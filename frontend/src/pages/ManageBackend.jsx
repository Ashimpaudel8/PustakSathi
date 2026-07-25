import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";

const API_BASE = "http://127.0.0.1:8000/api/admin-panel";
const PAGE_SIZE = 20;
const USER_PAGE_SIZE = 20;

const EMPTY_BOOK = { id: null, title: "", author: "", genre: "", description: "", img: "", link: "" };

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access")}`,
});

const ManageBackend = () => {
  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [totalUsers, setTotalUsers] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [isEditing, setIsEditing] = useState(false);
  const { theme } = useTheme();

  const totalPages = Math.max(1, Math.ceil(totalBooks / PAGE_SIZE));
  const totalUserPages = Math.max(1, Math.ceil(totalUsers / USER_PAGE_SIZE));

  const fetchBooks = useCallback(async (pageNum, query) => {
    const token = localStorage.getItem("access");
    if (!token) throw new Error("Unauthenticated: Token missing.");

    const params = new URLSearchParams({ page: pageNum, page_size: PAGE_SIZE });
    if (query) params.set("q", query);

    const res = await fetch(`${API_BASE}/books/?${params.toString()}`, { headers: getHeaders() });
    if (res.status === 403) throw new Error("Unauthorized: Superuser access authorization verification failed.");
    const data = await res.json();
    setBooks(data.books || []);
    setTotalBooks(data.total || 0);
  }, []);

  const fetchUsers = useCallback(async (pageNum, query) => {
    const params = new URLSearchParams({ page: pageNum, page_size: USER_PAGE_SIZE });
    if (query) params.set("q", query);

    const res = await fetch(`${API_BASE}/users/?${params.toString()}`, { headers: getHeaders() });
    if (res.status === 403) throw new Error("Unauthorized: Superuser access authorization verification failed.");
    const data = await res.json();
    setUsers(data.users || []);
    setTotalUsers(data.total || 0);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    const res = await fetch(`${API_BASE.replace("/admin-panel", "")}/user/me/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Could not verify your account.");
    const data = await res.json();
    setCurrentUser(data);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setError("");
      await Promise.all([fetchBooks(page, searchQuery), fetchUsers(userPage, userSearchQuery), fetchCurrentUser()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, userPage, userSearchQuery, fetchBooks, fetchUsers, fetchCurrentUser]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    setUserSearchQuery(userSearchInput.trim());
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    if (!bookForm.title.trim() || !bookForm.author.trim()) {
      alert("Title and Author are required.");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditing ? `${API_BASE}/books/${bookForm.id}/` : `${API_BASE}/books/`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(bookForm),
      });
      const resData = await res.json();

      if (res.ok) {
        setBookForm(EMPTY_BOOK);
        setIsEditing(false);
        await fetchBooks(page, searchQuery);
      } else {
        alert(resData.message || "Operation failed");
      }
    } catch (err) {
      alert(err.message || "Network error — check the backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (book) => {
    setIsEditing(true);
    setBookForm({ ...EMPTY_BOOK, ...book });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setBookForm(EMPTY_BOOK);
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    try {
      const res = await fetch(`${API_BASE}/books/${id}/`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Delete failed");
        return;
      }
      // if we deleted the last item on a page beyond page 1, step back a page
      const isLastItemOnPage = books.length === 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      setPage(nextPage);
      await fetchBooks(nextPage, searchQuery);
    } catch (err) {
      alert(err.message || "Network error");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Permanently purge this user account?")) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}/`, { method: "DELETE", headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Delete failed");
        return;
      }
      await fetchUsers(userPage, userSearchQuery);
    } catch (err) {
      alert(err.message || "Network error");
    }
  };

  const handleToggleStaff = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/toggle-staff/`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Operation failed");
        return;
      }
      await fetchUsers(userPage, userSearchQuery);
    } catch (err) {
      alert(err.message || "Network error");
    }
  };

  const themeStyles = `
    .mb-root {
      --bg: #f6f7fb;
      --bg-card: #ffffff;
      --bg-subtle: #fafbfd;
      --bg-subtle-2: #f8f9fc;
      --border: #e6e8f0;
      --border-soft: #eef0f6;
      --text: #1e2230;
      --text-strong: #14162b;
      --text-muted: #8b8fa3;
      --text-row-sub: #40435c;
      --accent: #4b4fd1;
      --accent-soft-bg: #eceefa;
      --danger: #dc2626;
      --danger-soft-bg: #fee2e2;
      --warn: #b45309;
      --purple-bg: #f3e8ff;
      --purple-text: #7e22ce;
      --blue-bg: #e0f2fe;
      --blue-text: #0369a1;

      padding: 32px;
      background: var(--bg);
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
      transition: background 0.2s, color 0.2s;
    }
    .mb-root.dark-theme {
      --bg: #14161f;
      --bg-card: #1c1f2b;
      --bg-subtle: #191b25;
      --bg-subtle-2: #20232f;
      --border: #2c2f3d;
      --border-soft: #262936;
      --text: #d8dae5;
      --text-strong: #f2f3f8;
      --text-muted: #7c8098;
      --text-row-sub: #9a9ebb;
      --accent: #8285f0;
      --accent-soft-bg: #262a4a;
      --danger: #f87171;
      --danger-soft-bg: #3a1f22;
      --warn: #f0b060;
      --purple-bg: #2e2340;
      --purple-text: #d4b3f7;
      --blue-bg: #1c3444;
      --blue-text: #7dd3fc;
    }
    .mb-status {
      padding: 60px 20px;
      text-align: center;
      font-size: 15px;
      color: var(--text-muted);
    }
    .mb-status--error {
      margin: 16px;
      background: var(--danger-soft-bg);
      color: var(--danger);
      border: 1px solid var(--danger);
      border-radius: 8px;
      padding: 14px 18px;
    }
    .mb-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }
    .mb-header h1 {
      font-size: 26px;
      font-weight: 700;
      margin: 0;
      color: var(--text-strong);
      letter-spacing: -0.02em;
    }
    .mb-header p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .mb-header code {
      background: var(--accent-soft-bg);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--accent);
    }
    .mb-theme-toggle {
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .mb-theme-toggle:hover { border-color: var(--accent); }
    .mb-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .mb-grid { grid-template-columns: 1fr; }
    }
    .mb-col { display: flex; flex-direction: column; gap: 20px; }
    .mb-card {
      background: var(--bg-card);
      border-radius: 10px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .mb-card-pad { padding: 20px; }
    .mb-card h2 {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 14px 0;
      color: var(--text-strong);
    }
    .mb-form { display: flex; flex-direction: column; gap: 10px; }
    .mb-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mb-input, .mb-textarea {
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      padding: 9px 11px;
      border-radius: 6px;
      font-size: 13.5px;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .mb-input::placeholder, .mb-textarea::placeholder { color: var(--text-muted); }
    .mb-input:focus, .mb-textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .mb-textarea { min-height: 70px; resize: vertical; }
    .mb-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .mb-btn {
      border: none;
      padding: 9px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .mb-btn:hover { opacity: 0.88; }
    .mb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .mb-btn--primary { background: var(--accent); color: #fff; }
    .mb-btn--muted { background: var(--accent-soft-bg); color: var(--text-row-sub); }
    .mb-btn--danger { background: var(--danger-soft-bg); color: var(--danger); }
    .mb-btn--ghost {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .mb-search-bar {
      display: flex;
      gap: 8px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--bg-subtle);
    }
    .mb-search-bar input {
      flex: 1;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13.5px;
    }
    .mb-list-head {
      padding: 12px 20px;
      background: var(--bg-subtle-2);
      font-weight: 700;
      font-size: 13px;
      color: var(--text-row-sub);
      border-bottom: 1px solid var(--border-soft);
      display: flex;
      justify-content: space-between;
    }
    .mb-list { max-height: 460px; overflow-y: auto; }
    .mb-row {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-soft);
    }
    .mb-row:hover { background: var(--bg-subtle); }
    .mb-row-title { font-weight: 600; font-size: 14px; margin: 0; color: var(--text-strong); }
    .mb-row-sub { font-size: 12px; color: var(--text-muted); margin: 3px 0 0 0; }
    .mb-row-actions { display: flex; gap: 14px; flex-shrink: 0; }
    .mb-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid var(--border-soft);
      font-size: 13px;
      color: var(--text-row-sub);
    }
    .mb-pagination button {
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      padding: 5px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12.5px;
    }
    .mb-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .mb-badge {
      font-size: 10px;
      background: var(--purple-bg);
      color: var(--purple-text);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
      margin-top: 5px;
    }
    .mb-empty { padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 13.5px; }
  `;

  if (loading) return <div className="mb-status mb-status--loading">Verifying administrative clearance…</div>;

  if (error) {
    const isDark = theme === "dark";
    return (
      <div className={`mb-unauthorized ${isDark ? "dark-theme" : ""}`}>
        <style>{`
          .mb-unauthorized {
            --ud-bg: #fef2f2;
            --ud-title: #991b1b;
            --ud-text: #7f1d1d;
            --ud-btn-bg: #dc2626;
            --ud-btn-text: #ffffff;

            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            background: var(--ud-bg);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            text-align: center;
            transition: background 0.2s;
          }
          .mb-unauthorized.dark-theme {
            --ud-bg: #1f1416;
            --ud-title: #f87171;
            --ud-text: #e0a8a8;
            --ud-btn-bg: #f87171;
            --ud-btn-text: #1f1416;
          }
          .mb-unauthorized h1 {
            font-size: 22px;
            color: var(--ud-title);
            margin: 0;
          }
          .mb-unauthorized p {
            font-size: 14px;
            color: var(--ud-text);
            max-width: 420px;
            margin: 0;
          }
          .mb-unauthorized button {
            margin-top: 8px;
            border: none;
            background: var(--ud-btn-bg);
            color: var(--ud-btn-text);
            padding: 10px 22px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
          }
          .mb-unauthorized button:hover { opacity: 0.9; }
        `}</style>
        <h1>🚫 Access Denied</h1>
        <p>{error}</p>
        <p>You don't have permission to view this page.</p>
        <button onClick={() => window.location.assign("/")}>Go back to the app</button>
      </div>
    );
  }

  return (
    <div className={`mb-root ${theme === "dark" ? "dark-theme" : ""}`}>
      <style>{themeStyles}</style>

      <header className="mb-header">
        <div>
          <h1>Book &amp; User Administration</h1>
        </div>
      </header>

      <div className="mb-grid">
        <div className="mb-col">
          <div className="mb-card mb-card-pad">
            <h2>{isEditing ? "Edit Book" : "Add New Book"}</h2>
            <form className="mb-form" onSubmit={handleSaveBook}>
              <div className="mb-form-row">
                <input
                  className="mb-input"
                  placeholder="Book Title *"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                />
                <input
                  className="mb-input"
                  placeholder="Author *"
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  required
                />
              </div>
              <div className="mb-form-row">
                <input
                  className="mb-input"
                  placeholder="Genre (optional)"
                  value={bookForm.genre}
                  onChange={(e) => setBookForm({ ...bookForm, genre: e.target.value })}
                />
                <input
                  className="mb-input"
                  placeholder="Cover image URL (optional)"
                  value={bookForm.img}
                  onChange={(e) => setBookForm({ ...bookForm, img: e.target.value })}
                />
              </div>
              <input
                className="mb-input"
                placeholder="Link (optional)"
                value={bookForm.link}
                onChange={(e) => setBookForm({ ...bookForm, link: e.target.value })}
              />
              <textarea
                className="mb-textarea"
                placeholder="Description (optional)"
                value={bookForm.description}
                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
              />
              <div className="mb-form-actions">
                {isEditing && (
                  <button type="button" className="mb-btn mb-btn--muted" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="mb-btn mb-btn--primary" disabled={submitting}>
                  {submitting ? "Saving…" : isEditing ? "Update Book" : "Add Book"}
                </button>
              </div>
            </form>
          </div>

          <div className="mb-card">
            <div className="mb-search-bar">
              <form onSubmit={handleSearchSubmit} style={{ display: "flex", flex: 1, gap: 8 }}>
                <input
                  placeholder="Search by title or author…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="mb-btn mb-btn--primary">Search</button>
                {searchQuery && (
                  <button
                    type="button"
                    className="mb-btn mb-btn--muted"
                    onClick={() => { setSearchInput(""); setSearchQuery(""); setPage(1); }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>
            <div className="mb-list-head">
              <span>Book Inventory</span>
              <span>{totalBooks} total</span>
            </div>
            <div className="mb-list">
              {books.length === 0 && <div className="mb-empty">No books match this search.</div>}
              {books.map((book) => (
                <div key={book.id} className="mb-row">
                  <div>
                    <p className="mb-row-title">{book.title}</p>
                    <p className="mb-row-sub">
                      By {book.author || "Unknown"} {book.genre ? `· ${book.genre}` : ""} · ID: {book.id}
                    </p>
                  </div>
                  <div className="mb-row-actions">
                    <button className="mb-btn--ghost" style={{ color: "var(--accent)" }} onClick={() => handleEditClick(book)}>
                      Edit
                    </button>
                    <button className="mb-btn--ghost" style={{ color: "var(--danger)" }} onClick={() => handleDeleteBook(book.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </div>
        </div>

        <div className="mb-card" style={{ height: "fit-content" }}>
          <div className="mb-search-bar">
            <form onSubmit={handleUserSearchSubmit} style={{ display: "flex", flex: 1, gap: 8 }}>
              <input
                placeholder="Search by username or email…"
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
              />
              <button type="submit" className="mb-btn mb-btn--primary">Search</button>
              {userSearchQuery && (
                <button
                  type="button"
                  className="mb-btn mb-btn--muted"
                  onClick={() => { setUserSearchInput(""); setUserSearchQuery(""); setUserPage(1); }}
                >
                  Clear
                </button>
              )}
            </form>
          </div>
          <div className="mb-list-head">
            <span>Registered Users</span>
            <span>{totalUsers} total</span>
          </div>
          <div className="mb-list" style={{ maxHeight: 460 }}>
            {users.map((user) => (
              <div key={user.id} className="mb-row">
                <div>
                  <p className="mb-row-title">{user.username}</p>
                  <p className="mb-row-sub">{user.email || "No email provided"}</p>
                  {user.is_superuser && <span className="mb-badge">ROOT</span>}
                  {!user.is_superuser && user.is_staff && (
                    <span className="mb-badge" style={{ background: "var(--blue-bg)", color: "var(--blue-text)" }}>STAFF</span>
                  )}
                </div>
                {!user.is_superuser && currentUser?.is_superuser && (
                  <div className="mb-row-actions">
                    <button
                      className="mb-btn--ghost"
                      style={{ color: user.is_staff ? "var(--warn)" : "var(--accent)" }}
                      onClick={() => handleToggleStaff(user)}
                    >
                      {user.is_staff ? "Revoke Staff" : "Make Staff"}
                    </button>
                    <button className="mb-btn mb-btn--danger" onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <div className="mb-empty">No users match this search.</div>}
          </div>
          <div className="mb-pagination">
            <button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>← Prev</button>
            <span>Page {userPage} of {totalUserPages}</span>
            <button disabled={userPage >= totalUserPages} onClick={() => setUserPage((p) => p + 1)}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageBackend;