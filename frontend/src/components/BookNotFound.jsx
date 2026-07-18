import React from 'react';
import '../styles/components/BookNotFound.css';

const BookNotFound = ({ search = "" }) => {
    return (
        <div className="book-not-found-container">
            <div className="bnf-icon">📚🔍</div>

            <h2 className="bnf-title">We couldn't find that book</h2>

            <p className="bnf-description">
                Sorry, we couldn't find any matches in our database
                {search ? ` for "${search}"` : ""}. The book might be unavailable in the database.
            </p>

            <div className="bnf-suggestions-box">
                <h3>Here are a few things you can try:</h3>
                <ul className="bnf-suggestions">
                    <li>Double-check the spelling of the title or author's name.</li>
                    <li>Try using fewer or more general keywords.</li>
                    <li>Search by ISBN for an exact match.</li>
                </ul>
            </div>
        </div>
    );
};

export default BookNotFound;