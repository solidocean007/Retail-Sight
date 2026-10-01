import React, { useEffect } from "react";
import ReactDOM from "react-dom";

import "./customConfirmation.css";

interface CustomConfirmationProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  title?: string;
  confirmLabel?: string;
  tone?: "default" | "warning" | "danger";
  error?: string | null;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  message = "Are you sure you want to proceed?",
  onConfirm,
  onClose,
  loading = false,
  title = "Confirm",
  confirmLabel = "Confirm",
  tone = "default",
  error = null,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // ✅ Mount into modal-root (defined in index.html)
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div
      className="custom-confirmation-backdrop"
      onMouseDown={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className={`custom-confirmation-modal custom-confirmation-modal--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="custom-confirmation-title"
        aria-describedby="custom-confirmation-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="custom-confirmation-close"
          aria-label="Close confirmation"
          onClick={onClose}
          disabled={loading}
        >
          ×
        </button>
        <div className="custom-confirmation-eyebrow">Please confirm</div>
        <div
          id="custom-confirmation-title"
          className="custom-confirmation-title"
        >
          {title}
        </div>
        <div
          id="custom-confirmation-message"
          className="custom-confirmation-message"
        >
          {message}
        </div>
        {error && (
          <div className="custom-confirmation-error" role="alert">
            {error}
          </div>
        )}

        <div className="custom-confirmation-actions">
          <button
            type="button"
            className="custom-confirmation-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="custom-confirmation-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="custom-confirmation-loading">
                <span className="custom-spinner" />
                Working…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    modalRoot,
  );
};

export default CustomConfirmation;
