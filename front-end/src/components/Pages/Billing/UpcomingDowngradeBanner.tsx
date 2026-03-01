import React from "react";
import "./upcomingDowngradeBanner.css";
import { useSelector } from "react-redux";
import { RootState } from "../../../utils/store";
import { Timestamp } from "firebase/firestore";
import { formatPlanLabel } from "./PlanCard";
import { getFunctions, httpsCallable } from "firebase/functions";

const UpcomingDowngradeBanner: React.FC = () => {
  const company = useSelector((state: RootState) => state.currentCompany.data);
  const allPlans = useSelector((state: RootState) => state.plans.allPlans);
  const functions = getFunctions();
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

  const overUsers = currentUsage.users > upcomingPlan.userLimit;

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
          Your plan will change from <strong>{currentPlanId.toUpperCase()}</strong> to{" "}
          <strong>{nextPlanId.toUpperCase()}</strong>{" "}
          {effectiveAt && (
            <>
              on <strong>{effectiveAt.toLocaleDateString()}</strong>
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
              <span className="limit-warning">Over upcoming limit</span>
            )}
          </div>

          <div>
            <span>Connections:</span>
            <strong>
              {currentUsage.connections} / {upcomingPlan.connectionLimit}
            </strong>
            {overConnections && (
              <span className="limit-warning">Over upcoming limit</span>
            )}
          </div>
          <p className="billing-summary-renewal downgrade">
            Downgrades to{" "}
            <strong>
              {billing?.pendingChange?.nextPlanId && (
                <strong>
                  {formatPlanLabel(billing.pendingChange.nextPlanId).toUpperCase()}
                </strong>
              )}
            </strong>{" "}
            on{" "}
            {(() => {
              const effective = billing?.pendingChange?.effectiveAt;

              if (!effective) return "—";

              // Firestore Timestamp
              if (typeof effective === "object" && "seconds" in effective) {
                return new Date(effective.seconds * 1000).toLocaleDateString();
              }

              // ISO string
              if (typeof effective === "string") {
                const date = new Date(effective);
                return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
              }

              return "—";
            })()}
          </p>
        </div>
        {billing?.pendingChange && (
          <div className="billing-summary-actions">
            <button
              className="btn-secondary"
              onClick={async () => {
                const cancel = httpsCallable(
                  functions,
                  "cancelScheduledDowngrade",
                );
                await cancel({ companyId: company.id });
              }}
            >
              Cancel Downgrade
            </button>
          </div>
        )}

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
