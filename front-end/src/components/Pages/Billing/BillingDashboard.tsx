// components/billing/BillingDashboard.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { db, functions } from "../../../utils/firebase";
import { selectCurrentCompany } from "../../../Slices/currentCompanySlice";
import CheckoutModal from "./CheckoutModal";
import "./billingDashboard.css";
import { RootState, useAppDispatch } from "../../../utils/store";
import { CompanyBilling, PlanType, UserType } from "../../../utils/types";
import PlanCard from "./PlanCard";
import { useNavigate } from "react-router-dom";
import { showMessage } from "../../../Slices/snackbarSlice";

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

      const freePlan =
        planList.find((plan) => plan.braintreePlanId === "free") || null;
      setFreePlan(freePlan);
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

  const derivedPaymentStatus = useMemo(() => {
    if (!billingInfo) return "inactive";

    // hard cancel always wins
    if (billingInfo.paymentStatus === "canceled") return "canceled";

    // if renewal date is in the future, treat as active
    if (billingInfo.renewalDate) {
      const renewalMs = billingInfo.renewalDate.seconds * 1000;
      if (renewalMs > Date.now()) {
        return "active";
      }
    }

    // otherwise fall back to backend status
    return billingInfo.paymentStatus;
  }, [billingInfo]);

  if (loading) return <p className="loading-msg">Loading plans...</p>;

  const currentPlan = plans.find(
    (p) => p.braintreePlanId === billingInfo?.plan,
  );

  const currentPlanPrice = currentPlan?.price ?? 0;

  const currentPlanName = currentPlan?.name ?? "Free Plan";

  const paymentStatus = derivedPaymentStatus || "inactive";

  const statusClass =
    paymentStatus === "active"
      ? "status-active"
      : paymentStatus === "past_due"
        ? "status-pending"
        : "status-inactive";

  const basePlanPrice = currentPlan?.price ?? 0;

  const renewalDate = billingInfo?.renewalDate
    ? new Date(billingInfo.renewalDate.seconds * 1000).toLocaleDateString()
    : null;

  const handlePlanSelection = async (selectedPlan: PlanType) => {
    if (!currentCompanyId) return;

    const currentPlan = plans.find(
      (p) => p.braintreePlanId === billingInfo?.plan,
    );

    const currentPrice = currentPlan?.price ?? 0;
    const newPrice = selectedPlan.price;

    try {
      // New company
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

        const confirmed = window.confirm(
          isFree
            ? "Downgrading to Free will cancel your subscription immediately. Continue?"
            : `Downgrade to ${selectedPlan.name} at next renewal?`,
        );

        if (!confirmed) return;

        const scheduleDowngrade = httpsCallable(
          functions,
          "scheduleBillingDowngrade",
        );

        await scheduleDowngrade({
          companyId: currentCompanyId,
          nextPlanId: selectedPlan.braintreePlanId,
        });
        dispatch(showMessage({ text: "Downgrade scheduled successfully.", severity: "success" }));
        return;
      }

      alert(`You're already on the ${currentPlan?.name} plan.`);
    } catch (err) {
      console.error(err);
      alert("Plan change failed.");
    }
  };

  return (
    <div className="billing-container">
      <h2>Billing & Subscription</h2>
      <button className="button-outline" onClick={() => navigate("/dashboard")}>
        ← Back to Dashboard
      </button>
      <section className="billing-explainer">
        <h3>How Billing Works</h3>
        <ul className="billing-rules">
          <li>
            <strong>Flat monthly pricing.</strong>
            <span>
              Each plan has a fixed monthly cost with defined capacity limits.
            </span>
          </li>
          <li>
            <strong>Upgrades start a new billing cycle.</strong>
            <span>
              When you upgrade, you are charged immediately and a new monthly
              cycle begins.
            </span>
          </li>
          <li>
            <strong>Downgrades take effect at renewal.</strong>
            <span>
              Downgrades apply at the end of your current billing period.
            </span>
          </li>
          <li>
            <strong>No contracts.</strong>
          </li>
        </ul>
      </section>

      <p>Manage your plan, payments</p>
      {currentPlanId === "free" && (
        <p className="upgrade-hint">
          🚀 Unlock more capacity by upgrading your plan below.
        </p>
      )}

      {/* === Plan Grid === */}
      <div className="plans-grid">
        {[...plans]
          .sort((a, b) => a.price - b.price)
          .map((plan) => {
            const isCurrent = plan.braintreePlanId === currentPlanId;
            const currentPlan = plans.find(
              (p) => p.braintreePlanId === billingInfo?.plan,
            );
            const isUpgrade =
              currentPlan && plan.price > (currentPlan.price || 0);
            const isDowngrade =
              currentPlan && plan.price < (currentPlan.price || 0);
            const isRecommended = plan.name === "team";

            return (
              <PlanCard
                key={plan.braintreePlanId}
                planId={plan.braintreePlanId}
                name={plan.name}
                description={plan.description}
                price={plan.price}
                features={plan.features ?? []}
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

      <div className="plan-summary-card">
        <div className="summary-top">
          <div className="summary-left">
            <div className="summary-header">
              <h3 className="plan-name">
                Current Plan: {currentPlanName} - ${basePlanPrice.toFixed(2)}{" "}
                /month
              </h3>
            </div>
            {billingInfo?.pendingChange && (
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
                Cancel scheduled downgrade
              </button>
            )}

            {renewalDate && (
              <p className="renewal-text">Renews on {renewalDate}</p>
            )}
          </div>
          <span className={`status-pill ${statusClass}`}>
            {paymentStatus.replace("_", " ")}
          </span>
        </div>

        {paymentStatus === "past_due" && (
          <div className="alert-banner warning">
            ⚠️ Your payment is past due. Please update your payment method.
          </div>
        )}
        {paymentStatus === "canceled" && (
          <div className="alert-banner danger">
            ❌ Your subscription is canceled. Some features may be limited.
          </div>
        )}
      </div>
      {/* === Add-ons Section === */}

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
          planName={selectedPlan?.name || "Payment Update"}
          planPrice={selectedPlan?.price ?? currentPlanPrice}
          planFeatures={selectedPlan?.features || []}
          isUpgrade={!!selectedPlan && selectedPlan.price > currentPlanPrice}
          mode={showPaymentUpdate ? "update-card" : "subscribe"}
          billingInfo={billingInfo || undefined}
        />
      )}
    </div>
  );
};

export default BillingDashboard;
