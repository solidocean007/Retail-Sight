import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  CompanyGoalType,
  CompanyAccountType,
  UserType,
  GoalAssignmentType,
} from "../../utils/types";
import AccountMultiSelector from "./AccountMultiSelector";
import isEqual from "lodash.isequal";
import "./editCompanyGoalModal.css";

interface EditCompanyGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: CompanyGoalType;
  allAccounts: CompanyAccountType[];
  companyUsers: UserType[];
  onSave: (updatedGoal: Partial<CompanyGoalType>) => void;
}

const EditCompanyGoalModal: React.FC<EditCompanyGoalModalProps> = ({
  open,
  onClose,
  goal,
  allAccounts,
  companyUsers,
  onSave,
}) => {
  // 🧩 Initialize from new or old goal data
  const [goalAssignments, setGoalAssignments] = useState<GoalAssignmentType[]>(
    goal.goalAssignments || []
  );
  const [accountNumbersForThisGoal, setAccountNumbersForThisGoal] = useState<
    string[]
  >(goal.accountNumbersForThisGoal || []);

  const [goalTitle, setGoalTitle] = useState(goal.goalTitle);
  const [goalDescription, setGoalDescription] = useState(goal.goalDescription);
  const [goalMetric, setGoalMetric] = useState(goal.goalMetric);
  const [goalValueMin, setGoalValueMin] = useState(goal.goalValueMin);
  const [perUserQuota, setPerUserQuota] = useState(goal.perUserQuota ?? 0);
  const [lastValidQuota, setLastValidQuota] = useState(goal.perUserQuota ?? 1);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);
  const [searchSelected, setSearchSelected] = useState("");

  // 🧩 Sync when modal opens or goal changes
  useEffect(() => {
    setGoalAssignments(goal.goalAssignments || []);
    setAccountNumbersForThisGoal(goal.accountNumbersForThisGoal || []);
  }, [goal]);

  // --- Derived data ---
  const selectedAccountObjects = useMemo(() => {
    return allAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );
  }, [allAccounts, accountNumbersForThisGoal]);

  const filteredSelectedAccounts = useMemo(() => {
    return selectedAccountObjects.filter(
      (acc) =>
        acc.accountName
          .toLowerCase()
          .includes(searchSelected.toLowerCase()) ||
        acc.accountNumber.toString().includes(searchSelected)
    );
  }, [selectedAccountObjects, searchSelected]);

  // --- Account selection change handler ---
  const handleAccountSelectionChange = (updatedAccounts: CompanyAccountType[]) => {
    const updatedNumbers = updatedAccounts.map((acc) =>
      acc.accountNumber.toString()
    );
    setAccountNumbersForThisGoal(updatedNumbers);

    // 🔹 Automatically prune assignments for removed accounts
    setGoalAssignments((prev) =>
      prev.filter((a) => updatedNumbers.includes(a.accountNumber.toString()))
    );

    // 🔹 Optionally auto-add reps for new accounts
    const newAccounts = updatedAccounts.filter(
      (acc) =>
        !goalAssignments.some(
          (a) => a.accountNumber === acc.accountNumber.toString()
        )
    );
    const autoAssignments = newAccounts.flatMap((acc) => {
      const reps = companyUsers.filter(
        (u) =>
          u.salesRouteNum && acc.salesRouteNums?.includes(u.salesRouteNum)
      );
      return reps.map((u) => ({
        uid: u.uid,
        accountNumber: acc.accountNumber.toString(),
      }));
    });

    if (autoAssignments.length) {
      setGoalAssignments((prev) => [...prev, ...autoAssignments]);
    }
  };

  // --- Form object ---
  const updatedGoal: Partial<CompanyGoalType> = useMemo(
    () => ({
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
      accountNumbersForThisGoal,
      goalAssignments, // ✅ persist both arrays
    }),
    [
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
      accountNumbersForThisGoal,
      goalAssignments,
    ]
  );

  const currentGoalComparable = useMemo(
    () => ({
      goalTitle: goal.goalTitle,
      goalDescription: goal.goalDescription,
      goalMetric: goal.goalMetric,
      goalValueMin: goal.goalValueMin,
      perUserQuota: goal.perUserQuota,
      goalStartDate: goal.goalStartDate,
      goalEndDate: goal.goalEndDate,
      accountNumbersForThisGoal: goal.accountNumbersForThisGoal || [],
      goalAssignments: goal.goalAssignments || [],
    }),
    [goal]
  );

  const isModified = useMemo(
    () => !isEqual(updatedGoal, currentGoalComparable),
    [updatedGoal, currentGoalComparable]
  );

  const handleSave = () => {
    const cleanedGoal: Partial<CompanyGoalType> = { ...updatedGoal };
    if (updatedGoal.perUserQuota === 0) delete cleanedGoal.perUserQuota;
    onSave(cleanedGoal);
    onClose();
  };

  const handleQuotaToggle = (checked: boolean) => {
    if (checked) {
      setPerUserQuota(lastValidQuota); // restore
    } else {
      setLastValidQuota(perUserQuota > 0 ? perUserQuota : 1);
      setPerUserQuota(0); // disable
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: "goal-modal" }}
    >
      <DialogTitle className="goal-modal__title">Edit Company Goal</DialogTitle>

      <DialogContent dividers className="goal-modal-content">
        {/* 📝 Goal Basics */}
        <section>
          <header className="goal-modal-section-head">
            <h3>Goal basics</h3>
            <span className="muted">Update the goal parameters.</span>
          </header>
          <Box
            mt={1}
            mb={3}
            display="grid"
            gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
            gap={2}
          >
            <TextField
              label="Title"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Metric"
              value={goalMetric}
              onChange={(e) => setGoalMetric(e.target.value)}
              fullWidth
            />
            <TextField
              label="Minimum Value"
              type="number"
              value={goalValueMin}
              onChange={(e) => setGoalValueMin(Number(e.target.value))}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={perUserQuota !== 0}
                  onChange={(e) => handleQuotaToggle(e.target.checked)}
                />
              }
              label="Require submissions per user"
            />
            {perUserQuota !== 0 && (
              <TextField
                label="Goal Quota"
                type="number"
                value={perUserQuota}
                onChange={(e) =>
                  setPerUserQuota(Math.max(1, Number(e.target.value)))
                }
                helperText="Each user must submit this many posts"
              />
            )}
            <TextField
              label="Start Date"
              type="date"
              value={goalStartDate}
              onChange={(e) => setGoalStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={goalEndDate}
              onChange={(e) => setGoalEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Box gridColumn="1 / -1">
              <TextField
                label="Description"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </Box>
        </section>

        <Divider sx={{ my: 2 }} />

        {/* 🧾 Current Accounts */}
        <section>
          <header className="goal-modal__section-head">
            <h3>Accounts on this goal</h3>
            <span className="muted">
              These accounts are already linked to the goal.
            </span>
          </header>

          <div className="toolbar">
            <div className="pill">Total: {selectedAccountObjects.length}</div>
            <TextField
              label="Search Selected Accounts"
              value={searchSelected}
              onChange={(e) => setSearchSelected(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          </div>

          <Box
            sx={{
              maxHeight: 250,
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: 1,
              p: 1,
              mb: 2,
            }}
          >
            {filteredSelectedAccounts.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No matching selected accounts
              </Typography>
            ) : (
              filteredSelectedAccounts.map((acc) => (
                <Box
                  key={acc.accountNumber}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={0.5}
                  borderBottom="1px solid #eee"
                >
                  <Typography variant="body2">{acc.accountName}</Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      const updated = selectedAccountObjects.filter(
                        (sel) => sel.accountNumber !== acc.accountNumber
                      );
                      handleAccountSelectionChange(updated);
                    }}
                  >
                    ×
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </section>

        {/* 🧠 Add More Accounts */}
        <section className="goal-modal__section">
          <header className="goal-modal__section-head">
            <h3>Add more accounts</h3>
            <span className="muted">
              Search your company accounts below. Items already on the goal are
              pre-checked and auto-assign their salespeople.
            </span>
          </header>

          <AccountMultiSelector
            allAccounts={allAccounts}
            selectedAccounts={selectedAccountObjects}
            setSelectedAccounts={handleAccountSelectionChange}
            selectedAssignments={goalAssignments}
            setSelectedAssignments={setGoalAssignments}
            companyUsers={companyUsers}
          />
        </section>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!isModified}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCompanyGoalModal;
