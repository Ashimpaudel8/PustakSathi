import "../styles/components/SingleBookDetail.css"
import defaultBookCover from "../assets/cover-not-available.png";

function SingleBookDetail({ book }) {
  return (
    <div className="singlebook-div">
      <div className="singleimg-div">
        <img
          src={
            book.thumbnail_url
              ? book.thumbnail_url
              : book.thumbnail_id
                ? `https://covers.openlibrary.org/b/id/${book.thumbnail_id}-M.jpg`
                : defaultBookCover
          }
          alt="Book Thumbnail"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultBookCover;
          }}
        />
      </div>

      <div className="singlebook-metadata">
        <p className="title">{book.title}</p>
        <p className="isbn">ISBN : {book.isbn}</p>
        <p className="detail">Authors : {book.authors.join(", ")}</p>
        <p className="detail">Publisher : {book.publisher}</p>
        <p className="detail">Published Date : {book.publishedDate}</p>
        <p className="detail">Categories : {book.categories.join(", ")}</p>
        <hr />
        <p className="description">Description</p>
        <p className="description-text">{book.description}</p>
      </div>
    </div>
  )
}

export default SingleBookDetail