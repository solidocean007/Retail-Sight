// EditCompanyGoalModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  TextField,
  Grid,
} from "@mui/material";
import {
  CompanyGoalType,
  CompanyAccountType,
  UserType,
} from "../../utils/types";
import AccountMultiSelector from "./AccountMultiSelector";
import UserMultiSelector from "./UserMultiSelector";
import "./editCompanyGoalModal.css";

interface EditCompanyGoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: CompanyGoalType;
  allAccounts: CompanyAccountType[];
  companyUsers: UserType[] | null;
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
  const [appliesToAllAccounts, setAppliesToAllAccounts] = useState(
    goal.appliesToAllAccounts
  );
  const [selectedAccounts, setSelectedAccounts] = useState<
    CompanyAccountType[]
  >(goal.accounts || []);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    goal.usersIdsOfGoal || []
  );
  const [goalTitle, setGoalTitle] = useState(goal.goalTitle);
  const [goalDescription, setGoalDescription] = useState(goal.goalDescription);
  const [goalMetric, setGoalMetric] = useState(goal.goalMetric);
  const [goalValueMin, setGoalValueMin] = useState(goal.goalValueMin);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);
  // const hasSubmissions = goal.submittedPosts && goal.submittedPosts.length > 0;
  const hasSubmissions = false;

  useEffect(() => {
    setAppliesToAllAccounts(goal.appliesToAllAccounts);
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
      appliesToAllAccounts,
      accounts: appliesToAllAccounts ? [] : selectedAccounts,
      usersIdsOfGoal: selectedUserIds,
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

        {hasSubmissions && (
          <Typography color="error" mt={2}>
            This goal already has submissions. Editing the available accounts is
            locked.
          </Typography>
        )}

        <Button
          variant="outlined"
          size="small"
          onClick={() => setAppliesToAllAccounts(!appliesToAllAccounts)}
          disabled={hasSubmissions}
          sx={{ mb: 2 }}
        >
          {appliesToAllAccounts
            ? "Limit to Specific Accounts"
            : "Apply to All Accounts"}
        </Button>

        {!appliesToAllAccounts && (
          <AccountMultiSelector
            allAccounts={allAccounts}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
          />
        )}

        <UserMultiSelector
          users={normalizedCompanyUsers}
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
        />
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
