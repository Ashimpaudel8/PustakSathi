from django.contrib import admin
# Register your models here.
from .models import Book, Wishlist, ReadBook


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "isbn")
    search_fields = ("title", "isbn")


admin.site.register(Wishlist)
admin.site.register(ReadBook)
