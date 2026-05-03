// components/GoalIntegration/SupplierGoalCard.tsx
import React, { useMemo } from "react";
import { Button, Collapse, Tooltip, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Timestamp } from "firebase/firestore";
import { CompanyGoalWithIdType } from "../../utils/types";
import "./companyGoalCard.css";

type SupplierGoal = CompanyGoalWithIdType & {
  originCompanyName?: string;
};

interface SupplierGoalCardProps {
  goal: SupplierGoal;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  mobile?: boolean;
  onViewPostModal: (postId: string, target?: HTMLElement) => void;
}

const formatSubmittedAt = (value: unknown) => {
  if (!value) return "";

  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }

  return "";
};

const SupplierGoalCard: React.FC<SupplierGoalCardProps> = ({
  goal,
  expanded,
  onToggleExpand,
  mobile = false,
  onViewPostModal,
}) => {
  const submittedPosts = useMemo(() => {
    return [...(goal.submittedPosts || [])].sort((a, b) => {
      const aDate =
        typeof a.submittedAt === "string"
          ? new Date(a.submittedAt).getTime()
          : a.submittedAt instanceof Timestamp
            ? a.submittedAt.toDate().getTime()
            : 0;

      const bDate =
        typeof b.submittedAt === "string"
          ? new Date(b.submittedAt).getTime()
          : b.submittedAt instanceof Timestamp
            ? b.submittedAt.toDate().getTime()
            : 0;

      return bDate - aDate;
    });
  }, [goal.submittedPosts]);

  const submittedCount = submittedPosts.length;

  return (
    <div className="info-box-company-goal">
      <div className="goal-badge">Supplier Goal</div>

      <div className="company-goal-card-header">
        <div className="company-goal-card-start-end">
          <h3>Starts: {goal.goalStartDate || "N/A"}</h3>
          <h3>Ends: {goal.goalEndDate || "N/A"}</h3>
        </div>

        <div className="info-title-row">
          <div className="info-title">{goal.goalTitle}</div>
        </div>

        {goal.originCompanyName && (
          <Typography variant="caption" color="text.secondary">
            Created by {goal.originCompanyName}
          </Typography>
        )}
      </div>

      <div className="info-layout-row">
        <div className="info-layout">
          <div className="info-description">
            {goal.goalDescription || "No goal description provided."}

            {goal.perUserQuota && (
              <div className="info-quota">
                Requirement: Each user must submit at least {goal.perUserQuota}{" "}
                submission{goal.perUserQuota > 1 ? "s" : ""}.
              </div>
            )}
          </div>
        </div>

        <div className="goal-progress-section">
          <Typography variant="caption">Supplier Visibility</Typography>

          <div className="goal-progress-numbers">
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{submittedCount} Total Submissions</span>

              <Tooltip title="Posts submitted by the distributor for this supplier-linked goal.">
                <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
              </Tooltip>
            </div>

            {goal.originCompanyName && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span>{goal.originCompanyName}</span>

                <Tooltip title="Distributor company that created this goal.">
                  <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        <div className="info-layout-row-bottom">
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(goal.id);
            }}
            disabled={submittedCount === 0}
          >
            {expanded ? "Hide submissions" : "Show submissions"}
          </Button>
        </div>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Submissions
        </Typography>

        {submittedCount === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No submissions have been attached to this goal yet.
          </Typography>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <tbody>
                {submittedPosts.map((submission, index) => {
                  const submittedBy = submission.submittedBy
                    ? `${submission.submittedBy.firstName || ""} ${
                        submission.submittedBy.lastName || ""
                      }`.trim()
                    : "Unknown user";

                  const accountName =
                    submission.account?.accountName || "Unknown account";

                  const accountAddress =
                    submission.account?.accountAddress || "";

                  return (
                    <tr key={`${submission.postId}-${index}`}>
                      <td className="user-table-count">{index + 1}</td>

                      <td>
                        <div className="user-info-cell">
                          <div className="user-name-cell">{accountName}</div>

                          <span className="completion-pill high">
                            Submitted
                          </span>
                        </div>

                        <div className="submissions-wrapper">
                          <div className="submission-item">
                            <div className="store-name">{submittedBy}</div>

                            {accountAddress && (
                              <div className="submitted-at">
                                {accountAddress}
                              </div>
                            )}

                            <div className="submitted-at">
                              {formatSubmittedAt(submission.submittedAt)}
                            </div>

                            <button
                              onClick={(e) =>
                                onViewPostModal(
                                  submission.postId,
                                  e.currentTarget,
                                )
                              }
                            >
                              View Post
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Collapse>
    </div>
  );
};

export default SupplierGoalCard;