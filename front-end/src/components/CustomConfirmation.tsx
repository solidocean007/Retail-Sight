import React from "react";
import "./customConfirmation.css";

interface CustomConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  message: string;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="custom-confirmation-backdrop">
      <div className="custom-confirmation-modal">
        <h3 className="custom-confirmation-title">Confirmation</h3>
        <p className="custom-confirmation-message">{message}</p>
        <div className="custom-confirmation-actions">
          <button className="custom-confirmation-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="custom-confirmation-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomConfirmation;

