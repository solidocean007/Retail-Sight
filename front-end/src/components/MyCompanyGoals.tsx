// MyCompanyGoals.tsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  CircularProgress,
  Collapse,
  Box,
  useMediaQuery,
} from "@mui/material";
import { selectUser } from "../Slices/userSlice";
import "./myCompanyGoals.css";
import {
  selectCompanyGoalsIsLoading,
  selectUsersCompanyGoals,
} from "../Slices/goalsSlice";
import { CompanyGoalType, GoalSubmissionType } from "../utils/types";
import { useNavigate } from "react-router-dom";
import InfoRowCompanyGoal from "./GoalIntegration/InfoRowCompanyGoal";
import { useTheme } from "@mui/material/styles";

const MyCompanyGoals = () => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const salesRouteNum = user?.salesRouteNum;
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );

  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector((state: RootState) =>
    selectUsersCompanyGoals(state, salesRouteNum)
  );

  // ✅ Toggle expanded state for goals
  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const usersAccountsForGoal = (goal: CompanyGoalType) => {
    if (!Array.isArray(goal.accounts)) {
      // If accounts are "Global", return an empty array as no filtering is needed.
      return [];
    }
    // Filter accounts that match the user's salesRouteNum
    return goal.accounts.filter(
      (account) =>
        Array.isArray(account.salesRouteNums)
          ? account.salesRouteNums.includes(salesRouteNum || "") // Match salesRouteNum if it's an array
          : account.salesRouteNums === salesRouteNum // Match directly if it's a single value
    );
  };

  return (
    <div className="my-company-goals-container">
      <Typography
        variant="h3"
        sx={{ flexGrow: 1, fontSize: "large" }}
        className="my-goals-title"
      >
        Company Goals
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <div>
          <div>
            {userCompanyGoals.map((goal: CompanyGoalType, index: number) => {
              return (
                <InfoRowCompanyGoal
                  key={index}
                  goal={goal}
                  mobile={isMobile}
                  salesRouteNum={salesRouteNum}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCompanyGoals;
