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
} from "@mui/material";
import {
  CompanyGoalType,
  CompanyAccountType,
  UserType,
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
  const [accountNumbersForThisGoal, setAccountNumbersForThisGoal] = useState(
    goal.accountNumbersForThisGoal || []
  );
  const [goalTitle, setGoalTitle] = useState(goal.goalTitle);
  const [goalDescription, setGoalDescription] = useState(goal.goalDescription);
  const [goalMetric, setGoalMetric] = useState(goal.goalMetric);
  const [goalValueMin, setGoalValueMin] = useState(goal.goalValueMin);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);

  const hasSubmissions = false;

  useEffect(() => {
    setAccountNumbersForThisGoal(goal.accountNumbersForThisGoal || []);
  }, [goal]);

  const selectedAccountObjects = useMemo(
    () =>
      allAccounts.filter((acc) =>
        accountNumbersForThisGoal.includes(acc.accountNumber.toString())
      ),
    [allAccounts, accountNumbersForThisGoal]
  );

  const updatedGoal: Partial<CompanyGoalType> = useMemo(
    () => ({
      accountNumbersForThisGoal,
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
    }),
    [
      accountNumbersForThisGoal,
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
    ]
  );

  const currentGoalComparable = useMemo(
    () => ({
      accountNumbersForThisGoal: goal.accountNumbersForThisGoal || [],
      goalTitle: goal.goalTitle,
      goalDescription: goal.goalDescription,
      goalMetric: goal.goalMetric,
      goalValueMin: goal.goalValueMin,
      goalStartDate: goal.goalStartDate,
      goalEndDate: goal.goalEndDate,
    }),
    [goal]
  );

  const isModified = useMemo(
    () => !isEqual(updatedGoal, currentGoalComparable),
    [updatedGoal, currentGoalComparable]
  );

  const handleSave = () => {
    if (!isModified) {
      alert("No changes detected.");
      return;
    }

    onSave(updatedGoal);
    onClose();
  };

  const handleAccountSelectionChange = (
    updatedAccounts: CompanyAccountType[]
  ) => {
    setAccountNumbersForThisGoal(
      updatedAccounts.map((acc) => acc.accountNumber.toString())
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Goal</DialogTitle>
      <DialogContent>
        <Box
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

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Select Target Accounts
        </Typography>
        <AccountMultiSelector
          allAccounts={allAccounts}
          selectedAccounts={selectedAccountObjects}
          setSelectedAccounts={handleAccountSelectionChange}
        />
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
