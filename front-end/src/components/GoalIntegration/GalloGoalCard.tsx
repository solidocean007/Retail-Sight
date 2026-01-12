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
import "./gallo-goal-card.css";
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
  const [accountsOpen, setAccountsOpen] = useState(false);

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
    <Paper elevation={20} className="gallo-goal-card">
      {/* Header */}
      <div className="gallo-goal-card__header">
        <div className="gallo-goal-card__header-text">
          <Typography variant="h6">
            {goal.programDetails.programTitle}
          </Typography>

          <Tooltip title={goal.lifeCycleStatus}>
            <span
              className={`gallo-goal-card__badge gallo-goal-card__badge--${goal.lifeCycleStatus}`}
            >
              {goal.lifeCycleStatus.toUpperCase()}
            </span>
          </Tooltip>

          <div className="gallo-goal-card__dates">
            {goal.programDetails.programStartDate} –{" "}
            {goal.programDetails.programEndDate}
          </div>
        </div>

        <div className="gallo-goal-card__header-actions">
          <Button size="small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Close" : "Open"}
          </Button>

          {canManage && (
            <>
              {goal.lifeCycleStatus === "active" && (
                <>
                  <Button
                    size="small"
                    onClick={() => handleLifecycleChange("archived")}
                  >
                    Archive
                  </Button>
                  <Button
                    size="small"
                    color="warning"
                    onClick={() => handleLifecycleChange("disabled")}
                  >
                    Disable
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="gallo-goal-card__progress">
        <strong>{submittedCount}</strong> / {totalAccounts} submitted
      </div>

      {/* Body */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="gallo-goal-card__body">
          <div className="gallo-goal-card__summary">
            <div className="gallo-goal-card__goal">
              <strong>Goal:</strong> {goal.goalDetails.goal}
            </div>

            <div className="gallo-goal-card__metrics">
              Metric: {goal.goalDetails.goalMetric} | Min:{" "}
              {goal.goalDetails.goalValueMin}
            </div>

            <Button
              size="small"
              onClick={() => setAccountsOpen((v) => !v)}
            >
              {accountsOpen ? "Hide Accounts" : "Show Accounts"}
            </Button>
          </div>

          {/* Accounts */}
          <Collapse in={accountsOpen} timeout="auto" unmountOnExit>
            <div className="gallo-goal-card__accounts">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Salesperson</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {goal.accounts.map((account, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        {Array.isArray(account.salesRouteNums)
                          ? account.salesRouteNums.join(", ")
                          : account.salesRouteNums}
                      </TableCell>
                      <TableCell>
                        {employeeMap[
                          Array.isArray(account.salesRouteNums)
                            ? account.salesRouteNums[0]
                            : account.salesRouteNums
                        ] || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {account.submittedPostId ? (
                          <button
                            onClick={() =>
                              onViewPostModal(account.submittedPostId!)
                            }
                          >
                            View
                          </button>
                        ) : (
                          <span className="gallo-goal-card__status--pending">
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
