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
from .serializers import UserSerializer, BookSerializer
from .models import Book
from django.http import JsonResponse
from rest_framework.permissions import IsAdminUser

from rest_framework.permissions import AllowAny, IsAuthenticated


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class ReadBookView(generics.ListAPIView):

    serializer_class = BookSerializer
    # permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

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
