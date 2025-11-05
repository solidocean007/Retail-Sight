import React, { useEffect, useState, useMemo } from "react";
import "./cartSummary.css";

interface CartItem {
  label: string;
  quantity?: number;
  price: number;
  onAdd?: (amount: number) => void;
  onRemove?: (amount: number) => void;
}

interface CartSummaryProps {
  planName: string;
  planPrice: number;
  addons?: CartItem[];
}

/**
 * 🧾 CartSummary
 * Displays the current plan, add-ons, and total cost before checkout.
 * Adds subtle flash + slide animations when totals change.
 */
const CartSummary: React.FC<CartSummaryProps> = ({
  planName,
  planPrice,
  addons = [],
}) => {
  const subtotal = useMemo(
    () =>
      planPrice +
      addons.reduce((sum, a) => sum + a.price * (a.quantity ?? 1), 0),
    [planPrice, addons]
  );

  // 👇 animation trigger state
  const [flash, setFlash] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(subtotal);

  useEffect(() => {
    const start = animatedTotal;
    const end = subtotal;
    const duration = 300;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2); // ease-out
      setAnimatedTotal(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [subtotal]);

  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(t);
  }, [subtotal]);

  return (
    <div className={`cart-summary ${flash ? "flash" : ""}`}>
      <h4 className="cart-title">Order Summary</h4>

      <div className="cart-line">
        <span>{planName} Plan</span>
        {/* <span>${planPrice.toFixed(2)}</span> */}
        <span>${planPrice}</span>
      </div>

      {addons.length > 0 && (
        <>
          <hr className="cart-divider" />
          {addons.map((addon, idx) => (
            <div key={idx} className="cart-line cart-addon">
              <span>{addon.label}</span>
              <div className="addon-inline">
                {addon.quantity !== undefined && (
                  <>
                    <span>x{addon.quantity}</span>
                    <span>
                      ${(addon.price * (addon.quantity ?? 1)).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      <hr className="cart-divider strong" />
      <div className="cart-line total">
        <strong>Total due today</strong>
        <strong>${animatedTotal.toFixed(2)}</strong>
      </div>
      <p className="cart-note">Billed monthly • Cancel anytime</p>
    </div>
  );
};

export default CartSummary;
