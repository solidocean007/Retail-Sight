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

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setLoading(true); // Start loading
        const savedGoals = await getGoalsFromIndexedDB();
  
        if (savedGoals.length > 0) {
          console.log("Loaded goals from IndexedDB:", savedGoals);
          dispatch(setGoals(savedGoals)); // Load from IndexedDB
        } else if (companyId) {
          // Fetch goals from Firestore
          console.log("No goals stored for user in IndexedDB. Fetching from Firestore...");
          const fetchedGoals = await dispatch(
            fetchUserGalloGoals({ companyId, salesRouteNum })
          ).unwrap();
  
          console.log("Fetched goals from Firestore:", fetchedGoals); // Already filtered goals
  
          // Save fetched goals to IndexedDB and Redux
          await saveGoalsToIndexedDB(fetchedGoals); // Save directly without additional filtering
          dispatch(setGoals(fetchedGoals)); // Store in Redux
        }
      } catch (error) {
        console.error("Error loading goals:", error); // this logs MyGoals.tsx:84 Error loading goals: DOMException: Failed to execute 'put' on 'IDBObjectStore': Evaluating the object store's key path did not yield a value.
      } finally {
        setLoading(false); // End loading
      }
    };
  
    loadGoals();
  }, [dispatch, companyId]);
  
  

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

  const groupedPrograms = goals.reduce<GroupedProgram[]>((acc, goal) => {
    if (!goal.programDetails || !goal.programDetails.programTitle) {
      console.warn("Skipping invalid goal:", goal);
      return acc; // Skip invalid goal
    }
  
    const programIndex = acc.findIndex(
      (p) => p.programTitle === goal.programDetails.programTitle
    );
  
    if (programIndex === -1) {
      // Add a new program with its first goal
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
            accounts: goal.accounts.map((acc) => ({
              distributorAcctId: acc.distributorAcctId,
              accountName: acc.accountName || "Unknown",
              accountAddress: acc.accountAddress || "Unknown",
            })),
          },
        ],
      });
    } else {
      // Add the goal to an existing program
      acc[programIndex].goals.push({
        goalId: goal.goalDetails.goalId,
        goal: goal.goalDetails.goal,
        metric: goal.goalDetails.goalMetric,
        valueMin: goal.goalDetails.goalValueMin,
        accounts: goal.accounts.map((acc) => ({
          distributorAcctId: acc.distributorAcctId,
          accountName: acc.accountName || "Unknown",
          accountAddress: acc.accountAddress || "Unknown",
        })),
      });
    }
  
    return acc;
  }, []);
  

  console.log(expandedGoals);
  console.log(goals); // this logs the goal

  return (
    <div>
      <Typography variant="h5">My Goals</Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Program Title</TableCell>
                <TableCell>Goal</TableCell>
                <TableCell>Metric</TableCell>
                <TableCell>Min Value</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Accounts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupedPrograms.map((program) => (
                <React.Fragment key={program.programTitle}>
                  <TableRow>
                    <TableCell>
                      <Button
                        onClick={() =>
                          toggleProgramExpansion(program.programTitle)
                        }
                      >
                        {expandedPrograms.includes(program.programTitle)
                          ? "Collapse"
                          : "Show Goals"}
                      </Button>
                    </TableCell>
                    <TableCell colSpan={6}>{program.programTitle}</TableCell>
                  </TableRow>
                  {expandedPrograms.includes(program.programTitle) &&
                    program.goals.map((goal) => (
                      <React.Fragment key={goal.goalId}>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell>
                            <Button
                              onClick={() => toggleGoalExpansion(goal.goalId)}
                            >
                              {expandedGoals.includes(goal.goalId)
                                ? "Hide Accounts"
                                : "Show Accounts"}
                            </Button>
                          </TableCell>
                          <TableCell>{goal.goal}</TableCell>
                          <TableCell>{goal.metric}</TableCell>
                          <TableCell>{goal.valueMin}</TableCell>
                          <TableCell>{program.programStartDate}</TableCell>
                          <TableCell>{program.programEndDate}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} style={{ padding: 0 }}>
                            <Collapse
                              in={expandedGoals.includes(goal.goalId)}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box margin={1}>
                                <Table size="small">
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
