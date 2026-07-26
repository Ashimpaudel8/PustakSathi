import os
import pickle

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_DIR = os.path.join(BASE_DIR, "pickle_models")

book_ids = None
id_to_idx = None
title_emb = None
title_mask = None
desc_emb = None
desc_mask = None
genre_emb = None
genre_mask = None
author_sets = None


def _load(filename):
    with open(os.path.join(PKL_DIR, filename), "rb") as f:
        return pickle.load(f)


def load_data():
    global book_ids, id_to_idx, title_emb, title_mask, desc_emb, desc_mask
    global genre_emb, genre_mask, author_sets
    try:
        book_ids = _load("book_ids.pkl")
        id_to_idx = {bid: i for i, bid in enumerate(book_ids)}
        title_emb = _load("title_emb.pkl")
        title_mask = _load("title_mask.pkl")
        desc_emb = _load("desc_emb.pkl")
        desc_mask = _load("desc_mask.pkl")
        genre_emb = _load("genre_emb.pkl")
        genre_mask = _load("genre_mask.pkl")
        author_sets = _load("author_sets.pkl")
        print("Recommendation data loaded/refreshed.")
    except FileNotFoundError:
        print("Recommendation pkl files not found yet.")


load_data()