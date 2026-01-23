import React, { useEffect, useRef, useState, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import "./checkoutModal.css";
import CartSummary from "./CartSummary";
import { useOutsideAlerter } from "../../../utils/useOutsideAlerter";
import { functions } from "../../../utils/firebase";
import BillingAuthDebug from "./BillingAuthDebug";
import { CompanyBilling } from "../../../utils/types";

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
  // clientToken?: string | null;
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
  // clientToken,
}) => {
  const isFreePlan = planId === "free";
  const dropinRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef, onClose);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropinReady, setDropinReady] = useState(false);

  // ✅ More descriptive state
  const [additionalUserCount, setAdditionalUserCount] = useState(0);
  const [additionalConnectionCount, setAdditionalConnectionCount] = useState(0);

  // --- Derive add-on prices from Firestore plan ---
  const addonPrices = useMemo(
    () => ({
      user: planAddons?.extraUser ?? 0,
      connection: planAddons?.extraConnection ?? 0,
    }),
    [planAddons],
  );

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

  // --- Initialize Braintree drop-in ---
  useEffect(() => {
    if (!open || !companyId || !dropinRef.current) return;
    let cancelled = false;
    if (open && dropinRef.current) {
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
          if (!token) {
            throw new Error("Missing Braintree client token");
          }

          if (!token) throw new Error("Missing Braintree client token");

          if (cancelled) return;

          // instanceRef.current = await dropin.create({
          //   authorization: token,
          //   container: dropinRef.current,
          //   paypal: { flow: "vault" },
          //   card: {
          //     overrides: {
          //       fields: {
          //         number: { placeholder: "Card number" },
          //         cvv: { placeholder: "CVV" },
          //         expirationDate: { placeholder: "MM/YY" },
          //       },
          //     },
          //   },
          // });
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
    }

    return () => {
      cancelled = true;
      instanceRef.current?.teardown?.();
    };
  }, [open, companyId]);

  // --- Submit handler ---
  const hasSubscription = !!billingInfo?.subscriptionId;

  const isAddonPurchase =
    additionalUserCount > 0 || additionalConnectionCount > 0;

  const handleSubmit = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const addons: any[] = [];

      if (additionalUserCount > 0) {
        addons.push({ id: "extraUser", quantity: additionalUserCount });
      }
      if (additionalConnectionCount > 0) {
        addons.push({
          id: "extraConnection",
          quantity: additionalConnectionCount,
        });
      }

      if (hasSubscription && !isUpgrade && addons.length === 0) {
        throw new Error("No changes selected.");
      }

      /**
       * CASE 1: Existing subscription → PLAN CHANGE ONLY
       * (add-ons are handled AFTER upgrade)
       */
      if (hasSubscription && isUpgrade) {
        const upgradeFn = httpsCallable(
          functions,
          "changePlanAndRestartBillingCycle",
        );

        await upgradeFn({
          companyId,
          newPlanId: planId,
        });

        setSuccess(true);
        setTimeout(onClose, 1500);
        return;
      }

      /**
       * CASE 2: Existing subscription → ADD-ONS ONLY
       */
      if (hasSubscription && !isUpgrade && addons.length > 0) {
        for (const addon of addons) {
          const addAddon = httpsCallable(functions, "addAddon");
          await addAddon({
            companyId,
            addonType: addon.id,
            quantity: addon.quantity,
          });
        }

        setSuccess(true);
        setTimeout(onClose, 1500);
        return;
      }

      /**
       * CASE 3: No subscription → CREATE (free plan + addons OR paid plan)
       */
      if (!instanceRef.current) {
        throw new Error("Payment form not ready.");
      }

      const { nonce } = await instanceRef.current.requestPaymentMethod();

      const subscribeFn = httpsCallable(functions, "createSubscription");

      const res: any = await subscribeFn({
        companyId,
        companyName,
        email,
        paymentMethodNonce: nonce,
        planId,
        addons,
      });

      if (res.data?.status?.toLowerCase?.() === "active") {
        setSuccess(true);
        setTimeout(onClose, 1500);
        return;
      }

      throw new Error("Subscription failed.");
    } catch (err: any) {
      console.group("🔥 Checkout Error Details");
      console.error("Full error object:", err);
      console.groupEnd();
      setError(err.message || "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // --- Compute live total ---
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

  const isDowngrade =
    !!billingInfo?.subscriptionId &&
    !isUpgrade &&
    planPrice < (billingInfo?.price ?? 0);

  const isFreeAddonPurchase =
    isFreePlan &&
    !hasSubscription &&
    (additionalUserCount > 0 || additionalConnectionCount > 0);

  const disableAddonInputs =
    isUpgrade || (hasSubscription && planId !== billingInfo?.plan);

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

        <p className="billing-note">
          {mode === "update-card"
            ? "Update your saved card details below."
            : isFreeAddonPurchase
              ? "Add payment details to purchase add-ons."
              : "Billed monthly • Cancel anytime"}
        </p>

        {/* === Plan Summary === */}
        <div className="plan-summary">
          <h3>{planName || planId}</h3>
          <p className="plan-price">${planPrice}/month</p>

          {/* === Add-on Inputs === */}
          {!disableAddonInputs && (
            <div className="addon-selectors">
              <h4>Optional Add-ons</h4>
              {disableAddonInputs && (
                <div className="addon-lock-note">
                  ℹ️ Add-ons can be added after upgrading your plan.
                </div>
              )}
              <div className="addon-field">
                <label>Additional Users (${addonPrices.user} each)</label>
                <input
                  type="number"
                  min={0}
                  disabled={disableAddonInputs}
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
                  disabled={disableAddonInputs}
                  value={additionalConnectionCount}
                  onChange={(e) =>
                    setAdditionalConnectionCount(Number(e.target.value))
                  }
                />
              </div>
            </div>
          )}

          {/* === Live Summary === */}
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

        {/* === Drop-in / Feedback === */}
        {!dropinReady && !error && (
          <div className="dropin-loading">
            <div className="spinner" />
            <p className="secure-note">🔒 Secure payment form loading…</p>
          </div>
        )}
        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">Payment successful! 🎉</p>}

        {!isDowngrade && (
          <div
            ref={dropinRef}
            className="dropin-container"
            style={{ display: dropinReady ? "block" : "none" }}
          />
        )}

        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={loading || (!billingInfo?.subscriptionId && !dropinReady)}
        >
          {loading
            ? "Processing..."
            : mode === "update-card"
              ? "Update Card"
              : isFreeAddonPurchase
                ? "Confirm Add-on Purchase"
                : isUpgrade
                  ? `Upgrade to ${planName}`
                  : hasSubscription
                    ? "Confirm Changes"
                    : "Confirm Purchase"}
        </button>
        {/* {billingInfo?.pendingChange && (  */}
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
