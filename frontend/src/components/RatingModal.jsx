import { useState, useEffect } from "react";
import "../styles/components/RatingModal.css";

function RatingModal({ book, onSubmit, onCancel, initialRating = 0, initialReview = "", mode = "add" }) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState(initialReview);

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
    <div className="rating-modal-overlay">
      <div className="rating-modal">
        <h3 className="rating-modal-title">
          {mode === "edit" ? `Edit your rating for "${book.title}"` : `Rate "${book.title}"`}
        </h3>

        <div className="rating-modal-stars">
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
          className="rating-modal-textarea"
          placeholder="Write a review (optional)"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={230}
          rows={4}
        />
        <div className="rating-modal-charcount">
          {review.length}/230
        </div>

        <div className="rating-modal-actions">
          <button
            className="rating-modal-submit"
            onClick={handleSubmit}
            disabled={rating === 0}
          >
            {mode === "edit" ? "Save" : "Submit"}
          </button>
          <button className="rating-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default RatingModal;