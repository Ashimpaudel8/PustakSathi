from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path("books/search/", views.ReadBookView.as_view(), name="search-recommend"),
    path("admin-panel/books/", views.admin_books_resource, name="admin_books"),
    path(
        "admin-panel/books/<int:book_id>/",
        views.admin_book_detail,
        name="admin_book_detail",
    ),
    path("admin-panel/users/", views.admin_get_all_users, name="admin_users"),
    path(
        "admin-panel/users/<int:user_id>/",
        views.admin_delete_user,
        name="admin_delete_user",
    ),
    path("books/recommend/", views.get_recommendation_view, name="books-recommend"),
    path("readbooks/", views.ReadBooksListCreate.as_view(), name="readbooks-list"),
    path("readbooks/delete/<int:pk>", views.ReadBooksDelete.as_view(), name="readbooks-delete"),
]
