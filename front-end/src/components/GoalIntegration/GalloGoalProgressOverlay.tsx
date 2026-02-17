import React, { useMemo } from "react";
import "./galloGoalProgressOverlay.css";
import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";

type Props = {
  goal: FireStoreGalloGoalWithId;
  onClose: () => void;
  onEdit: () => void;
  onViewPost: (postId: string) => void;
};

export default function GalloGoalProgressOverlay({
  goal,
  onClose,
  onEdit,
  onViewPost,
}: Props) {
  const activeAccounts = useMemo(
    () => goal.accounts.filter((a) => a.status === "active"),
    [goal]
  );

  const submittedCount = activeAccounts.filter(
    (a) => a.submittedPostId
  ).length;

  const percent = Math.round(
    (submittedCount / (activeAccounts.length || 1)) * 100
  );

  return (
    <div className="gallo-overlay-backdrop">
      <div className="gallo-overlay">

        {/* Header */}
        <div className="overlay-header">
          <div>
            <h3>{goal.programDetails.programTitle}</h3>
            <div className="overlay-percent">
              {submittedCount} / {activeAccounts.length} ({percent}%)
            </div>
          </div>

          <div className="overlay-actions">
            <button onClick={onEdit}>Edit</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Account Grid */}
        <div className="overlay-account-grid">
          {activeAccounts.map((account, index) => {
            const submitted = !!account.submittedPostId;

            return (
              <div
                key={index}
                className={`account-cell ${
                  submitted ? "submitted" : "pending"
                }`}
                onClick={() =>
                  submitted &&
                  onViewPost(account.submittedPostId!)
                }
              >
                <span className="account-name">
                  {account.accountName}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
