import React, { useEffect, useState } from "react";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import {
  getAllCompanyGoalsFromIndexedDB,
  saveAllCompanyGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Collapse,
  Button,
  IconButton,
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import { fetchAllCompanyGoals } from "../../Slices/goalsSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { deleteGoalFromFirestore } from "../../utils/helperFunctions/deleteGoalFRomFirestore";

const AllGoalsView = ({ companyId }: { companyId: string | undefined }) => {
  const [goals, setGoals] = useState<FireStoreGalloGoalDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const dispatch = useAppDispatch();

  // Add a log to inspect the `goals` array.
  useEffect(() => {
    console.log("Current goals in state:", goals);
    goals.forEach((goal, index) => {
      console.log(`Goal ${index + 1}:`, goal);
      console.log(`Program Title: ${goal.programDetails?.programTitle}`);
    });
  }, [goals]);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        if (!companyId) {
          setLoading(false); // Stop loading if no companyId
          return;
        }

        // Load from IndexedDB
        const savedGoals = await getAllCompanyGoalsFromIndexedDB();
        if (savedGoals.length > 0) {
          console.log("Loaded goals from IndexedDB:", savedGoals);
          setGoals(savedGoals); // Update state with goals from IndexedDB
          setLoading(false);
        } else {
          // Fetch from Firestore if no data in IndexedDB
          const fetchedGoals = await dispatch(fetchAllCompanyGoals({ companyId })).unwrap();
          console.log("Fetched goals from Firestore:", fetchedGoals);
          setGoals(fetchedGoals); // Update state with goals from Firestore
          await saveAllCompanyGoalsToIndexedDB(fetchedGoals); // Save to IndexedDB
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading company goals:", error);
        dispatch(showMessage("Failed to load company goals. Please try again."));
        setLoading(false);
      }
    };

    loadGoals();
  }, [companyId, dispatch]);

  const toggleExpand = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newExpandedGoals = new Set(prev);
      if (newExpandedGoals.has(goalId)) {
        newExpandedGoals.delete(goalId);
      } else {
        newExpandedGoals.add(goalId);
      }
      return newExpandedGoals;
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalFromFirestore(goalId); // Remove from Firestore
      const updatedGoals = goals.filter((goal) => goal.goalDetails.goalId !== goalId);
      setGoals(updatedGoals); // Update local state
      await saveAllCompanyGoalsToIndexedDB(updatedGoals); // Update IndexedDB
      dispatch(showMessage("Goal deleted successfully."));
    } catch (error) {
      console.error("Error deleting goal:", error);
      dispatch(showMessage("Failed to delete goal. Please try again."));
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography>Loading company goals...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        All Company Goals
      </Typography>
      {goals.length === 0 ? (
        <Typography>No goals found for this company.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Goal</TableCell>
              <TableCell>Metric</TableCell>
              <TableCell>Min Value</TableCell>
              <TableCell>Program Title</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goals.map((goal) => {
              if (!goal.programDetails || !goal.programDetails.programTitle) {
                console.warn("Invalid goal skipped:", goal);
                return null; // Skip invalid goal
              }

              return (
                <React.Fragment key={goal.goalDetails.goalId}>
                  {/* Parent Goal Row */}
                  <TableRow>
                    <TableCell>
                      <IconButton onClick={() => toggleExpand(goal.goalDetails.goalId)}>
                        {expandedGoals.has(goal.goalDetails.goalId) ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>{goal.goalDetails.goal}</TableCell>
                    <TableCell>{goal.goalDetails.goalMetric}</TableCell>
                    <TableCell>{goal.goalDetails.goalValueMin}</TableCell>
                    <TableCell>{goal.programDetails.programTitle}</TableCell>
                    <TableCell>{goal.programDetails.programStartDate || "N/A"}</TableCell>
                    <TableCell>{goal.programDetails.programEndDate || "N/A"}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => handleDeleteGoal(goal.goalDetails.goalId)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expandable Account Rows */}
                  <TableRow>
                    <TableCell colSpan={8} style={{ padding: 0, border: "none" }}>
                      <Collapse in={expandedGoals.has(goal.goalDetails.goalId)} timeout="auto" unmountOnExit>
                        <Box margin={2}>
                          <Typography variant="h6">Accounts</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Account Name</TableCell>
                                <TableCell>Address</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {goal.accounts.map((account) => (
                                <TableRow key={account.distributorAcctId}>
                                  <TableCell>{account.accountName}</TableCell>
                                  <TableCell>{account.accountAddress}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AllGoalsView;




