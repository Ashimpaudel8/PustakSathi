import { useEffect, useState } from "react";
import api from "../api";

function SearchBar({ setRecommendations }) {
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

            api.get(`/api/books/search/?q=${encodeURIComponent(search)}`)
                .then((res) => { setBooks(res.data) });

        }, 500);

        return () => { clearTimeout(timer); }

    }, [search])

    const handleSearchClick = async (e) => {
        e.preventDefault()
        const res = await api.get(`/api/books/recommend/?q=${encodeURIComponent(search)}`)
        setRecommendations(res.data.Recommendations)
    }

    const handleBookClick = async (title) => {
        setShowSuggestions(false);
        setSearch(title);
        const res = await api.get(`/api/books/recommend/?q=${encodeURIComponent(title)}`)
        setRecommendations(res.data.Recommendations)
    }

    return (
        <>
            <input
                type="text"
                value={search}
                onChange={handleChange}
            />

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
            )
            }
            <button onClick={handleSearchClick}>Search</button>
        </>
    );
}

export default SearchBar;