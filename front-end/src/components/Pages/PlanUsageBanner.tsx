import React from "react";
import { useSelector } from "react-redux";
import "./planUsageBanner.css";
import { RootState } from "../../utils/store";
import UpcomingDowngradeBanner from "./Billing/UpcomingDowngradeBanner";

const PlanUsageBanner: React.FC = () => {
  const company = useSelector((state: RootState) => state.currentCompany.data);

  const allPlans = useSelector((state: RootState) => state.plans.allPlans);

  if (!company?.billing?.plan || !company?.counts) return null;

  const upcomingDowngrade = company.billing.pendingChange?.nextPlanId;

  const currentPlan = allPlans[company.billing.plan];
  if (!currentPlan) return null;

  const nextPlanId = company.billing.pendingChange?.nextPlanId;
  const upcomingPlan = nextPlanId ? allPlans[nextPlanId] : null;

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

  const userPercent =
    effectiveUserLimit > 0 ? usersUsed / effectiveUserLimit : 0;

  const connectionPercent =
    effectiveConnectionLimit > 0
      ? connectionsUsed / effectiveConnectionLimit
      : 0;

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
        {!upcomingDowngrade && (
          <p>Usage includes active and pending users and connections.</p>
        )}
        {upcomingDowngrade && (
          <p>
            Usage is calculated based on your upcoming downgrade to to {upcomingPlan?.braintreePlanId.toUpperCase()}.
          </p>
        )}

        <div className="plan-usage-row">
          <span>Users:</span>
          <strong>
            {usersUsed} / {effectiveUserLimit}
          </strong>
          {effectiveUserLimit - usersUsed > 0 && (
            <em className="remaining">
              {" "}
              ({effectiveUserLimit - usersUsed} remaining)
            </em>
          )}
        </div>

        <div className="plan-usage-row">
          <span>Connections:</span>
          <strong>
            {connectionsUsed} / {effectiveConnectionLimit}
          </strong>
          {effectiveConnectionLimit - connectionsUsed > 0 && (
            <em className="remaining">
              {" "}
              ({effectiveConnectionLimit - connectionsUsed} remaining)
            </em>
          )}
        </div>

        {userState === "limit" || connectionState === "limit" ? (
          <div className="plan-usage-alert">
            {!upcomingDowngrade && (
              <p>You’ve reached your plan limit. Upgrade to continue adding users or connections.</p>
            )}
            {upcomingDowngrade && (
              <p>You’ve reached your plan limit for the upcoming downgrade. Cancel the downgrade to continue adding users or connections.</p>
            )}
          </div>
        ) : (
          <div className="plan-usage-alert">
            You’re approaching your plan limit.
          </div>
        )}
      </div>
      {/* <UpcomingDowngradeBanner /> */}
    </section>
  );
};

export default PlanUsageBanner;
