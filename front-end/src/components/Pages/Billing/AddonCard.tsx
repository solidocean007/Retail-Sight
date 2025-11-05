// components/billing/AddonCard.tsx
import React, { useState } from "react";
import "./addonCard.css";

interface AddonCardProps {
  title: string;
  description: string;
  unitPrice: number;
  current: number;
  onAdd: (count: number) => void;
  onRemove: (count: number) => void;
  pendingRemoval?: {
    addonType: string;
    quantityRemoved: number;
    removeAt?: string | Date | { toDate: () => Date };
  } | null;
}

const AddonCard: React.FC<AddonCardProps> = ({
  title,
  description,
  unitPrice,
  current,
  onAdd,
  onRemove,
  pendingRemoval,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState<"add" | "remove" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    setQuantity(val);
  };

  const handleAdd = async () => {
    setLoading("add");
    try {
      await onAdd(quantity);
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    setLoading("remove");
    try {
      await onRemove(quantity);
    } finally {
      setLoading(null);
    }
  };

  const monthlyCost = unitPrice * quantity;

  const formatDate = (date: any): string | null => {
    if (!date) return null;
    const d =
      date.toDate?.() ? date.toDate() : typeof date === "string" ? new Date(date) : null;
    return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
  };

  const isPending =
    pendingRemoval?.addonType?.toLowerCase() === title.toLowerCase() &&
    pendingRemoval?.quantityRemoved > 0;

  const removalDate = isPending ? formatDate(pendingRemoval?.removeAt) : null;

  return (
    <div className="addon-card">
      <div className="addon-header">
        <h4>{title}</h4>
        <span className="addon-price">${unitPrice.toFixed(2)}/ea</span>
      </div>

      <p className="addon-desc">{description}</p>

      <div className="addon-current">
        <p>
          Current: <strong>{current}</strong>
        </p>
      </div>

      {isPending && (
        <div className="addon-pending">
          <span>
            ⏳ Scheduled for removal on{" "}
            <strong>{removalDate || "next billing cycle"}</strong>
          </span>
        </div>
      )}

      <div className="addon-controls">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={handleChange}
          className="addon-input"
        />
        <div className="addon-buttons">
          <button
            className="btn-addon-action add"
            onClick={handleAdd}
            disabled={loading === "add"}
          >
            {loading === "add" ? "Adding..." : "Add"}
          </button>

          {current > 0 && (
            <button
              className="btn-addon-action remove"
              onClick={handleRemove}
              disabled={loading === "remove"}
            >
              {loading === "remove" ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      </div>

      <div className="addon-footer">
        <p className="addon-monthly">+${monthlyCost.toFixed(2)} / month</p>
      </div>
    </div>
  );
};

export default AddonCard;
