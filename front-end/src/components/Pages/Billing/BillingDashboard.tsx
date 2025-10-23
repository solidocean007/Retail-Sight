// components/billing/BillingDashboard.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { collection, doc, getDocs, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { db } from "../../../utils/firebase";
import { selectCurrentCompany } from "../../../Slices/currentCompanySlice";
import CheckoutModal from "./CheckoutModal";
import AddonCard from "./AddonCard";
import "./billingDashboard.css";

interface PlanAddons {
  extraUsers: number;
  extraConnections: number;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  braintreePlanId: string;
  features: string[];
  addons: PlanAddons;
}

interface BillingAddons {
  extraUsers: number;
  extraConnections: number;
}

interface BillingInfo {
  plan: string;
  price: number;
  paymentStatus?: "active" | "past_due" | "canceled";
  renewalDate?: { seconds: number };
  lastPaymentDate?: { seconds: number };
  addons?: BillingAddons;
  totalMonthlyCost?: number;
}

/** Lightweight confirm dialog */
const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}> = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}) => {
  if (!open) return null;
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-card">
        <h4 className="confirm-title">{title}</h4>
        <div className="confirm-body">{message}</div>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const BillingDashboard: React.FC = () => {
  const functions = getFunctions(undefined, "us-central1");
  const currentCompanyId = useSelector(selectCurrentCompany)?.id;
  const companyName = useSelector((state: any) => state.user.companyName);
  const email = useSelector((state: any) => state.user.email);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCtx, setConfirmCtx] = useState<{
    action: "add" | "remove";
    addonType: "extraUsers" | "extraConnections";
    count: number;
    estCost: number;
    label: string;
  } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  // --- Fetch all plans ---
  const fetchPlans = useCallback(async () => {
    try {
      const querySnap = await getDocs(collection(db, "plans"));
      const planList: Plan[] = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Plan[];
      setPlans(planList);
    } catch (err) {
      console.error("Error loading plans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch current company billing ---
  const fetchCompanyPlan = useCallback(async () => {
    if (!currentCompanyId) return;
    try {
      const companyRef = doc(db, "companies", currentCompanyId);
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        const data = companySnap.data() as any;
        setBillingInfo(data.billing || null);
        setCurrentPlanId(data.billing?.plan || "free");
      }
    } catch (err) {
      console.error("Error fetching company billing info:", err);
    }
  }, [currentCompanyId]);

  console.log("billingInfo: ", billingInfo);
  console.log("currentPlanId: ", currentPlanId);
  // Initial loads
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchCompanyPlan();
  }, [fetchCompanyPlan]);

  // Derived UI state (uses backend totalMonthlyCost)
  const { addonPrices, nextPlan, shouldUpgrade, nextPlanLabel, addons } =
    useMemo(() => {
      const current = plans.find((p) => p.braintreePlanId === currentPlanId);
      console.log("current plan: ", current);
      if (!current) {
        console.warn(`⚠️ Current plan not found for: ${currentPlanId}`);
        return {
          addons: { extraUsers: 0, extraConnections: 0 },
          addonPrices: { user: 0, connection: 0 },
          nextPlan: null,
          shouldUpgrade: false,
          nextPlanLabel: "",
        };
      }

      if (!current.addons) {
        console.warn(
          `⚠️ Missing addons field for plan: ${current.braintreePlanId}`
        );
      }

      const sorted = [...plans].sort((a, b) => a.price - b.price);
      const currentIdx = sorted.findIndex(
        (p) => p.braintreePlanId === currentPlanId
      );
      const next =
        currentIdx >= 0 && currentIdx < sorted.length - 1
          ? sorted[currentIdx + 1]
          : null;

      const prices = {
        user: current.addons?.extraUsers ?? 0,
        connection: current.addons?.extraConnections ?? 0,
      };

      const addOnTotals = billingInfo?.addons || {
        extraUsers: 0,
        extraConnections: 0,
      };

      const total = billingInfo?.totalMonthlyCost ?? 0;
      const nextPrice = next?.price ?? Infinity;
      const upgrade = total >= nextPrice;

      return {
        addons: addOnTotals,
        addonPrices: prices,
        nextPlan: next,
        shouldUpgrade: upgrade,
        nextPlanLabel: next?.name ?? "Next Tier",
      };
    }, [plans, currentPlanId, billingInfo]);

  // open confirmation with context
  const openConfirm = (
    action: "add" | "remove",
    addonType: "extraUsers" | "extraConnections",
    count: number
  ) => {
    const pricePer =
      addonType === "extraUsers" ? addonPrices.user : addonPrices.connection;
    const estCost = count * pricePer;

    const labelBase =
      addonType === "extraUsers" ? "user seat" : "company connection";
    const label =
      count === 1
        ? labelBase
        : `${labelBase}${addonType === "extraUsers" ? "s" : "s"}`;

    setConfirmCtx({ action, addonType, count, estCost, label });
    setConfirmOpen(true);
  };

  // perform add/remove via Cloud Functions
  const performConfirmedAction = async () => {
    if (!confirmCtx || !currentCompanyId) return;
    setBusyAction(true);

    try {
      if (confirmCtx.action === "add") {
        const addAddon = httpsCallable(functions, "addAddon");
        await addAddon({
          companyId: currentCompanyId,
          addonType: confirmCtx.addonType,
          quantity: confirmCtx.count,
        });
      } else {
        const removeAddon = httpsCallable(functions, "removeAddon");
        await removeAddon({
          companyId: currentCompanyId,
          addonType: confirmCtx.addonType,
          quantity: confirmCtx.count,
        });
      }
      // refresh billing snapshot after server writes (webhook will also hard-sync later)
      await fetchCompanyPlan();
      setConfirmOpen(false);
      setConfirmCtx(null);
    } catch (err) {
      console.error("Add/Remove add-on failed:", err);
      alert("There was a problem updating your add-ons. Please try again.");
    } finally {
      setBusyAction(false);
    }
  };

  // Handler used by AddonCard
  const handleAddonAdd = (
    type: "extraUsers" | "extraConnections",
    qty: number
  ) => openConfirm("add", type, qty);
  const handleAddonRemove = (
    type: "extraUsers" | "extraConnections",
    qty: number
  ) => openConfirm("remove", type, qty);

  if (loading) return <p className="loading-msg">Loading plans...</p>;

  const currentPlanName =
    plans.find((p) => p.braintreePlanId === currentPlanId)?.name || "Free Plan";

  const paymentStatus = billingInfo?.paymentStatus || "active";
  const statusClass =
    paymentStatus === "active"
      ? "status-active"
      : paymentStatus === "past_due"
      ? "status-pending"
      : "status-inactive";

  const totalMonthly = billingInfo?.totalMonthlyCost ?? 0;
  const renewalDate = billingInfo?.renewalDate
    ? new Date(billingInfo.renewalDate.seconds * 1000).toLocaleDateString()
    : null;

  return (
    <div className="billing-container">
      <h2>Billing & Subscription</h2>
      <p>Manage your plan, payments, and add-ons</p>

      {/* === Plan Summary === */}
      <div className="plan-summary-card">
        <div className="summary-top">
          <div className="summary-left">
            <h3 className="plan-name">
              Current Plan:{" "}
              <span>
                {currentPlanName} — ${billingInfo?.price}/month
              </span>
            </h3>
            <div className="total-line">
              <span className="total-label">Total Monthly Cost</span>
              <span className="total-value">${totalMonthly.toFixed(2)}</span>
            </div>
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

        <div className="addon-summary">
          <p>
            You currently have <strong>{addons.extraUsers}</strong> extra users
            and <strong>{addons.extraConnections}</strong> extra connections.
          </p>
          <button
            className="btn-addon"
            onClick={() =>
              document
                .querySelector(".addons-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Manage Add-ons
          </button>
        </div>

        {currentPlanId === "free" && (
          <p className="upgrade-hint">
            🚀 Unlock more capacity by upgrading your plan below.
          </p>
        )}
      </div>

      {/* === Plan Grid === */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isCurrent = plan.braintreePlanId === currentPlanId;
          const currentPlan = plans.find(
            (p) => p.braintreePlanId === currentPlanId
          );
          const isUpgrade =
            currentPlan && plan.price > (currentPlan.price || 0);
          const isDowngrade =
            currentPlan && plan.price < (currentPlan.price || 0);
          const isRecommended = plan.braintreePlanId === "network";

          return (
            <div
              key={plan.id}
              className={`plan-card ${isCurrent ? "current" : ""} ${
                isRecommended ? "recommended" : ""
              }`}
            >
              {isCurrent && <span className="current-badge">Current</span>}
              {isRecommended && !isCurrent && (
                <span className="recommended-badge">Recommended</span>
              )}

              <h3>{plan.name}</h3>
              <p className="price">
                {plan.price === 0 ? "Free" : `$${plan.price}/month`}
              </p>
              <p className="desc">{plan.description}</p>
              <ul className="feature-list">
                {plan.features?.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>

              <button
                className={`${isCurrent ? "btn-current" : "btn-upgrade"}`}
                disabled={isCurrent}
                onClick={() => {
                  if (!isCurrent) {
                    setSelectedPlan(plan);
                    setModalOpen(true);
                  }
                }}
              >
                {isCurrent
                  ? "Your Current Plan"
                  : isUpgrade
                  ? "Upgrade"
                  : isDowngrade
                  ? `Switch to ${plan.name}`
                  : "Select"}
              </button>
            </div>
          );
        })}
      </div>

      {/* === Add-ons Section === */}
      <div className="addons-section">
        <h3>Add-ons & Upgrades</h3>
        <p className="addons-subtext">
          Add-ons apply immediately and recur monthly. Removing add-ons is
          effective at your next renewal (credits/proration may apply based on
          policy). Upgrading plans takes effect immediately with prorated
          charges for the current cycle.
        </p>

        {shouldUpgrade && (
          <div className="upgrade-banner">
            <p>
              🚀 Your add-ons now cost about as much as the{" "}
              <strong>{nextPlanLabel}</strong> plan.{" "}
              <button
                className="upgrade-banner-btn"
                onClick={() => {
                  if (nextPlan) {
                    setSelectedPlan(nextPlan);
                    setModalOpen(true);
                  }
                }}
              >
                Upgrade Now
              </button>
            </p>
            <small className="upgrade-note">
              You’ll pay only the prorated difference for this cycle.
            </small>
          </div>
        )}

        <div className="addons-grid">
          <AddonCard
            title={`${currentPlanName} — Extra Users`}
            description="Add more teammates to collaborate"
            unitPrice={addonPrices.user}
            current={addons.extraUsers}
            onAdd={(count) => handleAddonAdd("extraUsers", count)}
            onRemove={(count) => handleAddonRemove("extraUsers", count)}
          />
          <AddonCard
            title={`${currentPlanName} — Extra Connections`}
            description="Grow your partner network"
            unitPrice={addonPrices.connection}
            current={addons.extraConnections}
            onAdd={(count) => handleAddonAdd("extraConnections", count)}
            onRemove={(count) => handleAddonRemove("extraConnections", count)}
          />
        </div>
      </div>

      {/* Checkout */}
      {selectedPlan && (
        <CheckoutModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          planId={selectedPlan.braintreePlanId}
          companyId={currentCompanyId}
          companyName={companyName}
          email={email}
        />
      )}

      {/* Confirm dialog for add/remove add-ons */}
      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmCtx?.action === "add" ? "Confirm Add-on" : "Confirm Removal"
        }
        message={
          confirmCtx ? (
            <div>
              <p className="confirm-line">
                {confirmCtx.action === "add" ? "Add" : "Remove"}{" "}
                <strong>{confirmCtx.count}</strong> {confirmCtx.label}.
              </p>
              {confirmCtx.action === "add" ? (
                <p className="confirm-sub">
                  This will add <strong>${confirmCtx.estCost}/month</strong> to
                  your subscription (recurring).
                </p>
              ) : (
                <p className="confirm-sub">
                  Removal takes effect at renewal (policy-dependent). Your
                  monthly total will adjust accordingly.
                </p>
              )}
            </div>
          ) : null
        }
        confirmText={confirmCtx?.action === "add" ? "Add" : "Remove"}
        cancelText="Cancel"
        onConfirm={performConfirmedAction}
        onCancel={() => setConfirmOpen(false)}
        busy={busyAction}
      />
    </div>
  );
};

export default BillingDashboard;
