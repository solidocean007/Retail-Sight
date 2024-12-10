// MyGoals.tsx
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
import {
  fetchUserGalloGoals,
  selectGoals,
  selectGoalsLoading,
  selectLastUpdated,
  setGoals,
} from "../Slices/goalsSlice";
import {
  getGoalsFromIndexedDB,
  getUserAccountsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { selectUser } from "../Slices/userSlice";
import { setupUserGoalsListener } from "../utils/listeners/setupGoalsListener";
import './myGoals.css';

interface GroupedProgram {
  programTitle: string;
  programStartDate: string;
  programEndDate: string;
  goals: {
    goalId: string;
    goal: string;
    metric: string;
    valueMin: string;
    accounts: Array<{
      distributorAcctId: string;
      accountName: string;
      accountAddress: string;
    }>;
  }[];
}

const MyGoals = () => {
  const dispatch = useAppDispatch();
  const goals = useSelector((state: RootState) => state.goals.goals);
  // const loading = useSelector(selectGoalsLoading);
  const lastUpdated = useSelector(selectLastUpdated);
  const user = useSelector(selectUser); // added this
  const companyId = user?.companyId; // added this
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const salesRouteNum = useSelector(selectUser)?.salesRouteNum;
  const [userAccounts, setUserAccounts] = useState<any[]>([]);

  console.log("goals: ", goals); // this logs empty then it logs with the current goal but all accounts.  but no program/goal or accounts render

  useEffect(() => {
    if (!companyId) return;

    setLoading(true); // Start loading

    const unsubscribe = dispatch(
      setupUserGoalsListener(companyId, salesRouteNum)
    );

    // Load user accounts asynchronously
    getUserAccountsFromIndexedDB().then((accounts) => {
      setUserAccounts(accounts);
    });

    // Add a timeout or listen to the first data load
    const timeout = setTimeout(() => {
      setLoading(false); // Stop loading after listener setup
    }, 1500); // Arbitrary delay to simulate load, you can adjust or replace this logic

    // Cleanup listener and timeout
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [dispatch, companyId, salesRouteNum]);

  const toggleProgramExpansion = (programTitle: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(programTitle)
        ? prev.filter((title) => title !== programTitle)
        : [...prev, programTitle]
    );
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const groupedPrograms = React.useMemo(() => {
    if (userAccounts.length === 0 || goals.length === 0) return [];

    return goals.reduce<GroupedProgram[]>((acc, goal) => {
      if (!goal.programDetails || !goal.programDetails.programTitle) {
        console.warn("Skipping invalid goal:", goal);
        return acc; // Skip invalid goal
      }

      // Filter accounts for this goal based on user accounts
      const filteredAccounts = goal.accounts.filter((acc) =>
        userAccounts.some(
          (ua) => String(ua.accountNumber) === String(acc.distributorAcctId)
        )
      );

      if (filteredAccounts.length === 0) {
        return acc; // Skip this goal if no matching accounts
      }

      const programIndex = acc.findIndex(
        (p) => p.programTitle === goal.programDetails.programTitle
      );

      if (programIndex === -1) {
        acc.push({
          programTitle: goal.programDetails.programTitle,
          programStartDate: goal.programDetails.programStartDate || "Unknown",
          programEndDate: goal.programDetails.programEndDate || "Unknown",
          goals: [
            {
              goalId: goal.goalDetails.goalId,
              goal: goal.goalDetails.goal,
              metric: goal.goalDetails.goalMetric,
              valueMin: goal.goalDetails.goalValueMin,
              accounts: filteredAccounts, // Filtered accounts only
            },
          ],
        });
      } else {
        acc[programIndex].goals.push({
          goalId: goal.goalDetails.goalId,
          goal: goal.goalDetails.goal,
          metric: goal.goalDetails.goalMetric,
          valueMin: goal.goalDetails.goalValueMin,
          accounts: filteredAccounts, // Filtered accounts only
        });
      }

      return acc;
    }, []);
  }, [goals, userAccounts]);

  return (
    <div className="my-goals-container">
      <Typography variant="h5" className="my-goals-title">My Goals</Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer>
          <Table className="program-table">
            <TableHead>
              <TableRow>
                <TableCell>Program Title</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedPrograms.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No goals available for your accounts at this time.
                  </TableCell>
                </TableRow>
              )}
  
              {groupedPrograms.map((program) => (
                <React.Fragment key={program.programTitle}>
                  {/* Program Row */}
                  <TableRow className="program-row">
                    <TableCell>{program.programTitle}</TableCell>
                    <TableCell>{program.programStartDate}</TableCell>
                    <TableCell>{program.programEndDate}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => toggleProgramExpansion(program.programTitle)}
                        variant="outlined"
                        size="small"
                      >
                        {expandedPrograms.includes(program.programTitle)
                          ? "Collapse"
                          : "Show Goals"}
                      </Button>
                    </TableCell>
                  </TableRow>
  
                  {/* Goals Section */}
                  {expandedPrograms.includes(program.programTitle) &&
                    program.goals.map((goal) => (
                      <React.Fragment key={goal.goalId}>
                        <TableRow className="goal-row">
                          <TableCell colSpan={4} className="goal-cell">
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body1">
                                Goal: {goal.goal}
                              </Typography>
                              <Typography variant="body1">
                                Metric: {goal.metric} | Min Value: {goal.valueMin}
                              </Typography>
                              <Button
                                onClick={() => toggleGoalExpansion(goal.goalId)}
                                variant="outlined"
                                size="small"
                              >
                                {expandedGoals.includes(goal.goalId)
                                  ? "Hide Accounts"
                                  : "Show Accounts"}
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
  
                        {/* Accounts Table */}
                        {expandedGoals.includes(goal.goalId) && (
                          <TableRow>
                            <TableCell colSpan={4} className="accounts-table">
                              <Collapse
                                in={expandedGoals.includes(goal.goalId)}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box margin={1}>
                                  <Table size="small" className="spreadsheet-table">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Address</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {goal.accounts.map((account) => (
                                        <TableRow
                                          key={account.distributorAcctId}
                                          className="account-row"
                                        >
                                          <TableCell>
                                            {account.accountName}
                                          </TableCell>
                                          <TableCell>
                                            {account.accountAddress}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
  
};

export default MyGoals;
