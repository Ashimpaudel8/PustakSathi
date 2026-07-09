from django.contrib import admin
from .models import Book, ReadBooks, Wishlist

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "isbn")
    search_fields = ("title", "isbn")

@admin.register(ReadBooks)
class ReadBooksAdmin(admin.ModelAdmin):
    list_display = ("user", "book")
    search_fields = ("user__username", "book__title")

@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "book")
    search_fields = ("user__username", "book__title")