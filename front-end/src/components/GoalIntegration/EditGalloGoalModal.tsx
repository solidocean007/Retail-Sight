import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { addOrUpdateGalloGoal } from "../../Slices/galloGoalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { useAppDispatch } from "../../utils/store";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import ConfirmEditGalloGoalModal from "./ConfirmEditGalloGoalModal";
import EditGalloGoalAccountTable from "./EditGalloGoalAccountTable";
import { diffGalloGoalAccounts } from "./utils/diffGalloGoalAccounts";
import { updateGalloGoalAccounts } from "./utils/galloProgramGoalsHelpers";

import "./editGalloGoalModal.css";

type Props = {
  goal: FireStoreGalloGoalDocType;
  onClose: () => void;
  onArchive: () => void;
  onDisable: () => void;
};

type AccountFilter = "all" | "active" | "inactive";

const normalizeAccounts = (accounts: FireStoreGalloGoalDocType["accounts"]) =>
  accounts.map((account) => ({
    ...account,
    status: account.status ?? "active",
  }));

const EditGalloGoalModal: React.FC<Props> = ({
  goal,
  onClose,
  onArchive,
  onDisable,
}) => {
  const dispatch = useAppDispatch();
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [statusFilter, setStatusFilter] = useState<AccountFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accounts, setAccounts] = useState(() =>
    normalizeAccounts(goal.accounts),
  );
  const [saving, setSaving] = useState(false);
  const originalAccountsRef = useRef(
    JSON.stringify(normalizeAccounts(goal.accounts)),
  );

  const counts = useMemo(
    () =>
      accounts.reduce(
        (summary, account) => {
          if (account.status === "active") summary.active += 1;
          else summary.inactive += 1;
          summary.total += 1;
          return summary;
        },
        { active: 0, inactive: 0, total: 0 },
      ),
    [accounts],
  );

  const hasInvalidAccounts = useMemo(
    () =>
      accounts.some(
        (account) =>
          account.status === "active" &&
          (!Array.isArray(account.salesRouteNums) ||
            account.salesRouteNums.length !== 1),
      ),
    [accounts],
  );

  const hasChanges = JSON.stringify(accounts) !== originalAccountsRef.current;

  const diff = useMemo(
    () => diffGalloGoalAccounts(goal.accounts, accounts),
    [goal.accounts, accounts],
  );

  const handleSave = async () => {
    if (hasInvalidAccounts) {
      dispatch(
        showMessage({
          text: "Each active account needs exactly one salesperson.",
          severity: "warning",
        }),
      );
      return;
    }

    setSaving(true);
    try {
      await updateGalloGoalAccounts(goal.goalDetails.goalId, accounts);
      dispatch(
        addOrUpdateGalloGoal({
          ...goal,
          accounts,
          id: goal.goalDetails.goalId,
        }),
      );
      dispatch(
        showMessage({
          text: "Goal accounts updated",
          severity: "success",
        }),
      );
      onClose();
    } catch (error) {
      console.error("Failed to update Gallo goal accounts:", error);
      dispatch(
        showMessage({
          text: "Failed to save changes. Nothing was removed.",
          severity: "error",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open
        fullWidth
        maxWidth="md"
        onClose={() => {
          if (!saving) onClose();
        }}
        PaperProps={{ className: "edit-gallo-goal-dialog" }}
      >
        <DialogTitle className="edit-gallo-goal-dialog__header">
          <span className="edit-gallo-goal-dialog__eyebrow">
            Axis goal accounts
          </span>
          <Typography variant="h6">
            {goal.programDetails.programTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Active accounts count toward the goal and can submit displays.
          </Typography>

          <Box className="edit-gallo-goal-dialog__filters">
            <Chip
              label={`Active · ${counts.active}`}
              color={statusFilter === "active" ? "success" : "default"}
              variant={statusFilter === "active" ? "filled" : "outlined"}
              onClick={() => setStatusFilter("active")}
            />
            <Chip
              label={`Excluded · ${counts.inactive}`}
              color={statusFilter === "inactive" ? "warning" : "default"}
              variant={statusFilter === "inactive" ? "filled" : "outlined"}
              onClick={() => setStatusFilter("inactive")}
            />
            <Chip
              label={`All accounts · ${counts.total}`}
              color={statusFilter === "all" ? "primary" : "default"}
              variant={statusFilter === "all" ? "filled" : "outlined"}
              onClick={() => setStatusFilter("all")}
            />
          </Box>
        </DialogTitle>

        <DialogContent dividers className="edit-gallo-goal-dialog__content">
          <EditGalloGoalAccountTable
            accounts={accounts}
            statusFilter={statusFilter}
            companyUsers={companyUsers}
            onChange={setAccounts}
          />
        </DialogContent>

        <DialogActions className="edit-gallo-goal-dialog__actions">
          {goal.lifeCycleStatus === "active" && (
            <div className="edit-gallo-goal-dialog__lifecycle-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onArchive}
                disabled={saving}
              >
                Archive goal
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onDisable}
                disabled={saving}
              >
                Disable goal
              </button>
            </div>
          )}

          <div className="edit-gallo-goal-dialog__save-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={saving || hasInvalidAccounts || !hasChanges}
              onClick={() => setConfirmOpen(true)}
            >
              {saving ? "Saving…" : "Review changes"}
            </button>
          </div>
        </DialogActions>
      </Dialog>

      <ConfirmEditGalloGoalModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await handleSave();
        }}
        goalTitle={goal.goalDetails.goal}
        diff={diff}
      />
    </>
  );
};

export default EditGalloGoalModal;
