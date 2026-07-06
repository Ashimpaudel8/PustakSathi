import React, { useEffect, useState } from "react";
import api from "../api";
import BookTile from "../components/BookTile";

function ReadBooks() {
  const [readBooks, setReadBooks] = useState([]);

  const handleDelete = (e, book) => {
    e.preventDefault();
    api.delete(`/api/readbooks/delete/${book.readbook_id}`).then((res) => {
      console.log("Delete Success!!", res.data);
      setReadBooks((prevBooks) => prevBooks.filter((b) => b.readbook_id !== book.readbook_id));
    })
    .catch((err)=> {
      console.log("Error encountered:", err)
    });
  };

  useEffect(() => {
    api
      .get("/api/readbooks/")
      .then((res) => {
        console.log("Fetched data:", res.data);
        setReadBooks(res.data.ReadBooks);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
      });
  }, []);

  return (
    <>
      <h1>Read Books :</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "20px",
        }}
      >
        {readBooks.map((book) => {
          return (
            <BookTile
              key={book.isbn}
              book={book}
              action={
                <button onClick={(e) => handleDelete(e, book)}>Delete</button>
              }
            />
          );
        })}
      </div>
    </>
  );
}

export default ReadBooks;
