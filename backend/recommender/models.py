from django.db import models

# Create your models here.
class Book(models.Model):
    
    isbn = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=500)

    def __str__(self):
        return self.title

class Wishlist(models.Model):
    user_id = models.IntegerField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('user_id', 'book')
    def __str__(self):
        return f"Wishlist for User {self.user_id} - Book: {self.book.title}"
    
class ReadBook(models.Model):
    user_id = models.IntegerField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
  
    class Meta:
        unique_together = ('user_id', 'book')
    def __str__(self):
        return f"Read Book for User {self.user_id} - Book: {self.book.title}"    
    
    