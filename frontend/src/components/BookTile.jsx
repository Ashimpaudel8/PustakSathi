

function BookTile({ book, action }) {
  return (
    <>
      <div
        style={{
          border: "1px solid black",
          padding: "10px",
        }}
      >
        {action}
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
        <div> Description : {book.description}</div>
      </div>
    </>
  );
}

export default BookTile;
