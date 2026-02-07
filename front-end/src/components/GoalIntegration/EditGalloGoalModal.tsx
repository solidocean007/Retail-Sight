import React, { useMemo, useRef, useState } from "react";
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
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import EditGalloGoalAccountTable from "./EditGalloGoalAccountTable";
import ConfirmGoalModal from "./ConfirmGoalModal";
import "./editGalloGoalModal.css";
import { diffGalloGoalAccounts } from "./utils/diffGalloGoalAccounts";
import ConfirmEditGalloGoalModal from "./ConfirmEditGalloGoalModal";

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
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const isMobile = useMediaQuery("(max-width:700px)");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const normalizeAccounts = (accounts: FireStoreGalloGoalDocType["accounts"]) =>
    accounts.map((a) => ({
      ...a,
      status: a.status ?? "active", // ✅ guarantee status
    }));

  const [accounts, setAccounts] = useState(() =>
    normalizeAccounts(goal.accounts),
  );

  const [saving, setSaving] = useState(false);

  // ✅ For edit mode, don’t limit assignment options to “already assigned users”.
  // Provide ALL sales users (users with a salesRouteNum).
  const assignedUserIds = useMemo(() => {
    return companyUsers
      .filter(
        (u) =>
          typeof u.salesRouteNum === "string" &&
          u.salesRouteNum.trim().length > 0,
      )
      .map((u) => u.uid);
  }, [companyUsers]);

  const counts = useMemo(() => {
    return accounts.reduce(
      (acc, a) => {
        if (a.status === "active") acc.assigned++;
        else acc.unassigned++;
        acc.total++;
        return acc;
      },
      { assigned: 0, unassigned: 0, total: 0 },
    );
  }, [accounts]);

  const handleSave = async () => {
    const unassigned = accounts.some(
      (a) => !Array.isArray(a.salesRouteNums) || a.salesRouteNums.length === 0,
    );

    if (unassigned) {
      alert("Cannot save goal: some accounts have no assigned salesperson.");
      return;
    }

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
      dispatch(
        showMessage({
          text: "Failed to save changes",
          severity: "error",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const hasInvalidAccounts = accounts.some(
    (a) =>
      a.status === "active" &&
      (!Array.isArray(a.salesRouteNums) || a.salesRouteNums.length !== 1),
  );

  const visibleAccounts = accounts.filter((a) =>
    statusFilter === "all" ? true : a.status === statusFilter,
  );

  const originalAccountsRef = useRef(
    JSON.stringify(normalizeAccounts(goal.accounts)),
  );

  const hasChanges = JSON.stringify(accounts) !== originalAccountsRef.current;

  const diff = useMemo(
    () => diffGalloGoalAccounts(goal.accounts, accounts),
    [goal.accounts, accounts],
  );

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
            <Chip
              label={`Assigned: ${counts.assigned}`}
              color={statusFilter === "active" ? "success" : "default"}
              onClick={() => setStatusFilter("active")}
            />
            <Chip
              label={`Unassigned: ${counts.unassigned}`}
              color={statusFilter === "inactive" ? "default" : "default"}
              onClick={() => setStatusFilter("inactive")}
            />
            <Chip
              label={`All accounts: ${counts.total}`}
              onClick={() => setStatusFilter("all")}
            />
          </Box>
        </DialogTitle>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            <button className="btn-secondary" onClick={onArchive}>Archive Goal</button>
            <button className="btn-secondary" onClick={onDisable}>Disable Goal</button>
          </Box>

          <Box>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={saving || hasInvalidAccounts || !hasChanges}
              onClick={() => setConfirmOpen(true)}
            >
              Apply Changes
            </button>
          </Box>
        </DialogActions>

        <DialogContent
          dividers
          sx={{ maxHeight: "70vh", overflowY: "auto", padding: "1rem" }}
        >
          <EditGalloGoalAccountTable
            accounts={visibleAccounts}
            onChange={setAccounts}
          />
        </DialogContent>
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
