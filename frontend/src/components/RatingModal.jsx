import { useState, useEffect } from "react";

function RatingModal({ book, onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({ rating, review });
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>Rate "{book.title}"</h3>

        <div style={{ fontSize: "28px", cursor: "pointer" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              {(hoverRating || rating) >= star ? "★" : "☆"}
            </span>
          ))}
        </div>

        <textarea
          placeholder="Write a review (optional)"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={230}
          rows={4}
          style={{ width: "100%", marginTop: "10px" }}
        />
        <div style={{ fontSize: "14px", textAlign: "right" }}>
          {review.length}/230
        </div>

        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button onClick={handleSubmit} disabled={rating === 0}>
            Submit
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};

export default RatingModal;
