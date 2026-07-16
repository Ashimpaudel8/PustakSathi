import { useEffect, useState, useRef } from "react";
import api from "../api";
import "../styles/components/SearchBar.css"

function SearchBar({ setRecommendations, focusSearch, setSingleBook, setIsDiscover }) {
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (focusSearch) {
      inputRef.current?.focus();
    }
  }, [focusSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setBooks([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [searchBy, setSearchBy] = useState("q");

  // Show suggestions only for title search
  const showSuggestions = searchBy === "q";

  const handleChange = (e) => {
    setSearch(e.target.value);
  };

  const skipNextFetch = useRef(false);

  const fetchSuggestions = () => {
    if (searchBy !== "q" || search.trim() === "") {
      setBooks([]);
      return;
    }

    api
      .get("/api/books/search/", { params: { [searchBy]: search } })
      .then((res) => setBooks(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (searchBy !== "q") {
      setBooks([]);
      return;
    }

    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const timer = setTimeout(fetchSuggestions, 500);

    return () => clearTimeout(timer);
  }, [search, searchBy]);

  const handleSearchClick = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;

    setBooks([]);
    skipNextFetch.current = true; // in case search state changes downstream

    try {
      const res = await api.get("/api/books/recommend/", {
        params: { [searchBy]: search },
      });
      setRecommendations(res.data.Recommendations);
      setSingleBook(res.data.single_book_detail);
      setIsDiscover(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookClick = async (title) => {
    skipNextFetch.current = true; // must be set BEFORE setSearch triggers the effect
    setSearch(title);
    setBooks([]);

    try {
      const res = await api.get("/api/books/recommend/", { params: { q: title } });
      setRecommendations(res.data.Recommendations);
      setSingleBook(res.data.single_book_detail);
      setIsDiscover(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="search-div">
      <div className="search-input-wrap" ref={searchContainerRef}>
        <input className="search-box"
          ref={inputRef}
          type="text"
          value={search}
          placeholder={
            searchBy === "q"
              ? "Prince of Ayodhya (The Ramayana, Book I)"
              : "0446530921"
          }
          onChange={handleChange}
          onFocus={fetchSuggestions}
        />

        {showSuggestions && books.length > 0 && (
          <div className="search-suggestions">
            {books.map((book) => (
              <div className="search-suggest"
                key={book.id}
                onClick={() => handleBookClick(book.title)}
              >
                {book.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSearchClick}
        className="search-button"
      >
        <i className="fa-solid fa-magnifying-glass"></i>
      </button>

      <select
        className="search-type-select"
        value={searchBy}
        onChange={(e) => {
          setSearchBy(e.target.value);
          setSearch("");
          setBooks([]);
        }}
      >
        <option value="q">Search by Title</option>
        <option value="i">Search by ISBN</option>
      </select>
    </div>
  );
}

export default SearchBar;