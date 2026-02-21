// components/billing/BillingDashboard.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { db, functions } from "../../../utils/firebase";
import { selectCurrentCompany } from "../../../Slices/currentCompanySlice";
import CheckoutModal from "./CheckoutModal";
import "./billingDashboard.css";
import { RootState, useAppDispatch } from "../../../utils/store";
import { CompanyBilling, PlanType, UserType } from "../../../utils/types";
import PlanCard, { formatPlanLabel } from "./PlanCard";
import { useNavigate } from "react-router-dom";
import { showMessage } from "../../../Slices/snackbarSlice";
import CustomConfirmation from "../../CustomConfirmation";

const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const company = useSelector(selectCurrentCompany) as any;
  const currentCompanyId = useSelector(selectCurrentCompany)?.id;
  const user = useSelector(
    (state: RootState) => state.user.currentUser,
  ) as UserType;
  const companyName = company?.name;
  const email = user?.email;
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [billingInfo, setBillingInfo] = useState<CompanyBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  const hasPendingDowngrade = !!billingInfo?.pendingChange;
  const [prefetchedClientToken, setPrefetchedClientToken] = useState<
    string | null
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingDowngradePlan, setPendingDowngradePlan] =
    useState<PlanType | null>(null);

  const derivedPaymentStatus = useMemo(() => {
    if (!billingInfo) return "inactive";

    const normalizedStatus = billingInfo.paymentStatus?.toLowerCase?.() ?? null;

    if (billingInfo.plan === "free") return "free";

    if (normalizedStatus === "canceled") return "canceled";

    // Handle renewal date (string or timestamp)
    if (billingInfo.renewalDate) {
      let renewalMs: number | null = null;

      if (
        typeof billingInfo.renewalDate === "object" &&
        "seconds" in billingInfo.renewalDate
      ) {
        renewalMs = billingInfo.renewalDate.seconds * 1000;
      }

      if (typeof billingInfo.renewalDate === "string") {
        renewalMs = new Date(billingInfo.renewalDate).getTime();
      }

      if (renewalMs && renewalMs > Date.now()) {
        return "active";
      }
    }

    return normalizedStatus ?? "inactive";
  }, [billingInfo]);

  useEffect(() => {
    import("braintree-web-drop-in");
  }, []);

  useEffect(() => {
    if (!currentCompanyId) return;

    const getClientToken = httpsCallable<
      { companyId: string },
      { clientToken: string }
    >(functions, "getClientToken");

    getClientToken({ companyId: currentCompanyId })
      .then(({ data }) => {
        setPrefetchedClientToken(data.clientToken);
      })
      .catch(() => {
        // silent fail, modal will fetch normally
      });
  }, [currentCompanyId]);

  const fetchPlans = useCallback(async () => {
    try {
      const querySnap = await getDocs(collection(db, "plans"));
      const planList = querySnap.docs.map((doc) => ({
        ...doc.data(),
      })) as PlanType[];

      // Show hidden/internal plans only if Healy company
      const visiblePlans =
        currentCompanyId === "3WOAwgj3l3bnvHqE4IV3"
          ? planList
          : planList.filter((p) => p.braintreePlanId !== "healy_plan");

      setPlans(visiblePlans);

      console.log(planList);

      const freePlan =
        planList.find((plan) => plan.braintreePlanId === "free") || null;
      // setFreePlan(freePlan);
    } catch (err) {
      console.error("Error loading plans:", err);
    } finally {
      setLoading(false);
    }
  }, [currentCompanyId]);

  useEffect(() => {
    if (!currentCompanyId) return;

    const companyRef = doc(db, "companies", currentCompanyId);
    const unsubscribe = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBillingInfo(data.billing || null);
        setCurrentPlanId(data.billing?.plan || "free");
      }
    });

    return () => unsubscribe();
  }, [currentCompanyId]);
  // Initial loads
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const currentPlan = plans.find(
    (p) => p.braintreePlanId === billingInfo?.plan,
  );

  const currentPlanPrice = currentPlan?.price ?? 0;

  const currentPlanName = currentPlan?.braintreePlanId ?? "Free Plan";

  const paymentStatus = derivedPaymentStatus || "inactive";

  const statusClass =
    paymentStatus === "active"
      ? "status-active"
      : paymentStatus === "past_due"
        ? "status-pending"
        : paymentStatus === "free"
          ? "status-active"
          : "status-inactive";

  const basePlanPrice = currentPlan?.price ?? 0;

  const renewalDate = useMemo(() => {
    // if (!billingInfo?.renewalDate) return null;

    // If it's a Firestore Timestamp
    if (
      typeof billingInfo?.renewalDate === "object" &&
      "seconds" in billingInfo.renewalDate
    ) {
      return new Date(
        billingInfo.renewalDate.seconds * 1000,
      ).toLocaleDateString();
    }

    // If it's an ISO string
    if (typeof billingInfo?.renewalDate === "string") {
      return new Date(billingInfo.renewalDate).toLocaleDateString();
    }

    return null;
  }, [billingInfo]);

  const handleConfirmDowngrade = async () => {
    if (!pendingDowngradePlan || !currentCompanyId) return;

    setConfirmLoading(true);

    try {
      const scheduleDowngrade = httpsCallable(
        functions,
        "scheduleBillingDowngrade",
      );

      await scheduleDowngrade({
        companyId: currentCompanyId,
        nextPlanId: pendingDowngradePlan.braintreePlanId,
      });

      dispatch(
        showMessage({
          text: "Downgrade scheduled successfully.",
          severity: "success",
        }),
      );

      setConfirmOpen(false);
      setPendingDowngradePlan(null);
    } catch (err) {
      dispatch(
        showMessage({
          text: "Failed to schedule downgrade.",
          severity: "error",
        }),
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePlanSelection = async (selectedPlan: PlanType) => {
    if (!currentCompanyId) return;

    const currentPlan = plans.find(
      (p) => p.braintreePlanId === billingInfo?.plan,
    );

    const currentPrice = currentPlan?.price ?? 0;
    const newPrice = selectedPlan.price;

    try {
      // New company (no billing yet)
      if (!billingInfo?.plan) {
        setSelectedPlan(selectedPlan);
        setModalOpen(true);
        return;
      }

      // Upgrade
      if (newPrice > currentPrice) {
        setSelectedPlan(selectedPlan);
        setModalOpen(true);
        return;
      }

      // Downgrade
      if (newPrice < currentPrice) {
        const isFree = selectedPlan.braintreePlanId === "free";

        setConfirmMessage(
          isFree
            ? "Downgrading to Free will cancel your subscription immediately. Continue?"
            : `Downgrade to ${formatPlanLabel(
                selectedPlan.braintreePlanId,
              )} at next renewal?`,
        );

        setPendingDowngradePlan(selectedPlan);
        setConfirmOpen(true);
        return;
      }

      // Same plan
      dispatch(
        showMessage({
          text: `You're already on the ${formatPlanLabel(
            selectedPlan.braintreePlanId,
          )} plan.`,
          severity: "info",
        }),
      );
    } catch (err) {
      console.error(err);
      dispatch(
        showMessage({
          text: "Plan change failed.",
          severity: "error",
        }),
      );
    }
  };

  if (loading) return <p className="loading-msg">Loading plans...</p>;

  return (
    <div className="billing-container">
      <h2>Billing & Subscription</h2>
      <button className="button-outline" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>
      <div className="billing-top">
        <section className="billing-explainer">
          <h3>How Billing Works</h3>
          <ul className="billing-rules">
            <li>
              <strong>Flat monthly pricing.</strong>
              <span>No contracts. Clear capacity limits.</span>
            </li>
            <li>
              <strong>Flexible changes.</strong>
              <span>
                Upgrades start immediately. Downgrades apply at renewal.
              </span>
            </li>
          </ul>
        </section>
        <div className="billing-summary-card">
          <div className="billing-summary-header">
            <div className="billing-summary-title">
              <h3>{formatPlanLabel(currentPlanName)} Plan</h3>
              <div className="billing-summary-price">
                ${basePlanPrice.toFixed(2)}
                <span>/month</span>
              </div>
            </div>
            {/* {isCurrent && ( */}
            <span className="plan-badge">Current</span>
            {/* )} */}

            <div className="billing-summary-status">
              <span className={`status-pill ${statusClass}`}>
                {paymentStatus === "free"
                  ? "Free"
                  : paymentStatus.replace("_", " ")}
              </span>

              {/* {billingInfo?.pendingChange && (
                <span className="status-pill status-pending">
                  Downgrade Scheduled
                </span>
              )} */}
            </div>
          </div>
          {/* <p>Manage your plan, payments</p> */}

          <div className="billing-summary-details">
            {billingInfo?.pendingChange ? (
              <p className="billing-summary-renewal downgrade">
                Downgrades to{" "}
                <strong>
                  {billingInfo?.pendingChange?.nextPlanId && (
                    <strong>
                      {formatPlanLabel(billingInfo.pendingChange.nextPlanId)}
                    </strong>
                  )}
                </strong>{" "}
                on{" "}
                {new Date(
                  billingInfo.pendingChange.effectiveAt.seconds * 1000,
                ).toLocaleDateString()}
              </p>
            ) : (
              renewalDate && (
                <p className="billing-summary-renewal">
                  Renews on {renewalDate}
                </p>
              )
            )}
          </div>

          {billingInfo?.pendingChange && (
            <div className="billing-summary-actions">
              <button
                className="btn-secondary"
                onClick={async () => {
                  const cancel = httpsCallable(
                    functions,
                    "cancelScheduledDowngrade",
                  );
                  await cancel({ companyId: currentCompanyId });
                }}
              >
                Cancel Downgrade
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="billing-bottom"></div>

      {currentPlanId === "free" && (
        <p className="upgrade-hint">
          🚀 Unlock more capacity by upgrading your plan below.
        </p>
      )}

      {/* === Plan Grid === */}
      <div className="plans-grid">
        {[...plans]
          .filter((plan) => plan.braintreePlanId !== billingInfo?.plan)
          .sort((a, b) => a.price - b.price)
          .map((plan) => {
            const isCurrent = plan.braintreePlanId === billingInfo?.plan;

            const currentPlan = plans.find(
              (p) => p.braintreePlanId === billingInfo?.plan,
            );
            const isUpgrade =
              currentPlan && plan.price > (currentPlan.price || 0);
            const isDowngrade =
              currentPlan && plan.price < (currentPlan.price || 0);
            const isRecommended = plan.braintreePlanId === "team";

            return (
              <PlanCard
                key={plan.braintreePlanId}
                planId={plan.braintreePlanId}
                price={plan.price}
                userLimit={plan.userLimit}
                connectionLimit={plan.connectionLimit}
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                isRecommended={isRecommended}
                onSelect={() => {
                  if (hasPendingDowngrade) return;
                  if (!isCurrent) handlePlanSelection(plan);
                }}
                disabled={hasPendingDowngrade && !isCurrent}
              />
            );
          })}
      </div>

      {/* Checkout */}
      {modalOpen && (
        <CheckoutModal
          open={modalOpen || showPaymentUpdate}
          onClose={() => {
            setModalOpen(false);
            setShowPaymentUpdate(false);
          }}
          planId={selectedPlan?.braintreePlanId || currentPlanId}
          companyId={currentCompanyId}
          companyName={companyName}
          email={email}
          planName={selectedPlan?.braintreePlanId || "Payment Update"}
          planPrice={selectedPlan?.price ?? currentPlanPrice}
          isUpgrade={!!selectedPlan && selectedPlan.price > currentPlanPrice}
          mode={showPaymentUpdate ? "update-card" : "subscribe"}
          billingInfo={billingInfo || undefined}
          prefetchedClientToken={prefetchedClientToken ?? undefined}
          planUserLimit={selectedPlan?.userLimit ?? currentPlan?.userLimit ?? 0}
          planConnectionLimit={
            selectedPlan?.connectionLimit ?? currentPlan?.connectionLimit ?? 0
          }
        />
      )}
      <CustomConfirmation
        isOpen={confirmOpen}
        title="Confirm Plan Change"
        message={confirmMessage}
        loading={confirmLoading}
        onClose={() => {
          setConfirmOpen(false);
          setPendingDowngradePlan(null);
        }}
        onConfirm={handleConfirmDowngrade}
      />
    </div>
  );
};

export default BillingDashboard;
