import React, { useEffect, useRef, useState } from "react";
import dropin from "braintree-web-drop-in";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./checkoutModal.css";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  companyId: string  | undefined;
  customerId?: string;
  companyName?: string;
  email?: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  planId,
  companyId,
  customerId,
  companyName,
  email,
}) => {
  const dropinRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && dropinRef.current) {
      (async () => {
        try {
          const functions = getFunctions(undefined, "us-central1");

          const tokenFn = httpsCallable(functions, "getClientToken");
          const tokenRes: any = await tokenFn({ customerId });
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
        } catch (err) {
          console.error(err);
          setError("Failed to initialize payment form.");
        }
      })();
    }

    return () => {
      instanceRef.current?.teardown?.();
    };
  }, [open, companyId, companyName, email]);

  const handleSubmit = async () => {
    if (!instanceRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const { nonce } = await instanceRef.current.requestPaymentMethod();
      const subscribeFn = httpsCallable(functions, "createSubscription");

      // ✅ Make sure you send all required fields
      const payload = {
        companyId,
        companyName,
        email,
        customerId,
        paymentMethodNonce: nonce,
        planId,
      };

      console.log("Submitting subscription:", payload);

      const res: any = await subscribeFn(payload);

      if (res.data?.status?.toLowerCase() === "active") {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        throw new Error("Subscription failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="checkout-overlay">
      <div className="checkout-modal">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
        <h2>Complete Checkout</h2>
        <p className="plan-info">Plan: {planId}</p>

        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">Payment successful! 🎉</p>}

        <div ref={dropinRef} className="dropin-container" />

        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Processing..." : "Submit Payment"}
        </button>
      </div>
    </div>
  );
};

export default CheckoutModal;
