//MyGoals.tsx
import React, { useEffect } from "react";
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
} from "@mui/material";
import {
  fetchUserGalloGoals,
  selectGoals,
  selectGoalsLoading,
  selectLastUpdated,
  setGoals,
} from "../Slices/goalsSlice";
import { getGoalsFromIndexedDB, saveGoalsToIndexedDB } from "../utils/database/indexedDBUtils";

const MyGoals = () => {
  const dispatch = useAppDispatch();
  const goals = useSelector((state: RootState) => state.goals.goals);
  const loading = useSelector(selectGoalsLoading);
  const lastUpdated = useSelector(selectLastUpdated);

  console.log(goals) // logs empty

  useEffect(() => {
    const loadGoals = async () => {
      const savedGoals = await getGoalsFromIndexedDB();

      if (savedGoals.length > 0) {
        dispatch(setGoals(savedGoals)); // Load from IndexedDB
      } else {
        const fetchedGoals = await dispatch(fetchUserGalloGoals()).unwrap();
        await saveGoalsToIndexedDB(fetchedGoals); // Save to IndexedDB
      }
    };

    loadGoals();
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchUserGalloGoals());
  };

  return (
    <div>
      <Typography variant="h5">My Goals</Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Button variant="contained" onClick={handleRefresh} disabled={loading}>
            Refresh Goals
          </Button>
          {lastUpdated && (
            <Typography variant="body2">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </Typography>
          )}
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
                {goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>{goal.programTitle}</TableCell>
                    <TableCell>{goal.goalDetails.goal}</TableCell>
                    <TableCell>{goal.goalDetails.goalMetric}</TableCell>
                    <TableCell>{goal.goalDetails.goalValueMin}</TableCell>
                    <TableCell>{goal.programStartDate}</TableCell>
                    <TableCell>{goal.programEndDate}</TableCell>
                    <TableCell>
                      {goal.accounts.map((acc) => acc.accountName).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
};

export default MyGoals;

