import json
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, BookSerializer, ReadBooksSerializer
from .models import Book, ReadBooks
from django.http import JsonResponse
from rest_framework.permissions import IsAdminUser

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

        return Book.objects.filter(title__icontains=query)[:10]


# #for JWT authentication in backend
# @csrf_exempt
# @api_view(["POST"])
# @authentication_classes([])  # No auth required to register
# @permission_classes([])
# def api_signup(request):
#     try:
#         data = json.loads(request.body)
#         username = data.get("username")
#         email = data.get("email")
#         password = data.get("password")

#         if not username or not password or not email:
#             return JsonResponse(
#                 {"status": "error", "message": "All fields are required"}, status=400
#             )

#         if User.objects.filter(username=username).exists():
#             return JsonResponse(
#                 {"status": "error", "message": "Username already exists"}, status=400
#             )

#         # Create user account
#         user = User.objects.create_user(
#             username=username, email=email, password=password
#         )

#         # Manually generate JWT access and refresh tokens for the newly created user
#         refresh = RefreshToken.for_user(user)

#         return JsonResponse(
#             {
#                 "status": "success",
#                 "message": "User registered successfully",
#                 "tokens": {
#                     "refresh": str(refresh),
#                     "access": str(refresh.access_token),
#                 },
#                 "user": {"username": user.username, "email": user.email},
#             },
#             status=201,
#         )

#     except Exception as e:
#         return JsonResponse({"status": "error", "message": str(e)}, status=500)


# @api_view(["GET"])
# @authentication_classes([JWTAuthentication])  # Decodes the incoming Bearer token
# @permission_classes(
#     [IsAuthenticated]
# )  # Rejects the request if token is missing or expired
# def api_auth_status(request):
#     """
#     Acts as a secure checkpoint. If the React app passes a valid access token
#     in the headers, this will automatically succeed and return user details.
#     """
#     return JsonResponse(
#         {
#             "isAuthenticated": True,
#             "user": {"username": request.user.username, "email": request.user.email},
#         },
#         status=200,
#     )


# ==========================================
# BOOK CRUD MANAGEMENT (SUPERUSER ONLY)
# ==========================================
@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAdminUser])
def admin_books_resource(request):
    """Handles listing all books (paginated/limited) and adding a new book."""
    if request.method == "GET":
        # Grab recent 50 books to prevent heavy loading on the dashboard list
        books = Book.objects.all().order_by("-id")[:50].values("id", "isbn", "title")
        return JsonResponse({"status": "success", "books": list(books)}, status=200)

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            isbn = data.get("isbn", "").strip()
            title = data.get("title", "").strip()

            if not isbn or not title:
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "ISBN and Title are required fields.",
                    },
                    status=400,
                )

            if Book.objects.filter(isbn=isbn).exists():
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "A book with this ISBN already exists.",
                    },
                    status=400,
                )

            new_book = Book.objects.create(isbn=isbn, title=title)
            return JsonResponse(
                {
                    "status": "success",
                    "message": "Book added successfully!",
                    "book": {"id": new_book.id, "title": new_book.title},
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@api_view(["PUT", "DELETE"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAdminUser])
def admin_book_detail(request, book_id):
    """Handles updating or deleting a specific book record."""
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return JsonResponse(
            {"status": "error", "message": "Book not found."}, status=404
        )

    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            book.title = data.get("title", book.title).strip()
            book.isbn = data.get("isbn", book.isbn).strip()
            book.save()
            return JsonResponse(
                {"status": "success", "message": "Book updated successfully!"},
                status=200,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    elif request.method == "DELETE":
        book.delete()
        return JsonResponse(
            {"status": "success", "message": "Book deleted successfully!"}, status=200
        )


# ==========================================
# USER MANAGEMENT (SUPERUSER ONLY)
# ==========================================


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAdminUser])
def admin_get_all_users(request):
    """Retrieves all registered platform users."""
    users = User.objects.all().values(
        "id", "username", "email", "is_superuser", "date_joined"
    )
    return JsonResponse({"status": "success", "users": list(users)}, status=200)


@api_view(["DELETE"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAdminUser])
def admin_delete_user(request, user_id):
    """Purges a user account from the system database."""
    try:
        target_user = User.objects.get(id=user_id)
        if target_user == request.user:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "You cannot delete your own active session account.",
                },
                status=400,
            )

        target_user.delete()
        return JsonResponse(
            {"status": "success", "message": "User account permanently removed."},
            status=200,
        )
    except User.DoesNotExist:
        return JsonResponse(
            {"status": "error", "message": "User not found."}, status=404
        )


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