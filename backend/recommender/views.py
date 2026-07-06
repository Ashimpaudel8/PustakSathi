from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, BookSerializer, ReadBooksSerializer
from .models import Book, ReadBooks
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from concurrent.futures import ThreadPoolExecutor
from sklearn.metrics.pairwise import cosine_similarity
import string, pickle
import numpy as np
import requests
import re
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GOOGLE_BOOKS_API_KEY")

try:
    with open("recommender/pickle_models/indices_title.pkl", "rb") as f:
        indices_title = pickle.load(f)

    with open("recommender/pickle_models/vectorized_matrix.pkl", "rb") as f:
        vectorized_matrix = pickle.load(f)

    with open("recommender/pickle_models/df.pkl", "rb") as f:
        combined_df = pickle.load(f)

except FileNotFoundError:
    print("Recommendation pkl files not found yet — recommendations disabled until pipeline runs.")
    vectorized_matrix = None
    combined_df = None
    indices_title = None


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class ReadBookView(generics.ListAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()

        if not query:
            return Book.objects.none()

        return Book.objects.filter(
            title__icontains = query
        )[:10]

def clean_title(title):
    title = re.sub(r"\s*\(.*?\)", "", title)
    # Remove subtitle after colon
    title = title.split(":")[0]
    title = str(title).lower()
    # Remove punctuation
    title = title.translate(str.maketrans("", "", string.punctuation))
    # Remove extra spaces
    title = " ".join(title.split())
    return title.strip()

def get_book_detail(title, author, description, isbn):
    data_dict = {}

    # ---------- Google Books ----------
    response_google = requests.get(
        "https://www.googleapis.com/books/v1/volumes",
        params={
            "q": f'intitle:"{title}" inauthor:"{author}"',
            "maxResults": 1,
            "key": api_key,
        },
        timeout=5,
    )

    data_google = response_google.json()

    items = data_google.get("items", [])
    volume_info = items[0].get("volumeInfo", {}) if items else {}

    image_links = volume_info.get("imageLinks", {})

    data_dict["isbn"] = isbn
    data_dict["title"] = volume_info.get("title", title)
    data_dict["authors"] = volume_info.get("authors", [author])
    data_dict["publisher"] = volume_info.get("publisher", "N/A")
    data_dict["publishedDate"] = volume_info.get("publishedDate", "N/A")
    data_dict["thumbnail_url"] = image_links.get("thumbnail", "")
    data_dict["categories"] = volume_info.get("categories", ["N/A"])
    data_dict["description"] = volume_info.get("description", description)

    # Default
    data_dict["thumbnail_id"] = ""

    # If Google already has a thumbnail, skip Open Library completely.
    if data_dict["thumbnail_url"]:
        return data_dict

    # ---------- Open Library ----------
    search_titles = [
        data_dict["title"],
        clean_title(data_dict["title"]),
        title,
    ]

    for search_title in search_titles:

        if not search_title:
            continue

        response_open = requests.get(
            "https://openlibrary.org/search.json",
            params={
                "title": search_title,
                "limit": 3,
            },
            timeout=15,
        )

        try:
            data_open = response_open.json()
        except ValueError:
            continue

        docs = data_open.get("docs", [])

        for doc in docs:

            cover_id = doc.get("cover_i")

            if cover_id:
                data_dict["thumbnail_id"] = cover_id
                return data_dict

    return data_dict


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendation_view(request):

    title = request.query_params.get("q", "").strip()
    
    def normalize_title(title):
        return (
            str(title)
            .strip()
            .lower()
            .translate(str.maketrans("", "", string.punctuation))
        )
    
    titles = [title]

    selected_idx = [
        indices_title[normalize_title(title)]
        for title in titles
    ]
    
    user_vector = np.asarray(vectorized_matrix[selected_idx].mean(axis=0))
    sim_score = cosine_similarity(user_vector, vectorized_matrix)[0]
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:100]

    seen = set()
    books = []

    for idx in sim_idx:

        book = combined_df.iloc[idx]

        key = clean_title(book["title"])

        if key in seen:
            continue

        seen.add(key)

        books.append({
            "title": book["title"],
            "author": book["author"],
            "description": book["description"],
            "isbn": book["isbn"]
        })

        if len(books) == 20:
            break

    with ThreadPoolExecutor(max_workers=10) as executor:
        response_list = list(
            executor.map(
                lambda book: get_book_detail(
                    book["title"],
                    book["author"],
                    book["description"],
                    book["isbn"]
                ),
                books,
            )
        )

    return Response({"Recommendations": response_list})


class ReadBooksListCreate(generics.ListCreateAPIView):
    serializer_class = ReadBooksSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        readbooks = ReadBooks.objects.filter(user = user)

        return readbooks
    
    def list(self, request, *args, **kwargs):
        readbooks = self.get_queryset()

        with ThreadPoolExecutor(max_workers=10) as executor:
            response_list = list(
                executor.map(
                    lambda readbook: {
                        **get_book_detail(
                            readbook.book.title,
                            readbook.book.author,
                            readbook.book.description,
                            readbook.book.isbn
                        ),
                        "readbook_id": readbook.id,
                    },
                    readbooks,
                )
            )

        return Response({"ReadBooks": response_list})
        
    def perform_create(self, serializer):
        isbn = self.request.data["isbn"]
        book = Book.objects.get(isbn = isbn)

        already_read = ReadBooks.objects.filter(user=self.request.user, book=book).exists()
    
        if already_read:
            return
        
        serializer.save(user = self.request.user, book = book)
            
            
class ReadBooksDelete(generics.DestroyAPIView):
    serializer_class = ReadBooksSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ReadBooks.objects.filter(user = user)