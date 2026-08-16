import json, time, requests, re, os, string, random
from django.contrib.auth.models import User
from .serializers import UserSerializer, BookSerializer, ReadBooksSerializer, WishlistSerializer
from .models import Book, ReadBooks, Wishlist
from django.db.models import Case, When, Value, IntegerField, Q
from django.db.models.functions import Length
from django.http import JsonResponse
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, BasePermission
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from django.core.cache import cache
from . import data_store
from . import recommender


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


CACHE_TIMEOUT_HIT = 60 * 60    # 1 hour — successful lookups
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


def get_book_detail(book_id, title, author, description, genre, img, link):
    cache_key = f"book_detail:{book_id}"

    cached_result = cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    result, fetched_externally = _fetch_book_detail_fresh(title, author, description, genre, img, link)
    result["book_id"] = book_id

    if fetched_externally:
        found_something = bool(result["thumbnail_url"] or result["thumbnail_id"])
        timeout = CACHE_TIMEOUT_HIT if found_something else CACHE_TIMEOUT_MISS
        cache.set(cache_key, result, timeout)

    return result

def _fetch_book_detail_fresh(title, author, description, genre, img, link):
    description = description or ""
    img = img or ""
    genre = [genre] if genre else ["N/A"]

    data_dict = {
        "title": title,
        "link": link,
        "authors": [author],
        "thumbnail_url": img,
        "thumbnail_id": "",
        "categories": genre,
        "description": description,
        "is_wishlisted": False,
        "is_read": False,
    }

    if data_dict["thumbnail_url"]:
        return data_dict, False

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
    data_dict["thumbnail_url"] = image_links.get("thumbnail", "")
    data_dict["categories"] = volume_info.get("categories", genre)
    data_dict["description"] = volume_info.get("description", description)

    if data_dict["thumbnail_url"]:
        return data_dict, True

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
            time.sleep(0.5)

            response_open.raise_for_status()

            data_open = response_open.json()

            docs = data_open.get("docs", [])

            for doc in docs:
                cover_id = doc.get("cover_i")
                if cover_id:
                    data_dict["thumbnail_id"] = cover_id
                    return data_dict, True

        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"Failed to fetch data for '{search_title}': {e}")

    return data_dict, True


def _books_from_positions(positions, limit=16, max_per_author=8, max_per_genre=12, required_genre_sets=None):
    ids_in_order = [data_store.book_ids[p] for p in positions]
    books_by_id = Book.objects.only("id", "title", "author", "genre").in_bulk(ids_in_order)

    seen_titles = set()
    author_counts = {}
    genre_counts = {}
    result = []
    fallback_books = []
    
    unsatisfied_sets = list(required_genre_sets) if required_genre_sets else []

    for bid in ids_in_order:
        book = books_by_id.get(bid)
        if book is None:
            continue
        key = clean_title(book.title)
        if key in seen_titles:
            continue

        authors = {
            normalize_title(author.strip())
            for author in (book.author or "").split(",")
            if author.strip()
        }

        if any(author_counts.get(author, 0) >= max_per_author for author in authors):
            continue

        genres = {
            normalize_title(genre.strip())
            for genre in (book.genre or "").split(",")
            if genre.strip()
        }

        if any(genre_counts.get(genre, 0) >= max_per_genre for genre in genres):
            continue

        # --- Genre Guarantee Logic ---
        satisfies = [req for req in unsatisfied_sets if not req.isdisjoint(genres)]
        slots_left = limit - len(result)
        
        if slots_left / 5 <= len(unsatisfied_sets) and not satisfies:
            fallback_books.append(book)
            continue

        seen_titles.add(key)
        
        for author in authors:
            author_counts[author] = author_counts.get(author, 0) + 1

        for genre in genres:
            genre_counts[genre] = genre_counts.get(genre, 0) + 1

        result.append(book)
        
        for req in satisfies:
            unsatisfied_sets.remove(req)

        if len(result) == limit:
            break
            
    if len(result) < limit:
        for book in fallback_books:
            key = clean_title(book.title)
            if key in seen_titles:
                continue
                
            authors = {
                normalize_title(author.strip())
                for author in (book.author or "").split(",")
                if author.strip()
            }
            genres = {
                normalize_title(genre.strip())
                for genre in (book.genre or "").split(",")
                if genre.strip()
            }
            
            if any(author_counts.get(author, 0) >= max_per_author for author in authors):
                continue
            if any(genre_counts.get(genre, 0) >= max_per_genre for genre in genres):
                continue
                
            seen_titles.add(key)
            for author in authors:
                author_counts[author] = author_counts.get(author, 0) + 1
            for genre in genres:
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
                
            result.append(book)
            if len(result) == limit:
                break

    return result


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendation_view(request):

    title = request.query_params.get("q", "").strip()
    seed_book = Book.objects.filter(title__iexact=title).first()

    if seed_book is None:
        return Response(
            {"error": ["Book Not Found in Database."]}
        )

    seed_pos = data_store.id_to_idx.get(seed_book.id)
    if seed_pos is None:
        return Response(
            {"error": ["Book Not Found in Database."]}
        )
    selected_idx = [seed_pos]

    single_book_result = get_book_detail(
        seed_book.id,
        seed_book.title,
        seed_book.author,
        seed_book.description,
        seed_book.genre,
        seed_book.img,
        seed_book.link,
    )

    sim_score = recommender.similarity_from_seeds(selected_idx)
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:500]

    books = _books_from_positions(sim_idx)

    with ThreadPoolExecutor(max_workers=2) as executor:
        response_list = list(
            executor.map(
                lambda book: get_book_detail(
                    book.id, 
                    book.title, 
                    book.author, 
                    book.description, 
                    book.genre, 
                    book.img, 
                    book.link),
                books,
            )
        )

    wishlist_ids = set(
        Wishlist.objects.filter(user = request.user).values_list("book_id", flat=True)
    )
    read_ids = set(
        ReadBooks.objects.filter(user = request.user).values_list("book_id", flat=True)
    )

    single_book_result["is_wishlisted"] = single_book_result["book_id"] in wishlist_ids
    single_book_result["is_read"] = single_book_result["book_id"] in read_ids

    for book in response_list:
        book["is_wishlisted"] = book["book_id"] in wishlist_ids
        book["is_read"] = book["book_id"] in read_ids

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

        with ThreadPoolExecutor(max_workers=2) as executor:
            response_list = list(
                executor.map(
                    lambda readbook: {
                        **get_book_detail(
                            readbook.book.id,
                            readbook.book.title,
                            readbook.book.author,
                            readbook.book.description,
                            readbook.book.genre,
                            readbook.book.img,
                            readbook.book.link,
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
        book_id = self.request.data["book_id"]
        book = Book.objects.get(id = book_id)

        book_count = ReadBooks.objects.filter(user = self.request.user).count()

        if (book_count >= 30):
            raise ValidationError({
                "code": "READBOOKS_LIMIT_REACHED",
                "message": "You can only add up to 30 books."
            })

        already_read = ReadBooks.objects.filter(user=self.request.user, book=book).exists()
    
        if already_read:
            serializer.instance = already_read
            return
        
        serializer.save(user = self.request.user, book = book)
            
            
class ReadBooksDelete(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReadBooksSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        user = self.request.user
        return ReadBooks.objects.filter(user=user)

    def perform_update(self, serializer):
        # Only rating/review are ever editable via this endpoint
        serializer.save(
            rating=self.request.data.get("rating", serializer.instance.rating),
            review=self.request.data.get("review", serializer.instance.review),
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_readbooks_recommendation_view(request):

    posts = request.data.get("readbooks", [])

    selected = [
        (data_store.id_to_idx[item.get("book_id")], item.get("rating"), item.get("book_id"))
        for item in posts
        if item.get("book_id") in data_store.id_to_idx
    ]

    if not selected:
        return Response(
            {"Recommendations": []}
        )

    selected_idx = [idx for idx, _rating, _bid in selected]
    seed_weights = [rating for _idx, rating, _bid in selected]
    selected_bids = [bid for _idx, _rating, bid in selected if _rating >= 3]

    seed_books = Book.objects.filter(id__in=selected_bids)
    required_genre_sets = []
    for sb in seed_books:
        genres = {normalize_title(g.strip()) for g in (sb.genre or "").split(",") if g.strip()}
        if genres:
            required_genre_sets.append(genres)

    sim_score = recommender.similarity_from_seeds(selected_idx, seed_ratings=seed_weights)
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:500]

    books = _books_from_positions(sim_idx, required_genre_sets=required_genre_sets)

    with ThreadPoolExecutor(max_workers=2) as executor:
        response_list = list(
            executor.map(
                lambda book: get_book_detail(
                    book.id, 
                    book.title, 
                    book.author, 
                    book.description,
                    book.genre,
                    book.img,
                    book.link,
                    ),
                books,
            )
        )

    wishlist_ids = set(
        Wishlist.objects.filter(user = request.user).values_list("book_id", flat=True)
    )
    read_ids = set(
        ReadBooks.objects.filter(user = request.user).values_list("book_id", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["book_id"] in wishlist_ids
        book["is_read"] = book["book_id"] in read_ids

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

        with ThreadPoolExecutor(max_workers=2) as executor:
            response_list = list(
                executor.map(
                    lambda wishlist: {
                        **get_book_detail(
                            wishlist.book.id,
                            wishlist.book.title,
                            wishlist.book.author,
                            wishlist.book.description,
                            wishlist.book.genre,
                            wishlist.book.img,
                            wishlist.book.link,
                        ),
                        "wishlist_id": wishlist.id,
                    },
                    wishlists,
                )
            )

        return Response({"Wishlists": response_list})
        
    def perform_create(self, serializer):
        book_id = self.request.data["book_id"]
        book = Book.objects.get(id = book_id)

        book_count = Wishlist.objects.filter(user = self.request.user).count()

        if (book_count >= 30):
            raise ValidationError({
                "code": "WISHLISTS_LIMIT_REACHED",
                "message": "You can only add up to 30 books."
            })

        already_wishlist = Wishlist.objects.filter(user=self.request.user, book=book).exists()
    
        if already_wishlist:
            serializer.instance = already_wishlist
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
    book_ids = [item.get("book_id") for item in posts]

    selected_idx = [
        data_store.id_to_idx[bid]
        for bid in book_ids
        if bid in data_store.id_to_idx
    ]
    
    if not selected_idx:
        return Response(
            {"Recommendations": []}
        )

    seed_books = Book.objects.filter(id__in=book_ids)
    required_genre_sets = []
    for sb in seed_books:
        genres = {normalize_title(g.strip()) for g in (sb.genre or "").split(",") if g.strip()}
        if genres:
            required_genre_sets.append(genres)

    sim_score = recommender.similarity_from_seeds(selected_idx)
    sim_score[selected_idx] = -1
    sim_idx = np.argsort(sim_score)[::-1][:500]

    books = _books_from_positions(sim_idx, required_genre_sets=required_genre_sets)

    with ThreadPoolExecutor(max_workers=2) as executor:
        response_list = list(
            executor.map(
                lambda book: get_book_detail(
                    book.id, 
                    book.title, 
                    book.author, 
                    book.description,
                    book.genre,
                    book.img,
                    book.link,
                    ),
                books,
            )
        )

    wishlist_ids = set(
        Wishlist.objects.filter(user = request.user).values_list("book_id", flat=True)
    )
    read_ids = set(
        ReadBooks.objects.filter(user = request.user).values_list("book_id", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["book_id"] in wishlist_ids
        book["is_read"] = book["book_id"] in read_ids

    return Response({"Recommendations": response_list})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    wishlists_count = Wishlist.objects.filter(user = user).count()
    readbooks_count = ReadBooks.objects.filter(user = user).count()
    id = user.id
    username = user.username
    email = user.email
    return Response({
        "id": id,
        "username": username,
        "email": email,
        "wishlists_count": wishlists_count,
        "readbooks_count": readbooks_count,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_discover_books_view(request):
    cache_key = f"discover_books:{request.user.id}"
    cached = cache.get(cache_key)

    if cached is not None:
        response_list = cached
    else:
        random_idx = random.sample(range(len(data_store.book_ids)), 300)
        books = _books_from_positions(random_idx)

        with ThreadPoolExecutor(max_workers=2) as executor:
            response_list = list(
                executor.map(
                    lambda book: get_book_detail(
                        book.id, 
                        book.title, 
                        book.author, 
                        book.description,
                        book.genre,
                        book.img,
                        book.link,
                        ),
                    books,
                )
            )

        cache.set(cache_key, response_list, timeout=3600)

    wishlist_ids = set(
        Wishlist.objects.filter(user=request.user).values_list("book_id", flat=True)
    )
    read_ids = set(
        ReadBooks.objects.filter(user=request.user).values_list("book_id", flat=True)
    )

    for book in response_list:
        book["is_wishlisted"] = book["book_id"] in wishlist_ids
        book["is_read"] = book["book_id"] in read_ids

    return Response({"Discover_Something_New": response_list})











# ==========================================
# BOOK CRUD MANAGEMENT (SUPERUSER ONLY)
# ==========================================
@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_books_resource(request):
    """Handles searchable/paginated book listing and adding a new book."""
    if request.method == "GET":
        query = request.query_params.get("q", "").strip()

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except ValueError:
            page = 1
        try:
            page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
        except ValueError:
            page_size = 20

        books_qs = Book.objects.all().order_by("-id")
        if query:
            books_qs = books_qs.filter(
                Q(title__icontains=query) | Q(author__icontains=query)
            )

        total = books_qs.count()
        start = (page - 1) * page_size
        books = list(
            books_qs[start:start + page_size].values(
                "id", "title", "author", "genre", "description", "img", "link"
            )
        )
        return JsonResponse(
            {"status": "success", "books": books, "total": total, "page": page, "page_size": page_size},
            status=200,
        )

    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            title = data.get("title", "").strip()
            author = data.get("author", "").strip()

            if not title:
                return JsonResponse({"status": "error", "message": "Title is a required field."}, status=400)
            if not author:
                return JsonResponse({"status": "error", "message": "Author is a required field."}, status=400)

            new_book = Book.objects.create(
                title=title,
                author=author,
                genre=data.get("genre", "").strip(),
                description=data.get("description", "").strip(),
                img=data.get("img", "").strip(),
                link=data.get("link", "").strip(),
            )
            return JsonResponse(
                {
                    "status": "success",
                    "message": "Book added successfully!",
                    "book": {
                        "id": new_book.id, "title": new_book.title, "author": new_book.author,
                        "genre": new_book.genre, "description": new_book.description,
                        "img": new_book.img, "link": new_book.link,
                    },
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=10000)


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
            title = data.get("title", book.title).strip()
            author = data.get("author", book.author).strip()

            if not title:
                return JsonResponse({"status": "error", "message": "Title is a required field."}, status=400)
            if not author:
                return JsonResponse({"status": "error", "message": "Author is a required field."}, status=400)

            book.title = title
            book.author = author
            book.genre = data.get("genre", book.genre).strip()
            book.description = data.get("description", book.description).strip()
            book.img = data.get("img", book.img).strip()
            book.link = data.get("link", book.link).strip()
            book.save()
            return JsonResponse({"status": "success", "message": "Book updated successfully!"}, status=200)
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
    """Retrieves registered platform users, with search + pagination."""
    query = request.query_params.get("q", "").strip()

    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        page = 1
    try:
        page_size = min(100, max(1, int(request.query_params.get("page_size", 20))))
    except ValueError:
        page_size = 20

    users_qs = User.objects.all().order_by("-date_joined")
    if query:
        users_qs = users_qs.filter(
            Q(username__icontains=query) | Q(email__icontains=query)
        )

    total = users_qs.count()
    start = (page - 1) * page_size
    users = list(
        users_qs[start:start + page_size].values(
            "id", "username", "email", "is_superuser", "is_staff", "date_joined"
        )
    )
    return JsonResponse(
        {"status": "success", "users": users, "total": total, "page": page, "page_size": page_size},
        status=200,
    )


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

    
class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def admin_toggle_staff(request, user_id):
    try:
        target_user = User.objects.get(id=user_id)

        if target_user == request.user:
            return JsonResponse(
                {"status": "error", "message": "You cannot change your own staff status."},
                status=400,
            )
        if target_user.is_superuser:
            return JsonResponse(
                {"status": "error", "message": "Superuser staff status cannot be changed here."},
                status=400,
            )

        is_granting = not target_user.is_staff  # this action would flip is_staff False -> True

        if not request.user.is_superuser and not is_granting:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Only a superuser can revoke staff access.",
                },
                status=403,
            )

        target_user.is_staff = not target_user.is_staff
        target_user.save(update_fields=["is_staff"])

        return JsonResponse(
            {
                "status": "success",
                "message": f"Staff access {'granted' if target_user.is_staff else 'revoked'}.",
                "is_staff": target_user.is_staff,
            },
            status=200,
        )
    except User.DoesNotExist:
        return JsonResponse({"status": "error", "message": "User not found."}, status=404)