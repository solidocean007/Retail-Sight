import React from "react";
import "./planCard.css";
import {
  CatalogPlan,
  PlanDelta,
  formatPlanLabel,
  partnerNoun,
} from "../../../utils/billing/planCatalog";
import { PlanFamily } from "../../../utils/types";

interface PlanCardProps {
  plan: CatalogPlan;
  family: PlanFamily | null;
  delta: PlanDelta | null;
  isCurrent: boolean;
  isRecommended: boolean;
  blockedReason?: string | null;
  disabled?: boolean;
  disabledNote?: string;
  onSelect: () => void;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  family,
  delta,
  isCurrent,
  isRecommended,
  blockedReason,
  disabled,
  disabledNote,
  onSelect,
}) => {
  const label = formatPlanLabel(plan.planDocId);
  const partner = partnerNoun(family);
  const blocked = !!blockedReason;
  const inert = isCurrent || blocked || disabled;

  const cta = isCurrent
    ? "Current plan"
    : delta?.direction === "upgrade"
      ? `Upgrade to ${label}`
      : delta?.direction === "downgrade"
        ? `Downgrade to ${label}`
        : "Select plan";

  return (
    <article
      className={[
        "plan-card",
        isCurrent ? "is-current" : "",
        isRecommended ? "is-recommended" : "",
        blocked || disabled ? "is-blocked" : "",
      ]
        .join(" ")
        .trim()}
      aria-label={`${label} plan`}
    >
      <header className="plan-card__head">
        <h3 className="plan-card__name">{label}</h3>
        {isCurrent && <span className="plan-chip plan-chip--current">Current</span>}
        {!isCurrent && isRecommended && (
          <span className="plan-chip plan-chip--reco">Best fit</span>
        )}
      </header>

      <p className="plan-card__price">
        {plan.price === 0 ? (
          <span className="plan-card__amount">Free</span>
        ) : (
          <>
            <span className="plan-card__amount">${plan.price}</span>
            <span className="plan-card__period">/month</span>
          </>
        )}
      </p>

      <dl className="plan-card__capacity">
        <div>
          <dt>Team seats</dt>
          <dd>{plan.userLimit.toLocaleString()}</dd>
        </div>
        <div>
          <dt>{partner} connections</dt>
          <dd>{plan.connectionLimit.toLocaleString()}</dd>
        </div>
      </dl>

      {delta && !isCurrent && delta.direction !== "same" && (
        <p className="plan-card__delta">
          {delta.price !== 0 && (
            <span>{signed(delta.price)}$/mo</span>
          )}
          {delta.users !== 0 && <span>{signed(delta.users)} seats</span>}
          {delta.connections !== 0 && (
            <span>{signed(delta.connections)} connections</span>
          )}
        </p>
      )}

      {plan.description && !blocked && (
        <p className="plan-card__desc">{plan.description}</p>
      )}

      {blocked && <p className="plan-card__blocked">{blockedReason}</p>}
      {!blocked && disabled && disabledNote && (
        <p className="plan-card__blocked">{disabledNote}</p>
      )}

      <button
        type="button"
        className={`plan-card__cta ${
          delta?.direction === "upgrade" && !inert ? "is-primary" : ""
        }`}
        onClick={onSelect}
        disabled={inert}
      >
        {cta}
      </button>
    </article>
  );
};

export default PlanCard;
