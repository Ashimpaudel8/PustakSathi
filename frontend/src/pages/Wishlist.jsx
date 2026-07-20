import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import BookTile from "../components/BookTile";
import RecommendedList from "../components/RecommendedList";
import { useAuth } from "../context/AuthContext";
import { usePageState } from "../context/PageStateContext";
import RecommendationLoader from "../components/RecommendationLoader";
import "../styles/pages/Wishlist.css"

function Wishlist() {
  const { usePersistedState } = usePageState();
  const [wishlist, setWishlist] = usePersistedState("wishlist.list", []);
  const [hasFetchedWishlist, setHasFetchedWishlist] = usePersistedState("wishlist.fetched", false);
  const [isWishlistCollapsed, setIsWishlistCollapsed] = usePersistedState("wishlist.isCollapsed", false);
  const [recommendations, setRecommendations] = usePersistedState("wishlist.recommendations", []);
  const [isRecommending, setIsRecommending] = useState(null);
  const [isLoading, setIsLoading] = useState(null);
  const { fetchUser } = useAuth();
  const loadingRef = useRef(null);

  useEffect(() => {
    if (isRecommending && loadingRef.current) {
      loadingRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isRecommending]);

  const handleDelete = (e, book) => {
    e.preventDefault();
    api
      .delete(`/api/wishlist/delete/${book.wishlist_id}/`)
      .then((res) => {
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
    setIsLoading(true);
    api.get("/api/wishlist/")
      .then((res) => {
        setWishlist(res.data.Wishlists);
        setHasFetchedWishlist(true);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
      })
      .finally(() => { setIsLoading(false) });
  };

  useEffect(() => {
    if (hasFetchedWishlist) return; // already loaded once this session
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
        .then((res) => {
          setRecommendations(res.data.Recommendations);
          setIsWishlistCollapsed(true);
        })
        .finally(() => setIsRecommending(false));
    }, 2000);

    return () => clearTimeout(handler);
  };

  return (
    <div className="wishlist-page">
      <div className={`wishlist-collapsible ${isWishlistCollapsed ? "collapsed" : ""}`}>
        <button
          className="wishlist-toggle"
          onClick={() => setIsWishlistCollapsed((prev) => !prev)}
        >
          <i className={`fa-solid fa-chevron-${isWishlistCollapsed ? "down" : "up"}`}></i>
          Wishlist {isWishlistCollapsed && `(${wishlist.length})`}
        </button>

        {!isWishlistCollapsed && (
          isLoading ? (
            <div>
              <RecommendationLoader />
            </div>
          ) : (
            <div className="wishlist-book-grid">
              {wishlist.map((book) => (
                <BookTile
                  key={book.isbn}
                  book={book}
                  action1={
                    <div className="wishlist-btn-container">
                      <button
                        onClick={(e) => handleDelete(e, book)}
                        className="removewishlist-btn"
                      >
                        <i className="fa-solid fa-heart-crack"></i>
                        Remove From Wishlist
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )
        )}
      </div>
      <h1>Recommended Books :</h1>
      <button
        className="get-recommend-btn"
        onClick={handleGetRecommendations}>Get Recommendations</button>
      {isRecommending ?
        <div ref={loadingRef}>
          <RecommendationLoader initialLoading={true} />
        </div>
        : <RecommendedList
          recommendations={recommendations}
          setwishlist={setWishlist}
          setRecommendations={setRecommendations}
        />}
    </div>
  );
}

export default Wishlist;