from django.urls import path
from . import views

urlpatterns = [
    path("books/search/", views.ReadBookView.as_view(), name="search-recommend")
]
