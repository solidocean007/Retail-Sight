// src/components/GoalReports/AccountReportsDetailModal.tsx
//
// Admin-side detail for ONE account on a goal. Opened from the inline caution
// icon on an account row.
//
// The admin's decision here is binary and consequential:
//   Acknowledge          — seen, no action. Account stays on the goal.
//   Acknowledge + remove — the account leaves the goal (dimmed, excluded from
//                          completion math, reversible).
// Removal is what closes the loop for the rep: they watch the account drop
// off their list, which reads as a real result rather than a "reviewed" badge.

import React, { useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

import {
  GoalAccountReport,
  getReasonLabel,
  isHelpRequest,
} from "../../types/goalReports";
import "./goalReportsReview.css";

interface Props {
  open: boolean;
  onClose: () => void;

  accountName?: string;
  reports: GoalAccountReport[];

  isRemoved?: boolean;
}

const formatWhen = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const AccountReportsDetailModal: React.FC<Props> = ({
  open,
  onClose,
  accountName,
  reports,
  isRemoved = false,
}) => {
  const openCount = reports.filter((r) => !r.resolvedAt).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onClick={(e) => e.stopPropagation()}
      PaperProps={{ className: "goal-reports-paper" }}
    >
      <div className="goal-reports-header">
        <span className="goal-reports-eyebrow">Account feedback</span>
        <h2 className="goal-reports-title">{accountName || "This account"}</h2>
        {isRemoved && (
          <span className="goal-reports-removed-tag">Removed from goal</span>
        )}
      </div>

      <DialogContent className="goal-reports-content">
        {reports.length === 0 ? (
          <Typography color="text.secondary">
            No reports on this account.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {reports.map((r, i) => (
              <React.Fragment key={r.id}>
                {i > 0 && <Divider />}

                <div>
                  <div className="goal-reports-row-head">
                    <span className="goal-reports-rep">
                      {[r.userFirstName, r.userLastName]
                        .filter(Boolean)
                        .join(" ") || "Unknown rep"}
                      {r.salesRouteNum ? ` · Route ${r.salesRouteNum}` : ""}
                    </span>
                    <span className="goal-reports-when">
                      {formatWhen(r.createdAt)}
                    </span>
                  </div>

                  {r.reasonKeys?.length > 0 && (
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      gap={0.75}
                      sx={{ mt: 1 }}
                    >
                      {r.reasonKeys.map((k) => (
                        <Chip
                          key={k}
                          size="small"
                          label={getReasonLabel(k)}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  )}

                  {isHelpRequest(r) && (
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      gap={0.75}
                      sx={{ mt: 1 }}
                    >
                      {(r.helpKeys ?? []).map((k) => (
                        <Chip
                          key={k}
                          size="small"
                          label={getReasonLabel(k)}
                          color="secondary"
                        />
                      ))}
                    </Stack>
                  )}

                  {r.declinedBy && (
                    <div className="goal-reports-contact">
                      <PersonIcon fontSize="inherit" />
                      <span>{r.declinedBy}</span>
                    </div>
                  )}

                  {r.note && <p className="goal-reports-note">{r.note}</p>}

                  {r.resolvedAt && (
                    <div className="goal-reports-resolved">
                      {r.resolution === "accepted"
                        ? `Accepted ${formatWhen(r.resolvedAt)} · removed from goal`
                        : `Sent for follow-up ${formatWhen(r.resolvedAt)}`}
                      {r.resolutionNote && (
                        <span className="goal-reports-resolution-note">
                          {r.resolutionNote}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {openCount > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mr: "auto" }}
          >
            Decide on this in Feedback.
          </Typography>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountReportsDetailModal;
