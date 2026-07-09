import React, { useEffect, useState } from "react";
import api from "../api";
import BookTile from "../components/BookTile";
import RecommendedList from "../components/RecommendedList";
import { Link } from "react-router-dom";

function ReadBooks() {
  const [readBooks, setReadBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isRecommending, setIsRecommending] = useState(null);

  const handleDelete = (e, book) => {
    e.preventDefault();
    api
      .delete(`/api/readbooks/delete/${book.readbook_id}/`)
      .then((res) => {
        console.log("Delete Success!!", res.data);
        setReadBooks((prevBooks) =>
          prevBooks.filter((b) => b.readbook_id !== book.readbook_id),
        );
      })
      .catch((err) => {
        console.log("Error encountered:", err);
      });
  };

  useEffect(() => {
    api
      .get("/api/readbooks/")
      .then((res) => {
        setReadBooks(res.data.ReadBooks);
        console.log(res.data.ReadBooks);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
      });
  }, []);

  const handleGetRecommendations = (e) => {
    e.preventDefault();
    if (readBooks.length === 0) {
      setRecommendations([]);
      return;
    }

    const handler = setTimeout(() => {
      setIsRecommending(true);
      api
        .post("/api/readbooks/recommend/", { readbooks: readBooks })
        .then((res) => setRecommendations(res.data.Recommendations))
        .finally(() => setIsRecommending(false));
    }, 2000); // Wait 1 second before calling the API

    return () => clearTimeout(handler);
  };

  return (
    <>
      <Link to="/wishlist">Wishlist</Link>
      <br />
      <br />
      <Link to="/dashboard">Dashboard</Link>
      <br />
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
              action1={
                <button onClick={(e) => handleDelete(e, book)}>Delete</button>
              }
            />
          );
        })}
      </div>
      <h1>Recommended Books :</h1>
      <button onClick={handleGetRecommendations}>Get Recommendations</button>
      <RecommendedList
        recommendations={recommendations}
        setreadbooks={setReadBooks}
        recommendations={recommendations}
        setRecommendations={setRecommendations}
      />
    </>
  );
}

export default ReadBooks;
