// ProgramCard.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Collapse,
  Button,
  Paper,
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Tooltip,
} from "@mui/material";
import "./gallo-goals.css";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import { updateGalloGoalLifecycle } from "../../utils/helperFunctions/updateGalloGoalLifecycle";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useAppDispatch } from "../../utils/store";
import { addOrUpdateGalloGoal } from "../../Slices/galloGoalsSlice";

interface ProgramCardProps {
  goal: FireStoreGalloGoalDocType;
  employeeMap: Record<string, string>;
  onViewPostModal: (id: string) => void;
}

const GalloGoalCard: React.FC<ProgramCardProps> = ({
  goal,
  employeeMap,
  onViewPostModal,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const canManage =
    user?.role === "admin" ||
    user?.role === "super-admin" ||
    user?.role === "developer";
  const [expanded, setExpanded] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );

  const handleViewGoalPost = (postId: string) => {
    console.log("👀 Gallo View button clicked", postId);
    onViewPostModal(postId);
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const handleLifecycleChange = async (
    status: "active" | "archived" | "disabled"
  ) => {
    // optimistic
    dispatch(
      addOrUpdateGalloGoal({
        // galloGoalsSlice.ts(45, 3): 'id' is declared here.
        ...goal,
        lifeCycleStatus: status,
        id: goal.goalDetails.goalId, // ✅ REQUIRED
      })
    );

    try {
      await updateGalloGoalLifecycle(goal.goalDetails.goalId, status);
    } catch (e) {
      // optional rollback later
      console.error(e);
    }
  };

  // derived stats (place near top of component)
  const totalAccounts = goal.accounts.length;
  const submittedCount = goal.accounts.filter((a) => a.submittedPostId).length;

  const progressRatio = totalAccounts > 0 ? submittedCount / totalAccounts : 0;

  let progressClass = "progress-none";
  if (submittedCount === totalAccounts && totalAccounts > 0) {
    progressClass = "progress-complete";
  } else if (progressRatio >= 0.5) {
    progressClass = "progress-warning";
  } else if (submittedCount > 0) {
    progressClass = "progress-active";
  }

  return (
    <Paper elevation={20} className="program-card">
      <Box className="program-header">
        <Box>
          <Typography variant="h6" className="program-title">
            {goal.programDetails.programTitle}
          </Typography>
          {goal.programDetails.programId}
          <Tooltip
            arrow
            title={
              goal.lifeCycleStatus === "active"
                ? "This goal is live and accepting submissions"
                : goal.lifeCycleStatus === "archived"
                ? "This goal is historical and read-only"
                : "This goal is intentionally disabled"
            }
          >
            <span
              className={`lifecycle-badge lifecycle-${goal.lifeCycleStatus}`}
            >
              {goal.lifeCycleStatus.toUpperCase()}
            </span>
          </Tooltip>

          <Typography variant="body2" className="program-dates">
            {goal.programDetails.programStartDate} -{" "}
            {goal.programDetails.programEndDate}
          </Typography>
        </Box>
        <Button
          onClick={() => setExpanded(!expanded)}
          variant="outlined"
          size="small"
          className="toggle-btn"
        >
          {expanded ? "Close" : "Open"}
        </Button>
        {canManage && (
          <Box display="flex" gap={1}>
            {goal.lifeCycleStatus === "active" && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleLifecycleChange("archived")}
                >
                  Archive
                </Button>

                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  onClick={() => handleLifecycleChange("disabled")}
                >
                  Disable
                </Button>
              </>
            )}

            {(goal.lifeCycleStatus === "archived" ||
              goal.lifeCycleStatus === "disabled") && (
              <Button
                size="small"
                color="success"
                variant="outlined"
                onClick={() => handleLifecycleChange("active")}
              >
                Re-Enable
              </Button>
            )}
          </Box>
        )}
      </Box>
      <Box className="goal-progress">
        <div className={`goal-progress-count ${progressClass}`}>
          <strong>{submittedCount}</strong> / {totalAccounts} submitted
        </div>

        <div className="goal-progress-bar">
          <div
            className={`goal-progress-fill ${progressClass}`}
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="goal-container">
          <div className="goal-details">
            <div className="goal-text">
              <div className="goal-title">Goal: {goal.goalDetails.goal}</div>

              <div className="program-description">
                {goal.programDetails.programDescription}
              </div>

              <div className="goal-metrics">
                Metric: {goal.goalDetails.goalMetric} | Min Value:{" "}
                {goal.goalDetails.goalValueMin}
              </div>
            </div>

            <div className="show-hide-gallo-accounts-button">
              <button
                onClick={() => toggleGoalExpansion(goal.goalDetails.goalId)}
                className="btn-secondary"
              >
                {expandedGoals[goal.goalDetails.goalId]
                  ? "Hide Accounts"
                  : "Show Accounts"}
              </button>
            </div>
          </div>

          <Collapse
            in={expandedGoals[goal.goalDetails.goalId]}
            timeout="auto"
            unmountOnExit
          >
            <div className="accounts-wrapper">
              <Table size="small" className="accounts-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Account Name</TableCell>
                    <TableCell>Account Address</TableCell>
                    <TableCell>Sales Route #</TableCell>
                    <TableCell>Salesperson</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {goal.accounts.map((account, idx) => (
                    <TableRow key={idx} className="account-row">
                      <TableCell data-label="Account Name">
                        {account.accountName || "N/A"}
                      </TableCell>
                      <TableCell data-label="Account Address">
                        {account.accountAddress || "N/A"}
                      </TableCell>
                      <TableCell data-label="Sales Route #">
                        {Array.isArray(account.salesRouteNums)
                          ? account.salesRouteNums.join(", ")
                          : account.salesRouteNums || "N/A"}
                      </TableCell>
                      <TableCell data-label="Salesperson">
                        {Array.isArray(account.salesRouteNums)
                          ? employeeMap[account.salesRouteNums[0]] || "Unknown"
                          : employeeMap[account.salesRouteNums] || "Unknown"}
                      </TableCell>
                      <TableCell data-label="Status">
                        {account.submittedPostId ? (
                          <button
                            onClick={() =>
                              account.submittedPostId &&
                              handleViewGoalPost(account.submittedPostId)
                            }
                          >
                            View
                          </button>
                        ) : (
                          <span className="not-submitted-status">
                            Not Submitted
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Collapse>
        </div>
      </Collapse>
    </Paper>
  );
};

export default GalloGoalCard;
