import { useEffect, useState, useRef } from "react";
import api from "../api";

function SearchBar({ setRecommendations, focusSearch }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (focusSearch) {
      inputRef.current?.focus();
    }
  }, [focusSearch]);

  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleChange = (e) => {
    setShowSuggestions(true);
    setSearch(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() === "") {
        setBooks([]);
        return;
      }

      api
        .get(`/api/books/search/?q=${encodeURIComponent(search)}`)
        .then((res) => {
          setBooks(res.data);
        })
        .catch((err) => {
          console.error(err);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  const handleSearchClick = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get(
        `/api/books/recommend/?q=${encodeURIComponent(search)}`,
      );
      setRecommendations(res.data.Recommendations);
    } catch (err) {
      console.error(err)
    }
  };

  const handleBookClick = async (title) => {
    setShowSuggestions(false);
    setSearch(title);
    const res = await api.get(
      `/api/books/recommend/?q=${encodeURIComponent(title)}`,
    );
    setRecommendations(res.data.Recommendations);
  };

  return (
    <>
      <input 
      ref={inputRef}
      type="text" 
      value={search} 
      placeholder="Search to recommend.." 
      onChange={handleChange} />
      {showSuggestions && (
        <div>
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book.title)}
              style={{ cursor: "pointer" }}
            >
              {book.title}
            </div>
          ))}
        </div>
      )}
      <button onClick={handleSearchClick}>Search</button>
    </>
  );
}

export default SearchBar;
