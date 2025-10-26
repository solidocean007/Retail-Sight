// components/billing/BillingDashboard.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { db, functions } from "../../../utils/firebase";
import { selectCurrentCompany } from "../../../Slices/currentCompanySlice";
import CheckoutModal from "./CheckoutModal";
import AddonCard from "./AddonCard";
import "./billingDashboard.css";
import { RootState } from "../../../utils/store";
import { UserType } from "../../../utils/types";
import PlanCard from "./PlanCard";

export interface PlanAddons {
  extraUser: number;
  extraConnection: number;
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
  extraUser: number;
  extraConnection: number;
}

export interface BillingInfo {
  plan: string;
  price: number;
  braintreeCustomerId: string;
  subscriptionId: string;
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
  const currentCompanyId = useSelector(selectCurrentCompany)?.id;
  const user = useSelector(
    (state: RootState) => state.user.currentUser
  ) as UserType;
  const companyName = user?.company;
  const email = user?.email;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);

  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCtx, setConfirmCtx] = useState<{
    action: "add" | "remove";
    addonType: "extraUser" | "extraConnection";
    count: number;
    estCost: number;
    label: string;
  } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  // --- Fetch all plans --- this is a frontend call to get plans is it possible a user can change what is returned here to corrupt the pricing?  pricing is declared in braintree but ..
  //  why do we fetch this on every render?  should it be memoized or cached?  i really dont want to add this to cach if i dont have to.
  const fetchPlans = useCallback(async () => {
    try {
      const querySnap = await getDocs(collection(db, "plans"));
      const planList: Plan[] = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Plan[];
      setPlans(planList);
      console.log("plans: ", plans)
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

  useEffect(() => {
    fetchCompanyPlan();
  }, [fetchCompanyPlan]);

  // Derived UI state (uses backend totalMonthlyCost)
  const { addonPrices, nextPlan, shouldUpgrade, nextPlanLabel, addons } =
    useMemo(() => {
      const current = plans.find((p) => p.braintreePlanId === currentPlanId);
      if (!current) {
        console.warn(`⚠️ Current plan not found for: ${currentPlanId}`);
        return {
          addons: { extraUser: 0, extraConnection: 0 },
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
        user: current.addons?.extraUser ?? 0,
        connection: current.addons?.extraConnection ?? 0,
      };

      const addOnTotals = billingInfo?.addons || {
        extraUser: 0,
        extraConnection: 0,
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
    addonType: "extraUser" | "extraConnection",
    count: number
  ) => {
    const pricePer =
      addonType === "extraUser" ? addonPrices.user : addonPrices.connection;
    const estCost = count * pricePer;

    const labelBase =
      addonType === "extraUser" ? "user seat" : "company connection";
    const label =
      count === 1
        ? labelBase
        : `${labelBase}${addonType === "extraUser" ? "s" : "s"}`;

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
    type: "extraUser" | "extraConnection",
    qty: number
  ) => openConfirm("add", type, qty);
  const handleAddonRemove = (
    type: "extraUser" | "extraConnection",
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

  const handlePlanSelection = async (selectedPlan: Plan) => {
    if (!billingInfo || !currentCompanyId) return;

    const currentPrice = billingInfo.price || 0;
    const newPrice = selectedPlan.price;
    const currentPlanName =
      plans.find((p) => p.braintreePlanId === currentPlanId)?.name || "Free";

    try {
      if (newPrice > currentPrice) {
        // 🔼 Upgrade → use CheckoutModal
        setSelectedPlan(selectedPlan);
        setModalOpen(true);
      } else if (newPrice < currentPrice) {
        // 🔽 Downgrade flow
        const isFree = selectedPlan.braintreePlanId === "free";

        const confirmed = window.confirm(
          isFree
            ? `Downgrading to the Free plan will cancel your subscription immediately. Continue?`
            : `Downgrading to ${selectedPlan.name} will take effect at your next billing cycle. Continue?`
        );
        if (!confirmed) return;

        const cancelFn = httpsCallable(functions, "cancelSubscription");
        await cancelFn({ companyId: currentCompanyId });

        // Firestore marker for upcoming downgrade
        await updateDoc(doc(db, "companies", currentCompanyId), {
          "billing.pendingPlan": selectedPlan.braintreePlanId,
          "billing.pendingPlanName": selectedPlan.name,
          "billing.pendingEffectiveDate": billingInfo.renewalDate || null,
          updatedAt: new Date(),
        });

        alert(
          isFree
            ? `Your subscription has been canceled and you are now on the Free plan.`
            : `Your downgrade to ${selectedPlan.name} will take effect on your next renewal date.`
        );
      } else {
        alert(`You're already on the ${currentPlanName} plan.`);
      }
    } catch (err: any) {
      console.error("Plan change failed:", err);
      alert("Something went wrong updating your plan. Please try again later.");
    }
  };

  return (
    <div className="billing-container">
      <h2>Billing & Subscription</h2>
      <p>Manage your plan, payments, and add-ons</p>
      {currentPlanId === "free" && (
        <p className="upgrade-hint">
          🚀 Unlock more capacity by upgrading your plan below.
        </p>
      )}

      {/* === Plan Grid === */}
      <div className="plans-grid">
        {plans
          // 🪄 Sort so current plan shows first
          .sort((a, b) =>
            a.braintreePlanId === currentPlanId
              ? -1
              : b.braintreePlanId === currentPlanId
              ? 1
              : a.price - b.price
          )
          .map((plan) => {
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
              <PlanCard
                key={plan.id}
                planId={plan.braintreePlanId}
                name={plan.name}
                description={plan.description}
                price={plan.price}
                features={plan.features}
                isCurrent={isCurrent}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                isRecommended={isRecommended}
                onSelect={() => {
                  if (!isCurrent) handlePlanSelection(plan);
                }}
              />
            );
          })}
      </div>

      <div className="plan-summary-card">
        <div className="summary-top">
          <div className="summary-left">
            <div className="summary-header">
              <h3 className="plan-name">
                Current Plan: {currentPlanName} — ${billingInfo?.price}/month
              </h3>
            </div>

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
          {/* <p>
            You currently have <strong>{addons.extraUsers}</strong> extra users
            and <strong>{addons.extraConnections}</strong> extra connections.
          </p> */}
          {/* <button
            className="btn-addon"
            onClick={() =>
              document
                .querySelector(".addons-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            Manage Add-ons
          </button> */}
          <div className="addons-grid">
            <AddonCard
              title={`${currentPlanName} — Extra Users`}
              description="Add more teammates to collaborate"
              unitPrice={addonPrices.user}
              current={addons.extraUser}
              onAdd={(count) => handleAddonAdd("extraUser", count)}
              onRemove={(count) => handleAddonRemove("extraUser", count)}
            />
            <AddonCard
              title={`${currentPlanName} — Extra Connections`}
              description="Grow your partner network"
              unitPrice={addonPrices.connection}
              current={addons.extraConnection}
              onAdd={(count) => handleAddonAdd("extraConnection", count)}
              onRemove={(count) => handleAddonRemove("extraConnection", count)}
            />
          </div>
          <small className="addon-footnote">
            Add-ons apply immediately and recur monthly. Removing applies next
            cycle.
          </small>
        </div>
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
        </div>
      </div>
      {/* === Add-ons Section === */}

      {/* Checkout */}
      {(selectedPlan || showPaymentUpdate) && (
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
          planPrice={selectedPlan?.price || billingInfo?.price || 0}
          planFeatures={selectedPlan?.features || []}
          planAddons={selectedPlan?.addons} // ✅ Add this line
          isUpgrade={
            !!selectedPlan && selectedPlan.price > (billingInfo?.price || 0)
          }
          mode={showPaymentUpdate ? "update-card" : "subscribe"}
          billingInfo={billingInfo || undefined}
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
                  This will remove <strong>${confirmCtx.estCost}/month</strong>{" "}
                  from your subscription. Adjustments will appear on your next
                  invoice.
                </p>
              )}
              <small className="card-note">
                Need to update your payment method?{" "}
                <button
                  className="btn-link"
                  onClick={() => setShowPaymentUpdate(true)}
                >
                  Update Card
                </button>
              </small>
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
