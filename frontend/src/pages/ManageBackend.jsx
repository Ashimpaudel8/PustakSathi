import React, { useEffect, useState } from "react";

const ManageBackend = () => {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Form States
  const [bookForm, setBookForm] = useState({
    id: null,
    title: "",
    author: "",
    isbn: "",
    description: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access");

      if (!token) {
        throw new Error("Unauthenticated: Token missing.");
      }

      // Build fresh context headers dynamically
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [booksRes, usersRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/admin-panel/books/", { headers }),
        fetch("http://127.0.0.1:8000/api/admin-panel/users/", { headers }),
      ]);

      if (booksRes.status === 403 || usersRes.status === 403) {
        throw new Error(
          "Unauthorized: Superuser access authorization verification failed.",
        );
      }

      const booksData = await booksRes.json();
      const usersData = await usersRes.json();

      setBooks(booksData.books || []);
      setUsers(usersData.users || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Book Form Handlers
  const handleSaveBook = async (e) => {
    e.preventDefault();
    const url = isEditing
      ? `http://127.0.0.1:8000/api/admin-panel/books/${bookForm.id}/`
      : "http://127.0.0.1:8000/api/admin-panel/books/";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(bookForm),
    });
    const resData = await res.json();

    if (res.ok) {
      setBookForm({
        id: null,
        title: "",
        author: "",
        isbn: "",
        description: "",
      });
      setIsEditing(false);
      fetchData();
    } else {
      alert(resData.message || "Operation failed");
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    await fetch(`http://127.0.0.1:8000/api/admin-panel/books/${id}/`, {
      method: "DELETE",
      headers,
    });
    fetchData();
  };

  // User Handlers
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Permanently purge this user account?")) return;
    const res = await fetch(
      `http://127.0.0.1:8000/api/admin-panel/users/${id}/`,
      { method: "DELETE", headers },
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.message);
    }
    fetchData();
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">
        Verifying Administrative Clearance Contexts...
      </div>
    );
  if (error)
    return (
      <div className="p-6 m-4 bg-red-100 text-red-800 rounded-md border border-red-200">
        {error}
      </div>
    );
  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: "30px",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "15px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "#111827",
            margin: 0,
          }}
        >
          Custom System Administration Matrix
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "5px" }}>
          Route Context: <code>/manage/backend</code>
        </p>
      </header>

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px" }}
      >
        {/* Left Side: Book Form and Book List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Book Form Box */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 2px rgba(0,0,0,0,05)",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "15px",
                color: "#1f2937",
              }}
            >
              {isEditing ? "📝 Edit Book Parameters" : "➕ Add New Book Entry"}
            </h2>
            <form
              onSubmit={handleSaveBook}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <input
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                  placeholder="Book Title"
                  value={bookForm.title}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, title: e.target.value })
                  }
                  required
                />
                <input
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                  placeholder="Author Name"
                  value={bookForm.author}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, author: e.target.value })
                  }
                  required
                />
                <input
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                  placeholder="Unique ISBN Key"
                  value={bookForm.isbn}
                  onChange={(e) =>
                    setBookForm({ ...bookForm, isbn: e.target.value })
                  }
                  required
                />
              </div>
              <textarea
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  borderRadius: "4px",
                  height: "80px",
                }}
                placeholder="Book Description Synthesis..."
                value={bookForm.description}
                onChange={(e) =>
                  setBookForm({ ...bookForm, description: e.target.value })
                }
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setBookForm({
                        id: null,
                        title: "",
                        author: "",
                        isbn: "",
                        description: "",
                      });
                    }}
                    style={{
                      backgroundColor: "#e5e7eb",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Update Data" : "Save Record"}
                </button>
              </div>
            </form>
          </div>

          {/* Book List Box */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f3f4f6",
                fontWeight: "bold",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "14px",
              }}
            >
              Active Book Data Inventory (Recent Submissions)
            </div>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {books.map((book) => (
                <div
                  key={book.id}
                  style={{
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {book.title}
                    </p>
                    <p
                      style={{
                        margin: "3px 0 0 0",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      By {book.author} | ISBN: {book.isbn}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setBookForm(book);
                      }}
                      style={{
                        color: "#4f46e5",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      style={{
                        color: "#ef4444",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: User List Sidebar */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            height: "fit-content",
          }}
        >
          <div
            style={{
              padding: "12px",
              backgroundColor: "#f3f4f6",
              fontWeight: "bold",
              borderBottom: "1px solid #e5e7eb",
              fontSize: "14px",
            }}
          >
            Registered User Account Matrix
          </div>
          <div style={{ maxHeight: "530px", overflowY: "auto" }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  padding: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                <div>
                  <p
                    style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}
                  >
                    {user.username}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0 0",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    {user.email || "No Email Provided"}
                  </p>
                  {user.is_superuser && (
                    <span
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#f3e8ff",
                        color: "#7e22ce",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "bold",
                        display: "inline-block",
                        marginTop: "5px",
                      }}
                    >
                      ROOT
                    </span>
                  )}
                </div>
                {!user.is_superuser && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    style={{
                      backgroundColor: "#fee2e2",
                      color: "#ef4444",
                      border: "1px solid #fca5a5",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Delete User
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageBackend;
