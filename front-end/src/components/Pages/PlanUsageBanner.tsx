import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../utils/store";
import "./planUsageBanner.css";

const PlanUsageBanner: React.FC = () => {
  const company = useSelector((state: RootState) => state.currentCompany.data);

  const allPlans = useSelector((state: RootState) => state.plans.allPlans);

  if (!company?.billing?.plan || !company?.counts) return null;

  const currentPlan = allPlans[company.billing.plan];
  if (!currentPlan) return null;

  const upcomingPlan = company.billing.pendingChange
    ? allPlans[company.billing.pendingChange.nextPlanId]
    : null;

  // Effective limits (respect downgrade)
  const effectiveUserLimit = upcomingPlan
    ? Math.min(currentPlan.userLimit, upcomingPlan.userLimit)
    : currentPlan.userLimit;

  
  const effectiveConnectionLimit = upcomingPlan
    ? Math.min(currentPlan.connectionLimit, upcomingPlan.connectionLimit)
    : currentPlan.connectionLimit;

  const usersUsed =
    (company.counts.usersActiveTotal ?? 0) +
    (company.counts.usersPendingTotal ?? 0);

  const connectionsUsed =
    (company.counts.connectionsApprovedTotal ?? 0) +
    (company.counts.connectionsPendingTotal ?? 0);

  const userPercent = usersUsed / effectiveUserLimit;
  const connectionPercent = connectionsUsed / effectiveConnectionLimit;

  const getState = (percent: number) => {
    if (percent >= 1) return "limit";
    if (percent >= 0.8) return "warning";
    return "normal";
  };

  const userState = getState(userPercent);
  const connectionState = getState(connectionPercent);

  if (userState === "normal" && connectionState === "normal") {
    return null; // don’t show unless near limit
  }

  return (
    <section
      className={`plan-usage-banner ${userState === "limit" || connectionState === "limit" ? "limit" : "warning"}`}
    >
      <div className="plan-usage-banner__content">
        <h3>Plan Usage</h3>

        <div className="plan-usage-row">
          <span>Users:</span>
          <strong>
            {usersUsed} / {effectiveUserLimit}
          </strong>
        </div>

        <div className="plan-usage-row">
          <span>Connections:</span>
          <strong>
            {connectionsUsed} / {effectiveConnectionLimit}
          </strong>
        </div>

        {userState === "limit" || connectionState === "limit" ? (
          <div className="plan-usage-alert">
            You’ve reached your plan limit. Upgrade to continue adding users or
            connections.
          </div>
        ) : (
          <div className="plan-usage-alert">
            You’re approaching your plan limit.
          </div>
        )}
      </div>
    </section>
  );
};

export default PlanUsageBanner;
