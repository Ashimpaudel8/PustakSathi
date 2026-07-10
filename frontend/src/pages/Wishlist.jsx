import React, { useEffect, useState } from "react";
import api from "../api";
import BookTile from "../components/BookTile";
import RecommendedList from "../components/RecommendedList";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isRecommending, setIsRecommending] = useState(null);
  const { fetchUser } = useAuth();

  const handleDelete = (e, book) => {
    e.preventDefault();
    api
      .delete(`/api/wishlist/delete/${book.wishlist_id}/`)
      .then((res) => {
        console.log("Delete Success!!", res.data);
        setWishlist((prevBooks) =>
          prevBooks.filter((b) => b.wishlist_id !== book.wishlist_id),
        );
        fetchUser();
      })
      .catch((err) => {
        console.log("Error encountered:", err);
      });
  };

  const fetchWishlist = () => {
    api
      .get("/api/wishlist/")
      .then((res) => {
        setWishlist(res.data.Wishlists);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
      });
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleGetRecommendations = (e) => {
    e.preventDefault();
    if (wishlist.length === 0) {
      setRecommendations([]);
      return;
    }

    const handler = setTimeout(() => {
      setIsRecommending(true);
      api
        .post("/api/wishlist/recommend/", { wishlists: wishlist })
        .then((res) => setRecommendations(res.data.Recommendations))
        .finally(() => setIsRecommending(false));
    }, 2000);

    return () => clearTimeout(handler);
  };

  return (
    <>
      <h1>Wishlists :</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "20px",
        }}
      >
        {wishlist.map((book) => {
          return (
            <BookTile
              key={book.isbn}
              book={book}
              action1={
                <button onClick={(e) => handleDelete(e, book)}>
                  Remove From Wishlist
                </button>
              }
            />
          );
        })}
      </div>
      <h1>Recommended Books :</h1>
      <button onClick={handleGetRecommendations}>Get Recommendations</button>
      <RecommendedList
        recommendations={recommendations}
        setwishlist={setWishlist}
        setRecommendations={setRecommendations}
      />
    </>
  );
}

export default Wishlist;
