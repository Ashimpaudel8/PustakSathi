import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from recommender.models import Book

class Command(BaseCommand):
    help = "Import books from csv"

    def handle(self, *args, **options):
        url = Path("C:/Users/Acer/Desktop/Project Beta/data/books_meta.csv")

        with open(url, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            books = []

            for row in reader:
                books.append(
                    Book(
                        isbn=row["ISBN"],
                        title=row["Title"]
                    )
                )

            Book.objects.bulk_create(books, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Books imported successfully!"))