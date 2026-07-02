from django.db import models

# Create your models here.
class Book(models.Model):
    
    isbn = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=500)

    def __str__(self):
        return self.title