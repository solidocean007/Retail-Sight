import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CircularProgress, Typography, Box } from "@mui/material";
import { RootState } from "../../utils/store";
import {
  selectGalloGoalsLoading,
  selectUsersActiveGalloGoals,
  selectUsersGalloGoals,
} from "../../Slices/galloGoalsSlice";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";
import MyGalloGoalCard from "./GalloIntegration/MyGalloGoalCard";

const toMillisSafe = (v?: any): number | null => {
  if (!v) return null;
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : ms;
  }
  if (v instanceof Date) return v.getTime();
  return null;
};

const MyGalloGoals: React.FC = () => {
  const loading = useSelector(selectGalloGoalsLoading);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const salesRouteNum = user?.salesRouteNum;
  const allUserGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum),
  );

  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    null,
  );
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {},
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

  const now = Date.now();

  const { upcomingGoals, currentGoals } = useMemo(() => {
    const upcoming: typeof allUserGoals = [];
    const current: typeof allUserGoals = [];

    allUserGoals.forEach((goal) => {
      if (goal.lifeCycleStatus !== "active") return;

      const displayAt = toMillisSafe(goal.displayDate);

      if (displayAt && displayAt > now) {
        upcoming.push(goal);
        return;
      }

      const end = goal.programDetails?.programEndDate
        ? new Date(goal.programDetails.programEndDate).getTime()
        : null;

      if (end && end < now) return;

      current.push(goal);
    });

    upcoming.sort(
      (a, b) =>
        (toMillisSafe(a.displayDate) ?? 0) - (toMillisSafe(b.displayDate) ?? 0),
    );

    return { upcomingGoals: upcoming, currentGoals: current };
  }, [allUserGoals]);

  return (
    <div className="my-gallo-goals-container">
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
          <Typography variant="body1">Loading your Gallo goals…</Typography>
        </Box>
      ) : allUserGoals.length === 0 ? (
        <Typography className="no-goals-message">
          No Gallo goals available for your accounts at this time.
        </Typography>
      ) : (
        <Box className="programs-wrapper">
          {/* Upcoming */}
          {upcomingGoals.length > 0 && (
            <Box mb={3}>
              <Typography variant="h6">Upcoming Goals</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                These goals are approved and will become active soon.
              </Typography>

              {upcomingGoals.map((goal) => (
                <MyGalloGoalCard
                  key={goal.goalDetails.goalId}
                  goal={goal}
                  expanded={false}
                  onToggleExpand={() => {}}
                  onViewPostModal={openPostViewer}
                  // isUpcoming // ← optional prop if you want styling later
                />
              ))}
            </Box>
          )}

          {/* Current */}
          {currentGoals.length > 0 ? (
            <Box>
              <Typography variant="h6">Current Goals</Typography>

              {currentGoals.map((goal) => (
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
          ) : (
            <Typography className="no-goals-message">
              You have no active Gallo goals right now.
            </Typography>
          )}
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
