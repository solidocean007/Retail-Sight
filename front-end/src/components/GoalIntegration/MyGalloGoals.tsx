import { useState } from "react";
import { useSelector } from "react-redux";
import { CircularProgress, Typography, Box, Collapse } from "@mui/material";
import { RootState } from "../../utils/store";
import {
  selectGalloGoalsLoading,
  selectUsersGoalsByTiming,
} from "../../Slices/galloGoalsSlice";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";
import MyGalloGoalCard from "./GalloIntegration/MyGalloGoalCard";

type ViewMode = "current" | "upcoming";

const MyGalloGoals: React.FC = () => {
  const loading = useSelector(selectGalloGoalsLoading);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const salesRouteNum = user?.salesRouteNum;

  const { scheduled, upcoming, current } = useSelector((state: RootState) =>
    selectUsersGoalsByTiming(state, salesRouteNum),
  );

  const [mode, setMode] = useState<ViewMode>("current");
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {},
  );
  const [showScheduled, setShowScheduled] = useState(false);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);

  if (!salesRouteNum) {
    return (
      <Typography color="error" className="no-sales-route">
        You do not have a sales route assigned.
      </Typography>
    );
  }

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  return (
    <div className="my-gallo-goals-container">
      {/* ================= Tabs ================= */}
      <div className="gallo-subtabs">
        <button
          className={`gallo-subtab ${mode === "current" ? "active" : ""}`}
          onClick={() => setMode("current")}
        >
          Current
        </button>

        <button
          className={`gallo-subtab ${mode === "upcoming" ? "active" : ""}`}
          onClick={() => setMode("upcoming")}
        >
          Upcoming ({upcoming.length + scheduled.length})
        </button>
      </div>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
          <Typography>Loading your Gallo goals…</Typography>
        </Box>
      ) : (
        <Box className="programs-wrapper">
          {/* ================= CURRENT MODE ================= */}
          {mode === "current" && (
            <>
              <Typography variant="h6">Current Goals</Typography>

              {current.length > 0 ? (
                current.map((goal) => (
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
                ))
              ) : (
                <Typography className="no-goals-message">
                  You have no active Gallo goals right now.
                </Typography>
              )}
            </>
          )}

          {/* ================= UPCOMING MODE ================= */}
          {mode === "upcoming" && (
            <>
              {/* Upcoming */}
              <Typography variant="h6">Upcoming Goals</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                These goals are visible but cannot be submitted yet.
              </Typography>

              {upcoming.length > 0 ? (
                upcoming.map((goal) => (
                  <MyGalloGoalCard
                    key={goal.goalDetails.goalId}
                    goal={goal}
                    expanded={false}
                    onToggleExpand={() => {}}
                    onViewPostModal={openPostViewer}
                  />
                ))
              ) : (
                <Typography className="no-goals-message">
                  You have no upcoming Gallo goals.
                </Typography>
              )}

              {/* Scheduled (collapsed) */}
              <Box mt={3}>
                <button
                  // className="btn-secondary"
                  onClick={() => setShowScheduled((v) => !v)}
                >
                  {showScheduled ? "Hide" : "Show"} Scheduled Goals (
                  {scheduled.length})
                </button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  These goals are assigned to you but aren’t visible yet. They
                  will move into Upcoming automatically as their dates approach.
                </Typography>

                <Collapse in={showScheduled}>
                  {scheduled.length > 0 ? (
                    <Box className="programs-wrapper">
                      {scheduled.map((goal) => (
                        <div
                          key={goal.goalDetails.goalId}
                          aria-disabled
                          style={{ opacity: 0.5, pointerEvents: "none" }}
                        >
                          <MyGalloGoalCard
                            goal={goal}
                            expanded={false}
                            onToggleExpand={() => {}}
                            onViewPostModal={() => {}}
                            disabled
                          />
                        </div>
                      ))}
                    </Box>
                  ) : (
                    <Typography className="no-goals-message">
                      You have no scheduled Gallo goals.
                    </Typography>
                  )}
                </Collapse>
              </Box>
            </>
          )}
        </Box>
      )}

      <PostViewerModal
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={() => setPostViewerOpen(false)}
        currentUserUid={user?.uid}
      />
    </div>
  );
};

export default MyGalloGoals;
