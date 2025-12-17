import React, { useEffect, useRef } from "react";
import { Typography, Box, FormControlLabel, Checkbox } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { CompanyGoalType } from "../../utils/types";
import "../customConfirmation.css";

interface ConfirmGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;

  goal: CompanyGoalType | null;

  affectedAccountsCount: number;
  affectedSalesCount: number;
  affectedSupervisorsCount: number;

  // 🔽 NEW — email intent (controlled by parent)
  emailOnCreate: boolean;
  setEmailOnCreate: (value: boolean) => void;
}

const ConfirmGoalModal: React.FC<ConfirmGoalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  goal,
  affectedAccountsCount,
  affectedSalesCount,
  affectedSupervisorsCount,
  emailOnCreate,
  setEmailOnCreate,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 🔹 Focus first focusable element & handle ESC
  useEffect(() => {
    if (!isOpen) return;

    const modalEl = modalRef.current;
    if (modalEl) {
      const focusable = modalEl.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      focusable?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !goal) return null;

  return (
    <div className="custom-confirmation-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="custom-confirmation-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-confirmation-title">
          <Box display="flex" alignItems="center" gap={1}>
            <TrackChangesIcon color="primary" />
            <Typography variant="h6">Review Goal</Typography>
          </Box>
        </div>

        <div className="goal-preview">
          <Typography variant="body1" gutterBottom>
            You are about to create a goal titled{" "}
            <strong>{goal.goalTitle}</strong>.
          </Typography>

          <Typography variant="body2" gutterBottom>
            Description: {goal.goalDescription}
          </Typography>

          <Typography variant="body2" gutterBottom>
            Metric: <strong>{goal.goalMetric}</strong> &nbsp;|&nbsp; Minimum
            Value: <strong>{goal.goalValueMin}</strong>
          </Typography>

          <Typography variant="body2" gutterBottom>
            Duration: {goal.goalStartDate} → {goal.goalEndDate}
          </Typography>

          <Typography variant="body2" gutterBottom>
            Accounts targeted: <strong>{affectedAccountsCount}</strong>
          </Typography>

          {affectedSalesCount > 0 && (
            <Typography variant="body2" gutterBottom>
              Sales reps affected: <strong>{affectedSalesCount}</strong>
            </Typography>
          )}

          {affectedSupervisorsCount > 0 && (
            <Typography variant="body2" gutterBottom>
              Supervisors affected: <strong>{affectedSupervisorsCount}</strong>
            </Typography>
          )}

          {goal.perUserQuota && (
            <Typography variant="body2" gutterBottom>
              Per-user quota: {goal.perUserQuota}
            </Typography>
          )}
        </div>

        {/* 📧 Email intent */}
        <FormControlLabel
          control={
            <Checkbox
              checked={emailOnCreate}
              onChange={(e) => setEmailOnCreate(e.target.checked)}
            />
          }
          label="Email assigned users about this goal"
        />

        <Typography variant="caption" color="textSecondary">
          This is a required operational email. Users cannot opt out.
        </Typography>

        <div className="custom-confirmation-actions">
          <button className="custom-confirmation-cancel" onClick={onClose}>
            Cancel
          </button>

          <button className="custom-confirmation-confirm" onClick={onConfirm}>
            Confirm Goal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmGoalModal;
