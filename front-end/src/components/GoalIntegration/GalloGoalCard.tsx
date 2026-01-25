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
import "./galloGoalCard.css";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import { updateGalloGoalLifecycle } from "../../utils/helperFunctions/updateGalloGoalLifecycle";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { useAppDispatch } from "../../utils/store";
import { addOrUpdateGalloGoal } from "../../Slices/galloGoalsSlice";
import EditGalloGoalModal from "./EditGalloGoalModal";
import { GoalActionsMenu } from "./GoalActionsMenu";
import CustomConfirmation from "../CustomConfirmation";
import { formatGoalDate } from "./GalloIntegration/MyGalloGoalCard";

type PendingAction = {
  status: "archived" | "disabled";
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
} | null;

interface ProgramCardProps {
  goal: FireStoreGalloGoalDocType;
  employeeMap: Record<string, string>;
  onViewPostModal: (id: string) => void;

  // NEW (optional)
  showTimingHint?: boolean;
  timingContext?: "scheduled" | "upcoming";
}

function formatDisplayDate(v?: any, fallback = "on a future date"): string {
  if (!v) return fallback;

  // Firestore Timestamp
  if (typeof v.toDate === "function") {
    return v.toDate().toLocaleDateString();
  }

  // ISO string
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? fallback : new Date(ms).toLocaleDateString();
  }

  // Date
  if (v instanceof Date) {
    return v.toLocaleDateString();
  }

  return fallback;
}

const GalloGoalCard: React.FC<ProgramCardProps> = ({
  goal,
  employeeMap,
  onViewPostModal,
  showTimingHint = false,
  timingContext,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const canManage =
    user?.role === "admin" ||
    user?.role === "super-admin" ||
    user?.role === "developer";
  const [expanded, setExpanded] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {},
  );
  const [accountsOpen, setAccountsOpen] = useState(true);

  const confirmLifecycleChange = (status: "archived" | "disabled") => {
    setPendingAction({
      status,
      title: status === "archived" ? "Archive Goal" : "Disable Goal",
      message:
        status === "archived"
          ? "This goal will be archived and removed from active workflows. This cannot be undone."
          : "This goal will be temporarily disabled. Sales reps will not be able to submit new posts.",
      onConfirm: async () => {
        setConfirmLoading(true);

        dispatch(
          addOrUpdateGalloGoal({
            ...goal,
            lifeCycleStatus: status,
            id: goal.goalDetails.goalId,
          }),
        );

        try {
          await updateGalloGoalLifecycle(goal.goalDetails.goalId, status);
        } finally {
          setConfirmLoading(false);
          setPendingAction(null);
        }
      },
    });
  };

  // derived stats (place near top of component)
  const activeAccounts = goal.accounts.filter((a) => a.status === "active");

  const totalAccounts = activeAccounts.length;
  const submittedCount = activeAccounts.filter((a) => a.submittedPostId).length;

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
      <div
        className="gallo-goal-card-body"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="gallo-goal-card__header">
          <div className="gallo-goal-card__header-left">
            <div className="gallo-goal-card__header-text">
              <Typography variant="h6">
                {goal.programDetails.programTitle}
              </Typography>
              <div className="gallo-program-id">
                <p>program id: {goal.goalDetails.goalId}</p>
              </div>
              <span
                className={`gallo-goal-card__badge gallo-goal-card__badge--${goal.lifeCycleStatus}`}
                title={goal.lifeCycleStatus}
              >
                {goal.lifeCycleStatus.toUpperCase()}
              </span>

              <div className="gallo-goal-card__dates">
                <h5>
                  Starts: {formatGoalDate(goal.programDetails.programStartDate)}
                </h5>
                <h5>
                  Ends: {formatGoalDate(goal.programDetails.programEndDate)}
                </h5>
              </div>
            </div>
          </div>
          {showTimingHint && timingContext === "scheduled" && (
            <div className="goal-timing-hint scheduled">
              Scheduled · Displays {formatDisplayDate(goal.displayDate)}
            </div>
          )}

          {showTimingHint && timingContext === "upcoming" && (
            <div className="goal-timing-hint upcoming">
              Upcoming · Starts{" "}
              {goal.programDetails?.programStartDate
                ? new Date(
                    goal.programDetails.programStartDate,
                  ).toLocaleDateString()
                : ""}
            </div>
          )}

          <div
            className="gallo-goal-card__header-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="small" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Close" : "Open"}
            </Button>

            {canManage && (
              <GoalActionsMenu
                status={
                  goal.lifeCycleStatus as "active" | "disabled" | "archived"
                }
                onArchive={() => confirmLifecycleChange("archived")}
                onDisable={() => confirmLifecycleChange("disabled")}
                onEdit={() => setEditOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="gallo-goal-card__progress">
          <strong>{submittedCount}</strong> / {totalAccounts} submitted
        </div>
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
            {/* <Button size="small" onClick={() => setAccountsOpen((v) => !v)}>
              {accountsOpen ? "Hide Accounts" : "Show Accounts"}
            </Button> */}
          </div>

          {/* Accounts */}
          <Collapse in={accountsOpen} timeout="auto" unmountOnExit>
            <div className="gallo-goal-card__accounts">
              {goal.accounts.length !== activeAccounts.length && (
                <Typography variant="caption" color="text.secondary">
                  {goal.accounts.length - activeAccounts.length} inactive
                  account(s) hidden
                </Typography>
              )}

              {/* Mobile cards */}
              <div className="gallo-goal-card__accounts-mobile">
                {activeAccounts.map((account, idx) => (
                  <div key={idx} className="account-card">
                    <div className="account-card__title">
                      {account.accountName}
                    </div>

                    <div className="account-card__row">
                      <span>Route</span>
                      <span>
                        {Array.isArray(account.salesRouteNums)
                          ? account.salesRouteNums.join(", ")
                          : account.salesRouteNums}
                      </span>
                    </div>

                    <div className="account-card__row">
                      <span>Salesperson</span>
                      <span>
                        {employeeMap[
                          Array.isArray(account.salesRouteNums)
                            ? account.salesRouteNums[0]
                            : account.salesRouteNums
                        ] || "Unknown"}
                      </span>
                    </div>

                    <div className="account-card__row">
                      <span>Status</span>
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
                    </div>
                  </div>
                ))}
              </div>

              <div className="gallo-goal-card__accounts-table">
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
                    {activeAccounts.map((account, idx) => (
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
            </div>
          </Collapse>
        </div>
      </Collapse>
      {editOpen && (
        <EditGalloGoalModal goal={goal} onClose={() => setEditOpen(false)} />
      )}
      {pendingAction && (
        <CustomConfirmation
          isOpen
          title={pendingAction.title}
          message={pendingAction.message}
          loading={confirmLoading}
          onClose={() => setPendingAction(null)}
          onConfirm={pendingAction.onConfirm}
        />
      )}
    </Paper>
  );
};

export default GalloGoalCard;
