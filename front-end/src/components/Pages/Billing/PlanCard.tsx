import React, { useEffect, useState } from "react";
import "./planCard.css";

interface PlanCardProps {
  planId: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  isCurrent?: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  name,
  description,
  price,
  features,
  isCurrent = false,
  isUpgrade,
  isDowngrade,
  isRecommended = false,
  onSelect,
}) => {
  const [open, setOpen] = useState(isCurrent);
  const toggle = () => setOpen(!open);

  // Auto-expand on desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) setOpen(true);
  }, []);

  return (
    <div
      className={`billing-plan-card ${isCurrent ? "current" : ""} ${
        isRecommended ? "recommended" : ""
      }`}
    >
      <div className="plan-header">
        <div className="plan-header-info" onClick={toggle}>
          <div className="plan-title">
            <h3>{name}</h3>
            <p className="price">{price === 0 ? "Free" : `$${price}/month`}</p>
          </div>
          {isRecommended && !isCurrent && (
            <span className="plan-pill recommended">Recommended</span>
          )}
          {isCurrent && <span className="plan-pill current">Current</span>}
        </div>

        <div className="plan-header-details">
          <button
            className={`btn-select ${isCurrent ? "btn-disabled" : ""}`}
            onClick={onSelect}
            disabled={isCurrent}
          >
            {isCurrent
              ? "Current Plan"
              : isUpgrade
              ? "Upgrade"
              : isDowngrade
              ? "Downgrade"
              : "Select"}
          </button>
          <button className="collapse-btn" onClick={toggle}>
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {open && (
        <div className="plan-body">
          <p className="desc">{description}</p>
          <ul className="feature-list">
            {features.map((f, i) => (
              <li key={i}>✅ {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlanCard;
