import csv
from django.core.management.base import BaseCommand
from recommender.models import Book
from recommender.recommender import rebuild_recommendation_data
from recommender.recommender import get_csv_path   # wherever you put get_csv_path above

class Command(BaseCommand):
    help = "Import books from csv"

    def handle(self, *args, **options):
        csv_path = get_csv_path()
        self.stdout.write(f"Importing from: {csv_path}")

        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                batch.append(Book(
                    title=row["title"], author=row["author"], description=row["description"],
                    genre=row["genre"], img=row["img"], link=row["link"],
                ))
                if len(batch) >= 1000:
                    Book.objects.bulk_create(batch, ignore_conflicts=True)
                    batch.clear()          # <-- free each batch instead of holding all 50,995 at once
            if batch:
                Book.objects.bulk_create(batch, ignore_conflicts=True)

        rebuild_recommendation_data()
        self.stdout.write(self.style.SUCCESS("Books imported successfully & pickle files regenerated!"))