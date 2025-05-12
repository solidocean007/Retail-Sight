// MyCompanyGoals.tsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { Typography, CircularProgress, useMediaQuery } from "@mui/material";
import { selectUser } from "../Slices/userSlice";
import "./myCompanyGoals.css";
import {
  selectCompanyGoalsIsLoading,
  selectUsersCompanyGoals,
} from "../Slices/goalsSlice";
import { CompanyGoalType } from "../utils/types";
import { useNavigate } from "react-router-dom";
import CompanyGoalDetailsCard from "./GoalIntegration/CompanyGoalDetailsCard";
import { useTheme } from "@mui/material/styles";
import UserGoalCard from "./GoalIntegration/UserGoalCard";

const MyCompanyGoals = () => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const salesRouteNum = user?.salesRouteNum;
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {},
  );

  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector(
    (
      state: RootState, // Selector unknown returned a different result when called with the same parameters. This can lead to unnecessary rerenders.Selectors that return a new reference (such as an object or an array) should be memoized:
    ) => selectUsersCompanyGoals(state, salesRouteNum),
  );
  // console.log(userCompanyGoals[0].id)
  // console.log(userCompanyGoals[0].submittedPosts[30])

  // ✅ Toggle expanded state for goals
  // const toggleGoalExpansion = (goalId: string) => {
  //   setExpandedGoals((prev) => ({
  //     ...prev,
  //     [goalId]: !prev[goalId],
  //   }));
  // };

  const usersAccountsForGoal = (goal: CompanyGoalType) => {
    if (!Array.isArray(goal.accounts)) {
      return [];
    }
    // Filter accounts that match the user's salesRouteNum
    return goal.accounts.filter(
      (account) =>
        Array.isArray(account.salesRouteNums)
          ? account.salesRouteNums.includes(salesRouteNum || "") // Match salesRouteNum if it's an array
          : account.salesRouteNums === salesRouteNum, // Match directly if it's a single value
    );
  };

  const today = new Date();

  // Separate and sort current vs upcoming
  const currentGoals = [...userCompanyGoals]
    .filter((goal) => {
      const start = new Date(goal.goalStartDate);
      const end = new Date(goal.goalEndDate);
      return start <= today && end >= today; // Ongoing today
    })
    .sort(
      (a, b) =>
        new Date(b.goalStartDate).getTime() -
        new Date(a.goalStartDate).getTime(),
    );

  const upcomingGoals = [...userCompanyGoals]
    .filter((goal) => new Date(goal.goalStartDate) > today)
    .sort(
      (a, b) =>
        new Date(a.goalStartDate).getTime() -
        new Date(b.goalStartDate).getTime(),
    );

  return (
    <div className="my-company-goals-container">
      <Typography
        variant="h3"
        sx={{ flexGrow: 1, fontSize: "large" }}
        className="my-goals-title"
      >
        {/* {`${user?.company} Goals`} */}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <div>
          {/* CURRENT GOALS */}
          {currentGoals.length > 0 && (
            <div>
              <Typography variant="h5" className="goals-section-header">
                Current Goals
              </Typography>
              {currentGoals.map((goal, index) => (
                <UserGoalCard
                  key={goal.id || index}
                  goal={goal}
                  userUid={user?.uid}
                />
                // <CompanyGoalDetailsCard
                //   key={goal.id || index}
                //   goal={goal}
                //   mobile={isMobile}
                //   salesRouteNum={salesRouteNum}
                // />
              ))}
            </div>
          )}

          {/* UPCOMING GOALS */}
          {upcomingGoals.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <Typography variant="h5" className="goals-section-header">
                Upcoming Goals
              </Typography>
              {upcomingGoals.map((goal, index) => (
                <CompanyGoalDetailsCard
                  key={goal.id || index}
                  goal={goal}
                  mobile={isMobile}
                  salesRouteNum={salesRouteNum}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCompanyGoals;
