import React from "react";
import "./customConfirmation.css";
import { CompanyGoalType } from "../utils/types";

interface CustomConfirmationProps {
  isOpen: boolean;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
  goal?: CompanyGoalType;
  loading?: boolean;
}

const CustomConfirmation: React.FC<CustomConfirmationProps> = ({
  isOpen,
  message,
  onConfirm,
  onClose,
  goal,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="custom-confirmation-backdrop">
      <div className="custom-confirmation-modal">
        <div className="custom-confirmation-title">Confirm Goal Creation</div>

        {goal ? (
          <div className="goal-preview">
            <p>
              <strong>Title:</strong> {goal.goalTitle}
            </p>
            <p>
              <strong>Description:</strong> {goal.goalDescription}
            </p>
            <p>
              <strong>Metric:</strong> {goal.goalMetric}
            </p>
            <p>
              <strong>Minimum Value:</strong> {goal.goalValueMin}
            </p>
            <p>
              <strong>Start:</strong> {goal.goalStartDate}
            </p>
            <p>
              <strong>End:</strong> {goal.goalEndDate}
            </p>
            <p>
              <strong>Target Role:</strong> {goal.targetRole}
            </p>

            {goal.perUserQuota && (
              <p>
                <strong>Per User Quota:</strong> {goal.perUserQuota}
              </p>
            )}

            {goal.targetRole === "supervisor" && goal.userAssignments && (
              <div className="goal-preview-subsection">
                <strong>User Assignments:</strong>
                <ul>
                  {Object.entries(goal.userAssignments).map(
                    ([accountNumber, userIds]) => (
                      <li key={accountNumber}>
                        <strong>{accountNumber}:</strong> {userIds.join(", ")}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {goal.targetRole === "sales" && goal.accountNumbersForThisGoal && (
              <div className="goal-preview-subsection">
                <strong>Account Numbers:</strong>
                <ul>
                  {goal.accountNumbersForThisGoal.map((acct) => (
                    <li key={acct}>{acct}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="custom-confirmation-message">
            {message || "Are you sure you want to proceed?"}
          </div>
        )}

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
