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
import { CompanyGoalType, PostType } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { db } from "../utils/firebase";
import fetchPostsForGoal from "../utils/PostLogic/fetchPostsForGoal";

const MyCompanyGoals = () => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const salesRouteNum = user?.salesRouteNum;
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );
  const [postsByGoal, setPostsByGoal] = useState<Record<string, PostType[]>>(
    {}
  );
  const loading = useSelector(selectCompanyGoalsIsLoading);

  const userCompanyGoals = useSelector((state: RootState) =>
    selectUsersCompanyGoals(state, salesRouteNum)
  );

  const toggleGoalExpansion = async (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId], // Toggle the specific goal's expansion state
    }));

    if (!postsByGoal[goalId]) {
      try {
        const posts = await fetchPostsForGoal(goalId, "companyGoals");
        setPostsByGoal((prev) => ({ ...prev, [goalId]: posts })); // Type '{ id: string; }' is missing the following properties from type 'PostType': category, channel, storeAddress, displayDate, and 13 more.ts(2345)
      } catch (error) {
        console.error("Error fetching posts for goal:", error);
      }
    }
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
      <Typography variant="h3" sx={{ flexGrow: 1, fontSize: "large" }} className="my-goals-title">
        Company Goals
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
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
                                      const postsForGoal = postsByGoal[goal.id] || [];
                                      const postForAccount = postsForGoal.find(
                                        (post) => post.accountNumber === account.accountNumber
                                      );

                                      return (
                                        <TableRow
                                          key={accIndex}
                                          sx={
                                            postForAccount
                                              ? {
                                                  backgroundColor: "green",
                                                  color: "white",
                                                }
                                              : {}
                                          }
                                        >
                                          <TableCell>{account.accountName || "N/A"}</TableCell>
                                          <TableCell>{account.accountAddress || "N/A"}</TableCell>
                                          <TableCell>{account.accountNumber || "N/A"}</TableCell>
                                          <TableCell>
                                            {postForAccount ? (
                                              <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={() =>
                                                  navigate(`/user-home-page?postId=${postForAccount.id}`)
                                                }
                                              >
                                                View Post
                                              </Button>
                                            ) : (
                                              <Typography color="error">None</Typography>
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
