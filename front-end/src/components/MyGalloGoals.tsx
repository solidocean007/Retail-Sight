import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../utils/store";
import { selectUser } from "../Slices/userSlice";
import { setupUserGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";
import {
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Collapse,
  Box,
} from "@mui/material";
import { RootState } from "../utils/store";
// import "./myGalloGoals.css";
import { CompanyAccountType } from "../utils/types";
import {
  selectGalloGoalsLoading,
  selectUsersGalloGoals,
} from "../Slices/goalsSlice";

const MyGalloGoals = () => {
  const loading = useSelector(selectGalloGoalsLoading);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const salesRouteNum = user?.salesRouteNum;
  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum)
  );
  const companyId = user?.companyId;
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );

  const toggleProgramExpansion = (programTitle: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(programTitle)
        ? prev.filter((title) => title !== programTitle)
        : [...prev, programTitle]
    );
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId], // Toggle the specific goal's state
    }));
  };

  return (
    <div className="my-gallo-goals-container">
      <Typography
        variant="h3"
        sx={{ flexGrow: 1, fontSize: "large" }}
        className="my-goals-title"
      >
        Gallo Programs
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer>
          <Table className="gallo-program-table">
            <TableHead>
              <TableRow>
                <TableCell>Program Title</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Handle no Gallo goals case */}
              {usersGalloGoals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No Gallo goals available for your accounts at this time.
                  </TableCell>
                </TableRow>
              )}

              {usersGalloGoals.map((goal, index) => (
                <React.Fragment key={index}>
                  {/* Program Row */}
                  <TableRow>
                    <TableCell>{goal.programDetails.programTitle}</TableCell>
                    <TableCell>
                      {goal.programDetails.programStartDate || "N/A"}
                    </TableCell>
                    <TableCell>
                      {goal.programDetails.programEndDate || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() =>
                          toggleProgramExpansion(
                            goal.programDetails.programTitle
                          )
                        }
                        variant="outlined"
                        size="small"
                      >
                        {expandedPrograms.includes(
                          goal.programDetails.programTitle
                        )
                          ? "Collapse"
                          : "Show Goal"}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expandable Goal Section */}
                  {expandedPrograms.includes(
                    goal.programDetails.programTitle
                  ) && (
                    <React.Fragment>
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body1">
                              Goal: {goal.goalDetails.goal}
                            </Typography>
                            <Typography variant="body1">
                              Metric: {goal.goalDetails.goalMetric} | Min Value:{" "}
                              {goal.goalDetails.goalValueMin}
                            </Typography>
                            <Button
                              onClick={() =>
                                toggleGoalExpansion(goal.goalDetails.goalId)
                              }
                              variant="outlined"
                              size="small"
                            >
                              {expandedGoals[goal.goalDetails.goalId]
                                ? "Hide Accounts"
                                : "Show Accounts"}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Accounts Section */}
                      {expandedGoals[goal.goalDetails.goalId] && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Collapse
                              in={expandedGoals[goal.goalDetails.goalId]}
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
                                      <TableCell>Post Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {goal.accounts.map(
                                      (account, accountIndex) => {
                                        const isPostSubmitted =
                                          !!account.submittedPostId; // Check if submittedPostId exists

                                        return (
                                          <TableRow key={accountIndex}>
                                            <TableCell>
                                              {account.accountName || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                              {account.accountAddress || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                              {account.distributorAcctId ||
                                                "N/A"}
                                            </TableCell>
                                            <TableCell>
                                              {isPostSubmitted ? (
                                                <Typography color="primary">
                                                  Submitted
                                                </Typography>
                                              ) : (
                                                <Typography color="error">
                                                  Not Submitted
                                                </Typography>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {isPostSubmitted ? (
                                                <Button
                                                  variant="text"
                                                  color="primary"
                                                  // onClick={() =>
                                                  //   navigate(
                                                  //     `/post/${account.submittedPostId}`
                                                  //   )
                                                  // } // Add appropriate navigation logic
                                                >
                                                  View Post
                                                </Button>
                                              ) : (
                                                <Typography color="error">
                                                  Not Submitted
                                                </Typography>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {isPostSubmitted ? (
                                                <Typography color="primary">
                                                  Submitted
                                                </Typography>
                                              ) : (
                                                <Button
                                                  disabled={isPostSubmitted}
                                                  variant="contained"
                                                  color="primary"
                                                  // onClick={() =>
                                                  //   navigate(
                                                  //     `/create-post?goalId=${goal.goalDetails.goalId}&accountId=${account.distributorAcctId}`
                                                  //   )
                                                  // }
                                                >
                                                  Create Post
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      }
                                    )}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
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

export default MyGalloGoals;
