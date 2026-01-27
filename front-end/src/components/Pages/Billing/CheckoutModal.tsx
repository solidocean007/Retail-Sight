import React, { useEffect, useRef, useState, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import "./checkoutModal.css";
import CartSummary from "./CartSummary";
import { useOutsideAlerter } from "../../../utils/useOutsideAlerter";
import { functions } from "../../../utils/firebase";
import BillingAuthDebug from "./BillingAuthDebug";
import { CompanyBilling } from "../../../utils/types";

type CheckoutIntent =
  | "create-subscription"
  | "upgrade-plan"
  | "add-addons"
  | "update-card";

type ClientTokenResponse = {
  clientToken: string;
};

interface PlanAddons {
  extraUser: number;
  extraConnection: number;
}

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
  isUpgrade?: boolean;
  mode?: "subscribe" | "update-card";
  billingInfo?: CompanyBilling;
  planAddons?: PlanAddons;
  initialAddonType?: "extraUser" | "extraConnection";
  initialAddonQty?: number;
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
  isUpgrade = false,
  mode = "subscribe",
  billingInfo,
  planAddons,
  initialAddonType,
  initialAddonQty,
}) => {
  const dropinRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef, onClose);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropinReady, setDropinReady] = useState(false);

  const [additionalUserCount, setAdditionalUserCount] = useState(0);
  const [additionalConnectionCount, setAdditionalConnectionCount] = useState(0);

  const hasSubscription = !!billingInfo?.subscriptionId;

  const checkoutIntent: CheckoutIntent = useMemo(() => {
    if (mode === "update-card") return "update-card";
    if (hasSubscription && isUpgrade) return "upgrade-plan";
    if (hasSubscription) return "add-addons";
    return "create-subscription";
  }, [mode, hasSubscription, isUpgrade]);

  // This replaces your missing isFreeAddonPurchase.
  // It means: user is on "Free" UI plan (no subscription) but wants add-ons => needs card collection.
  const needsCardForAddonPurchase = useMemo(() => {
    return (
      !hasSubscription &&
      (additionalUserCount > 0 || additionalConnectionCount > 0)
    );
  }, [hasSubscription, additionalUserCount, additionalConnectionCount]);

  const needsPaymentMethod =
    checkoutIntent === "create-subscription" ||
    checkoutIntent === "update-card" ||
    needsCardForAddonPurchase;

  const addonPrices = useMemo(
    () => ({
      user: planAddons?.extraUser ?? 0,
      connection: planAddons?.extraConnection ?? 0,
    }),
    [planAddons],
  );

  const requiresDropin = useMemo(() => {
    // Only needed when we're going to collect a nonce.
    return (
      checkoutIntent === "create-subscription" ||
      checkoutIntent === "update-card" ||
      needsCardForAddonPurchase
    );
  }, [checkoutIntent, needsCardForAddonPurchase]);

  const disableAddonInputs = checkoutIntent !== "add-addons";

  const submitLabel = useMemo(() => {
    switch (checkoutIntent) {
      case "create-subscription":
        return "Confirm Purchase";
      case "upgrade-plan":
        return `Upgrade to ${planName ?? "Plan"}`;
      case "add-addons":
        return "Confirm Add-ons";
      case "update-card":
        return "Update Card";
      default:
        return "Confirm";
    }
  }, [checkoutIntent, planName]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setLoading(false);
      setDropinReady(false);
      setAdditionalUserCount(0);
      setAdditionalConnectionCount(0);

      if (instanceRef.current) {
        try {
          instanceRef.current.teardown();
        } catch {}
        instanceRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (initialAddonType === "extraUser")
      setAdditionalUserCount(initialAddonQty || 0);
    if (initialAddonType === "extraConnection")
      setAdditionalConnectionCount(initialAddonQty || 0);
  }, [initialAddonType, initialAddonQty]);

  const loadDropin = async () => {
    const dropin = await import("braintree-web-drop-in");
    return dropin.default;
  };

  // Initialize drop-in ONLY if it’s needed
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

        const { data } = await getClientToken({ companyId });
        const token = data.clientToken;
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
  }, [open, companyId, requiresDropin]);

  const handleSubmit = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      switch (checkoutIntent) {
        case "add-addons": {
          // add-ons only (no drop-in)
          if (additionalUserCount > 0) {
            await httpsCallable(
              functions,
              "addAddon",
            )({
              companyId,
              addonType: "extraUser",
              quantity: additionalUserCount,
            });
          }

          if (additionalConnectionCount > 0) {
            await httpsCallable(
              functions,
              "addAddon",
            )({
              companyId,
              addonType: "extraConnection",
              quantity: additionalConnectionCount,
            });
          }
          break;
        }

        case "upgrade-plan": {
          console.log("Upgrading plan to", planId); // this logs 'network'
          await httpsCallable(
            functions,
            "changePlanAndRestartBillingCycle",
          )({
            companyId,
            newPlanId: planId,
          });
          break;
        }

        case "create-subscription": {
          if (!instanceRef.current) throw new Error("Payment form not ready.");

          const { nonce } = await instanceRef.current.requestPaymentMethod();

          await httpsCallable(
            functions,
            "createSubscription",
          )({
            companyId,
            companyName,
            email,
            paymentMethodNonce: nonce,
            planId,
          });

          // If user wanted add-ons as part of their first checkout, do it AFTER subscription exists
          // (keeps backend simpler + avoids “addons on creation” issues)
          if (additionalUserCount > 0) {
            await httpsCallable(
              functions,
              "addAddon",
            )({
              companyId,
              addonType: "extraUser",
              quantity: additionalUserCount,
            });
          }
          if (additionalConnectionCount > 0) {
            await httpsCallable(
              functions,
              "addAddon",
            )({
              companyId,
              addonType: "extraConnection",
              quantity: additionalConnectionCount,
            });
          }

          break;
        }

        case "update-card": {
          if (!instanceRef.current) throw new Error("Payment form not ready.");
          await instanceRef.current.requestPaymentMethod();
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

  const activeAddons = [
    {
      label: "Additional Users",
      quantity: additionalUserCount,
      price: addonPrices.user,
    },
    {
      label: "Additional Connections",
      quantity: additionalConnectionCount,
      price: addonPrices.connection,
    },
  ].filter((a) => a.quantity > 0);

  // You aren’t doing downgrades in this modal.
  // If you later add downgrade scheduling, handle it outside (BillingDashboard).
  const showDropin = requiresDropin;

  const billingNote = useMemo(() => {
    if (mode === "update-card") return "Update your saved card details below.";
    if (needsCardForAddonPurchase)
      return "Add payment details to purchase add-ons.";
    return "Billed monthly • Cancel anytime";
  }, [mode, needsCardForAddonPurchase]);

  const canSubmit = useMemo(() => {
    if (loading) return false;

    if (needsPaymentMethod) {
      return dropinReady;
    }

    return true;
  }, [loading, needsPaymentMethod, dropinReady]);

  return (
    <div className="checkout-overlay">
      <div ref={wrapperRef} className="checkout-modal">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>
          {mode === "update-card"
            ? "Update Payment Method"
            : "Complete Checkout"}
        </h2>
        {import.meta.env.DEV && <BillingAuthDebug />}

        <p className="billing-note">{billingNote}</p>

        <div className="plan-summary">
          <h3>{planName || planId}</h3>
          <p className="plan-price">${planPrice}/month</p>

          {/* Add-on inputs: enabled only for add-ons flow OR initial “free -> add-ons” desire */}
          {(checkoutIntent === "add-addons" || !hasSubscription) && (
            <div className="addon-selectors">
              <h4>Optional Add-ons</h4>

              <div className="addon-field">
                <label>Additional Users (${addonPrices.user} each)</label>
                <input
                  type="number"
                  min={0}
                  disabled={disableAddonInputs && hasSubscription}
                  value={additionalUserCount}
                  onChange={(e) =>
                    setAdditionalUserCount(Number(e.target.value))
                  }
                />
              </div>

              <div className="addon-field">
                <label>
                  Additional Connections (${addonPrices.connection} each)
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={disableAddonInputs && hasSubscription}
                  value={additionalConnectionCount}
                  onChange={(e) =>
                    setAdditionalConnectionCount(Number(e.target.value))
                  }
                />
              </div>
            </div>
          )}

          <CartSummary
            planName={planName || "Selected"}
            planPrice={planPrice}
            addons={activeAddons}
          />

          {planFeatures.length > 0 && (
            <ul className="plan-features">
              {planFeatures.map((f, i) => (
                <li key={i}>✅ {f}</li>
              ))}
            </ul>
          )}

          <p className="secure-note">🔒 Secure payment via Braintree</p>
        </div>

        {!dropinReady && showDropin && !error && (
          <div className="dropin-loading">
            <div className="spinner" />
            <p className="secure-note">🔒 Secure payment form loading…</p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">Payment successful! 🎉</p>}

        {needsPaymentMethod && (
          <div ref={dropinRef} className="dropin-container" />
        )}

        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? "Processing..." : submitLabel}
        </button>

        {billingInfo?.pendingChange && (
          <div className="downgrade-notice">
            Downgrade scheduled for{" "}
            {new Date(
              billingInfo.pendingChange.effectiveAt.seconds * 1000,
            ).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
