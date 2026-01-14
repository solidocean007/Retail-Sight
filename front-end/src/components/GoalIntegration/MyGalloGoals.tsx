import { useState } from "react";
import { useSelector } from "react-redux";
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
  Paper,
} from "@mui/material";
import { RootState } from "../../utils/store";
import {
  selectGalloGoalsLoading,
  selectUsersActiveGalloGoals,
  selectUsersGalloGoals,
} from "../../Slices/galloGoalsSlice";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";
import { GalloAccountType } from "../../utils/types";
import MyGalloGoalCard from "./GalloIntegration/MyGalloGoalCard";

const MyGalloGoals: React.FC = () => {
  const loading = useSelector(selectGalloGoalsLoading);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const salesRouteNum = user?.salesRouteNum;
  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersActiveGalloGoals(state, salesRouteNum)
  );

  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    null
  );
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );

  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const closePostViewer = () => {
    setPostViewerOpen(false);
  };

  const toggleProgramExpansion = (programId: string) => {
    setExpandedProgramId((prev) => (prev === programId ? null : programId));
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  if (!salesRouteNum) {
    return (
      <Typography color="error" className="no-sales-route">
        You do not have a sales route assigned.
      </Typography>
    );
  }

  return (
    <div className="my-gallo-goals-container">
      <Typography variant="h4" className="gallo-goals-header">
        Gallo Programs
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
          <Typography variant="body1">Loading your Gallo goals…</Typography>
        </Box>
      ) : usersGalloGoals.length === 0 ? (
        <Typography className="no-goals-message">
          No Gallo goals available for your accounts at this time.
        </Typography>
      ) : (
        <Box className="programs-wrapper">
          {usersGalloGoals.map((goal) => (
            <MyGalloGoalCard
              key={goal.goalDetails.goalId}
              goal={goal}
              expanded={expandedGoals[goal.goalDetails.goalId]}
              onToggleExpand={(id) =>
                setExpandedGoals((prev) => ({
                  ...prev,
                  [id]: !prev[id],
                }))
              }
              onViewPostModal={openPostViewer}
            />
          ))}
        </Box>
      )}
      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={closePostViewer}
        currentUserUid={user?.uid}
      />
    </div>
  );
};

export default MyGalloGoals;
