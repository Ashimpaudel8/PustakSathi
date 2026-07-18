import json, time, requests, re, os, string, json, random
from django.contrib.auth.models import User
from .serializers import UserSerializer, BookSerializer, ReadBooksSerializer, WishlistSerializer
from .models import Book, ReadBooks, Wishlist
from django.db.models import Case, When, Value, IntegerField
from django.db.models.functions import Length
from django.http import JsonResponse
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from concurrent.futures import ThreadPoolExecutor
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from django.core.cache import cache
from . import data_store

from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("GOOGLE_BOOKS_API_KEY")


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

        return (
            Book.objects
            .filter(title__icontains=query)
            .annotate(
                priority=Case(
                    When(title__iexact=query, then=Value(0)),
                    When(title__istartswith=query, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                ),
                title_len=Length("title"),
            )
            .order_by("priority", "title_len", "title")[:10]
        )


CACHE_TIMEOUT_HIT = 60 * 60    # 1 hour — successful lookups (found thumbnail)
CACHE_TIMEOUT_MISS = 60 * 5    # 5 minutes — nothing found, retry sooner


def normalize_title(title):
    return (
        str(title)
        .strip()
        .lower()
        .translate(str.maketrans("", "", string.punctuation))
    )


def clean_title(title):
    title = re.sub(r"\s*\(.*?\)", "", title)
    title = re.sub(r"#\d+", "", title)
    # Remove subtitle after colon
    title = title.split(":")[0]
    title = str(title).lower()
    # Remove punctuation
    title = title.translate(str.maketrans("", "", string.punctuation))
    # Remove extra spaces
    title = " ".join(title.split())
    return title.strip()


def get_book_detail(title, author, description, isbn):
    cache_key = f"book_detail:isbn:{isbn}"

    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    result = _fetch_book_detail_fresh(title, author, description, isbn)

    found_something = bool(result["thumbnail_url"] or result["thumbnail_id"])
    timeout = CACHE_TIMEOUT_HIT if found_something else CACHE_TIMEOUT_MISS

    cache.set(cache_key, result, timeout)
    return result

def _fetch_book_detail_fresh(title, author, description, isbn):

    data_dict = {
        "isbn": isbn,
        "title": title,
        "authors": [author],
        "publisher": "N/A",
        "publishedDate": "N/A",
        "thumbnail_url": "",
        "thumbnail_id": "",
        "categories": ["N/A"],
        "description": description,
        "is_wishlisted": False,
        "is_read": False,
    }

    # ---------- Google Books ----------
    google_titles = list(dict.fromkeys([
        title,
        clean_title(title),
    ]))

    volume_info = {}
    google_search_title = None

    for search_title in google_titles:
        if not search_title:
            continue

        try:
            response_google = requests.get(
                "https://www.googleapis.com/books/v1/volumes",
                params={
                    "q": f'intitle:"{search_title}" inauthor:"{author}"',
                    "maxResults": 1,
                    "key": api_key,
                },
                timeout=5,
            )

            response_google.raise_for_status()
            data_google = response_google.json()

            items = data_google.get("items", [])
            if items:
                volume_info = items[0].get("volumeInfo", {})
                google_search_title = search_title
                break

        except requests.exceptions.RequestException as e:
            print(f"Google search failed for '{search_title}': {e}")

    image_links = volume_info.get("imageLinks", {})

    data_dict["authors"] = volume_info.get("authors", [author])
    data_dict["publisher"] = volume_info.get("publisher", "N/A")
    data_dict["publishedDate"] = volume_info.get("publishedDate", "N/A")
    data_dict["thumbnail_url"] = image_links.get("thumbnail", "")
    data_dict["categories"] = volume_info.get("categories", ["N/A"])
    data_dict["description"] = volume_info.get("description", description)

    # Google already has thumbnail
    if data_dict["thumbnail_url"]:
        return data_dict

    # ---------- Open Library ----------
    if google_search_title:
        search_titles = [title, google_search_title, clean_title(google_search_title)]
    else:
        search_titles = google_titles

    for search_title in search_titles:

        try:
            response_open = requests.get(
                "https://openlibrary.org/search.json",
                params={
                    "title": search_title,
                    "limit": 3,
                },
                timeout=5,
            )
            time.sleep(0.2)

            response_open.raise_for_status()

            data_open = response_open.json()

            docs = data_open.get("docs", [])

            for doc in docs:
                cover_id = doc.get("cover_i")
                if cover_id:
                    data_dict["thumbnail_id"] = cover_id
                    return data_dict

        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"Failed to fetch data for '{search_title}': {e}")

    return data_dict


@api_view(['GET'])
@permission_classes([AllowAny])
def get_recommendation_view(request):

    title = request.query_params.get("q", "").strip()
    isbn = request.query_params.get("i", "").strip()

    if isbn:

        selected_idx = [
            data_store.indices_isbn.get(isbn.strip(), None)
        ]

    elif title:
        selected_idx = [
            data_store.indices_title.get(normalize_title(title), None)
        ]

    selected_idx = [idx for idx in selected_idx if idx is not None]

    if not selected_idx:
        return Response(
            {"error": ["Book Not Found in Database."]}
        )
    
    single_book = data_store.combined_df.iloc[selected_idx[0]]
    print(single_book["title"])
    print(single_book["author"])
    print(single_book["description"])
    print(single_book["isbn"])
    single_book_result = get_book_detail(single_book["title"], single_book["author"], single_book["description"], single_book["isbn"])
    # single_book_result = {"None": "gg"}
    
    user_vector = np.asarray(data_store.vectorized_matrix[selected_idx].mean(axis=0))
    sim_score = cosine_similarity(user_vector, data_store.vectorized_matrix)[0]
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:100]

    seen = set()
    books = []

    for idx in sim_idx:

        book = data_store.combined_df.iloc[idx]

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

        if len(books) == 8:
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

    wishlist_isbns = set(
        Wishlist.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )
    read_isbns = set(
        ReadBooks.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["isbn"] in wishlist_isbns
        book["is_read"] = book["isbn"] in read_isbns

    return Response({"single_book_detail": single_book_result, "Recommendations": response_list})


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
                        "review": readbook.review,
                        "rating": readbook.rating,
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_readbooks_recommendation_view(request):

    posts = request.data.get("readbooks", [])
    titles = [item.get("title") for item in posts]
    ratings = [item.get("rating") for item in posts]

    selected_idx = [
        data_store.indices_title[normalize_title(title)]
        for title in titles
        if normalize_title(title) in data_store.indices_title
    ]
    
    if not selected_idx:
        return Response(
            {"Recommendations": []}
        )

    weights = np.array(ratings)

    user_vector = np.average(
        data_store.vectorized_matrix[selected_idx].toarray(),
        axis=0,
        weights=weights,
    ).reshape(1, -1)

    sim_score = cosine_similarity(user_vector, data_store.vectorized_matrix)[0]
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:100]

    seen = set()
    books = []

    for idx in sim_idx:

        book = data_store.combined_df.iloc[idx]

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

        if len(books) == 8:
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

    wishlist_isbns = set(
        Wishlist.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )
    read_isbns = set(
        ReadBooks.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["isbn"] in wishlist_isbns
        book["is_read"] = book["isbn"] in read_isbns

    return Response({"Recommendations": response_list})


class WishlistListCreate(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        wishlists = Wishlist.objects.filter(user = user)

        return wishlists
    
    def list(self, request, *args, **kwargs):
        wishlists = self.get_queryset()

        with ThreadPoolExecutor(max_workers=10) as executor:
            response_list = list(
                executor.map(
                    lambda wishlist: {
                        **get_book_detail(
                            wishlist.book.title,
                            wishlist.book.author,
                            wishlist.book.description,
                            wishlist.book.isbn,
                        ),
                        "wishlist_id": wishlist.id,
                    },
                    wishlists,
                )
            )

        return Response({"Wishlists": response_list})
        
    def perform_create(self, serializer):
        isbn = self.request.data["isbn"]
        book = Book.objects.get(isbn = isbn)

        already_wishlist = Wishlist.objects.filter(user=self.request.user, book=book).exists()
    
        if already_wishlist:
            return
        
        serializer.save(user = self.request.user, book = book)
            
            
class WishlistDelete(generics.DestroyAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Wishlist.objects.filter(user = user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_wishlist_recommendation_view(request):

    posts = request.data.get("wishlists", [])
    titles = (item.get("title") for item in posts)

    selected_idx = [
        data_store.indices_title[normalize_title(title)]
        for title in titles
        if normalize_title(title) in data_store.indices_title
    ]
    
    if not selected_idx:
        return Response(
            {"Recommendations": []}
        )
    
    user_vector = np.asarray(data_store.vectorized_matrix[selected_idx].mean(axis=0))
    sim_score = cosine_similarity(user_vector, data_store.vectorized_matrix)[0]
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:100]

    seen = set()
    books = []

    for idx in sim_idx:

        book = data_store.combined_df.iloc[idx]

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

        if len(books) == 8:
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

    wishlist_isbns = set(
        Wishlist.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )
    read_isbns = set(
        ReadBooks.objects.filter(user = request.user)
        .values_list("book__isbn", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["isbn"] in wishlist_isbns
        book["is_read"] = book["isbn"] in read_isbns

    return Response({"Recommendations": response_list})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    wishlists_count = Wishlist.objects.filter(user = user).count()
    readbooks_count = ReadBooks.objects.filter(user = user).count()
    id = user.id
    username = user.username
    return Response({
        "id": id,
        "username": username,
        "wishlists_count": wishlists_count,
        "readbooks_count": readbooks_count,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_discover_books_view(request):
    cache_key = f"discover_books:{request.user.id}"
    cached = cache.get(cache_key)

    if cached is not None:
        response_list = cached
    else:
        seen = set()
        books = []

        random_idx = random.sample(range(len(data_store.combined_df)), 50)

        for idx in random_idx:
            book = data_store.combined_df.iloc[idx]
            key = clean_title(book["title"])

            if key in seen:
                continue

            seen.add(key)
            books.append({
                "title": book["title"],
                "author": book["author"],
                "description": book["description"],
                "isbn": book["isbn"],
            })

            if len(books) == 8:
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

        cache.set(cache_key, response_list, timeout=3600)

    wishlist_isbns = set(
        Wishlist.objects.filter(user=request.user)
        .values_list("book__isbn", flat=True)
    )
    read_isbns = set(
        ReadBooks.objects.filter(user=request.user)
        .values_list("book__isbn", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["isbn"] in wishlist_isbns
        book["is_read"] = book["isbn"] in read_isbns

    return Response({"Discover_Something_New": response_list})











# ==========================================
# BOOK CRUD MANAGEMENT (SUPERUSER ONLY)
# ==========================================
@api_view(["GET", "POST"])
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
@permission_classes([IsAdminUser])
def admin_get_all_users(request):
    """Retrieves all registered platform users."""
    users = User.objects.all().values(
        "id", "username", "email", "is_superuser", "date_joined"
    )
    return JsonResponse({"status": "success", "users": list(users)}, status=200)


@api_view(["DELETE"])
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