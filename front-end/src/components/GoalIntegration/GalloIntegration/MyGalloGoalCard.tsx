import React, { useMemo } from "react";
import { Button, Collapse, Typography } from "@mui/material";
import "./../companyGoalCard.css";
import { FireStoreGalloGoalDocType } from "../../../utils/types";
import GoalProgressRow from "../GoalProgressRow";
import { getGoalTimingState } from "../utils/getGoalTimingState";
import { daysFromNow, toMillisSafe } from "../utils/goalTimingUtils";

export function formatGoalDate(v?: any) {
  if (!v) return "—";

  if (typeof v?.toDate === "function") {
    return v.toDate().toLocaleDateString();
  }

  if (v instanceof Date) {
    return v.toLocaleDateString();
  }

  if (typeof v === "string") {
    const ms = Date.parse(v);
    if (!Number.isNaN(ms)) {
      return new Date(ms).toLocaleDateString();
    }
  }

  return "—";
}

interface Props {
  goal: FireStoreGalloGoalDocType;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  onViewPostModal: (postId: string) => void;
  disabled?: boolean;
}

const MyGalloGoalCard: React.FC<Props> = ({
  goal,
  expanded,
  onToggleExpand,
  onViewPostModal,
  disabled = false,
}) => {
  const activeAccounts = useMemo(
    () => goal.accounts.filter((a) => a.status === "active"),
    [goal.accounts],
  );
  console.log(goal);
  const submittedCount = activeAccounts.filter((a) => a.submittedPostId).length;

  const totalAccounts = activeAccounts.length;
  const percentage =
    totalAccounts > 0 ? Math.round((submittedCount / totalAccounts) * 100) : 0;

  const timingState = getGoalTimingState(goal);

  const displayAt = toMillisSafe(goal.displayDate);
  const startAt = toMillisSafe(goal.programDetails?.programStartDate);

  let timingLabel: string | null = null;

  if (timingState === "scheduled" && displayAt) {
    const d = daysFromNow(displayAt);
    timingLabel =
      d > 0 ? `Visible in ${d} day${d > 1 ? "s" : ""}` : "Visible soon";
  }

  if (timingState === "upcoming" && startAt) {
    const d = daysFromNow(startAt);
    timingLabel =
      d > 0 ? `Starts in ${d} day${d > 1 ? "s" : ""}` : "Starting soon";
  }

  return (
    <div className="info-box-company-goal">
      <div
        className={`goal-content ${disabled ? "goal-card-disabled" : "goal-card-clickable"}`}
        onClick={() => !disabled && onToggleExpand(goal.goalDetails.goalId)}
      >
        <div className="goal-badge-row">
          <div className={`goal-badge badge-${timingState}`}>
            {timingState === "current" && "Active"}
            {timingState === "upcoming" && "Upcoming"}
            {timingState === "scheduled" && "Scheduled"}
          </div>

          {timingLabel && <div className="goal-timing-hint">{timingLabel}</div>}
        </div>

        {/* Dates */}
        <div className="company-goal-card-start-end">
          <h5>
            Starts: {formatGoalDate(goal.programDetails.programStartDate)}
          </h5>
          <h5>Ends: {formatGoalDate(goal.programDetails.programEndDate)}</h5>
        </div>

        {/* Title */}
        <div className="info-title-row">
          <div className="info-title">{goal.programDetails.programTitle}</div>
        </div>

        {/* Description + Progress */}
        <div className="info-layout-row">
          <div className="info-description">
            <p className="description-text">
              <strong>Goal:</strong> {goal.goalDetails.goal}
            </p>

            <p className="description-text">
              Metric: {goal.goalDetails.goalMetric} · Min:{" "}
              {goal.goalDetails.goalValueMin}
            </p>
          </div>

          <div className="goal-progress-section">
            <Typography variant="caption">Progress</Typography>

            <div className="goal-progress-numbers">
              <div>
                {submittedCount} / {totalAccounts} submitted
              </div>
              <div className={`completion completion-${percentage}`}>
                {percentage}% Completed
              </div>
            </div>
          </div>
        </div>
        {/* Expand toggle */}
        {/* <div className="info-layout-row-bottom">
          <Button
            variant="outlined"
            size="small"
            onClick={() => onToggleExpand(goal.goalDetails.goalId)}
          >
            {expanded ? "Hide accounts" : "Show accounts"}
          </Button>
        </div> */}
      </div>

      {/* Expanded accounts */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="expanded-submissions">
          <GoalProgressRow
            title="Your Accounts"
            completionPercentage={percentage}
            submissions={activeAccounts
              .filter((a) => a.submittedPostId)
              .map((a) => ({
                postId: a.submittedPostId!,
                storeName: a.accountName,
                // submittedAt: a.submittedAt ?? "",
              }))}
            unsubmittedAccounts={activeAccounts
              .filter((a) => !a.submittedPostId)
              .map((a) => ({
                accountName: a.accountName,
                accountAddress: a.accountAddress || "",
                accountNumber: a.distributorAcctId,
              }))}
            onViewPost={onViewPostModal}
          />
        </div>
      </Collapse>
    </div>
  );
};

export default MyGalloGoalCard;
