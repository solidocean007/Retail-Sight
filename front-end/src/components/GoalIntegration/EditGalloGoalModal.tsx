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

type Props = {
  goal: FireStoreGalloGoalDocType;
  onClose: () => void;
};

const STATUS_OPTIONS = ["active", "inactive", "disabled"] as const;

const EditGalloGoalModal: React.FC<Props> = ({ goal, onClose }) => {
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery("(max-width:900px)");

  const [accounts, setAccounts] = useState(goal.accounts);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    return accounts.reduce(
      (acc, a) => {
        acc[a.status ?? "inactive"]++;
        return acc;
      },
      { active: 0, inactive: 0, disabled: 0 } as Record<string, number>
    );
  }, [accounts]);

  const updateStatus = (
    distributorAcctId: string,
    status: "active" | "inactive" | "disabled"
  ) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.distributorAcctId === distributorAcctId ? { ...a, status } : a
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);

    // optimistic
    dispatch(
      addOrUpdateGalloGoal({
        ...goal,
        accounts,
        id: goal.goalDetails.goalId,
      })
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
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Edit Goal Accounts</DialogTitle>

      <DialogContent>
        <Typography variant="subtitle2" gutterBottom>
          {goal.programDetails.programTitle}
        </Typography>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip label={`Active: ${counts.active}`} color="success" />
          <Chip label={`Inactive: ${counts.inactive}`} />
          <Chip label={`Disabled: ${counts.disabled}`} color="warning" />
        </Box>

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
                <Typography fontWeight={600}>{account.accountName}</Typography>
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
                    color={
                      s === "active"
                        ? "success"
                        : s === "disabled"
                        ? "warning"
                        : "inherit"
                    }
                    onClick={() => updateStatus(account.distributorAcctId, s)}
                  >
                    {s}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditGalloGoalModal;
