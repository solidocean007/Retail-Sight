import React from "react";
import "./upcomingDowngradeBanner.css";
import { useSelector } from "react-redux";
import { RootState } from "../../../utils/store";
import { Timestamp } from "firebase/firestore";

const UpcomingDowngradeBanner: React.FC = () => {
  const company = useSelector(
    (state: RootState) => state.currentCompany.data
  );

  const allPlans = useSelector(
    (state: RootState) => state.plans.allPlans
  );

  if (!company?.billing?.pendingChange) return null;

  const { billing } = company;
  const { pendingChange } = billing;

  const nextPlanId = pendingChange?.nextPlanId;
  const currentPlanId = billing.plan;

  if (!nextPlanId || !currentPlanId) return null;

  const currentPlan = allPlans[currentPlanId];
  const upcomingPlan = allPlans[nextPlanId];

  if (!currentPlan || !upcomingPlan) return null;

  // Usage snapshot
  const currentUsage = {
    users:
      (company.counts?.usersActiveTotal ?? 0) +
      (company.counts?.usersPendingTotal ?? 0),

    connections:
      (company.counts?.connectionsApprovedTotal ?? 0) +
      (company.counts?.connectionsPendingTotal ?? 0),
  };

  const overUsers =
    currentUsage.users > upcomingPlan.userLimit;

  const overConnections =
    currentUsage.connections > upcomingPlan.connectionLimit;

  // Proper Timestamp handling
  let effectiveAt: Date | null = null;

  if (pendingChange?.effectiveAt instanceof Timestamp) {
    effectiveAt = pendingChange.effectiveAt.toDate();
  }

  return (
    <section className="downgrade-banner">
      <div className="downgrade-banner__content">
        <h3>Plan Downgrade Scheduled</h3>

        <p>
          Your plan will change from{" "}
          <strong>{currentPlanId}</strong> to{" "}
          <strong>{nextPlanId}</strong>{" "}
          {effectiveAt && (
            <>
              on{" "}
              <strong>
                {effectiveAt.toLocaleDateString()}
              </strong>
            </>
          )}
          .
        </p>

        <div className="downgrade-banner__limits">
          <div>
            <span>Users:</span>
            <strong>
              {currentUsage.users} / {upcomingPlan.userLimit}
            </strong>
            {overUsers && (
              <span className="limit-warning">
                Over upcoming limit
              </span>
            )}
          </div>

          <div>
            <span>Connections:</span>
            <strong>
              {currentUsage.connections} /{" "}
              {upcomingPlan.connectionLimit}
            </strong>
            {overConnections && (
              <span className="limit-warning">
                Over upcoming limit
              </span>
            )}
          </div>
        </div>

        {(overUsers || overConnections) && (
          <div className="downgrade-banner__alert">
            You must reduce usage before renewal to avoid restricted access.
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingDowngradeBanner;