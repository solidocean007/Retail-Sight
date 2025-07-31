import React from "react";
import ReactDOM from "react-dom";
import "../customConfirmation.css";
import "./goalChangeConfirmation.css";

interface GoalChangeConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: () => void;
  onDuplicate: () => void;
  loading?: boolean;
}

const GoalChangeConfirmation: React.FC<GoalChangeConfirmationProps> = ({
  isOpen,
  onClose,
  onReplace,
  onDuplicate,
  loading = false,
}) => {
  if (!isOpen) return null;

  const modal = (
    <div className="custom-confirmation-backdrop">
      <div className="custom-confirmation-modal">
        <div className="custom-confirmation-title">Change Goal?</div>
        <div className="custom-confirmation-message">
          You changed the company goal. Do you want to:
        </div>
        <div
          className="custom-confirmation-actions"
          style={{ flexDirection: "column", gap: "0.5rem" }}
        >
          <button
            className="custom-confirmation-confirm"
            onClick={onReplace}
            disabled={loading}
          >
            Replace Goal on This Post
          </button>
          <button
            className="custom-confirmation-confirm"
            onClick={onDuplicate}
            disabled={loading}
            style={{ backgroundColor: "#444" }}
          >
            Duplicate Post for New Goal
          </button>
          <button
            className="custom-confirmation-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default GoalChangeConfirmation;

