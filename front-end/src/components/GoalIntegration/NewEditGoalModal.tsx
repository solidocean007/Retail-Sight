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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  CompanyGoalType,
  CompanyAccountType,
  UserType,
  GoalTargetMode,
} from "../../utils/types";
import AccountMultiSelector from "./AccountMultiSelector";
import UserMultiSelector from "./UserMultiSelector";
import "./editCompanyGoalModal.css";

interface EditCompanyGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: CompanyGoalType;
  allAccounts: CompanyAccountType[];
  companyUsers: UserType[];
  onSave: (updatedGoal: Partial<CompanyGoalType>) => void;
}

const fallbackTargetMode = (goal: CompanyGoalType): GoalTargetMode => {
  if (goal.appliesToAllAccounts) return "goalForAllAccounts";
  if (goal.accounts?.length > 0) return "goalForSelectedAccounts";
  if (goal.usersIdsOfGoal?.length > 0) return "goalForSelectedUsers";
  return "goalForAllAccounts";
};

const EditCompanyGoalModal: React.FC<EditCompanyGoalModalProps> = ({
  open,
  onClose,
  goal,
  allAccounts,
  companyUsers,
  onSave,
}) => {
  const hasSubmissions = goal.submittedPosts && goal.submittedPosts.length > 0;

  const [targetMode, setTargetMode] = useState<GoalTargetMode>(
    goal.targetMode || fallbackTargetMode(goal)
  );
  const [selectedAccounts, setSelectedAccounts] = useState<CompanyAccountType[]>(goal.accounts || []);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(goal.usersIdsOfGoal || []);

  const [goalTitle, setGoalTitle] = useState(goal.goalTitle);
  const [goalDescription, setGoalDescription] = useState(goal.goalDescription);
  const [goalMetric, setGoalMetric] = useState(goal.goalMetric);
  const [goalValueMin, setGoalValueMin] = useState(goal.goalValueMin);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);

  useEffect(() => {
    setTargetMode(goal.targetMode || fallbackTargetMode(goal));
    setSelectedAccounts(goal.accounts || []);
    setSelectedUserIds(goal.usersIdsOfGoal || []);
  }, [goal]);

  const normalizedCompanyUsers = useMemo(
    () =>
      companyUsers.map((user) => ({
        ...user,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role || "",
      })),
    [companyUsers]
  );

  const handleSave = () => {
    onSave({
      targetMode,
      appliesToAllAccounts: targetMode === "goalForAllAccounts", // why does this hard code at goalForAllAccounts?
      accounts: targetMode === "goalForSelectedAccounts" ? selectedAccounts : [], // what about the conditional of all accounts mode?  why not put them all in here?
      usersIdsOfGoal: targetMode === "goalForSelectedUsers" ? selectedUserIds : [],
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Goal</DialogTitle>
      <DialogContent>
        {hasSubmissions && (
          <Typography variant="body2" color="error" mb={2}>
            This goal has already been submitted. You cannot edit it.
          </Typography>
        )}
        <Box
          mb={3}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            fullWidth
            disabled={hasSubmissions}
          />
          <TextField
            label="Metric"
            value={goalMetric}
            onChange={(e) => setGoalMetric(e.target.value)}
            fullWidth
            disabled={hasSubmissions}
          />
          <TextField
            label="Minimum Value"
            type="number"
            value={goalValueMin}
            onChange={(e) => setGoalValueMin(Number(e.target.value))}
            fullWidth
            disabled={hasSubmissions}
          />
          <TextField
            label="Start Date"
            type="date"
            value={goalStartDate}
            onChange={(e) => setGoalStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            disabled={hasSubmissions}
          />
          <TextField
            label="End Date"
            type="date"
            value={goalEndDate}
            onChange={(e) => setGoalEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            disabled={hasSubmissions}
          />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField
              label="Description"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={hasSubmissions}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="target-mode-label">Target Mode</InputLabel>
          <Select
            labelId="target-mode-label"
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value as GoalTargetMode)}
            disabled={hasSubmissions}
            label="Target Mode"
          >
            <MenuItem value="goalForAllAccounts">All Accounts</MenuItem>
            <MenuItem value="goalForSelectedAccounts">Specific Accounts</MenuItem>
            <MenuItem value="goalForSelectedUsers">Accounts Assigned to Users</MenuItem>
          </Select>
        </FormControl>

        {targetMode === "goalForSelectedAccounts" && (
          <AccountMultiSelector
            allAccounts={allAccounts}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
          />
        )}

        {targetMode === "goalForSelectedUsers" && (
          <UserMultiSelector
            users={normalizedCompanyUsers}
            selectedUserIds={selectedUserIds}
            setSelectedUserIds={setSelectedUserIds}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCompanyGoalModal;
