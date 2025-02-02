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
} from "@mui/material";
import { selectUser } from "../Slices/userSlice";
import "./myCompanyGoals.css";
import {
  selectCompanyGoalsIsLoading,
  selectUsersCompanyGoals,
} from "../Slices/goalsSlice";
import { CompanyGoalType } from "../utils/types";
import { useNavigate } from "react-router-dom";

const MyCompanyGoals = () => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const salesRouteNum = user?.salesRouteNum;
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );
  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector((state: RootState) =>
    selectUsersCompanyGoals(state, salesRouteNum)
  );

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId], // Toggle the specific goal's expansion state
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

  console.log(userCompanyGoals);

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
        <TableContainer>
          {/* Company Goals Table */}
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
                <TableCell>Accounts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userCompanyGoals.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No company goals available for your accounts at this time.
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
                        variant="contained"
                        color="primary"
                        // onClick={() =>
                        //   navigate(
                        //     `/create-post?goalId=${goal.id}&accountId=${account.accountNumber}`
                        //   )
                        // }
                      >
                        Create
                      </Button>
                    </TableCell>
                    <TableCell>
                      {goal.accounts === "Global" ? (
                        <Typography>Available for all accounts</Typography>
                      ) : (
                        <Button
                          onClick={() => toggleGoalExpansion(goal.id)}
                          variant="outlined"
                          size="small"
                        >
                          {expandedGoals[goal.id]
                            ? "Hide"
                            : "Show"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedGoals[goal.id] && (
                    <TableRow>
                      <TableCell colSpan={5}>
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
                                  <TableCell>Post</TableCell>{" "}
                                  {/* Merged Post Status and Actions */}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {usersAccountsForGoal(goal).length > 0 ? (
                                  usersAccountsForGoal(goal).map(
                                    (account, accIndex) => {
                                      const isPostSubmitted = Array.isArray(
                                        goal.submittedPostsIds
                                      )
                                        ? goal.submittedPostsIds.includes(
                                            account.accountNumber
                                          )
                                        : false;

                                      return (
                                        <TableRow
                                          key={accIndex}
                                          sx={
                                            isPostSubmitted
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
                                            {account.accountAddress || "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            {account.accountNumber || "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            {isPostSubmitted ? (
                                              <Button
                                                variant="contained"
                                                color="secondary"
                                                size="small"
                                                sx={{
                                                  color: "white",
                                                  backgroundColor: "darkgreen",
                                                  "&:hover": {
                                                    backgroundColor: "green",
                                                  },
                                                }}
                                                // onClick={() =>
                                                //   navigate(
                                                //     `/user-home-page?postId=${goal.submittedPostsIds.find(
                                                //       (postId) =>
                                                //         postId ===
                                                //         account.accountNumber.toString()
                                                //     )}`
                                                //   )
                                                // }
                                              >
                                                View Post
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
                                      No accounts match your sales route number.
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
      )}
    </div>
  );
};

export default MyCompanyGoals;
