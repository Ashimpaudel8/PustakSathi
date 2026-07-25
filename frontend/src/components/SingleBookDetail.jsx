import { useState } from "react";
import "../styles/components/SingleBookDetail.css"
import defaultBookCover from "../assets/cover-not-available.png";
import RatingModal from "./RatingModal";
import LimitModal from "./LimitModal";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { usePageState } from "../context/PageStateContext";

function SingleBookDetail({ book, setSingleBook }) {
  const [ratingModalBook, setRatingModalBook] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const { fetchUser } = useAuth();
  const { usePersistedState } = usePageState();
  const [, setCachedWishlist] = usePersistedState("wishlist.list", []);
  const [, setCachedReadBooks] = usePersistedState("readbooks.list", []);

  const handleMarkAsRead = (e) => {
    e.preventDefault();
    setRatingModalBook(book);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    api
      .post("/api/wishlist/", { book_id: book.book_id })
      .then((res) => {
        setCachedWishlist((prev) => [...prev, { ...book, wishlist_id: res.data.id }]);
        setSingleBook((prev) => ({ ...prev, is_wishlisted: true }));
        fetchUser();
      })
      .catch((error) => {
        const data = error.response?.data;
        if (data?.code === "WISHLISTS_LIMIT_REACHED") {
          setLimitReached(true);
        }
      });
  };

  const handleRatingSubmit = ({ rating, review }) => {
    api
      .post("/api/readbooks/", { book_id: ratingModalBook.book_id, rating, review })
      .then((res) => {
        setCachedReadBooks((prev) => [
          ...prev,
          { ...ratingModalBook, readbook_id: res.data.id, rating: res.data.rating, review: res.data.review },
        ]);
        setSingleBook((prev) => ({ ...prev, is_read: true }));
        fetchUser();
      })
      .catch((error) => {
        const data = error.response?.data;
        if (data?.code === "READBOOKS_LIMIT_REACHED") {
          setLimitReached(true);
        }
      });;
    setRatingModalBook(null);
  };

  return (
    <div className="singlebook-div">
      <div className="singleimg-div">
        <img
          src={
            book.thumbnail_url
              ? book.thumbnail_url
              : book.thumbnail_id
                ? `https://covers.openlibrary.org/b/id/${book.thumbnail_id}-L.jpg`
                : defaultBookCover
          }
          alt="Book Thumbnail"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultBookCover;
          }}
        />
      </div>

      <div className="singlebook-metadata">
        <div className="singlebook-buttons-container">
          {book.link && (
            <button
              className="link-visit-btn"
              onClick={() => window.open(book.link, "_blank", "noopener,noreferrer")}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              Visit
            </button>
          )}
          {book.is_read ? (
            <button className="markedasread-btn" title="Mark as Read" disabled={true}>
              <i className="fa-solid fa-book-bookmark"></i>
              <i className="fa-solid fa-check"></i>
              Marked as Read
            </button>
          ) : (
            <button className="markasread-btn" title="Mark as Read" onClick={handleMarkAsRead}>
              <i className="fa-solid fa-book-bookmark"></i>
              Mark as Read
            </button>
          )}

          {book.is_wishlisted ? (
            <button className="wishlisted-btn" title="Wishlist">
              <i className="fa-solid fa-heart"></i>
            </button>
          ) : (
            <button className="wishlist-btn" title="Wishlist" onClick={handleWishlist}>
              <i className="fa-regular fa-heart"></i>
            </button>
          )}
        </div>

        <p className="title">{book.title}</p>
        <p className="detail">
          Author(s):{" "}
          {book.authors.length > 1
            ? [...new Set(book.authors)].slice(0, 10).join(", ")
            : [...new Set(book.authors[0].split(","))].slice(0, 10).join(", ")}
          {(
            book.authors.length > 1
              ? [...new Set(book.authors)].length
              : [...new Set(book.authors[0].split(","))].length
          ) > 10 && ", ..."}
        </p>
        <p className="detail">
          Genre(s):{" "}
          {book.categories.length > 1
            ? [...new Set(book.categories)].slice(0, 8).join(", ")
            : [...new Set(book.categories[0].split(","))].slice(0, 8).join(", ")}
          {(
            book.categories.length > 1
              ? [...new Set(book.categories)].length
              : [...new Set(book.categories[0].split(","))].length
          ) > 8 && ", ..."}
        </p>
        <hr />
        <p className="description">Description</p>
        <p className="description-text">{book.description}</p>
      </div>

      {ratingModalBook && (
        <RatingModal
          book={ratingModalBook}
          onSubmit={handleRatingSubmit}
          onCancel={() => setRatingModalBook(null)}
        />
      )}
      {limitReached && (
        <LimitModal onCancel={() => setLimitReached(false)} />
      )}
    </div>
  )
}

export default SingleBookDetail;