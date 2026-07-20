import React, { useEffect } from "react";
import "../styles/components/LimitModal.css";

function LimitModal({ onCancel }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  return (
    <div className="limit-modal-overlay" onClick={onCancel}>
      <div
        className="limit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="limit-modal-icon">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 id="limit-modal-title" className="limit-modal-title">
          Book Limit Reached
        </h2>

        <p className="limit-modal-message">
          You've reached the maximum of <strong>30 books</strong>.
          Please remove an existing book before adding a new one.
        </p>

        <div className="limit-modal-actions">
          <button
            className="limit-modal-cancel"
            onClick={onCancel}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default LimitModal;