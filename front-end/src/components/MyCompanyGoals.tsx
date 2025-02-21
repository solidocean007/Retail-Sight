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

            <TableContainer>
              <Table className="company-goal-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell>Metric Minimum</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {userCompanyGoals.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No company goals available for your accounts at this
                        time.
                      </TableCell>
                    </TableRow>
                  )}

                  {userCompanyGoals.map((goal, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>{goal.goalTitle}</TableCell>
                        <TableCell>{goal.goalDescription}</TableCell>
                        <TableCell>{goal.goalMetric}</TableCell>
                        <TableCell>{goal.goalValueMin}</TableCell>
                        <TableCell>{goal.goalStartDate}</TableCell>
                        <TableCell>{goal.goalEndDate}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            onClick={() => toggleGoalExpansion(goal.id)}
                          >
                            {expandedGoals[goal.id] ? "Hide" : "Show"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedGoals[goal.id] && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Collapse
                              in={expandedGoals[goal.id]}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box margin={2}>
                                <Typography variant="h6">Accounts</Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Account Name</TableCell>
                                      <TableCell>Account Address</TableCell>
                                      <TableCell>Account Number</TableCell>
                                      <TableCell>Post</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {usersAccountsForGoal(goal).length > 0 ? (
                                      usersAccountsForGoal(goal).map(
                                        (account, accIndex) => {
                                          // ✅ Check if this account has a submitted post
                                          const submittedPost =
                                            goal.submittedPosts?.find(
                                              (
                                                submission: GoalSubmissionType
                                              ) =>
                                                submission.accountNumber ===
                                                account.accountNumber
                                            );

                                          return (
                                            <TableRow
                                              key={accIndex}
                                              sx={
                                                submittedPost
                                                  ? {
                                                      backgroundColor: "green",
                                                      color: "white",
                                                    }
                                                  : {}
                                              }
                                            >
                                              <TableCell>
                                                {account.accountName || "N/A"}
                                              </TableCell>
                                              <TableCell>
                                                {account.accountAddress ||
                                                  "N/A"}
                                              </TableCell>
                                              <TableCell>
                                                {account.accountNumber || "N/A"}
                                              </TableCell>
                                              <TableCell>
                                                {submittedPost ? (
                                                  <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    size="small"
                                                    sx={{
                                                      color: "white",
                                                      backgroundColor:
                                                        "darkgreen",
                                                      "&:hover": {
                                                        backgroundColor:
                                                          "green",
                                                      },
                                                    }}
                                                    onClick={() =>
                                                      navigate(
                                                        `/user-home-page?postId=${submittedPost.postId}`
                                                      )
                                                    }
                                                  >
                                                    View
                                                  </Button>
                                                ) : (
                                                  <Typography color="error">
                                                    None
                                                  </Typography>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        }
                                      )
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={4} align="center">
                                          No accounts match your sales route
                                          number.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCompanyGoals;
