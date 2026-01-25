// components/billing/AddonCard.tsx
import React, { useState } from "react";
import "./addonCard.css";

export type AddonCapacity = {
  included: number;
  purchased: number;
};
interface AddonCardProps {
  title: string;
  description: string;
  unitPrice: number;
  capacity: AddonCapacity | undefined;
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
  capacity,
  onAdd,
  onRemove,
  pendingRemoval,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState<"add" | "remove" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(Math.max(1, parseInt(e.target.value) || 1));
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

  const formatDate = (date: any): string | null => {
    if (!date) return null;
    const d =
      date.toDate?.() ?? (typeof date === "string" ? new Date(date) : null);
    return d
      ? d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
  };

  const isPending =
    pendingRemoval?.addonType?.toLowerCase() === title.toLowerCase() &&
    pendingRemoval?.quantityRemoved > 0;

  const removalDate = isPending ? formatDate(pendingRemoval?.removeAt) : null;

  return (
    <div className="addon-card">
      <div className="addon-header">
        <h4>{title}</h4>
      </div>
      <div className="addon-card-section">
        <div className="addon-usage">
          <div>
            Included with plan: <strong>{capacity?.included}</strong>
          </div>
          <div>
            Extra purchased: <strong>{capacity?.purchased}</strong>
          </div>
        </div>

        {isPending && (
          <div className="addon-pending">
            ⏳ Scheduled for removal on{" "}
            <strong>{removalDate || "next billing cycle"}</strong>
          </div>
        )}

        <div className="addon-controls">
          <div className="addon-controls-text">
            <p className="addon-desc">{description}</p>

            <p className="addon-price">${unitPrice.toFixed(2)}/ea</p>
          </div>

          <div className="addon-buttons">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={handleChange}
              className="addon-input"
            />
            <button
              className="btn-addon-action add"
              onClick={handleAdd}
              disabled={loading === "add"}
            >
              {loading === "add" ? "Adding..." : "Add"}
            </button>

            {capacity?.purchased && capacity?.purchased > 0 && (
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
      </div>

      {/* <div className="addon-footer">
        +${(unitPrice * quantity).toFixed(2)} / month
      </div> */}
    </div>
  );
};

export default AddonCard;
