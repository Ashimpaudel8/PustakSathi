# PustakSathi - Book Recommendation Web App

PustakSathi is a full-stack book recommendation and tracking app built as a minor project. Users can search for books, mark books as read with a rating, save books to a wishlist, and get personalized recommendations based on their reading history and wishlist — powered by a content-based recommender running on book titles, authors, descriptions, and genres.

## Features

- User registration and JWT-based authentication
- Search books by title
- Mark books as read, with a 1-5 rating and optional review
- Add/remove books to a wishlist
- Personalized recommendations from read books and wishlist
- A "discover" feed of books to browse
- Admin panel for managing books and users
- Content-based recommender with two switchable modes:
  - **TF-IDF** (lightweight, deployed on Render)
  - **E5 sentence embeddings** (heavier, meant for local/dev use)

## Tech Stack

**Frontend**
- React 19 + Vite
- React Router for routing
- Axios for API calls
- Plain CSS (no UI framework)

**Backend**
- Django 5 + Django REST Framework
- Simple JWT for authentication
- PostgreSQL (via `dj-database-url`, works with services like Neon)
- Redis for caching (`django-redis`)
- scikit-learn / NLTK for the TF-IDF recommender
- sentence-transformers (optional, local dev only) for the E5 recommender
- Gunicorn + WhiteNoise for deployment

## Project Structure

```
PustakSathi/
├── backend/
│   ├── backend/          # Django project settings, urls, wsgi/asgi
│   ├── recommender/      # Main app: models, views, serializers, recommender logic
│   ├── data/             # CSV datasets used to seed the book catalog
│   ├── requirements.txt          # Base deps (TF-IDF only, used on Render)
│   ├── requirements-local.txt    # Adds sentence-transformers/torch for E5 mode locally
│   └── manage.py
└── frontend/
    ├── src/
    │   ├── pages/         # Route-level pages (Home, Dashboard, Login, etc.)
    │   ├── components/    # Reusable UI components
    │   ├── context/        # Auth, theme, and page-state React contexts
    │   └── api.js          # Axios instance / API calls
    └── package.json
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- A PostgreSQL database (or any DB supported by `dj-database-url`)
- Redis (optional locally — used for caching)

### 1. Clone the repo

```bash
git clone https://github.com/prabin-panthi/PustakSathi
cd PustakSathi
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
# For the E5 recommender locally (optional, heavier):
# pip install -r requirements-local.txt

cp .env.example .env
# then fill in .env with real values (see below)


python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

**`.env` variables:**

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key |
| `GOOGLE_BOOKS_API_KEY` | Used for looking up book covers/details via the Google Books API |
| `DEBUG` | `True` for local development |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string (caching) |

### 3. Load book data

The `data/` folder holds CSV datasets (`tfidf` and `e5` variants) used to seed the `Book` table.

```bash
python manage.py import_books
```

This bulk-imports the books and generates the recommender's pickle files. Which recommender is used is controlled by `RECOMMENDER_EMBEDDING_MODEL` in `settings.py` (`"tfidf"` or `"e5"`).

> **Check `backend/backend/settings.py` before running.** A few things in there may need to be changed depending on your setup:
> - `RECOMMENDER_EMBEDDING_MODEL` — set to `"tfidf"` (lightweight, no `torch` needed) or `"e5"` (needs `requirements-local.txt` installed). Make sure this matches which CSV you imported from `data/`.
> - `HF_OFFLINE_MODE` — relevant only for `"e5"` mode; toggle depending on whether you want Hugging Face model downloads allowed.
> - `DEBUG`, `ALLOWED_HOSTS` — should already be picked up from `.env`, but double check if you're deploying somewhere other than Render.
> - Database/cache settings — confirm they match your local Postgres/Redis instead of the deployed ones.

### 4. Run the backend

```bash
python manage.py runserver
```

API will be available at `http://127.0.0.1:8000/`.

### 5. Frontend setup

```bash
cd ../frontend
npm install

cp .env.example .env
# set VITE_API_URL to your backend URL, e.g. http://127.0.0.1:8000

npm run dev
```

Frontend will be available at `http://localhost:5173/` by default.

## Recommender Notes

- **TF-IDF mode** (`RECOMMENDER_EMBEDDING_MODEL = "tfidf"`) hashes title/description/genre text with `HashingVectorizer` + `TfidfTransformer` and ranks by cosine similarity. This is the mode used in production (Render) since it doesn't need `torch`/`sentence-transformers`, keeping the deployed footprint small.
- **E5 mode** uses sentence-transformer embeddings for potentially richer recommendations, but pulls in `torch` and is intended for local experimentation (`requirements-local.txt`), not the current deployment.

## Deployment

- **Backend** is deployed on [Render](https://render.com) with Gunicorn, using the base `requirements.txt` (TF-IDF only).
- **Database** runs on [Neon](https://neon.tech) (serverless Postgres).
- **Frontend** is deployed to [Render](https://render.com) static host.

## Contributors

This is a group minor project built by our college team as part of our coursework.

### Team Members

- **Ashim Paudel**
- **Prabin Panthi**
- **Gaurab Shrestha**
- **Sujeet Paudel**

## License

This project was built for academic purposes as part of a college minor project.