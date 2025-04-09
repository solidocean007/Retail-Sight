// AdminCompanyGoalsOverview.tsx
import React, { useState } from "react";
import AdminGoalViewer from "./AdminGoalViewer";
import "./adminCompanyGoalsOverview.css";
import { CompanyGoalType } from "../utils/types";
import "./adminCompanyGoalsOverview.css";
import { Tooltip } from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';


interface CompanyGoalsStatusSummaryProps {
  goals: CompanyGoalType[];
}

const CompanyGoalsStatusSummary: React.FC<CompanyGoalsStatusSummaryProps> = ({
  goals,
}) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  const getSubmissionStats = (goal: CompanyGoalType) => {
    const total = goal.accounts?.length || 0;
    const submitted = goal.submittedPosts?.length || 0;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, percentage };
  };

  return (
    <div className="admin-overview-wrapper">
      <h2>All Company Goals (Admin View)</h2>

      {goals.length === 0 && <p>No goals available for this company.</p>}

      {goals.map((goal) => {
        const { total, submitted, percentage } = getSubmissionStats(goal);
        return (
          <div key={goal.id} className="admin-goal-summary-card">
            <div className="summary-header">
              <div className="summary-title">{goal.goalTitle}</div>
              <div className="summary-details">
                <span className="summary-counts">
                  {submitted} / {total} Submitted
                </span>
                <span
                  className={`summary-percentage ${
                    percentage === 100 ? "complete" : "incomplete"
                  }`}
                >
                  {percentage}%
                  <Tooltip title={`${submitted} of ${total} submitted`}>
                    <InfoIcon fontSize="small" />
                  </Tooltip>
                </span>

                <button
                  className="expand-toggle"
                  onClick={() => handleToggleExpand(goal.id)}
                >
                  {expandedGoalId === goal.id ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>

            {expandedGoalId === goal.id && (
              <div className="expanded-admin-view">
                <AdminGoalViewer goal={goal} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CompanyGoalsStatusSummary;
