import { useEffect, useState, useRef } from "react";
import api from "../api";
import "../styles/components/SearchBar.css";
import { usePageState } from "../context/PageStateContext";

function SearchBar({
  setRecommendations,
  setSingleBook,
  setIsDiscover,
  setIsRecommending,
  setIsError,
  search,
  setSearch, }) {

  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);


  useEffect(() => {
    const handleTouchMove = () => {
      if (
        isMobile &&
        inputRef.current === document.activeElement
      ) {
        inputRef.current.blur();
        setBooks([]);
      }
    };

    document.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isMobile]);

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { usePersistedState } = usePageState();
  const [books, setBooks] = useState([]);
  const [searchBy, setSearchBy] = usePersistedState("dashboard.searchBy", "q");

  const showSuggestions = searchBy === "q";

  const handleChange = (e) => {
    setSearch(e.target.value);
  };

  const handleMobileSearchOpen = () => {
    setMobileSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Clears the input field and drops suggestions instantly
  const handleClearSearch = () => {
    setSearch("");
    setBooks([]);
    inputRef.current?.focus();
  };

  const skipNextFetch = useRef(false);
  const isFirstRender = useRef(true);

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

    if (isFirstRender.current) {
      isFirstRender.current = false;
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
    skipNextFetch.current = true;

    try {
      setIsRecommending(true);
      setIsDiscover(false);
      setIsError(false);
      const res = await api.get("/api/books/recommend/", {
        params: { [searchBy]: search },
      });
      console.log(res.data.error);
      if (res.data.error) {
        setRecommendations([]);
        setIsError(true);
        setSingleBook(null)
        return;
      }
      setRecommendations(res.data.Recommendations);
      setSingleBook(res.data.single_book_detail);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecommending(false);
    }
  };

  const handleBookClick = async (title) => {
    skipNextFetch.current = true;
    setSearch(title);
    setBooks([]);

    try {
      setIsRecommending(true);
      setIsDiscover(false);
      setIsError(false);
      const res = await api.get("/api/books/recommend/", { params: { q: title } });
      setRecommendations(res.data.Recommendations);
      setSingleBook(res.data.single_book_detail);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <div className={`search-div ${mobileSearchOpen ? "mobile-expanded" : ""}`}>
      {isMobile && mobileSearchOpen && (
        <button
          type="button"
          className="mobile-search-close"
          onClick={() => setMobileSearchOpen(false)}
          aria-label="Close search"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
      )}

      {isMobile && (
        <button
          type="button"
          className="mobile-search-toggle"
          onClick={handleMobileSearchOpen}
          aria-label="Open search"
        >
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      )}

      <div className="search-input-wrap" ref={searchContainerRef}>
        <input
          className="search-box"
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchClick(e);
            }
          }}
        />

        {
          showSuggestions && books.length > 0 && (
            <div className="search-suggestions">
              {books.map((book) => (
                <div
                  className="search-suggest"
                  key={book.id}
                  onClick={() => handleBookClick(book.title)}
                >
                  {book.title}
                </div>
              ))}
            </div>
          )
        }

        {
          search.trim().length > 0 && (
            <button
              type="button"
              className="close-btn"
              onClick={handleClearSearch}
              aria-label="Clear search text"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )
        }
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
        <option value="q">{isMobile ? "Title" : "Search by Title"}</option>
        <option value="i">{isMobile ? "ISBN" : "Search by ISBN"}</option>
      </select>
    </div>
  );
}

export default SearchBar;