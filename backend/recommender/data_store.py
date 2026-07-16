import os
import pickle

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_DIR = os.path.join(BASE_DIR, "pickle_models")

vectorized_matrix = None
combined_df = None
indices_title = None
indices_isbn = None

def load_data():
    global vectorized_matrix, combined_df, indices_title, indices_isbn
    try:
        with open(os.path.join(PKL_DIR, "vectorized_matrix.pkl"), "rb") as f:
            vectorized_matrix = pickle.load(f)
        with open(os.path.join(PKL_DIR, "df.pkl"), "rb") as f:
            combined_df = pickle.load(f)
        with open(os.path.join(PKL_DIR, "indices_title.pkl"), "rb") as f:
            indices_title = pickle.load(f)
        with open(os.path.join(PKL_DIR, "indices_isbn.pkl"), "rb") as f:
            indices_isbn = pickle.load(f)
        print("Recommendation data loaded/refreshed.")
    except FileNotFoundError:
        print("Recommendation pkl files not found yet.")

load_data()