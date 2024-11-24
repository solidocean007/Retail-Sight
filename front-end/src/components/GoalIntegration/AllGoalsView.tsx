import React, { useEffect, useState } from "react";
import { GalloGoalType } from "../../utils/types";
import { fetchGoalsByCompanyId } from "../../utils/helperFunctions/fetchGoalsByCompanyId";
import {
  getAllCompanyGoalsFromIndexedDB,
  saveAllCompanyGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { collection, onSnapshot } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { deleteGoalFromFirestore } from "../../utils/helperFunctions/deleteGoalFRomFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";

const AllGoalsView = ({ companyId }: { companyId: string }) => {
  const [goals, setGoals] = useState<GalloGoalType[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const cachedGoals = await getAllCompanyGoalsFromIndexedDB();
        if (cachedGoals.length > 0) {
          setGoals(cachedGoals);
          dispatch(showMessage("Loaded goals from cache."));
        } else {
          console.log("Fetching goals from Firestore...");
          const fetchedGoals = await fetchGoalsByCompanyId(companyId);
          if (fetchedGoals.length > 0) {
            await saveAllCompanyGoalsToIndexedDB(fetchedGoals);
            setGoals(fetchedGoals);
            dispatch(showMessage("Goals loaded from Firestore."));
          } else {
            dispatch(showMessage("No goals found for this company."));
          }
        }
      } catch (error) {
        console.error("Error loading goals:", error);
        dispatch(showMessage("Failed to load goals. Please try again."));
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [companyId, dispatch]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "GalloGoals"),
      async (snapshot) => {
        try {
          const updatedGoals = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: data.goalDetails?.goalId || doc.id,
              programId: data.programId || "N/A",
              programTitle: data.programTitle || "Unknown Program",
              programStartDate: data.programStartDate || "",
              programEndDate: data.programEndDate || "",
              companyId: data.companyId || "N/A",
              goalDetails: {
                goalId: data.goalDetails?.goalId || doc.id,
                goal: data.goalDetails?.goal || "No Goal Description",
                goalMetric: data.goalDetails?.goalMetric || "N/A",
                goalValueMin: data.goalDetails?.goalValueMin || "0",
              },
              accounts: data.accounts || [],
            } as GalloGoalType;
          });

          await saveAllCompanyGoalsToIndexedDB(updatedGoals);
          setGoals(updatedGoals);
          dispatch(showMessage("Goals updated from Firestore."));
        } catch (error) {
          console.error("Error syncing goals:", error);
          dispatch(
            showMessage("Failed to sync goals. Please check your connection.")
          );
        }
      }
    );

    return () => unsubscribe();
  }, [dispatch]);

  const handleDeleteGoal = async () => {
    if (deleteGoalId) {
      try {
        await deleteGoalFromFirestore(deleteGoalId);
        const updatedGoals = goals.filter((goal) => goal.id !== deleteGoalId);
        setGoals(updatedGoals);
        await saveAllCompanyGoalsToIndexedDB(updatedGoals);
        dispatch(showMessage("Goal deleted successfully."));
      } catch (error) {
        console.error("Error deleting goal:", error);
        dispatch(showMessage("Failed to delete goal. Please try again."));
      } finally {
        setDeleteGoalId(null);
      }
    }
  };

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

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography>Loading goals...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        All Goals
      </Typography>
      {goals.length === 0 ? (
        <Typography>No goals found for this company.</Typography>
      ) : (
        goals.map((goal) => (
          <Box
            key={goal.id}
            sx={{
              mb: 2,
              border: "1px solid #ddd",
              borderRadius: "8px",
              p: 2,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {/* Goal Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
                {goal.goalDetails.goal}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  textAlign: "center",
                }}
              >
                Start Date: {goal.programStartDate || "N/A"} <br />
                End Date: {goal.programEndDate || "N/A"}
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setDeleteGoalId(goal.id)}
                sx={{ flex: 0 }}
              >
                Delete Goal
              </Button>
            </Box>

            {/* Accounts Tab */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => toggleExpand(goal.id)}
              sx={{ mt: 2, textTransform: "capitalize" }}
            >
              {expandedGoals.has(goal.id) ? "Hide Accounts" : "Show Accounts"}
            </Button>

            {/* Accounts List */}
            <Collapse
              in={expandedGoals.has(goal.id)}
              timeout="auto"
              unmountOnExit
            >
              <Box
                sx={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  mt: 2,
                  p: 2,
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Distributor ID</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Route #</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {goal.accounts.length > 0 ? (
                      goal.accounts
                        .slice() // Create a shallow copy to avoid mutating the original array
                        .sort((a, b) =>
                          a.accountName.localeCompare(b.accountName)
                        ) // Sort by accountName
                        .map((account, index) => (
                          <TableRow key={index}>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>{account.distributorAcctId}</TableCell>
                            <TableCell>{account.accountAddress}</TableCell>
                            <TableCell>
                              {account.salesRouteNums?.join(", ") || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No accounts available for this goal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </Box>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteGoalId !== null}
        onClose={() => setDeleteGoalId(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this goal? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGoalId(null)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteGoal} color="secondary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllGoalsView;
