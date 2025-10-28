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
}

const AddonCard: React.FC<AddonCardProps> = ({
  title,
  description,
  unitPrice,
  current,
  onAdd,
  onRemove,
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
  const hasAddons = current > 0;

  return (
    <div className="addon-card">
      <div className="addon-header">
        <h4>{title}</h4>
        <span className="addon-price">${unitPrice.toFixed(2)}/ea</span>
      </div>
      {/* <p className="addon-desc">{description}</p> */}

      <div className="addon-current">
        <p>
          Current: <strong>{current}</strong>
        </p>
      </div>

      <div className="addon-controls">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={handleChange}
          className="addon-input"
        />
        <div className="addon-buttons">
          <button className="btn-addon-action add" onClick={handleAdd}>
            Add
          </button>

          {/* Only show Remove if there’s something to remove */}
          {current > 0 && (
            <button className="btn-addon-action remove" onClick={handleRemove}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddonCard;
