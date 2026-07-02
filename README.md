# PustakSathi

A full-stack book recommendation and search app with a Django REST Framework backend and a React (Vite) frontend.

## Tech Stack

- **Backend:** Django, Django REST Framework, SimpleJWT
- **Frontend:** React (Vite)
- **Database:** SQLite (default, dev)

## Folder Structure

```
.
├── backend/          # Django REST Framework API
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React (Vite) app
│   ├── package.json
│   └── .env.example
└── README.md
```

## Setup Instructions

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```

Backend will be available at `http://127.0.0.1:8000/`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend will be available at `http://127.0.0.1:5173/`.

## Environment Variables

Both backend and frontend require a `.env` file. Copy the example files and fill in your own values.

**Backend** (`backend/.env`):

```bash
cp backend/.env.example backend/.env
```

Example contents:
```
SECRET_KEY=your-secret-key-here
DEBUG=True
```

**Frontend** (`frontend/.env`):

```bash
cp frontend/.env.example frontend/.env
```

Example contents:
```
VITE_API_URL=http://127.0.0.1:8000
```

## Running the Project Locally

1. Clone the repository
2. Set up the backend (see [Backend Setup](#backend-setup))
3. Set up the frontend (see [Frontend Setup](#frontend-setup))
4. Copy `.env.example` to `.env` in both `backend/` and `frontend/`
5. Start the backend server: `python manage.py runserver`
6. In a separate terminal, start the frontend: `npm run dev`
7. Open `http://127.0.0.1:5173/` in your browser

## API Example

**Search for books**

```
GET /api/books/search/?q=harry+potter
```

Example response:
```json
{
  "results": [
    { "title": "Harry Potter and the Sorcerer's Stone", "author": "J.K. Rowling" }
  ]
}
```

---

> **Note:** This is a first-commit README and will be expanded as the project grows.
