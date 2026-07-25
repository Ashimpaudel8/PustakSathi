"""
Recommendation engine (embedding-based, DB-backed)
===================================================

Book metadata (title/author/genre/description) ALWAYS comes straight from
the DB via the Book model -- never cached in a DataFrame. Only the
expensive part (embeddings) is cached to disk, as plain arrays aligned to
book_ids: book_ids[i] is the Book.id for embedding row i.
"""

import os
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

from . import data_store

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_DIR = os.path.join(BASE_DIR, "pickle_models")
os.makedirs(PKL_DIR, exist_ok=True)

MODEL_NAME = "intfloat/multilingual-e5-small"

WEIGHTS = {
    "title": 0.25,
    "description": 0.42,
    "genre": 0.28,
    "author": 0.05,
}

from django.conf import settings

if getattr(settings, "HF_OFFLINE_MODE", True):
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

_model = None


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(
            MODEL_NAME,
            # device="cpu",
            local_files_only=getattr(settings, "HF_OFFLINE_MODE", True))
    return _model


def parse_authors(author_str):
    if not isinstance(author_str, str) or not author_str.strip():
        return None
    names = {a.strip().lower() for a in author_str.split(",") if a.strip()}
    return names if names else None


def embed_column(model, values):
    """values: plain list[str] pulled straight from the DB (no DataFrame)."""
    clean = ["" if v is None else str(v).strip() for v in values]
    mask = np.array([v != "" for v in clean])
    texts = ["query: " + t for t in clean]
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    embeddings[~mask] = 0.0
    return embeddings, mask


PKL_FILES = {
    "book_ids": "book_ids.pkl",
    "title_emb": "title_emb.pkl",
    "title_mask": "title_mask.pkl",
    "desc_emb": "desc_emb.pkl",
    "desc_mask": "desc_mask.pkl",
    "genre_emb": "genre_emb.pkl",
    "genre_mask": "genre_mask.pkl",
    "author_sets": "author_sets.pkl",
}


def _path(name):
    return os.path.join(PKL_DIR, PKL_FILES[name])


def _save(**objects):
    for name, obj in objects.items():
        with open(_path(name), "wb") as f:
            pickle.dump(obj, f)


def _load(name):
    with open(_path(name), "rb") as f:
        return pickle.load(f)


def rebuild_recommendation_data():
    """Full rebuild from the DB. Book metadata is read once here just to
    build the embeddings, then thrown away -- only book_ids + embeddings
    get cached to disk."""
    from .models import Book

    rows = list(Book.objects.all().values("id", "title", "author", "description", "genre"))
    if not rows:
        return

    model = get_model()
    book_ids = [r["id"] for r in rows]
    title_emb, title_mask = embed_column(model, [r["title"] for r in rows])
    desc_emb, desc_mask = embed_column(model, [r["description"] for r in rows])
    genre_emb, genre_mask = embed_column(model, [r["genre"] for r in rows])
    author_sets = [parse_authors(r["author"]) for r in rows]

    _save(
        book_ids=book_ids,
        title_emb=title_emb, title_mask=title_mask,
        desc_emb=desc_emb, desc_mask=desc_mask,
        genre_emb=genre_emb, genre_mask=genre_mask,
        author_sets=author_sets,
    )
    data_store.load_data()


import pandas as pd
import numpy as np

def sync_new_books():
    """Embeds ONLY books whose id isn't in book_ids.pkl yet, then appends --
    never re-embeds books that are already indexed."""
    from .models import Book

    try:
        book_ids = _load("book_ids")
    except FileNotFoundError:
        return rebuild_recommendation_data()

    # 1. Compare IDs in Python memory (0 SQL parameters used)
    indexed_set = set(book_ids)
    db_ids = set(Book.objects.values_list("id", flat=True))
    missing_ids = list(db_ids - indexed_set)

    if not missing_ids:
        return

    # 2. Fetch missing rows in safe 500-ID chunks to avoid SQLite limits
    new_rows = []
    CHUNK_SIZE = 500
    for i in range(0, len(missing_ids), CHUNK_SIZE):
        chunk = missing_ids[i : i + CHUNK_SIZE]
        rows = list(
            Book.objects.filter(id__in=chunk).values(
                "id", "title", "author", "description", "genre"
            )
        )
        new_rows.extend(rows)

    model = get_model()

    # Wrapped in pd.Series so embed_column()'s .fillna() method works cleanly
    new_title_emb, new_title_mask = embed_column(
        model, pd.Series([r["title"] for r in new_rows])
    )
    new_desc_emb, new_desc_mask = embed_column(
        model, pd.Series([r["description"] for r in new_rows])
    )
    new_genre_emb, new_genre_mask = embed_column(
        model, pd.Series([r["genre"] for r in new_rows])
    )
    new_author_sets = [parse_authors(r["author"]) for r in new_rows]

    title_emb, title_mask = _load("title_emb"), _load("title_mask")
    desc_emb, desc_mask = _load("desc_emb"), _load("desc_mask")
    genre_emb, genre_mask = _load("genre_emb"), _load("genre_mask")
    author_sets = _load("author_sets")

    book_ids = book_ids + [r["id"] for r in new_rows]
    title_emb = np.vstack([title_emb, new_title_emb])
    title_mask = np.concatenate([title_mask, new_title_mask])
    desc_emb = np.vstack([desc_emb, new_desc_emb])
    desc_mask = np.concatenate([desc_mask, new_desc_mask])
    genre_emb = np.vstack([genre_emb, new_genre_emb])
    genre_mask = np.concatenate([genre_mask, new_genre_mask])
    author_sets = author_sets + new_author_sets

    _save(
        book_ids=book_ids,
        title_emb=title_emb,
        title_mask=title_mask,
        desc_emb=desc_emb,
        desc_mask=desc_mask,
        genre_emb=genre_emb,
        genre_mask=genre_mask,
        author_sets=author_sets,
    )
    data_store.load_data()

def update_existing_books(ids_to_update):
    """Re-embeds books that are ALREADY indexed (rename/edit case).
    Overwrites their rows in place at the same position -- never appends,
    never touches other books' embeddings."""
    from .models import Book

    ids_to_update = [i for i in ids_to_update if i is not None]
    if not ids_to_update:
        return

    try:
        book_ids = _load("book_ids")
    except FileNotFoundError:
        return rebuild_recommendation_data()

    id_to_idx = {bid: i for i, bid in enumerate(book_ids)}
    targets = [bid for bid in ids_to_update if bid in id_to_idx]
    if not targets:
        return  # not indexed yet -- let sync_new_books handle it

    rows = list(
        Book.objects.filter(id__in=targets).values(
            "id", "title", "author", "description", "genre"
        )
    )
    if not rows:
        return

    model = get_model()
    new_title_emb, new_title_mask = embed_column(model, [r["title"] for r in rows])
    new_desc_emb, new_desc_mask = embed_column(model, [r["description"] for r in rows])
    new_genre_emb, new_genre_mask = embed_column(model, [r["genre"] for r in rows])
    new_author_sets = [parse_authors(r["author"]) for r in rows]

    title_emb, title_mask = _load("title_emb"), _load("title_mask")
    desc_emb, desc_mask = _load("desc_emb"), _load("desc_mask")
    genre_emb, genre_mask = _load("genre_emb"), _load("genre_mask")
    author_sets = _load("author_sets")

    for k, r in enumerate(rows):
        pos = id_to_idx[r["id"]]
        title_emb[pos], title_mask[pos] = new_title_emb[k], new_title_mask[k]
        desc_emb[pos], desc_mask[pos] = new_desc_emb[k], new_desc_mask[k]
        genre_emb[pos], genre_mask[pos] = new_genre_emb[k], new_genre_mask[k]
        author_sets[pos] = new_author_sets[k]

    _save(
        book_ids=book_ids,
        title_emb=title_emb, title_mask=title_mask,
        desc_emb=desc_emb, desc_mask=desc_mask,
        genre_emb=genre_emb, genre_mask=genre_mask,
        author_sets=author_sets,
    )
    data_store.load_data()

def remove_books_from_index(ids_to_remove):
    """Removes books from ALL cached arrays in place, keeping book_ids and
    every embedding matrix aligned. Safe to call with ids that were never
    indexed (they're just skipped)."""
    ids_to_remove = set(i for i in ids_to_remove if i is not None)
    if not ids_to_remove:
        return

    try:
        book_ids = _load("book_ids")
    except FileNotFoundError:
        return  # nothing indexed yet

    keep_mask = np.array([bid not in ids_to_remove for bid in book_ids])
    if keep_mask.all():
        return  # none of these were indexed

    book_ids = [bid for bid, keep in zip(book_ids, keep_mask) if keep]
    title_emb = _load("title_emb")[keep_mask]
    title_mask = _load("title_mask")[keep_mask]
    desc_emb = _load("desc_emb")[keep_mask]
    desc_mask = _load("desc_mask")[keep_mask]
    genre_emb = _load("genre_emb")[keep_mask]
    genre_mask = _load("genre_mask")[keep_mask]
    author_sets = [a for a, keep in zip(_load("author_sets"), keep_mask) if keep]

    _save(
        book_ids=book_ids,
        title_emb=title_emb, title_mask=title_mask,
        desc_emb=desc_emb, desc_mask=desc_mask,
        genre_emb=genre_emb, genre_mask=genre_mask,
        author_sets=author_sets,
    )
    data_store.load_data()



# ---------------- similarity (dynamic weight redistribution) ----------------
# NOTE: seed_idx / seed_idxs below are POSITIONS in book_ids (0..n-1), not
# Book primary keys. views.py converts book_id -> position via
# data_store.id_to_idx before calling these, and position -> book_id via
# data_store.book_ids[pos] afterwards.

# instead of raw Jaccard (0 or 1 for single-author books), compress it:
def _jaccard(a, b):
    if not a or not b:
        return None
    inter = len(a & b)
    union = len(a | b)
    if union == 0:
        return None
    j = inter / union
    return j ** 0.5 if j == 1.0 else j  # optional: soften only perfect matches

def rating_to_weight(rating, min_weight=0.5, max_weight=1.0):
    rating = max(1, min(5, rating))
    return min_weight + (rating - 1) / 4 * (max_weight - min_weight)


def weighted_similarity(seed_idx):
    n = len(data_store.book_ids)

    title_emb, title_mask = data_store.title_emb, data_store.title_mask
    desc_emb, desc_mask = data_store.desc_emb, data_store.desc_mask
    genre_emb, genre_mask = data_store.genre_emb, data_store.genre_mask
    author_sets = data_store.author_sets

    title_sim = cosine_similarity(title_emb[seed_idx:seed_idx + 1], title_emb)[0]
    desc_sim = cosine_similarity(desc_emb[seed_idx:seed_idx + 1], desc_emb)[0]
    genre_sim = cosine_similarity(genre_emb[seed_idx:seed_idx + 1], genre_emb)[0]

    seed_authors = author_sets[seed_idx]
    author_sim = np.full(n, np.nan)
    if seed_authors:
        for i, other in enumerate(author_sets):
            j = _jaccard(seed_authors, other)
            if j is not None:
                author_sim[i] = j

    title_avail = title_mask & title_mask[seed_idx]
    desc_avail = desc_mask & desc_mask[seed_idx]
    genre_avail = genre_mask & genre_mask[seed_idx]
    author_avail = ~np.isnan(author_sim)

    scores = np.zeros(n)
    weight_mass = np.zeros(n)

    for sim, avail, w in [
        (title_sim, title_avail, WEIGHTS["title"]),
        (desc_sim, desc_avail, WEIGHTS["description"]),
        (genre_sim, genre_avail, WEIGHTS["genre"]),
        (np.nan_to_num(author_sim), author_avail, WEIGHTS["author"]),
    ]:
        scores += np.where(avail, sim * w, 0.0)
        weight_mass += np.where(avail, w, 0.0)

    with np.errstate(divide="ignore", invalid="ignore"):
        final = np.where(weight_mass > 0, scores / weight_mass, 0.0)

    return final


def similarity_from_seeds(seed_idxs, seed_ratings=None):
    n = len(data_store.book_ids)
    total = np.zeros(n)

    if seed_ratings is None:
        weights = np.ones(len(seed_idxs))
    else:
        weights = np.array([rating_to_weight(r) for r in seed_ratings])

    if np.allclose(weights, 0):
        weights = np.ones(len(seed_idxs))  # fallback: no signal, treat equally

    for idx, w in zip(seed_idxs, weights):
        total += w * weighted_similarity(idx)

    denom = np.sum(np.abs(weights))
    return total / denom if denom > 0 else total