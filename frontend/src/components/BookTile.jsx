import { useNavigate } from "react-router-dom";
import "../styles/components/BookTile.css"
import defaultBookCover from "../assets/cover-not-available.png";

function BookTile({ book, action1, action2 }) {
  console.log(book.categories);
  console.log(typeof book.categories);
  console.log(Array.isArray(book.categories));
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate("/dashboard", {
      state: {
        openTitle: book.title,
      },
    });
  };

  return (
    <>
      <div className="tile-div">
        <div className="tile-buttons-container">
          {action1}
          {action2}
        </div>
        <div className="img-div">
          <button className="open-btn" onClick={handleOpen}>
            <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
          </button>
          <img
            src={
              book.thumbnail_url
                ? book.thumbnail_url
                : book.thumbnail_id
                  ? `https://covers.openlibrary.org/b/id/${book.thumbnail_id}-L.jpg`
                  : defaultBookCover
            }
            alt="Book Thumbnail"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.target.onerror = null; // prevent infinite loop
              e.target.src = defaultBookCover;
            }}
          />
        </div>

        <h3>{book.title}</h3>

        <div className="metadata-div">
          <p>
            <span className="label">Author(s) :</span>
            <span className="value">
              {!book.authors?.length
                ? "N/A"
                : (() => {
                  const authors = [
                    ...new Set(
                      book.authors.length > 1
                        ? book.authors
                        : book.authors[0].split(",")
                    ),
                  ];

                  return (
                    authors.slice(0, 3).join(", ") +
                    (authors.length > 3 ? "..." : "")
                  );
                })()}
            </span>
          </p>

          <p>
            <span className="label">Genre(s) :</span>
            <span className="value">
              {!book.categories?.length
                ? "N/A"
                : book.categories.length > 1
                  ? [...new Set(book.categories)].slice(0, 3).join(", ")
                  : [...new Set(book.categories[0].split(","))].slice(0, 3).join(", ")}
            </span>
          </p>
        </div>

        {book.rating && (
          <div className="book-tile-readbooks-section">
            <hr />
            <p>
              <span className="label">Your Rating : </span>
              <span className="readbooks-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star}>
                    {(book.rating) >= star ? "★" : "☆"}
                  </span>
                ))}
              </span>
            </p>

            <p>
              <span className="label">Your Review : </span>
              <span className="value">{book.review || "N/A"}</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default BookTile;