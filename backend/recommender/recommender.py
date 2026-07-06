import os

# This line goes near the top of ANY file where you need to read/write files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PKL_DIR = os.path.join(BASE_DIR, "pickle_models")
os.makedirs(PKL_DIR, exist_ok=True)   # creates the folder if missing — critical for first-time runs

import pandas as pd
import pickle
import string
from sklearn.feature_extraction.text import TfidfVectorizer
from .models import Book

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
nltk.download('stopwords')
nltk.download('wordnet')
stop = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def preprocess_text(row):
    row = str(row).lower()
    row = row.translate(str.maketrans("", "", string.punctuation))
    row = " ".join(word for word in row.split() if word not in stop)
    row = " ".join(lemmatizer.lemmatize(word) for word in row.split())
    return row

def rebuild_recommendation_data():
    books = Book.objects.all().values("isbn","title", "author", "description")
    df = pd.DataFrame(list(books))

    df["text"] = df[["title", "author", "description"]].agg(" ".join, axis=1)
    df["text"] = df["text"].apply(preprocess_text)

    vectorizer = TfidfVectorizer(max_features=100000, ngram_range=(1,2))
    vectorized_matrix = vectorizer.fit_transform(df["text"])

    indices_title = pd.Series(
        df.index,
        index=df['title'].str.lower().str.translate(str.maketrans("", "", string.punctuation))
    )

    indices_isbn = pd.Series(df.index, index=df['isbn'])

    with open(os.path.join(PKL_DIR, "df.pkl"), "wb") as f:
        pickle.dump(df, f)
    with open(os.path.join(PKL_DIR, "vectorized_matrix.pkl"), "wb") as f:
        pickle.dump(vectorized_matrix, f)
    with open(os.path.join(PKL_DIR, "indices_title.pkl"), "wb") as f:
        pickle.dump(indices_title, f)
    with open(os.path.join(PKL_DIR, "indices_isbn.pkl"), "wb") as f:
        pickle.dump(indices_isbn, f)