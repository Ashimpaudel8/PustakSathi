import { useEffect } from "react";
import BookTile from "./BookTile";
import api from "../api";

function RecommendedList({ recommendations }) {
  const handleMarkAsRead = (e, book) => {
    e.preventDefault();
    api.post("/api/readbooks/", { isbn: book.isbn }).then((res) => {
      res.data;
    });
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
        {recommendations.map((book) => {
          return (
            <BookTile
              key={book.isbn}
              book={book}
              action={<button onClick={(e) => handleMarkAsRead(e, book)}>Mark as Read</button>}
            />
          );
        })}
      </div>
    </>
  );
}

export default RecommendedList;
