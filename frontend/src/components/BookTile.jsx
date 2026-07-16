import { useNavigate } from "react-router-dom";
import "../styles/components/BookTile.css"
import defaultBookCover from "../assets/cover-not-available.png";

function BookTile({ book, action1, action2 }) {
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
                  ? `https://covers.openlibrary.org/b/id/${book.thumbnail_id}-M.jpg`
                  : defaultBookCover
            }
            alt="Book Thumbnail"
          />
        </div>

        <h3>{book.title}</h3>

        <div className="metadata-div">
          <p>
            <span className="label">Authors :</span>
            <span className="value">{book.authors.join(", ")}</span>
          </p>

          <p>
            <span className="label">Publisher :</span>
            <span className="value">{book.publisher}</span>
          </p>

          <p>
            <span className="label">Published Date :</span>
            <span className="value">{book.publishedDate}</span>
          </p>

          <p>
            <span className="label">Categories :</span>
            <span className="value">{book.categories.join(", ")}</span>
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