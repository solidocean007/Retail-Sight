// components/Pages/Billing/BillingDashboard.tsx
//
// Authenticated Billing & capacity page. Catalog visibility policy lives in
// the getAvailableBillingPlans callable (family / selfServe / active); this
// component renders the customer's situation first — current plan, capacity,
// next action — then a comparison catalog on demand.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { db, functions } from "../../../utils/firebase";
import { selectCurrentCompany } from "../../../Slices/currentCompanySlice";
import { RootState, useAppDispatch } from "../../../utils/store";
import { CompanyBilling, UserType } from "../../../utils/types";
import { showMessage } from "../../../Slices/snackbarSlice";
import CheckoutModal from "./CheckoutModal";
import CustomConfirmation from "../../CustomConfirmation";
import UpcomingDowngradeBanner from "./UpcomingDowngradeBanner";
import PlanCard from "./PlanCard";
import {
  BillingCatalog,
  CatalogPlan,
  MeterState,
  downgradeBlockReason,
  familyLabel,
  fetchBillingCatalog,
  formatPlanLabel,
  getUsage,
  isCurrentPlan,
  meterState,
  partnerNoun,
  planDelta,
  recommendPlan,
} from "../../../utils/billing/planCatalog";
import "./billingDashboard.css";

// ---------------------------------------------------------------------------
// Capacity meter — fill carries state (accent → warning → limit); the track
// is a lighter step of the same ramp; all text wears text tokens.
// ---------------------------------------------------------------------------
const CapacityMeter: React.FC<{
  label: string;
  used: number;
  limit: number | null;
}> = ({ label, used, limit }) => {
  const state: MeterState = meterState(used, limit);
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const left = limit != null ? Math.max(0, limit - used) : null;

  return (
    <div className={`capacity-meter state-${state}`}>
      <div className="capacity-meter__row">
        <span className="capacity-meter__label">{label}</span>
        <span className="capacity-meter__value">
          {used.toLocaleString()}
          {limit != null && (
            <span className="capacity-meter__limit">
              {" "}
              of {limit.toLocaleString()}
            </span>
          )}
        </span>
      </div>
      <div
        className="capacity-meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit ?? undefined}
        aria-valuenow={used}
      >
        <div className="capacity-meter__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="capacity-meter__note">
        {state === "limit"
          ? "Limit reached — upgrade to keep adding"
          : left != null
            ? `Room for ${left.toLocaleString()} more`
            : "No limit data"}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------

const BillingDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const company = useSelector(selectCurrentCompany) as any;
  const currentCompanyId: string | undefined = company?.id;
  const user = useSelector(
    (state: RootState) => state.user.currentUser
  ) as UserType;

  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<CompanyBilling | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<CatalogPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPaymentUpdate, setShowPaymentUpdate] = useState(false);
  const [prefetchedClientToken, setPrefetchedClientToken] = useState<
    string | null
  >(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingDowngradePlan, setPendingDowngradePlan] =
    useState<CatalogPlan | null>(null);

  const hasPendingDowngrade = !!billingInfo?.pendingChange;

  // ---- data ------------------------------------------------------------

  const loadCatalog = useCallback(async () => {
    if (!currentCompanyId) return;
    setCatalogError(false);
    setLoading(true);
    try {
      const data = await fetchBillingCatalog(currentCompanyId);
      setCatalog(data);
    } catch (err) {
      console.error("Error loading billing catalog:", err);
      setCatalogError(true);
    } finally {
      setLoading(false);
    }
  }, [currentCompanyId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!currentCompanyId) return;
    const unsubscribe = onSnapshot(
      doc(db, "companies", currentCompanyId),
      (snap) => {
        if (snap.exists()) {
          setBillingInfo(snap.data().billing || null);
        }
      }
    );
    return () => unsubscribe();
  }, [currentCompanyId]);

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
      .then(({ data }) => setPrefetchedClientToken(data.clientToken))
      .catch(() => {
        /* silent — the modal fetches its own token */
      });
  }, [currentCompanyId]);

  // ---- derived ---------------------------------------------------------

  const family = catalog?.family ?? null;
  const plans = useMemo(() => catalog?.plans ?? [], [catalog]);
  const current = catalog?.currentPlan ?? null;
  const partner = partnerNoun(family);
  const usage = getUsage(company?.counts);

  const currentLabel = current
    ? formatPlanLabel(current.planDocId ?? current.braintreePlanId)
    : "Free";
  const isLegacyCurrent =
    !!current &&
    (!current.selfServe || !current.active || (family && current.family !== family));

  const paymentStatus = useMemo(() => {
    if (!billingInfo) return "free";
    if (billingInfo.plan === "free" || !billingInfo.plan) return "free";
    const s = billingInfo.paymentStatus?.toLowerCase?.() ?? null;
    if (s === "canceled") return "canceled";
    if (s === "past_due") return "past_due";
    return "active";
  }, [billingInfo]);

  const renewalDate = useMemo(() => {
    const r: any = billingInfo?.renewalDate;
    if (!r) return null;
    if (typeof r === "object" && "seconds" in r) {
      return new Date(r.seconds * 1000).toLocaleDateString();
    }
    if (typeof r === "string") return new Date(r).toLocaleDateString();
    return null;
  }, [billingInfo]);

  const recommendation = useMemo(() => {
    if (!current || hasPendingDowngrade || paymentStatus === "past_due") {
      return null;
    }
    return recommendPlan(plans, current, usage);
  }, [plans, current, usage, hasPendingDowngrade, paymentStatus]);

  const isPastDue = paymentStatus === "past_due";

  // ---- actions ---------------------------------------------------------

  const openCheckout = (plan: CatalogPlan) => {
    setSelectedPlan(plan);
    setShowPaymentUpdate(false);
    setModalOpen(true);
  };

  const handlePlanSelection = (plan: CatalogPlan) => {
    if (!currentCompanyId || !current) return;
    const delta = planDelta(plan, current);

    // No subscription yet → any paid plan is a fresh checkout.
    if (!billingInfo?.plan || billingInfo.plan === "free") {
      if (plan.price > 0) openCheckout(plan);
      return;
    }

    if (delta.direction === "upgrade") {
      openCheckout(plan);
      return;
    }

    if (delta.direction === "downgrade") {
      const label = formatPlanLabel(plan.planDocId);
      setConfirmMessage(
        plan.price === 0
          ? `Your subscription ends at renewal${
              renewalDate ? ` on ${renewalDate}` : ""
            } and your workspace moves to ${label}. Nothing changes before then.`
          : `Switch to ${label}${
              renewalDate ? ` on ${renewalDate}` : " at renewal"
            }? Your current plan stays fully active until then.`
      );
      setPendingDowngradePlan(plan);
      setConfirmOpen(true);
    }
  };

  const handleConfirmDowngrade = async () => {
    if (!pendingDowngradePlan || !currentCompanyId) return;
    setConfirmLoading(true);
    try {
      const scheduleDowngrade = httpsCallable(
        functions,
        "scheduleBillingDowngrade"
      );
      // Free-family plans may have no Braintree id — the canonical downgrade
      // target for any $0 plan is "free". Never send an empty plan id.
      const nextPlanId =
        pendingDowngradePlan.price === 0
          ? "free"
          : pendingDowngradePlan.braintreePlanId;
      if (!nextPlanId) throw new Error("Missing plan id");

      await scheduleDowngrade({ companyId: currentCompanyId, nextPlanId });
      dispatch(
        showMessage({
          text: `Downgrade scheduled${renewalDate ? ` for ${renewalDate}` : ""}.`,
          severity: "success",
        })
      );
      setConfirmOpen(false);
      setPendingDowngradePlan(null);
    } catch (err) {
      console.error(err);
      dispatch(
        showMessage({ text: "Failed to schedule downgrade.", severity: "error" })
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  // ---- render ----------------------------------------------------------

  const header = (
    <header className="billing-header">
      <Link to="/dashboard" className="billing-back">
        ← Dashboard
      </Link>
      <h1>Billing &amp; capacity</h1>
      <p className="billing-subtitle">
        <span>{company?.companyName ?? company?.name ?? ""}</span>
        <span className="billing-family-chip">{familyLabel(family)}</span>
      </p>
    </header>
  );

  if (loading) {
    return (
      <div className="billing-page">
        {header}
        <div className="billing-skeleton" aria-hidden="true">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block wide" />
        </div>
        <p className="sr-only" role="status">
          Loading billing information
        </p>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="billing-page">
        {header}
        <section className="billing-state-card" role="alert">
          <h2>We couldn't load your plans</h2>
          <p>Your subscription is unaffected. Check your connection and retry.</p>
          <button type="button" className="btn-primary-action" onClick={loadCatalog}>
            Try again
          </button>
        </section>
      </div>
    );
  }

  // Fail closed: no/unknown company type exposes no purchasable plans.
  if (!family) {
    return (
      <div className="billing-page">
        {header}
        <section className="billing-state-card">
          <h2>Plan options unavailable</h2>
          <p>
            This workspace isn't set up as a distributor or supplier yet, so we
            can't show the right pricing. Your current plan
            {current ? ` (${currentLabel})` : ""} is unaffected.
          </p>
          <p className="billing-state-support">
            Contact <a href="mailto:support@displaygram.com">support@displaygram.com</a>{" "}
            and we'll fix it quickly.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="billing-page">
      {header}

      <div className="billing-grid">
        {/* ---- Current plan ---- */}
        <section className="command-card" aria-labelledby="current-plan-h">
          <div className="command-card__top">
            <div>
              <p className="command-card__eyebrow">Current plan</p>
              <h2 id="current-plan-h" className="command-card__name">
                {currentLabel}
                {isLegacyCurrent && (
                  <span className="plan-chip plan-chip--legacy">Legacy</span>
                )}
              </h2>
            </div>
            <span className={`status-pill status-${paymentStatus}`}>
              {paymentStatus === "past_due"
                ? "Past due"
                : paymentStatus === "free"
                  ? "Free"
                  : paymentStatus === "canceled"
                    ? "Canceled"
                    : "Active"}
            </span>
          </div>

          <p className="command-card__price">
            {current?.price ? (
              <>
                <span className="command-card__amount">
                  ${current.price.toFixed(2)}
                </span>
                <span className="command-card__period">/month</span>
              </>
            ) : (
              <span className="command-card__amount">$0</span>
            )}
          </p>

          {isPastDue ? (
            <div className="command-card__alert" role="alert">
              <p>
                Your last payment didn't go through. Update your payment method
                to keep your plan active.
              </p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => {
                  setSelectedPlan(null);
                  setShowPaymentUpdate(true);
                  setModalOpen(true);
                }}
              >
                Update payment method
              </button>
            </div>
          ) : hasPendingDowngrade ? (
            <UpcomingDowngradeBanner />
          ) : (
            renewalDate &&
            paymentStatus === "active" && (
              <p className="command-card__renewal">Renews on {renewalDate}</p>
            )
          )}

          {!isPastDue && paymentStatus === "active" && (
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setSelectedPlan(null);
                setShowPaymentUpdate(true);
                setModalOpen(true);
              }}
            >
              Update payment method
            </button>
          )}
        </section>

        {/* ---- Capacity ---- */}
        <section className="capacity-card" aria-labelledby="capacity-h">
          <h2 id="capacity-h" className="section-title">
            Capacity
          </h2>
          {usage ? (
            <>
              <CapacityMeter
                label="Team seats"
                used={usage.users}
                limit={current?.userLimit ?? null}
              />
              <CapacityMeter
                label={`Connected ${partner}s`}
                used={usage.connections}
                limit={current?.connectionLimit ?? null}
              />
              <p className="capacity-card__note">
                Includes pending invites and connection requests.
              </p>
            </>
          ) : (
            <p className="capacity-card__note">
              Usage data appears here once your team starts working.
            </p>
          )}
        </section>
      </div>

      {/* ---- Recommendation ---- */}
      {recommendation && (
        <section className="next-step-card" aria-labelledby="next-step-h">
          <div className="next-step-card__body">
            <h2 id="next-step-h" className="section-title">
              Recommended next step
            </h2>
            <p className="next-step-card__reason">{recommendation.reason}</p>
            <p className="next-step-card__meta">
              {(() => {
                const d = planDelta(recommendation.plan, current!);
                return `${d.price > 0 ? `+$${d.price}` : `$${recommendation.plan.price}`}/month · upgrade takes effect today`;
              })()}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => handlePlanSelection(recommendation.plan)}
            disabled={hasPendingDowngrade}
          >
            Upgrade to {formatPlanLabel(recommendation.plan.planDocId)}
          </button>
        </section>
      )}

      {/* ---- Compare plans ---- */}
      <section className="plans-section" aria-labelledby="compare-h">
        <div className="plans-section__head">
          <h2 id="compare-h" className="section-title">
            Plans
          </h2>
          <button
            type="button"
            className="btn-quiet plans-toggle"
            aria-expanded={compareOpen}
            onClick={() => setCompareOpen((v) => !v)}
          >
            {compareOpen
              ? "Hide comparison"
              : `Compare all ${family} plans`}
          </button>
        </div>

        {compareOpen && (
          <div className="plans-grid">
            {plans.map((plan) => {
              const isCurrent = current ? isCurrentPlan(plan, current) : false;
              const delta = current ? planDelta(plan, current) : null;
              const blocked = current
                ? downgradeBlockReason(plan, current, usage, family)
                : null;
              return (
                <PlanCard
                  key={plan.planDocId}
                  plan={plan}
                  family={family}
                  delta={delta}
                  isCurrent={isCurrent}
                  isRecommended={
                    recommendation?.plan.planDocId === plan.planDocId
                  }
                  blockedReason={blocked}
                  disabled={hasPendingDowngrade && !isCurrent}
                  disabledNote="Cancel your scheduled downgrade to change plans."
                  onSelect={() => {
                    if (!hasPendingDowngrade && !isCurrent && !blocked) {
                      handlePlanSelection(plan);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Billing behavior ---- */}
      <section className="billing-note-card">
        <p>
          <strong>Upgrades start immediately.</strong> Downgrades take effect at
          renewal. Payments are handled securely by Braintree — no contracts,
          cancel anytime.
        </p>
      </section>

      {/* ---- Checkout ---- */}
      {modalOpen && (
        <CheckoutModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setShowPaymentUpdate(false);
          }}
          planId={
            showPaymentUpdate
              ? current?.braintreePlanId || "free"
              : selectedPlan?.braintreePlanId || ""
          }
          companyId={currentCompanyId}
          companyName={company?.companyName ?? company?.name}
          email={user?.email}
          planName={
            showPaymentUpdate
              ? "Payment update"
              : selectedPlan
                ? formatPlanLabel(selectedPlan.planDocId)
                : ""
          }
          planPrice={
            showPaymentUpdate ? current?.price ?? 0 : selectedPlan?.price ?? 0
          }
          isUpgrade={
            !!selectedPlan &&
            !!current &&
            planDelta(selectedPlan, current).direction === "upgrade"
          }
          mode={showPaymentUpdate ? "update-card" : "subscribe"}
          billingInfo={billingInfo || undefined}
          prefetchedClientToken={prefetchedClientToken ?? undefined}
          planUserLimit={selectedPlan?.userLimit ?? current?.userLimit ?? 0}
          planConnectionLimit={
            selectedPlan?.connectionLimit ?? current?.connectionLimit ?? 0
          }
        />
      )}

      <CustomConfirmation
        isOpen={confirmOpen}
        title="Confirm plan change"
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
