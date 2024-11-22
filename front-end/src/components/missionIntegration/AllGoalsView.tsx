import { useEffect, useState } from "react";
import { GalloGoalType } from "../../utils/types";
import { fetchGoalsByCompanyId } from "../../utils/helperFunctions/fetchGoalsByCompanyId";
import { getAllCompanyGoalsFromIndexedDB, saveAllCompanyGoalsToIndexedDB } from "../../utils/database/indexedDBUtils";
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, CircularProgress } from "@mui/material";
import { collection, onSnapshot } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { deleteGoalFromFirestore } from "../../utils/helperFunctions/deleteGoalFRomFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";

const AllGoalsView = ({ companyId }: { companyId: string }) => {
  const [goals, setGoals] = useState<GalloGoalType[]>([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const loadGoals = async () => {
      try {
        // Step 1: Try loading goals from IndexedDB
        const cachedGoals = await getAllCompanyGoalsFromIndexedDB();

        if (cachedGoals.length > 0) {
          console.log("Loaded goals from IndexedDB");
          setGoals(cachedGoals);
          dispatch(showMessage("Loaded goals from cache."));
        } else {
          // Step 2: Fetch goals from Firestore if none are cached
          console.log("Fetching goals from Firestore...");
          const fetchedGoals = await fetchGoalsByCompanyId(companyId);

          if (fetchedGoals.length > 0) {
            await saveAllCompanyGoalsToIndexedDB(fetchedGoals);
            setGoals(fetchedGoals);
            dispatch(showMessage("Goals loaded from Firestore."));
          } else {
            console.warn("No goals found for this company.");
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
    const unsubscribe = onSnapshot(collection(db, "GalloGoals"), async (snapshot) => {
      try {
        const updatedGoals = snapshot.docs.map((doc) => {
          const data = doc.data();

          const mappedGoal: GalloGoalType = {
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
          };

          return mappedGoal;
        });

        await saveAllCompanyGoalsToIndexedDB(updatedGoals);
        setGoals(updatedGoals);
        dispatch(showMessage("Goals updated from Firestore."));
      } catch (error) {
        console.error("Error syncing goals:", error);
        dispatch(showMessage("Failed to sync goals. Please check your connection."));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalFromFirestore(goalId);

      const updatedGoals = goals.filter((goal) => goal.id !== goalId);
      setGoals(updatedGoals);
      await saveAllCompanyGoalsToIndexedDB(updatedGoals);

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
        <Typography>Loading goals...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4">All Goals</Typography>
      {goals.length === 0 ? (
        <Typography>No goals found for this company.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Goal ID</TableCell>
              <TableCell>Program ID</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goals.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell>{goal.goalDetails.goalId}</TableCell>
                <TableCell>{goal.programId}</TableCell>
                <TableCell>
                  {goal.goalDetails.goal} (Metric: {goal.goalDetails.goalMetric}, Min: {goal.goalDetails.goalValueMin})
                </TableCell>
                <TableCell>
                  <Button variant="outlined" color="secondary" onClick={() => handleDeleteGoal(goal.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default AllGoalsView;


