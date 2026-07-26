from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, MinLengthValidator

class Book(models.Model):
    # CharField requires a max_length. 500 is usually safe for book titles.
    # If a title can be infinitely long, change this to models.TextField(unique=True)
    title = models.CharField(
        max_length=1000, 
        unique=True,
    )

    author = models.TextField(
        blank=True,
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    # Changed to TextField: No max limit
    genre = models.TextField(
        blank=True,
        default="",
    )

    # Changed to TextField: No max limit
    img = models.TextField(
        blank=True,
        default="",
    )

    # Changed to TextField: No max limit
    link = models.TextField(
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