import { useState } from "react";
import BookTile from "./BookTile";
import RatingModal from "./RatingModal";
import api from "../api";

function RecommendedList({
  recommendations,
  setRecommendations,
  setwishlist,
  setreadbooks,
}) {
  const [ratingModalBook, setRatingModalBook] = useState(null);

  const handleMarkAsRead = (e, book) => {
    e.preventDefault();
    setRatingModalBook(book);
  };

  const handleWishlist = (e, book) => {
    e.preventDefault();
    api
      .post("/api/wishlist/", { isbn: book.isbn })
      .then((res) => {
        if (setwishlist) {
          setwishlist((prev) => [
            ...prev,
            {
              ...book,
              wishlist_id: res.data.id,
            },
          ]);
        }
        setRecommendations((prev) =>
          prev.map((b) =>
            b.isbn === book.isbn ? { ...b, is_wishlisted: true } : b,
          ),
        );
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleRatingSubmit = ({ rating, review }) => {
    api
      .post("/api/readbooks/", {
        isbn: ratingModalBook.isbn,
        rating,
        review,
      })
      .then((res) => {
        console.log(res.data);
        if (setreadbooks) {
          setreadbooks((prev) => [
            ...prev,
            {
              ...ratingModalBook,
              readbook_id: res.data.id,
              rating: res.data.rating,
              review: res.data.review,
            },
          ]);
        }
        setRecommendations((prev) =>
          prev.map((book) =>
            book.isbn === ratingModalBook.isbn
              ? { ...book, is_read: true }
              : book,
          ),
        );
      });
    setRatingModalBook(null);
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "20px",
        }}
      >
        {recommendations.map((book) => (
          <BookTile
            key={book.isbn}
            book={book}
            action1={
              book.is_read ? (
                <button
                  title="Mark as Read"
                  style={{ cursor: "pointer" }}
                  disabled={true}
                >
                  Marked as Read
                </button>
              ) : (
                <button
                  title="Mark as Read"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => handleMarkAsRead(e, book)}
                >
                  Mark as Read
                </button>
              )
            }
            action2={
              book.is_wishlisted ? (
                <button
                  title="Wishlist"
                  style={{ fontSize: "18px", cursor: "pointer" }}
                >
                  ❤️
                </button>
              ) : (
                <button
                  title="Wishlist"
                  style={{ color: "red", fontSize: "28px", cursor: "pointer" }}
                  onClick={(e) => handleWishlist(e, book)}
                >
                  ♡
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
    </>
  );
}

export default RecommendedList;
