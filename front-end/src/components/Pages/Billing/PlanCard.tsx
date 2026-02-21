import React, { useEffect, useState } from "react";
import "./planCard.css";

export function formatPlanLabel(planId: string) {
  switch (planId) {
    case "healy_plan":
      return "Healy";
    case "free":
      return "Free";
    case "starter":
      return "Starter";
    case "team":
      return "Team";
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
    default:
      return planId;
  }
}

export const PLAN_COPY = {
  free: {
    title: "Free",
    description: "Best for evaluation and very small teams.",
  },
  starter: {
    title: "Starter",
    description: "For small distributors and supplier pilot programs.",
  },
  team: {
    title: "Team",
    description: "For growing distributors building active supplier networks.",
  },
  pro: {
    title: "Pro",
    description:
      "For regional organizations with larger teams and reporting needs.",
  },
  enterprise: {
    title: "Enterprise",
    description: "For large organizations with complex collaboration needs.",
  },
};

interface PlanCardProps {
  planId: string;
  price: number;
  userLimit: number;
  connectionLimit: number;
  isCurrent: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  isRecommended?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  planId,
  price,
  userLimit,
  connectionLimit,
  isCurrent = false,
  isUpgrade,
  isDowngrade,
  isRecommended = false,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(isCurrent);
  const toggle = () => setOpen(!open);

  // Auto-expand on desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) setOpen(true);
  }, []);

  return (
    <div className="billing-plan-card">
      {isRecommended && !isCurrent && (
        <div className="plan-badge">Most Popular</div>
      )}

      {isCurrent && <div className="plan-badge current">Current Plan</div>}

      {disabled && <div className="overlay">Downgrade scheduled</div>}

      <div className="plan-top">
        <h3 className="plan-name">
          {PLAN_COPY[planId as keyof typeof PLAN_COPY]?.title ??
            formatPlanLabel(planId)}
        </h3>

        <div className="plan-price-block">
          <span className="price-amount">
            {price === 0 ? "Free" : `$${price}`}
          </span>
          {price !== 0 && <span className="price-period">/month</span>}
        </div>
      </div>

      <div className="plan-capacity-block">
        <div className="capacity-item">
          <span className="capacity-number">{userLimit}</span>
          <span className="capacity-label">Users</span>
        </div>
        <div className="capacity-divider" />
        <div className="capacity-item">
          <span className="capacity-number">{connectionLimit}</span>
          <span className="capacity-label">Connections</span>
        </div>
      </div>

      <p className="plan-description">
        {PLAN_COPY[planId as keyof typeof PLAN_COPY]?.description ??
          "Contact us for details."}
      </p>

      <button
        className={`plan-cta ${
          isCurrent ? "btn-secondary btn-disabled" : "button-primary"
        }`}
        onClick={onSelect}
        disabled={isCurrent || disabled}
      >
        {isCurrent
          ? "Current Plan"
          : isUpgrade
            ? "Upgrade"
            : isDowngrade
              ? "Downgrade"
              : "Select Plan"}
      </button>
    </div>
  );
};

export default PlanCard;
