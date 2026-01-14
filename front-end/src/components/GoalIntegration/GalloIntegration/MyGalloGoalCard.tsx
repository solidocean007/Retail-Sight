import React, { useMemo } from "react";
import { Button, Collapse, Typography } from "@mui/material";
import "./../companyGoalCard.css";
import { FireStoreGalloGoalDocType } from "../../../utils/types";
import GoalProgressRow from "../GoalProgressRow";

interface Props {
  goal: FireStoreGalloGoalDocType;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  onViewPostModal: (postId: string) => void;
}

const MyGalloGoalCard: React.FC<Props> = ({
  goal,
  expanded,
  onToggleExpand,
  onViewPostModal,
}) => {
  const activeAccounts = useMemo(
    () => goal.accounts.filter((a) => a.status === "active"),
    [goal.accounts]
  );

  const submittedCount = activeAccounts.filter((a) => a.submittedPostId).length;

  const totalAccounts = activeAccounts.length;
  const percentage =
    totalAccounts > 0 ? Math.round((submittedCount / totalAccounts) * 100) : 0;

  return (
    <div className="info-box-company-goal">
      <div
        className="goal-content"
        onClick={() => onToggleExpand(goal.goalDetails.goalId)}
      >
        {/* Badge */}
        <div className="goal-badge">Sales Goal</div>

        {/* Dates */}
        <div className="company-goal-card-start-end">
          <h5>Starts: {goal.programDetails.programStartDate}</h5>
          <h5>Ends: {goal.programDetails.programEndDate}</h5>
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
