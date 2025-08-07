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
  selectUsersGalloGoals,
} from "../../Slices/galloGoalsSlice";
import "./gallo-goals.css";
import PostViewerModal from "../PostViewerModal";

const MyGalloGoals: React.FC = () => {
  const loading = useSelector(selectGalloGoalsLoading);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const salesRouteNum = user?.salesRouteNum;
  const usersGalloGoals = useSelector((state: RootState) =>
    selectUsersGalloGoals(state, salesRouteNum)
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
          {usersGalloGoals.map((goal, index) => (
            <Paper key={index} elevation={3} className="program-card">
              {/* Program Header */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                className="program-header"
              >
                <Box>
                  <Typography variant="h6" className="program-title">
                    {goal.programDetails.programTitle}
                  </Typography>
                  <Typography variant="body2" className="program-dates">
                    {goal.programDetails.programStartDate} -{" "}
                    {goal.programDetails.programEndDate}
                  </Typography>
                </Box>
                <Button
                  onClick={() =>
                    toggleProgramExpansion(goal.programDetails.programId)
                  }
                  variant="outlined"
                  size="small"
                >
                  {expandedProgramId === goal.programDetails.programId
                    ? "Close"
                    : "Open"}
                </Button>
              </Box>

              {/* Expandable Goals Section */}
              <Collapse
                in={expandedProgramId === goal.programDetails.programId}
                timeout="auto"
                unmountOnExit
              >
                <Box className="goal-container">
                  <Typography variant="subtitle1" className="goal-title">
                    Goal: {goal.goalDetails.goal}
                  </Typography>
                  <Typography variant="body2" className="goal-metrics">
                    Metric: {goal.goalDetails.goalMetric} | Min Value:{" "}
                    {goal.goalDetails.goalValueMin}
                  </Typography>

                  <Button
                    onClick={() => toggleGoalExpansion(goal.goalDetails.goalId)}
                    variant="outlined"
                    size="small"
                    className="toggle-btn"
                  >
                    {expandedGoals[goal.goalDetails.goalId]
                      ? "Hide Accounts"
                      : "Show Accounts"}
                  </Button>

                  <Collapse
                    in={expandedGoals[goal.goalDetails.goalId]}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Box mt={2}>
                      <Table size="small" className="accounts-table">
                        {window.innerWidth > 600 && (
                          <TableHead>
                            <TableRow>
                              <TableCell>Account Name</TableCell>
                              <TableCell>Account Address</TableCell>
                              <TableCell>Account Number</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </TableHead>
                        )}

                        <TableBody>
                          {goal.accounts.map((account, idx) => (
                            <TableRow key={idx} className="account-row">
                              <TableCell data-label="Account Name">
                                <span className="mobile-header">
                                  Account Name
                                </span>
                                {account.accountName || "N/A"}
                              </TableCell>
                              <TableCell data-label="Account Address">
                                <span className="mobile-header">
                                  Account Address
                                </span>
                                {account.accountAddress || "N/A"}
                              </TableCell>
                              <TableCell data-label="Account Number">
                                <span className="mobile-header">
                                  Account Number
                                </span>
                                {account.distributorAcctId || "N/A"}
                              </TableCell>
                              <TableCell data-label="Status">
                                <span className="mobile-header">Status</span>
                                {account.submittedPostId ? (
                                  <Typography className="submitted-status">
                                    Submitted
                                  </Typography>
                                ) : (
                                  <Typography className="not-submitted-status">
                                    Not Submitted
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell data-label="Action">
                                {account.submittedPostId && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() =>
                                      openPostViewer(account.submittedPostId!)
                                    }
                                  >
                                    View
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </Box>
              </Collapse>
            </Paper>
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
