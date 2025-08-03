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
  const [perUserQuota, setPerUserQuota] = useState(goal.perUserQuota ?? 0);
  const [lastValidQuota, setLastValidQuota] = useState(goal.perUserQuota ?? 1);
  const [goalStartDate, setGoalStartDate] = useState(goal.goalStartDate);
  const [goalEndDate, setGoalEndDate] = useState(goal.goalEndDate);
  const [searchSelected, setSearchSelected] = useState("");

  const hasSubmissions = false;

  useEffect(() => {
    setAccountNumbersForThisGoal(goal.accountNumbersForThisGoal || []);
  }, [goal]);

  const selectedAccountObjects = useMemo(() => {
    return allAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );
  }, [allAccounts, accountNumbersForThisGoal]);

  const filteredSelectedAccounts = useMemo(() => {
    return selectedAccountObjects.filter(
      (acc) =>
        acc.accountName.toLowerCase().includes(searchSelected.toLowerCase()) ||
        acc.accountNumber.toString().includes(searchSelected)
    );
  }, [selectedAccountObjects, searchSelected]);

  const updatedGoal: Partial<CompanyGoalType> = useMemo(
    () => ({
      accountNumbersForThisGoal,
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
    }),
    [
      accountNumbersForThisGoal,
      goalTitle,
      goalDescription,
      goalMetric,
      goalValueMin,
      goalStartDate,
      goalEndDate,
      perUserQuota,
    ]
  );

  const currentGoalComparable = useMemo(
    () => ({
      accountNumbersForThisGoal: goal.accountNumbersForThisGoal || [],
      goalTitle: goal.goalTitle,
      goalDescription: goal.goalDescription,
      goalMetric: goal.goalMetric,
      goalValueMin: goal.goalValueMin,
      perUserQuota: goal.perUserQuota,
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
    const cleanedGoal: Partial<CompanyGoalType> = { ...updatedGoal };
    if (updatedGoal.perUserQuota === 0) {
      delete cleanedGoal.perUserQuota;
    }

    onSave(cleanedGoal);
    onClose();
  };

  const handleAccountSelectionChange = (
    updatedAccounts: CompanyAccountType[]
  ) => {
    setAccountNumbersForThisGoal(
      updatedAccounts.map((acc) => acc.accountNumber.toString())
    );
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
              onChange={(e) => {
                const value = Number(e.target.value);
                setPerUserQuota(value < 1 ? 1 : value); // prevent setting to 0 manually
              }}
              // fullWidth
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
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Select Target Accounts
        </Typography>

        <TextField
          label="Search Selected Accounts"
          value={searchSelected}
          onChange={(e) => setSearchSelected(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
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
                  onClick={() =>
                    setAccountNumbersForThisGoal((prev) =>
                      prev.filter((id) => id !== acc.accountNumber.toString())
                    )
                  }
                >
                  ×
                </Button>
              </Box>
            ))
          )}
        </Box>

        <AccountMultiSelector
          allAccounts={allAccounts}
          selectedAccounts={filteredSelectedAccounts}
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
