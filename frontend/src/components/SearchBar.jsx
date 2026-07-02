import { useEffect, useState } from "react";
import api from "../api";

function SearchBar() {
    const [search, setSearch] = useState("")
    const [books, setBooks] = useState([])

    useEffect(() => {

        const timer = setTimeout(() => {

            if (search.trim() === "") {
                setBooks([]);
                return;
            }

            api.get(`/api/books/search/?q=${search}`)
                .then((res) => { setBooks(res.data) });

        }, 500);

        return () => { clearTimeout(timer) }

    }, [search])

    return (
        <>
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div>
                {books.map((book) => (
                    <div key={book.id}>
                        {book.title}
                    </div>
                ))}
            </div>
        </>
    );
}

export default SearchBar;