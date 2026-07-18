from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, MinLengthValidator

class Book(models.Model):
    
    isbn = models.CharField(
        max_length=13,
        unique=True,
        validators=[
            MinLengthValidator(10, message="ISBN must be min 10 digits."),
            RegexValidator(
                regex=r'^\d+$',
                message="ISBN must contain digits only."
            )
        ]
        )
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=200)
    description = models.TextField(
        validators=[
            MinLengthValidator(20, message="Description must be at least 20 characters long.")
        ]
    )

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