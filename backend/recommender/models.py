from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, MinLengthValidator

class Book(models.Model):
    title = models.CharField(
        unique=True,
    )

    author = models.CharField(
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    genre = models.CharField(
        max_length=300,
        blank=True,
        default="",
    )

    img = models.URLField(
        blank=True,
        default="",
    )

    link = models.URLField(
        blank=True,
        default="",
    )

    class Meta:
        indexes = [
            models.Index(fields=["title"]),
        ]

    def __str__(self):
        return self.title
    
class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wishlists")
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'book')
    
class ReadBooks(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="readbooks")
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    rating = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ]
    )
    review = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "book")