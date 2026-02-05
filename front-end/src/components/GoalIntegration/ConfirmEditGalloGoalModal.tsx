import React from "react";
import { Box, Typography, Button, Divider } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
// import "./confirmEditGalloGoalModal.css";
import { GalloGoalAccountDiffType } from "./utils/diffGalloGoalAccounts";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  goalTitle: string;
  diff: GalloGoalAccountDiffType;
}

const ConfirmEditGalloGoalModal: React.FC<Props> = ({
  open,
  onCancel,
  onConfirm,
  goalTitle,
  diff,
}) => {
  if (!open) return null;

  const hasChanges =
    diff.activated.length ||
    diff.deactivated.length ||
    diff.reassigned.length;

  if (!hasChanges) return null;

  return (
    <div className="custom-confirmation-backdrop" onClick={onCancel}>
      <div
        className="custom-confirmation-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-confirmation-title">
          <Box display="flex" alignItems="center" gap={1}>
            <TrackChangesIcon color="primary" />
            <Typography variant="h6">Confirm Goal Changes</Typography>
          </Box>
        </div>

        <Typography variant="body2" sx={{ mb: 2 }}>
          You are about to update the goal <strong>{goalTitle}</strong>.
          These changes will immediately affect reporting and submissions.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {diff.activated.length > 0 && (
          <>
            <Typography variant="subtitle2">
              ✅ Activated Accounts ({diff.activated.length})
            </Typography>
            <ul>
              {diff.activated.map((a) => (
                <li key={a.distributorAcctId}>{a.accountName}</li>
              ))}
            </ul>
          </>
        )}

        {diff.deactivated.length > 0 && (
          <>
            <Typography variant="subtitle2">
              ⛔ Deactivated Accounts ({diff.deactivated.length})
            </Typography>
            <ul>
              {diff.deactivated.map((a) => (
                <li key={a.distributorAcctId}>{a.accountName}</li>
              ))}
            </ul>
          </>
        )}

        {diff.reassigned.length > 0 && (
          <>
            <Typography variant="subtitle2">
              🔁 Salesperson Changes ({diff.reassigned.length})
            </Typography>
            <ul>
              {diff.reassigned.map(({ account, before, after }) => (
                <li key={account.distributorAcctId}>
                  {account.accountName}: {before} → <strong>{after}</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="custom-confirmation-actions">
          <button
            className="custom-confirmation-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="custom-confirmation-confirm"
            onClick={onConfirm}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEditGalloGoalModal;
