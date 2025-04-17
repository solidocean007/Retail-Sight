import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { CompanyAccountType, GoalTargetMode } from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { db } from "../../utils/firebase";
import { doc, getDoc } from "@firebase/firestore";
import getCompanyAccountId from "../../utils/helperFunctions/getCompanyAccountId";
import { createCompanyGoal } from "../../utils/helperFunctions/createCompanyGoal";
import UserMultiSelector from "./UserMultiSelector";
import AccountMultiSelector from "./AccountMultiSelector";
import { selectCompanyUsers } from "../../Slices/userSlice";

const CreateCompanyGoalView = () => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = currentUser?.companyId;
  const companyUsers = useSelector(selectCompanyUsers);

  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<CompanyAccountType[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMetric, setGoalMetric] = useState("");
  const [goalValueMin, setGoalValueMin] = useState(1);
  const [goalStartDate, setGoalStartDate] = useState("");
  const [goalEndDate, setGoalEndDate] = useState("");
  const [goalTargetMode, setGoalTargetMode] = useState<GoalTargetMode>("goalForAllAccounts");

  const normalizedCompanyUsers = useMemo(() => {
    return (companyUsers || []).map((user) => ({
      ...user,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "",
    }));
  }, [companyUsers]);

  const readyForCreation: boolean =
    goalTitle.trim().length > 0 &&
    goalDescription.trim().length > 0 &&
    goalMetric.trim().length > 0 &&
    Number(goalValueMin) > 0;

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!companyId) return;

      try {
        const accountsId = await getCompanyAccountId(companyId);
        if (!accountsId) return;

        const accountsDocRef = doc(db, "accounts", accountsId);
        const snapshot = await getDoc(accountsDocRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const formatted = (data.accounts as CompanyAccountType[]).map((account) => ({
            ...account,
            salesRouteNums: Array.isArray(account.salesRouteNums)
              ? account.salesRouteNums
              : [account.salesRouteNums].filter(Boolean),
          }));
          setAccounts(formatted);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };

    fetchAccounts();
  }, [companyId]);

  const handleCreateGoal = async () => {
    if (!readyForCreation) {
      alert("Please fill out all required fields.");
      return;
    }

    if (goalTargetMode === "goalForSelectedAccounts" && selectedAccounts.length === 0) {
      alert("You must select at least one account.");
      return;
    }

    if (goalTargetMode === "goalForSelectedUsers" && selectedUserIds.length === 0) {
      alert("You must select at least one user.");
      return;
    }

    setIsSaving(true);
    try {
      const newGoal = {
        companyId: companyId || "",
        appliesToAllAccounts: goalTargetMode === "goalForAllAccounts",
        targetMode: goalTargetMode,
        goalTitle,
        goalDescription,
        goalMetric,
        goalValueMin: Number(goalValueMin),
        goalStartDate,
        goalEndDate,
        accounts: goalTargetMode === "goalForSelectedAccounts" ? selectedAccounts : [],
        usersIdsOfGoal: goalTargetMode === "goalForSelectedUsers" ? selectedUserIds : [],
      };

      await createCompanyGoal(newGoal);
      alert("Goal created successfully!");

      // Reset form
      setGoalTitle("");
      setGoalDescription("");
      setGoalMetric("");
      setGoalValueMin(1);
      setGoalTargetMode("goalForAllAccounts");
      setGoalStartDate("");
      setGoalEndDate("");
      setSelectedAccounts([]);
      setSelectedUserIds([]);
    } catch (error) {
      alert("Error creating goal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Create a New Goal
        </Typography>

        <Box display="flex" flexDirection="column" gap={3}>
          <TextField
            label="Goal Title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
          />
          <TextField
            label="Goal Description"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
          />

          <Box display="flex" gap={2}>
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
          </Box>

          <Box display="flex" justifyContent="space-around">
            <Box>
              <Typography variant="h6">Goal Metric</Typography>
              <ToggleButtonGroup
                value={goalMetric}
                exclusive
                onChange={(e, val) => val && setGoalMetric(val)}
                aria-label="Goal Metric"
              >
                <ToggleButton value="cases">Cases</ToggleButton>
                <ToggleButton value="bottles">Bottles</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography variant="h6">Minimum Value</Typography>
              <Box display="flex" alignItems="center">
                <Button
                  variant="outlined"
                  onClick={() => setGoalValueMin((prev) => Math.max(1, prev - 1))}
                >
                  -
                </Button>
                <TextField
                  type="number"
                  value={goalValueMin}
                  onChange={(e) => setGoalValueMin(Math.max(1, Number(e.target.value)))}
                  size="small"
                  sx={{ width: 60, textAlign: "center", mx: 1 }}
                  inputProps={{ min: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => setGoalValueMin((prev) => prev + 1)}
                >
                  +
                </Button>
              </Box>
            </Box>
          </Box>

          <FormControl component="fieldset">
            <Typography variant="subtitle1">Target Audience</Typography>
            <RadioGroup
              value={goalTargetMode}
              onChange={(e) => setGoalTargetMode(e.target.value as GoalTargetMode)}
              row
            >
              <FormControlLabel
                value="goalForAllAccounts"
                control={<Radio />}
                label="All Accounts"
              />
              <FormControlLabel
                value="goalForSelectedAccounts"
                control={<Radio />}
                label="Selected Accounts"
              />
              <FormControlLabel
                value="goalForSelectedUsers"
                control={<Radio />}
                label="Selected Users"
              />
            </RadioGroup>
            <Typography variant="body2" color="textSecondary">
              {goalTargetMode === "goalForAllAccounts"
                ? "This goal will apply to every account in the company."
                : goalTargetMode === "goalForSelectedAccounts"
                ? "Choose specific accounts that this goal applies to."
                : "Select which users are responsible for this goal."}
            </Typography>
          </FormControl>

          {goalTargetMode === "goalForSelectedAccounts" && (
            <AccountMultiSelector
              allAccounts={accounts}
              selectedAccounts={selectedAccounts}
              setSelectedAccounts={setSelectedAccounts}
            />
          )}

          {goalTargetMode === "goalForSelectedUsers" && (
            <UserMultiSelector
              users={normalizedCompanyUsers}
              selectedUserIds={selectedUserIds}
              setSelectedUserIds={setSelectedUserIds}
            />
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateGoal}
            disabled={!readyForCreation || isSaving}
          >
            {isSaving ? "Creating..." : "Create Goal"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CreateCompanyGoalView;

