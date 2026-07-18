from django.contrib import admin
from .models import Book, ReadBooks, Wishlist
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from .recommender import rebuild_recommendation_data


class BookResource(resources.ModelResource):
    class Meta:
        model = Book
        import_id_fields = ["isbn"]   # adjust if isbn isn't your unique field
        skip_unchanged = True
        use_bulk = True                # bulk_create/bulk_update -> no per-row post_save fires
        batch_size = 500

    def after_import(self, dataset, result, **kwargs):
        # called once per import() call (preview + confirm = 2 calls total,
        # not once per row) — skip the dry_run/preview phase
        if not kwargs.get("dry_run", False):
            rebuild_recommendation_data()


@admin.register(Book)
class BookAdmin(ImportExportModelAdmin):
    resource_class = BookResource
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