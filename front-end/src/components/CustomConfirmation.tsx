import ReactDOM from "react-dom";
import React from "react";
import "./customConfirmation.css";

interface CustomConfirmationProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  title?: string;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  message = "Are you sure you want to proceed?",
  onConfirm,
  onClose,
  loading = false,
  title = "Confirm",
}) => {
  if (!isOpen) return null;

  // ✅ Mount into modal-root (defined in index.html)
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div className="custom-confirmation-backdrop">
      <div className="custom-confirmation-modal">
        <div className="custom-confirmation-title">{title}</div>
        <div className="custom-confirmation-message">{message}</div>

        <div className="custom-confirmation-actions">
          <button
            className="custom-confirmation-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="custom-confirmation-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <div className="custom-spinner" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default CustomConfirmation;
