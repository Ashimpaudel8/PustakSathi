function BookTile({ book, action1, action2 }) {
  return (
    <>
      <div
        style={{
          border: "1px solid black",
          padding: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          {action1}
          {action2}
        </div>
        <img
          src={
            book.thumbnail_url
              ? book.thumbnail_url
              : `https://covers.openlibrary.org/b/id/${book.thumbnail_id}-M.jpg`
          }
          alt="Book Thumbnail"
        />

        <div> Title : {book.title}</div>
        <div> Authors : {book.authors.join(", ")}</div>
        <div> Publisher : {book.publisher}</div>
        <div> Published Date : {book.publishedDate}</div>
        <div> Categories : {book.categories.join(", ")}</div>
        {book.rating && (
          <>
            <hr />
            <div> Your Rating : {book.rating}</div>
            <div> Your Review : {book.review || "N/A"}</div>
          </>
        )}
      </div>
    </>
  );
}

export default BookTile;