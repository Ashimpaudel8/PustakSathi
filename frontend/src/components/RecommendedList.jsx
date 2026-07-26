import { useState, useEffect } from "react";
import BookTile from "./BookTile";
import RatingModal from "./RatingModal";
import LimitModal from "./LimitModal";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { usePageState } from "../context/PageStateContext";
import "../styles/components/RecommendedList.css"

function RecommendedList({
  recommendations,
  setRecommendations,
  setwishlist,
  setreadbooks
}) {
  const [ratingModalBook, setRatingModalBook] = useState(null);
  const { fetchUser } = useAuth();
  const { usePersistedState } = usePageState();
  const [, setCachedWishlist] = usePersistedState("wishlist.list", []);
  const [hasFetchedWishlist] = usePersistedState("wishlist.fetched", false);
  const [, setCachedReadBooks] = usePersistedState("readbooks.list", []);
  const [hasFetchedReadBooks] = usePersistedState("readbooks.fetched", false);
  const [limitReached, setLimitReached] = useState(false);

  const handleMarkAsRead = (e, book) => {
    e.preventDefault();
    setRatingModalBook(book);
  };

  const handleWishlist = (e, book) => {
    e.preventDefault();
    api
      .post("/api/wishlist/", { book_id: book.book_id })
      .then((res) => {
        const newWishlistEntry = { ...book, wishlist_id: res.data.id };
        if (setwishlist) {
          setwishlist((prev) => [...prev, newWishlistEntry]);
        } else if (hasFetchedWishlist) {
          setCachedWishlist((prev) => [...prev, newWishlistEntry]);
        }
        setRecommendations((prev) =>
          prev.map((b) =>
            b.book_id === book.book_id ? { ...b, is_wishlisted: true } : b,
          ),
        );
        fetchUser();
      })
      .catch((error) => {
        const data = error.response?.data
        if (data.code === "WISHLISTS_LIMIT_REACHED") {
          setLimitReached(true)
        }
      });
  };

  const handleRatingSubmit = ({ rating, review }) => {
    api
      .post("/api/readbooks/", {
        book_id: ratingModalBook.book_id,
        rating,
        review,
      })
      .then((res) => {
        const newReadBookEntry = {
          ...ratingModalBook,
          readbook_id: res.data.id,
          rating: res.data.rating,
          review: res.data.review,
        };
        if (setreadbooks) {
          setreadbooks((prev) => [...prev, newReadBookEntry]);
        } else if (hasFetchedReadBooks) {
          setCachedReadBooks((prev) => [...prev, newReadBookEntry]);
        }
        setRecommendations((prev) =>
          prev.map((book) =>
            book.book_id === ratingModalBook.book_id
              ? { ...book, is_read: true }
              : book,
          ),
        );
        fetchUser();
      }).catch((error) => {
        const data = error.response?.data
        if (data.code === "READBOOKS_LIMIT_REACHED") {
          setLimitReached(true)
        }
      });
    setRatingModalBook(null);
  };

  return (
    <>
      <div className="book-grid">
        {recommendations.map((book) => (
          <BookTile
            key={book.book_id}
            book={book}
            action1={
              book.is_read ? (
                <button
                  className="markedasread-btn"
                  title="Mark as Read"
                  disabled={true}
                >
                  <i className="fa-solid fa-book-bookmark"></i>
                  <i className="fa-solid fa-check"></i>
                  Marked as Read
                </button>
              ) : (
                <button
                  className="markasread-btn"
                  title="Mark as Read"
                  onClick={(e) => handleMarkAsRead(e, book)}
                >
                  <i className="fa-solid fa-book-bookmark"></i>
                  Mark as Read
                </button>
              )
            }
            action2={
              book.is_wishlisted ? (
                <button
                  className="wishlisted-btn"
                  title="Wishlist"
                >
                  <i className="fa-solid fa-heart"></i>
                </button>
              ) : (
                <button
                  className="wishlist-btn"
                  title="Wishlist"
                  onClick={(e) => handleWishlist(e, book)}
                >
                  <i className="fa-regular fa-heart"></i>
                </button>
              )
            }
          />
        ))}
      </div>

      {ratingModalBook && (
        <RatingModal
          book={ratingModalBook}
          onSubmit={handleRatingSubmit}
          onCancel={() => setRatingModalBook(null)}
        />
      )}
      {limitReached && (
        <LimitModal
          onCancel={() => { setLimitReached(false) }}
        />
      )}
    </>
  );
}

export default RecommendedList;