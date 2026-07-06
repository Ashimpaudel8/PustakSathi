from django.urls import path
from . import views

urlpatterns = [
    path("books/search/", views.ReadBookView.as_view(), name="search-recommend"),
    path("books/recommend/", views.get_recommendation_view, name="books-recommend"),
    path("readbooks/", views.ReadBooksListCreate.as_view(), name="readbooks-list"),
    path("readbooks/delete/<int:pk>", views.ReadBooksDelete.as_view(), name="readbooks-delete"),
]
