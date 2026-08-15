import os
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import HashingVectorizer, TfidfTransformer
from django.conf import settings
import scipy.sparse as sp
from . import data_store
from pathlib import Path
import re
import unicodedata

try:
    import nltk
    from nltk.corpus import stopwords as nltk_stopwords
    from nltk.stem import WordNetLemmatizer
    _NLTK_AVAILABLE = True
except ImportError:
    _NLTK_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_DIR = os.path.join(BASE_DIR, "pickle_models")
os.makedirs(PKL_DIR, exist_ok=True)

BASE_DIR = Path(__file__).resolve().parents[1]

def get_csv_path():
    embedding_model = getattr(settings, "RECOMMENDER_EMBEDDING_MODEL", "e5")
    filename = "books_meta_tfidf.csv" if embedding_model == "tfidf" else "books_meta_e5.csv"
    return BASE_DIR / "data" / filename

MODEL_NAME = "intfloat/multilingual-e5-small"

EMBEDDING_MODEL = getattr(settings, "RECOMMENDER_EMBEDDING_MODEL", "e5")


TFIDF_N_FEATURES = {
    "title": 2**12,
    "description": 2**13,
    "genre": 2**10,
}

WEIGHTS = {
    "title": 0.25,
    "description": 0.42,
    "genre": 0.28,
    "author": 0.05,
}

_stopwords_en = None
_lemmatizer = None
_nltk_data_ready = False


def _ensure_nltk_data():
    global _nltk_data_ready
    if _nltk_data_ready or not _NLTK_AVAILABLE:
        return
    for pkg, path in [("stopwords", "corpora/stopwords"), ("wordnet", "corpora/wordnet")]:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass  # offline / no network -- fall back gracefully below
    _nltk_data_ready = True


def _get_stopwords_en():
    global _stopwords_en
    if _stopwords_en is None:
        _ensure_nltk_data()
        try:
            _stopwords_en = set(nltk_stopwords.words("english"))
        except LookupError:
            _stopwords_en = set()
    return _stopwords_en


def _get_lemmatizer():
    global _lemmatizer
    if _lemmatizer is None:
        _ensure_nltk_data()
        try:
            lem = WordNetLemmatizer()
            lem.lemmatize("test")  # forces a lookup, verifies wordnet data is present
            _lemmatizer = lem
        except LookupError:
            _lemmatizer = False  # marks "checked, unavailable" so we don't retry every call
    return _lemmatizer


# high-frequency Devanagari function words / postpositions.
NEPALI_STOPWORDS = {
    "छ", "छन्", "थियो", "थिए", "हो", "हुन्", "गर्ने", "गरेको", "गर्दै",
    "र", "तर", "पनि", "यो", "त्यो", "यस", "उस", "उनको", "उनले", "यसको",
    "एक", "हुने", "भएको", "लागि", "साथ", "बारे", "जस्तो", "अनि", "भने",
    "नै", "मा", "को", "का", "की", "ले", "लाई", "बाट", "देखि", "सम्म",
    "जुन", "जो", "यी", "ती", "हुँदा", "गर्न", "छैन", "थिएन",
}

# \W excludes Devanagari punctuation/spaces too since re.UNICODE treats
# Devanagari letters as \w -- so this tokenizes both scripts correctly.
_TOKEN_RE = re.compile(r"[^\W\d_]+", re.UNICODE)


def _preprocess_text(text):
    if not text:
        return text

    text = unicodedata.normalize("NFC", text)
    tokens = _TOKEN_RE.findall(text.lower())
    if not tokens:
        return ""

    stop_en = _get_stopwords_en()
    lemmatizer = _get_lemmatizer()

    out = []
    for tok in tokens:
        if tok in stop_en or tok in NEPALI_STOPWORDS:
            continue
        if tok.isascii() and lemmatizer:
            tok = lemmatizer.lemmatize(tok)
        out.append(tok)

    return " ".join(out)

if getattr(settings, "HF_OFFLINE_MODE", True):
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

_model = None

def hashed_transform_chunked(hasher, texts, chunk_size=5000):
    chunks = []
    for i in range(0, len(texts), chunk_size):
        chunks.append(hasher.transform(texts[i:i + chunk_size]))
    return sp.vstack(chunks).tocsr()


def get_model():
    """Only called from embed_column() when EMBEDDING_MODEL == 'e5'.
    The import is INSIDE this function on purpose -- torch/sentence-
    transformers never get loaded into memory at all when running in
    tfidf mode."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(
            MODEL_NAME,
            local_files_only=getattr(settings, "HF_OFFLINE_MODE", True))
    return _model


def parse_authors(author_str):
    if not isinstance(author_str, str) or not author_str.strip():
        return None
    names = {a.strip().lower() for a in author_str.split(",") if a.strip()}
    return names if names else None


def embed_column(values, column_name, vectorizer=None):
    clean = ["" if v is None else str(v).strip() for v in values]
    mask = np.array([v != "" for v in clean])

    if EMBEDDING_MODEL == "tfidf":
        n_features = TFIDF_N_FEATURES[column_name]
        hasher = HashingVectorizer(
            n_features=n_features,
            alternate_sign=False,  # keep values non-negative for tfidf-style weighting
            norm=None,             # TfidfTransformer normalizes afterward
        )
        processed = [_preprocess_text(v) for v in clean]
        counts = hashed_transform_chunked(hasher, processed)  # fixed-width sparse matrix, no vocabulary dict built

        if vectorizer is None:
            vectorizer = TfidfTransformer()
            embeddings = vectorizer.fit_transform(counts)
        else:
            embeddings = vectorizer.transform(counts)

        embeddings = embeddings.multiply(mask.reshape(-1, 1)).tocsr()
        return embeddings, mask, vectorizer

    # --- e5 path (unchanged) ---
    model = get_model()
    texts = ["query: " + t for t in clean]
    embeddings = model.encode(texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    embeddings[~mask] = 0.0
    return embeddings, mask, None


PKL_FILES = {
    "book_ids": "book_ids.pkl",
    "title_emb": "title_emb.pkl",
    "title_mask": "title_mask.pkl",
    "desc_emb": "desc_emb.pkl",
    "desc_mask": "desc_mask.pkl",
    "genre_emb": "genre_emb.pkl",
    "genre_mask": "genre_mask.pkl",
    "author_sets": "author_sets.pkl",
    # only ever written/read in tfidf mode:
    "title_vectorizer": "title_vectorizer.pkl",
    "desc_vectorizer": "desc_vectorizer.pkl",
    "genre_vectorizer": "genre_vectorizer.pkl",
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
    from .models import Book


    rows = list(Book.objects.all().values("id", "title", "author", "description", "genre"))
    if not rows:
        return

    book_ids = [r["id"] for r in rows]
    title_emb, title_mask, title_vec = embed_column([r["title"] for r in rows], "title")

    desc_emb, desc_mask, desc_vec = embed_column([r["description"] for r in rows], "description")

    genre_emb, genre_mask, genre_vec = embed_column([r["genre"] for r in rows], "genre")

    author_sets = [parse_authors(r["author"]) for r in rows]

    to_save = dict(
        book_ids=book_ids,
        title_emb=title_emb, title_mask=title_mask,
        desc_emb=desc_emb, desc_mask=desc_mask,
        genre_emb=genre_emb, genre_mask=genre_mask,
        author_sets=author_sets,
    )
    if EMBEDDING_MODEL == "tfidf":
        to_save.update(title_vectorizer=title_vec, desc_vectorizer=desc_vec, genre_vectorizer=genre_vec)

    _save(**to_save)

    data_store.load_data()


def sync_new_books():
    """e5: embeds ONLY the new books and appends them -- never re-embeds
    books that are already indexed.
    tfidf: vocabulary depends on the whole corpus, so a new book can
    introduce new words -- simplest correct option is a full rebuild."""
    if EMBEDDING_MODEL == "tfidf":
        return rebuild_recommendation_data()

    from .models import Book

    try:
        book_ids = _load("book_ids")
    except FileNotFoundError:
        return rebuild_recommendation_data()

    indexed_set = set(book_ids)
    db_ids = set(Book.objects.values_list("id", flat=True))
    missing_ids = list(db_ids - indexed_set)

    if not missing_ids:
        return

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

    new_title_emb, new_title_mask, _ = embed_column([r["title"] for r in new_rows], "title")
    new_desc_emb, new_desc_mask, _ = embed_column([r["description"] for r in new_rows], "description")
    new_genre_emb, new_genre_mask, _ = embed_column([r["genre"] for r in new_rows], "genre")
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
    """e5: re-embeds books that are ALREADY indexed (rename/edit case),
    overwriting their rows in place -- never appends, never touches other
    books' embeddings.
    tfidf: an edit can introduce new vocabulary, so re-transforming with the
    old vectorizer could silently drop new words -- full rebuild instead."""
    if EMBEDDING_MODEL == "tfidf":
        return rebuild_recommendation_data()

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
        return

    rows = list(
        Book.objects.filter(id__in=targets).values(
            "id", "title", "author", "description", "genre"
        )
    )
    if not rows:
        return

    new_title_emb, new_title_mask, _ = embed_column([r["title"] for r in rows], "title")
    new_desc_emb, new_desc_mask, _ = embed_column([r["description"] for r in rows], "description")
    new_genre_emb, new_genre_mask, _ = embed_column([r["genre"] for r in rows], "genre")
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
    indexed (they're just skipped). Unaffected by embedding model choice."""
    ids_to_remove = set(i for i in ids_to_remove if i is not None)
    if not ids_to_remove:
        return

    try:
        book_ids = _load("book_ids")
    except FileNotFoundError:
        return

    keep_mask = np.array([bid not in ids_to_remove for bid in book_ids])
    if keep_mask.all():
        return

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


def _jaccard(a, b):
    if not a or not b:
        return None
    inter = len(a & b)
    union = len(a | b)
    if union == 0:
        return None
    j = inter / union
    return j ** 0.5 if j == 1.0 else j


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
        weights = np.ones(len(seed_idxs))

    for idx, w in zip(seed_idxs, weights):
        total += w * weighted_similarity(idx)

    denom = np.sum(np.abs(weights))
    return total / denom if denom > 0 else total