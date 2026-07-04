from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path("books/search/", views.ReadBookView.as_view(), name="search-recommend"),
    # Custom Superuser Admin workspace
    # Superuser Dashboard Panel Routing Target Endpoints
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
    # #jwt backendd
    # # JWT Default Login Route (Returns access & refresh tokens given a username + password)
    # path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # # JWT Refresh Route (Pass a refresh token here to get a brand new active access token)
    # path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # # Custom endpoints
    # path('auth/signup/', views.api_signup, name='api_signup'),
    # path('auth/status/', views.api_auth_status, name='api_auth_status'),
]
