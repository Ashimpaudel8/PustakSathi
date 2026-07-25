import csv
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parents[3]
csv_path = BASE_DIR / "data" / "books_meta.csv"

from django.core.management.base import BaseCommand
from recommender.models import Book
from recommender.recommender import rebuild_recommendation_data

class Command(BaseCommand):
    help = "Import books from csv"

    def handle(self, *args, **options):
        url = Path(csv_path)

        with open(url, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            books = []

            for row in reader:
                books.append(
                    Book(
                        title=row["title"],
                        author=row["author"],
                        description=row["description"],
                        genre=row["genre"],
                        img=row["img"],
                        link=row["link"],
                    )
                )

            Book.objects.bulk_create(books, batch_size=1000, ignore_conflicts=True)

        # Builds the embedding pickles straight from books_meta.csv (title,
        # description, genre, author)
        rebuild_recommendation_data()
        self.stdout.write(self.style.SUCCESS("Books imported successfully & pickle files regenerated!"))