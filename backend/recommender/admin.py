from django.contrib import admin
from .models import Book, Wishlist, ReadBooks

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "isbn")
    search_fields = ("title", "isbn")

admin.site.register(Wishlist)
admin.site.register(ReadBooks)