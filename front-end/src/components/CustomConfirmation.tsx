// CustomConfirmation.tsx
import React from "react";
import "./customConfirmation.css";

interface CustomConfirmationProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  message,
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="custom-confirmation-backdrop">
      <div className="custom-confirmation-modal">
        <div className="custom-confirmation-title">Confirm Action</div>
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
    </div>
  );
};

export default CustomConfirmation;
