from django.contrib import admin
from django.conf import settings
from .models import Book, ReadBooks, Wishlist
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from import_export.results import RowResult
from .recommender import sync_new_books, update_existing_books, rebuild_recommendation_data

class BookResource(resources.ModelResource):
    class Meta:
        model = Book
        skip_unchanged = True
        use_bulk = True
        batch_size = 500

    def after_import(self, dataset, result, **kwargs):
        if kwargs.get("dry_run", False):
            return

        new_ids = [row.object_id for row in result.rows if row.import_type == RowResult.IMPORT_TYPE_NEW]
        updated_ids = [row.object_id for row in result.rows if row.import_type == RowResult.IMPORT_TYPE_UPDATE]

        if not new_ids and not updated_ids:
            return

        embedding_model = getattr(settings, "RECOMMENDER_EMBEDDING_MODEL", "e5")

        if embedding_model == "tfidf":
            # tfidf always needs a full refit anyway -- do it once here
            rebuild_recommendation_data()
        else:
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