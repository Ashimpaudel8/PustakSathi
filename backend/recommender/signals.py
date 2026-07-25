from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Book
from .recommender import sync_new_books, update_existing_books, remove_books_from_index

@receiver(post_save, sender=Book)
def on_book_saved(sender, instance, created, **kwargs):
    # Only run the sync if it's a NEW book/Edited book, to save time on simple edits
    if created:
        sync_new_books()

    else:
        update_existing_books([instance.id])

@receiver(post_delete, sender=Book)
def on_book_deleted(sender, instance, **kwargs):
    remove_books_from_index([instance.id])