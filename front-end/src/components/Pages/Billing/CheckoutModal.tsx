import React, { useEffect, useRef, useState, useMemo } from "react";
import dropin from "braintree-web-drop-in";
import { httpsCallable } from "firebase/functions";
import "./checkoutModal.css";
import CartSummary from "./CartSummary";
import { useOutsideAlerter } from "../../../utils/useOutsideAlerter";
import { BillingInfo } from "./BillingDashboard";
import { functions } from "../../../utils/firebase";

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
  billingInfo?: BillingInfo;
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
    [planAddons]
  );

  useEffect(() => {
    if (initialAddonType === "extraUser")
      setAdditionalUserCount(initialAddonQty || 0);
    if (initialAddonType === "extraConnection")
      setAdditionalConnectionCount(initialAddonQty || 0);
  }, [initialAddonType, initialAddonQty]);

  // --- Initialize Braintree drop-in ---
  useEffect(() => {
    if (!open || !companyId) return; // ✅ guard
    if (!dropinRef.current) return;
    if (open && dropinRef.current) {
      setDropinReady(false);
      (async () => {
        try {
          const tokenFn = httpsCallable(functions, "getClientToken");
          const tokenRes: any = await tokenFn({ companyId });
          const token = tokenRes.data.clientToken;
          if (!token) throw new Error("Missing Braintree client token");

          instanceRef.current = await dropin.create({
            authorization: token,
            container: dropinRef.current,
            paypal: { flow: "vault" },
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
      instanceRef.current?.teardown?.();
    };
  }, [open, companyId]);

  // --- Submit handler ---
  const handleSubmit = async () => {
    if (!instanceRef.current || !companyId) return;
    setLoading(true);
    setError(null);

    try {
      const { nonce } = await instanceRef.current.requestPaymentMethod();
      const isExistingSub = !!billingInfo?.subscriptionId;

      const addons: any[] = [];
      if (additionalUserCount > 0)
        addons.push({
          id: "extraUser",
          quantity: additionalUserCount,
          action: "add",
        });
      if (additionalConnectionCount > 0)
        addons.push({
          id: "extraConnection",
          quantity: additionalConnectionCount,
          action: "add",
        });

      if (isExistingSub) {
        const updateFn = httpsCallable(
          functions,
          "updateSubscriptionWithProration"
        );
        const newPlanId = planId;
        const res: any = await updateFn({ companyId, newPlanId, addons });

        if (res.data?.status?.toLowerCase?.() === "active") {
          setSuccess(true);
          setTimeout(onClose, 2000);
          return;
        }
      } else {
        const subscribeFn = httpsCallable(functions, "createSubscription");
        const payload = {
          companyId,
          companyName,
          email,
          paymentMethodNonce: nonce,
          planId,
          addons,
        };
        console.log("subscription payload: ", payload);
        const res: any = await subscribeFn(payload);

        if (res.data?.status?.toLowerCase?.() === "active") {
          setSuccess(true);
          setTimeout(onClose, 2000);
          return;
        }
      }

      throw new Error("Subscription failed.");
    } catch (err: any) {
      console.group("🔥 Checkout Error Details");
      console.error("Full error object:", err);
      if (err?.code) console.error("Firebase Error Code:", err.code);
      if (err?.details) console.error("Firebase Error Details:", err.details);
      if (err?.message) console.error("Firebase Error Message:", err.message);
      if (err?.response?.data)
        console.error("Response Data:", err.response.data);
      console.groupEnd();
      setError(err.message || "Payment failed. Check console for details.");
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

        <p className="billing-note">
          {mode === "update-card"
            ? "Update your saved card details below."
            : isFreePlan
            ? "Start your Free plan and securely add payment details for future add-ons."
            : "Billed monthly • Cancel anytime"}
        </p>

        {/* === Plan Summary === */}
        <div className="plan-summary">
          <h3>{planName || planId}</h3>
          <p className="plan-price">${planPrice}/month</p>

          {/* === Add-on Inputs === */}
          <div className="addon-selectors">
            <h4>Optional Add-ons</h4>
            <div className="addon-field">
              <label>Additional Users (${addonPrices.user} each)</label>
              <input
                type="number"
                min={0}
                value={additionalUserCount}
                onChange={(e) => setAdditionalUserCount(Number(e.target.value))}
              />
            </div>

            <div className="addon-field">
              <label>
                Additional Connections (${addonPrices.connection} each)
              </label>
              <input
                type="number"
                min={0}
                value={additionalConnectionCount}
                onChange={(e) =>
                  setAdditionalConnectionCount(Number(e.target.value))
                }
              />
            </div>
          </div>

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

          {isUpgrade && (
            <p className="proration-note">
              ⚖️ This upgrade will be automatically prorated for the remainder
              of your current billing cycle.
            </p>
          )}
          <p className="secure-note">🔒 Secure payment via Braintree</p>
        </div>

        {/* === Drop-in / Feedback === */}
        {!dropinReady && !error && (
          <div className="dropin-loading">
            <div className="spinner" />
            <p>Loading secure payment form...</p>
          </div>
        )}
        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">Payment successful! 🎉</p>}

        <div
          ref={dropinRef}
          className="dropin-container"
          style={{ display: dropinReady ? "block" : "none" }}
        />

        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={loading || !dropinReady}
        >
          {loading
            ? "Processing..."
            : mode === "update-card"
            ? "Update Card"
            : isFreePlan
            ? "Start Free Plan"
            : isUpgrade
            ? `Upgrade to ${planName}`
            : `Start ${planName || "Plan"}`}
        </button>
      </div>
    </div>
  );
};

export default CheckoutModal;
