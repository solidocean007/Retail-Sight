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
import { CompanyBilling, PlanType, UserType } from "../../../utils/types";
import PlanCard from "./PlanCard";
import { useNavigate } from "react-router-dom";

export type AddonUsage = {
  included: number;
  purchased: number;
};

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
  const navigate = useNavigate();
  const company = useSelector(selectCurrentCompany) as any;
  const companyId = company?.id;
  const currentCompanyId = useSelector(selectCurrentCompany)?.id;
  const user = useSelector(
    (state: RootState) => state.user.currentUser,
  ) as UserType;
  const companyName = company?.name;
  const email = user?.email;
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [freePlan, setFreePlan] = useState<PlanType | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string>("free");
  const [billingInfo, setBillingInfo] = useState<CompanyBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  const hasPendingDowngrade = !!billingInfo?.pendingChange;
  const [pendingAddonType, setPendingAddonType] = useState<
    "extraUser" | "extraConnection" | null
  >(null);
  const [pendingAddonQty, setPendingAddonQty] = useState<number>(0);

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
  const fetchPlans = useCallback(async () => {
    try {
      const querySnap = await getDocs(collection(db, "plans"));
      const planList = querySnap.docs.map((doc) => ({
        ...doc.data(),
      })) as PlanType[];

      const nonEnterprisePlans = planList.filter(
        (p) => p.braintreePlanId !== "enterprise",
      );

      // Show hidden/internal plans only if Healy company
      const visiblePlans =
        currentCompanyId === "3WOAwgj3l3bnvHqE4IV3"
          ? nonEnterprisePlans
          : nonEnterprisePlans.filter(
              (p) => p.braintreePlanId !== "healy_plan",
            );

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
  const { addonPrices, addonUsage } = useMemo(() => {
    const current = plans.find((p) => p.braintreePlanId === currentPlanId); // Property 'braintreePlanId' does not exist on type 'PlanType'.

    if (!current) {
      return {
        addonPrices: { user: 0, connection: 0 },
        addonUsage: {
          extraUser: { included: 0, purchased: 0 },
          extraConnection: { included: 0, purchased: 0 },
        },
      };
    }

    const purchased = billingInfo?.addons ?? {
      extraUser: 0,
      extraConnection: 0,
    };

    return {
      addonPrices: {
        user: current.addons.extraUser ?? 0,
        connection: current.addons.extraConnection ?? 0,
      },
      addonUsage: {
        extraUser: {
          included: current.userLimit, // ✅ from plan
          purchased: purchased.extraUser ?? 0, // ✅ from billing
        },
        extraConnection: {
          included: current.connectionLimit, // ✅ from plan
          purchased: purchased.extraConnection ?? 0, // ✅ from billing
        },
      },
    };
  }, [plans, currentPlanId, billingInfo]);

  // open confirmation with context
  const openConfirm = (
    action: "add" | "remove",
    addonType: "extraUser" | "extraConnection",
    count: number,
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
  // --- inside BillingDashboard.tsx ---

  const handleAddonAdd = (
    type: "extraUser" | "extraConnection",
    qty: number,
  ) => {
    const hasCustomer = billingInfo?.braintreeCustomerId;

    // 🧩 If no Braintree customer, open checkout modal with free plan
    if (!hasCustomer) {
      console.log("🔔 No Braintree customer yet — opening checkout modal.");
      setPendingAddonType(type);
      setPendingAddonQty(qty);
      setSelectedPlan(freePlan);
      setModalOpen(true);
      return;
    }

    // ✅ Otherwise show confirmation for add-on action
    openConfirm("add", type, qty);
  };

  const handleAddonRemove = (
    type: "extraUser" | "extraConnection",
    qty: number,
  ) => openConfirm("remove", type, qty);

  if (loading) return <p className="loading-msg">Loading plans...</p>;

  const currentPlan = plans.find(
    (p) => p.braintreePlanId === billingInfo?.plan,
  );

  const currentPlanPrice = currentPlan?.price ?? 0;

  const currentPlanName = currentPlan?.name ?? "Free Plan";

  const paymentStatus = billingInfo?.paymentStatus || "active";
  const statusClass =
    paymentStatus === "active"
      ? "status-active"
      : paymentStatus === "past_due"
        ? "status-pending"
        : "status-inactive";

  const basePlanPrice = currentPlan?.price ?? 0;

  const totalMonthly = billingInfo?.totalMonthlyCost ?? 0;
  const renewalDate = billingInfo?.renewalDate
    ? new Date(billingInfo.renewalDate.seconds * 1000).toLocaleDateString()
    : null;

  const handlePlanSelection = async (selectedPlan: PlanType) => {
    if (!currentCompanyId) return;

    // 🆕 Handle new companies without billing info
    if (!billingInfo || !billingInfo.plan) {
      console.log("🟢 New company — no existing plan, opening checkout.");
      setSelectedPlan(selectedPlan);
      setModalOpen(true);
      return;
    }

    const currentPlan = plans.find(
      (p) => p.braintreePlanId === billingInfo?.plan,
    );
    const currentPrice = currentPlan?.price ?? 0;

    const newPrice = selectedPlan.price;

    const currentPlanName = currentPlan?.name ?? "Free";

    try {
      if (newPrice > currentPrice) {
        console.log("🟢 Opening checkout modal for", selectedPlan.name);
        // 🔼 Upgrade → use CheckoutModal
        setSelectedPlan(selectedPlan);
        setModalOpen(true);
      } else if (newPrice < currentPrice) {
        // 🔽 Downgrade flow
        const isFree = selectedPlan.name === "free";
        const confirmed = window.confirm(
          isFree
            ? `Downgrading to the Free plan will cancel your subscription immediately. Continue?`
            : `Downgrading to ${selectedPlan.name} will take effect at your next billing cycle. Continue?`,
        );
        if (!confirmed) return;
        const scheduleDowngrade = httpsCallable(
          functions,
          "scheduleBillingDowngrade",
        );

        await scheduleDowngrade({
          companyId: currentCompanyId,
          nextPlanId: selectedPlan.braintreePlanId,
          nextAddons: [],
        });

        alert(
          isFree
            ? `Your subscription has been canceled and you are now on the Free plan.`
            : `Your downgrade to ${selectedPlan.name} will take effect on your next renewal date.`,
        );
      } else {
        alert(`You're already on the ${currentPlanName} plan.`);
      }
    } catch (err: any) {
      // 'try' expected.
      console.error("Plan change failed:", err);
      alert("Something went wrong updating your plan. Please try again later.");
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
            <strong>Plans start a new billing cycle.</strong>
            <span>
              When you upgrade or change plans, you’re charged the full plan
              price immediately and a new monthly billing cycle begins.
            </span>
          </li>

          <li>
            <strong>Add-ons are charged immediately.</strong>
            <span>
              Add-ons (extra users or connections) unlock capacity right away
              and are billed in full when purchased.
            </span>
          </li>

          <li>
            <strong>Add-ons renew with your plan.</strong>
            <span>
              Add-ons do not change your billing date. They renew automatically
              on your next plan renewal.
            </span>
          </li>

          <li>
            <strong>No prorated charges.</strong>
            <span>
              We don’t prorate plans or add-ons. This keeps billing simple,
              predictable, and transparent.
            </span>
          </li>
        </ul>

        <div className="billing-example">
          <strong>Example</strong>
          <p>
            If you start a Team plan today, you’re charged $25 today and your
            next renewal is one month from now.
          </p>
          <p>
            If you later add extra users, those add-ons are charged immediately
            and included in your next renewal.
          </p>
        </div>
      </section>

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
                : a.price - b.price,
          )

          .map((plan) => {
            const isCurrent = plan.name === currentPlanId;
            const currentPlan = plans.find(
              (p) => p.braintreePlanId === billingInfo?.plan,
            );
            const isUpgrade =
              currentPlan && plan.price > (currentPlan.price || 0);
            const isDowngrade =
              currentPlan && plan.price < (currentPlan.price || 0);
            const isRecommended = plan.name === "network";

            return (
              <PlanCard
                key={plan.name} // Property 'id' does not exist on type 'PlanType'.
                planId={plan.name}
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
          <div className="addons-grid">
            {!billingInfo?.braintreeCustomerId && (
              <div className="upgrade-note">
                💳 Add a payment method to purchase add-ons.
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!freePlan) {
                      alert(
                        "Free plan details not loaded yet. Please try again.",
                      );
                      return;
                    }
                    setSelectedPlan(freePlan);
                    setModalOpen(true);
                  }}
                >
                  Add Payment
                </button>
              </div>
            )}

            <AddonCard
              title="Extra Users"
              description="Add more user slots"
              unitPrice={addonPrices.user}
              usage={addonUsage.extraUser}
              onAdd={(count) => handleAddonAdd("extraUser", count)}
              onRemove={(count) => handleAddonRemove("extraUser", count)}
              pendingRemoval={company?.billing?.pendingAddonRemoval}
            />

            <AddonCard
              title="Extra Connections"
              description="Add more connection slots"
              unitPrice={addonPrices.connection}
              usage={addonUsage.extraConnection}
              onAdd={(count) => handleAddonAdd("extraConnection", count)}
              onRemove={(count) => handleAddonRemove("extraConnection", count)}
              pendingRemoval={company?.billing?.pendingAddonRemoval}
            />
          </div>
        </div>
        <div className="addons-section">
          <h3>Add-ons & Upgrades</h3>
          <p className="addons-subtext">
            Add-ons apply immediately and recur monthly. Removing add-ons takes
            effect at your next renewal. Upgrading plans takes effect
            immediately and starts a new billing cycle.
          </p>
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
          planPrice={selectedPlan?.price ?? currentPlanPrice}
          planFeatures={selectedPlan?.features || []}
          planAddons={selectedPlan?.addons}
          isUpgrade={!!selectedPlan && selectedPlan.price > currentPlanPrice}
          mode={showPaymentUpdate ? "update-card" : "subscribe"}
          billingInfo={billingInfo || undefined}
          initialAddonType={pendingAddonType || undefined}
          initialAddonQty={pendingAddonQty || 0}
          // clientToken={clientToken}
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
