import React, { useEffect, useRef, useState, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import "./checkoutModal.css";
import CartSummary from "./CartSummary";
import { useOutsideAlerter } from "../../../utils/useOutsideAlerter";
import { functions } from "../../../utils/firebase";
import BillingAuthDebug from "./BillingAuthDebug";
import { CompanyBilling } from "../../../utils/types";

type CheckoutIntent = "create-subscription" | "upgrade-plan" | "update-card";

type ClientTokenResponse = { clientToken: string };

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  companyId?: string;
  companyName?: string;
  email?: string;
  planName?: string;
  planPrice?: number;
  planFeatures?: string[];
  planUserLimit?: number;
  planConnectionLimit?: number;
  isUpgrade?: boolean;
  mode?: "subscribe" | "update-card";
  billingInfo?: CompanyBilling;
  prefetchedClientToken?: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  planId,
  companyId,
  companyName,
  email,
  planName,
  planPrice = 0,
  planFeatures = [],
  planUserLimit = 0,
  planConnectionLimit = 0,
  isUpgrade = false,
  mode = "subscribe",
  billingInfo,
  prefetchedClientToken,
}) => {
  const dropinRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useOutsideAlerter(wrapperRef, onClose);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropinReady, setDropinReady] = useState(false);

  const hasSubscription = !!billingInfo?.subscriptionId;

  const checkoutIntent: CheckoutIntent = useMemo(() => {
    if (mode === "update-card") return "update-card";
    if (hasSubscription && isUpgrade) return "upgrade-plan";
    return "create-subscription";
  }, [mode, hasSubscription, isUpgrade]);

  const needsPaymentMethod =
    checkoutIntent === "create-subscription" || checkoutIntent === "update-card";

  const submitLabel = useMemo(() => {
    switch (checkoutIntent) {
      case "create-subscription":
        return "Confirm Purchase";
      case "update-card":
        return "Update Card";
      case "upgrade-plan":
        return "Upgrade Plan";
    }
  }, [checkoutIntent]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setLoading(false);
      setDropinReady(false);
      if (instanceRef.current) {
        try {
          instanceRef.current.teardown();
        } catch {}
        instanceRef.current = null;
      }
    }
  }, [open]);

  const loadDropin = async () => {
    const dropin = await import("braintree-web-drop-in");
    return dropin.default;
  };

  useEffect(() => {
    if (!open || !companyId || !dropinRef.current) return;
    if (!needsPaymentMethod) return;

    let cancelled = false;
    setDropinReady(false);

    (async () => {
      try {
        const dropin = await loadDropin();

        const getClientToken = httpsCallable<
          { companyId: string },
          ClientTokenResponse
        >(functions, "getClientToken");

        let token = prefetchedClientToken;

        if (!token) {
          const { data } = await getClientToken({ companyId });
          token = data.clientToken;
        }

        if (!token) throw new Error("Missing Braintree client token");
        if (cancelled) return;

        instanceRef.current = await dropin.create({
          authorization: token,
          container: dropinRef.current,
          card: {
            overrides: {
              fields: {
                number: { placeholder: "Card number" },
                cvv: { placeholder: "CVV" },
                expirationDate: { placeholder: "MM/YY" },
              },
            },
          },
        });

        setDropinReady(true);
      } catch (err) {
        console.error(err);
        setError("Failed to initialize payment form.");
      }
    })();

    return () => {
      cancelled = true;
      instanceRef.current?.teardown?.();
      instanceRef.current = null;
      setDropinReady(false);
    };
  }, [open, companyId, needsPaymentMethod, prefetchedClientToken]);

  const handleSubmit = async () => {
    if (!companyId) return;
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      switch (checkoutIntent) {
        case "upgrade-plan": {
          await httpsCallable(functions, "changePlanAndRestartBillingCycle")({
            companyId,
            newPlanId: planId,
          });
          break;
        }

        case "create-subscription": {
          if (!instanceRef.current) throw new Error("Payment form not ready.");
          const { nonce } = await instanceRef.current.requestPaymentMethod();

          await httpsCallable(functions, "createSubscription")({
            companyId,
            companyName,
            email,
            paymentMethodNonce: nonce,
            planId,
          });
          break;
        }

        case "update-card": {
          if (!instanceRef.current) throw new Error("Payment form not ready.");
          const { nonce } = await instanceRef.current.requestPaymentMethod();

          await httpsCallable(functions, "updatePaymentMethod")({
            companyId,
            paymentMethodNonce: nonce,
          });
          break;
        }
      }

      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setError(err?.message || "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  const billingNote = useMemo(() => {
    if (mode === "update-card") return "Update your saved card details below.";
    return "Billed monthly • Cancel anytime";
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (needsPaymentMethod) return dropinReady;
    return true;
  }, [loading, needsPaymentMethod, dropinReady]);

  return (
    <div className="checkout-overlay">
      <div ref={wrapperRef} className="checkout-modal">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>
          {mode === "update-card" ? "Update Payment Method" : "Complete Checkout"}
        </h2>

        {/* {import.meta.env.DEV && <BillingAuthDebug />} */}

        <p className="billing-note">{billingNote}</p>

        <div className="checkout-plan-card">
          <div className="checkout-plan-header">
            <h3>{planName || planId}</h3>
            <div className="checkout-price">
              <span className="checkout-price-amount">
                {planPrice === 0 ? "Free" : `$${planPrice}`}
              </span>
              {planPrice !== 0 && <span>/month</span>}
            </div>
          </div>

          <div className="checkout-capacity">
            <div className="checkout-capacity-item">
              <strong>{planUserLimit}</strong>
              <span>Users</span>
            </div>
            <div className="checkout-capacity-item">
              <strong>{planConnectionLimit}</strong>
              <span>Connections</span>
            </div>
          </div>

          <CartSummary planName={planName || "Selected"} planPrice={planPrice} />

          {planFeatures.length > 0 && (
            <ul className="plan-features">
              {planFeatures.map((f, i) => (
                <li key={i}>✅ {f}</li>
              ))}
            </ul>
          )}

          <p className="secure-note">🔒 Secure payment via Braintree</p>
        </div>

        {!dropinReady && needsPaymentMethod && !error && (
          <div className="dropin-loading">
            <div className="spinner" />
            <p className="secure-note">🔒 Secure payment form loading…</p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">Payment successful! 🎉</p>}

        {needsPaymentMethod && <div ref={dropinRef} className="dropin-container" />}

        <button className="btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "Processing..." : submitLabel}
        </button>

        {billingInfo?.pendingChange && (
          <div className="downgrade-notice">
            Downgrade scheduled for{" "}
            {new Date(
              billingInfo.pendingChange.effectiveAt.seconds * 1000
            ).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
