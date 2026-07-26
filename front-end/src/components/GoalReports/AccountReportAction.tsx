// src/components/GoalReports/AccountReportAction.tsx
//
// The rep-facing capture controls on an unsubmitted account row, used by both
// company goals (UserTableForGoals) and Gallo goals (GoalProgressRow).
//
// Two separate flows on purpose:
//   "Report issue" — something got in the way. Often terminal. Informational.
//   "Help"         — an open ask on an account the rep hasn't given up on,
//                    expecting someone to act.
// They write to one record (two arrays) so "cost too much" + "need pricing
// support" doesn't require two entries, but the rep never has to think about
// that — they just pick the button that matches their intent.

import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { selectUser } from "../../Slices/userSlice";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  GoalAccountReport,
  GoalKind,
  HELP_OPTIONS,
  REPORT_REASONS,
  getReasonLabel,
} from "../../types/goalReports";
import {
  deleteGoalAccountReport,
  fetchLastContactForAccount,
  saveGoalAccountReport,
} from "../../utils/goalReports/goalAccountReportHelpers";
import "./accountReportAction.css";

type Mode = "issue" | "help";

interface Props {
  goalKind: GoalKind;
  goalId: string;
  goalTitle?: string;

  accountNumber?: string;
  oppId?: string;
  accountName?: string;

  existingReport?: GoalAccountReport;
  onSaved?: () => void;
}

const AccountReportAction: React.FC<Props> = ({
  goalKind,
  goalId,
  goalTitle,
  accountNumber,
  oppId,
  accountName,
  existingReport,
  onSaved,
}) => {
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  const [reasons, setReasons] = useState<string[]>([]);
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [declinedBy, setDeclinedBy] = useState("");
  const [note, setNote] = useState("");
  /** True when the name came from a previous report rather than the rep. */
  const [prefilledContact, setPrefilledContact] = useState(false);

  const hasIssue = Boolean(existingReport?.reasonKeys?.length);
  const hasHelp = Boolean(existingReport?.helpKeys?.length);
  const awaitingFollowUp = existingReport?.resolution === "follow_up";

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (key: string) =>
      setter((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );

  const openDialog = (nextMode: Mode) => (e: React.MouseEvent) => {
    // Row and card are both clickable — don't trigger them.
    e.stopPropagation();
    e.preventDefault();

    setReasons(existingReport?.reasonKeys ?? []);
    setHelpNeeded(existingReport?.helpKeys ?? []);
    setDeclinedBy(existingReport?.declinedBy ?? "");
    setNote(existingReport?.note ?? "");
    setPrefilledContact(false);
    setMode(nextMode);

    // Carry the last known contact forward so reps aren't retyping the same
    // buyer every visit. Only when we don't already have one, and only for
    // the issue flow. Fire-and-forget — prefill must never delay the dialog.
    if (
      nextMode === "issue" &&
      !existingReport?.declinedBy &&
      user?.companyId &&
      accountNumber
    ) {
      fetchLastContactForAccount(user.companyId, accountNumber).then(
        (contact) => {
          if (!contact) return;
          // Don't clobber anything the rep has already typed.
          setDeclinedBy((current) => {
            if (current) return current;
            setPrefilledContact(true);
            return contact;
          });
        },
      );
    }
  };

  const closeDialog = () => setMode(null);

  // The reasons read as things a person said ("They said: not interested"),
  // so a name is required — except for "Other", which is the catch-all for
  // situations where nobody actually turned you down.
  const contactRequired =
    mode === "issue" && reasons.some((r) => r !== "other");

  const canSave =
    mode === "issue"
      ? reasons.length > 0 &&
        (!contactRequired || declinedBy.trim().length > 0)
      : helpNeeded.length > 0;

  const handleSave = async () => {
    if (!user?.uid || !user?.companyId || !mode || !canSave) return;

    setSaving(true);
    try {
      // Only the active dimension is sent. The helper merges, so saving an
      // issue can't wipe an existing help request, or vice versa.
      await saveGoalAccountReport({
        companyId: user.companyId,
        goalKind,
        goalId,
        goalTitle,
        accountNumber,
        oppId,
        accountName,
        userId: user.uid,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        salesRouteNum: user.salesRouteNum,

        reasonKeys: mode === "issue" ? reasons : (existingReport?.reasonKeys ?? []),
        helpKeys:
          mode === "help"
            ? helpNeeded
            : (existingReport?.helpKeys ?? undefined),
        declinedBy:
          mode === "issue"
            ? declinedBy.trim() || undefined
            : existingReport?.declinedBy,
        note: note.trim() || undefined,
      });

      dispatch(
        showMessage(
          mode === "help" ? "Thanks — your request was sent." : "Thanks — noted.",
        ),
      );
      closeDialog();
      onSaved?.();
    } catch (err) {
      console.error("Failed to save account report:", err);
      dispatch(
        showMessage({
          text: "Could not save that. Try again.",
          severity: "error",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existingReport) return;

    setSaving(true);
    try {
      await deleteGoalAccountReport(existingReport.id);
      dispatch(showMessage("Removed."));
      closeDialog();
      onSaved?.();
    } catch (err) {
      console.error("Failed to remove account report:", err);
      dispatch(
        showMessage({ text: "Could not remove that.", severity: "error" }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* An admin sent this back for a conversation. The rep gets a push, so
          the app must show a matching state — otherwise they open it, see
          nothing changed, and stop trusting either signal. */}
      {awaitingFollowUp && (
        <div className="account-report-followup">
          <span className="account-report-followup-title">
            Your supervisor will follow up
          </span>
          {existingReport?.resolutionNote && (
            <span className="account-report-followup-note">
              {existingReport.resolutionNote}
            </span>
          )}
        </div>
      )}

      <div className="account-report-actions">
        <button
          type="button"
          className={`account-report-chip ${hasIssue ? "reported" : ""} ${
            awaitingFollowUp ? "follow-up" : ""
          }`}
          onClick={openDialog("issue")}
        >
          {hasIssue
            ? (existingReport?.reasonKeys ?? []).map(getReasonLabel).join(", ")
            : "Report issue"}
        </button>

        <button
          type="button"
          className={`account-report-chip help ${hasHelp ? "reported" : ""}`}
          onClick={openDialog("help")}
        >
          {hasHelp
            ? (existingReport?.helpKeys ?? []).map(getReasonLabel).join(", ")
            : "Help"}
        </button>
      </div>

      <Dialog
        open={mode !== null}
        onClose={closeDialog}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        className="account-report-dialog"
        PaperProps={{ className: "account-report-paper" }}
      >
        <div
          className={`account-report-header ${mode === "help" ? "help" : ""}`}
        >
          <span className="account-report-eyebrow">
            {mode === "help" ? "Ask for help" : "Report an issue"}
          </span>
          <DialogTitle className="account-report-title">
            {accountName || "This account"}
          </DialogTitle>
        </div>

        <DialogContent className="account-report-content">
          {mode === "issue" ? (
            <>
              <Typography className="account-report-prompt">
                They said&hellip;
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {REPORT_REASONS.map((r) => (
                  <Chip
                    key={r.key}
                    label={r.label}
                    clickable
                    color={reasons.includes(r.key) ? "primary" : "default"}
                    variant={reasons.includes(r.key) ? "filled" : "outlined"}
                    onClick={() => toggle(setReasons)(r.key)}
                  />
                ))}
              </Stack>

              <TextField
                label="Who did you speak with?"
                fullWidth
                size="small"
                required={contactRequired}
                value={declinedBy}
                onChange={(e) => {
                  setPrefilledContact(false);
                  setDeclinedBy(e.target.value);
                }}
                // Keep the label above the field — a global input style in the
                // app fights MUI's floating label and leaves it misaligned.
                InputLabelProps={{ shrink: true }}
                placeholder="Name"
                helperText={
                  contactRequired && !declinedBy.trim()
                    ? "Required — who turned it down?"
                    : prefilledContact
                      ? "From your last report here"
                      : undefined
                }
                className="account-report-field"
                sx={{ mt: 2.5 }}
              />
            </>
          ) : (
            <>
              <Typography className="account-report-prompt">
                What would help you get this one?
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {HELP_OPTIONS.map((h) => (
                  <Chip
                    key={h.key}
                    label={h.label}
                    clickable
                    color={helpNeeded.includes(h.key) ? "secondary" : "default"}
                    variant={
                      helpNeeded.includes(h.key) ? "filled" : "outlined"
                    }
                    onClick={() => toggle(setHelpNeeded)(h.key)}
                  />
                ))}
              </Stack>
            </>
          )}

          <TextField
            label="Anything else? (optional)"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            InputLabelProps={{ shrink: true }}
            placeholder="Add detail if it helps"
            className="account-report-field"
            sx={{ mt: 2.5 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {existingReport && (
            <Button
              color="error"
              onClick={handleRemove}
              disabled={saving}
              sx={{ mr: "auto" }}
            >
              Remove
            </Button>
          )}

          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccountReportAction;
