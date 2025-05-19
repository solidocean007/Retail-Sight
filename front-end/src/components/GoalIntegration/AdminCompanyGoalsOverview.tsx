// AdminCompanyGoalsOverview.tsx
import React, { useState } from "react";
import "./adminCompanyGoalsOverview.css";
import { useSelector } from "react-redux";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import AdminGoalViewerCard from "./AdminGoalViewerCard";
import { CompanyGoalType } from "../../utils/types";

interface CompanyGoalsStatusSummaryProps {
  goals: CompanyGoalType[];
}

const AdminCompanyGoalsOverview: React.FC<CompanyGoalsStatusSummaryProps> = ({
  goals,
}) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);

  return (
    <div className="admin-overview-wrapper">
      <h2>All Company Goals (Admin View)</h2>
      {goals.length === 0 ? (
        <p>No goals available for this company.</p>
      ) : (
        goals.map((goal) => (
          <AdminGoalViewerCard
            key={goal.id}
            goal={goal}
            isExpanded={expandedGoalId === goal.id}
            toggleExpand={() =>
              setExpandedGoalId((prev) => (prev === goal.id ? null : goal.id))
            }
            allCompanyAccounts={allCompanyAccounts} // ✅ keep this for effectiveAccounts
          />
        ))
      )}
    </div>
  );
};

export default AdminCompanyGoalsOverview;
