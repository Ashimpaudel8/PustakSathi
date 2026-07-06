import csv
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parents[4]
csv_path = BASE_DIR / "data" / "books_meta.csv"

from django.core.management.base import BaseCommand
from recommender.models import Book
from recommender.recommender import rebuild_recommendation_data

class Command(BaseCommand):
    help = "Import books from csv"

    def handle(self, *args, **options):
        url = Path(csv_path)

        with open(url, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            books = []

            for row in reader:
                books.append(
                    Book(
                        isbn=row["ISBN"],
                        title=row["Title"],
                        author = row["Author"],
                        description = row["Blurb"]
                    )
                )

            Book.objects.bulk_create(books, ignore_conflicts=True)

        rebuild_recommendation_data()
        self.stdout.write(self.style.SUCCESS("Books imported successfully & pickle files regenerated!"))