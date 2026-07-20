import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import BookTile from "../components/BookTile";
import RecommendedList from "../components/RecommendedList";
import { useAuth } from "../context/AuthContext";
import { usePageState } from "../context/PageStateContext";
import RecommendationLoader from "../components/RecommendationLoader";
import "../styles/pages/ReadBooks.css"

function ReadBooks() {
  const { usePersistedState } = usePageState();
  const [readBooks, setReadBooks] = usePersistedState("readbooks.list", []);
  const [hasFetchedReadBooks, setHasFetchedReadBooks] = usePersistedState("readbooks.fetched", false);
  const [isReadBooksCollapsed, setIsReadBooksCollapsed] = usePersistedState("readbooks.isCollapsed", false);
  const [recommendations, setRecommendations] = usePersistedState("readbooks.recommendations", []);
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
      .delete(`/api/readbooks/delete/${book.readbook_id}/`)
      .then((res) => {
        setReadBooks((prevBooks) =>
          prevBooks.filter((b) => b.readbook_id !== book.readbook_id),
        );
        fetchUser();
      })
      .catch((err) => {
        console.log("Error encountered:", err);
      });
  };

  useEffect(() => {
    if (hasFetchedReadBooks) return;
    setIsLoading(true);
    api
      .get("/api/readbooks/")
      .then((res) => {
        setReadBooks(res.data.ReadBooks);
        setHasFetchedReadBooks(true);
      })
      .catch((err) => {
        console.error("Error fetching books:", err);
      })
      .finally(() => { setIsLoading(false) });
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
        .then((res) => {
          setRecommendations(res.data.Recommendations);
          setIsReadBooksCollapsed(true);
        })
        .finally(() => setIsRecommending(false));
    }, 2000); // Wait 1 second before calling the API

    return () => clearTimeout(handler);
  };

  return (
    <div className="readbooks-page">
      <div className={`readbooks-collapsible ${isReadBooksCollapsed ? "collapsed" : ""}`}>
        <button
          className="readbooks-toggle"
          onClick={() => setIsReadBooksCollapsed((prev) => !prev)}
        >
          <i className={`fa-solid fa-chevron-${isReadBooksCollapsed ? "down" : "up"}`}></i>
          Read Books {isReadBooksCollapsed && `(${readBooks.length})`}
        </button>

        {!isReadBooksCollapsed && (
          isLoading ? (
            <div>
              <RecommendationLoader />
            </div>
          ) : (
            <div className="readbooks-book-grid">
              {readBooks.map((book) => {
                return (
                  <BookTile
                    key={book.isbn}
                    book={book}
                    action1={
                      <div className="readbooks-btn-container">
                        <button
                          onClick={(e) => handleDelete(e, book)}
                          className="removereadbooks-btn"
                        >
                          <i class="fa-solid fa-trash-can"></i>
                          Delete
                        </button>
                      </div>
                    }
                  />
                );
              })}
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
          setreadbooks={setReadBooks}
          setRecommendations={setRecommendations}
        />}
    </div>
  );
}

export default ReadBooks;
