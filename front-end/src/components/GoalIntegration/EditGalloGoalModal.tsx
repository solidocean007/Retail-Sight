import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  useMediaQuery,
} from "@mui/material";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import { useAppDispatch } from "../../utils/store";
import { addOrUpdateGalloGoal } from "../../Slices/galloGoalsSlice";
import { updateGalloGoalAccounts } from "./utils/galloProgramGoalsHelpers";
import CustomConfirmation from "../CustomConfirmation";

type PendingAccountChange = {
  distributorAcctId: string;
  nextStatus: "active" | "inactive";
  accountName: string;
} | null;

type Props = {
  goal: FireStoreGalloGoalDocType;
  onClose: () => void;
  onArchive: () => void;
  onDisable: () => void;
};

// const STATUS_OPTIONS = ["active", "inactive", "disabled"] as const;
const STATUS_OPTIONS = ["active", "inactive"] as const;

const EditGalloGoalModal: React.FC<Props> = ({
  goal,
  onClose,
  onArchive,
  onDisable,
}) => {
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery("(max-width:900px)");

  const [accounts, setAccounts] = useState(goal.accounts);
  const [saving, setSaving] = useState(false);

  // ✅ MUST be inside component
  const [pendingChange, setPendingChange] =
    useState<PendingAccountChange>(null);

  const counts = useMemo(() => {
    return accounts.reduce(
      (acc, a) => {
        const status = a.status === "active" ? "active" : "inactive";
        acc[status]++;
        return acc;
      },
      { active: 0, inactive: 0 },
    );
  }, [accounts]);

  const requestStatusChange = (
    distributorAcctId: string,
    nextStatus: "active" | "inactive",
    accountName: string,
    currentStatus?: "active" | "inactive" | "disabled",
  ) => {
    // optional: don't confirm if no-op
    if (currentStatus === nextStatus) return;

    setPendingChange({ distributorAcctId, nextStatus, accountName });
  };

  const confirmStatusChange = () => {
    if (!pendingChange) return;

    setAccounts((prev) =>
      prev.map((a) =>
        a.distributorAcctId === pendingChange.distributorAcctId
          ? { ...a, status: pendingChange.nextStatus }
          : a,
      ),
    );

    setPendingChange(null);
  };

  const handleSave = async () => {
    setSaving(true);

    dispatch(
      addOrUpdateGalloGoal({
        ...goal,
        accounts,
        id: goal.goalDetails.goalId,
      }),
    );

    try {
      await updateGalloGoalAccounts(goal.goalDetails.goalId, accounts);
      onClose();
    } catch (e) {
      console.error("Failed to update goal accounts", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open fullWidth maxWidth="md" onClose={onClose}>
        <DialogTitle>
          <Typography variant="h6">Edit Goal Accounts</Typography>

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            {goal.programDetails.programTitle}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            <strong>Active</strong>: Can submit & counts toward goal ·{" "}
            <strong>Inactive</strong>: Temporarily excluded
          </Typography>

          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            <Chip label={`Active: ${counts.active}`} color="success" />
            <Chip label={`Inactive: ${counts.inactive}`} />
          </Box>
        </DialogTitle>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            <button color="error" onClick={onArchive}>
              Archive Goal
            </button>
            <button color="warning" onClick={onDisable}>
              Disable Goal
            </button>
          </Box>

          <Box>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={saving}>
              Apply Changes
            </Button>
          </Box>
        </DialogActions>

        <DialogContent
          dividers
          sx={{
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          <Box display="flex" flexDirection="column" gap={1}>
            {accounts.map((account) => (
              <Box
                key={account.distributorAcctId}
                sx={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 2,
                  p: 1,
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={600}>
                    {account.accountName}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {account.accountAddress}
                  </Typography>
                </Box>

                <Box display="flex" gap={1}>
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant={account.status === s ? "contained" : "outlined"}
                      color={s === "active" ? "success" : "inherit"}
                      onClick={() =>
                        requestStatusChange(
                          account.distributorAcctId,
                          s,
                          account.accountName,
                          account.status as any,
                        )
                      }
                    >
                      {s}
                    </Button>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* ✅ Render outside Dialog so portal overlay always sits on top */}
      {pendingChange && (
        <CustomConfirmation
          isOpen
          title={
            pendingChange.nextStatus === "inactive"
              ? "Exclude account from goal"
              : "Include account in goal"
          }
          message={
            pendingChange.nextStatus === "inactive"
              ? `${pendingChange.accountName} will be excluded from this goal and cannot submit posts.`
              : `${pendingChange.accountName} will be reactivated and included in this goal.`
          }
          onConfirm={confirmStatusChange}
          onClose={() => setPendingChange(null)}
        />
      )}
    </>
  );
};

export default EditGalloGoalModal;
