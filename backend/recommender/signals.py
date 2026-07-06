from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Book
from .recommender import rebuild_recommendation_data

@receiver(post_save, sender=Book)
def on_book_saved(sender, instance, created, **kwargs):
    rebuild_recommendation_data()