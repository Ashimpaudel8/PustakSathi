from django.contrib import admin
from .models import Book, ReadBooks, Wishlist
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from import_export.results import RowResult
from .recommender import sync_new_books, update_existing_books

class BookResource(resources.ModelResource):
    class Meta:
        model = Book
        # import_id_fields = ["title"]
        skip_unchanged = True
        use_bulk = True
        batch_size = 500

    def after_import(self, dataset, result, **kwargs):
        if kwargs.get("dry_run", False):
            return

        new_ids = [row.object_id for row in result.rows if row.import_type == RowResult.IMPORT_TYPE_NEW]
        updated_ids = [row.object_id for row in result.rows if row.import_type == RowResult.IMPORT_TYPE_UPDATE]

        if new_ids:
            sync_new_books()          # embeds + appends brand-new rows
        if updated_ids:
            update_existing_books(updated_ids)  # re-embeds only renamed/edited rows in place

@admin.register(Book)
class BookAdmin(ImportExportModelAdmin):
    resource_class = BookResource
    list_display = ("title", "author")
    search_fields = ("title", "author")

@admin.register(ReadBooks)
class ReadBooksAdmin(admin.ModelAdmin):
    list_display = ("user", "book")
    search_fields = ("user__username", "book__title")


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "book")
    search_fields = ("user__username", "book__title")