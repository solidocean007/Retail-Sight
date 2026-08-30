// Catalog derivation for the authenticated Billing page.
//
// All plan-visibility policy lives server-side in the
// `getAvailableBillingPlans` callable (family, selfServe, active). This module
// only shapes that response for display: labels, usage math, deltas, and the
// recommendation heuristic. Keep it pure so it stays testable.

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { PlanFamily } from "../types";

export type CatalogPlan = {
  planDocId: string;
  braintreePlanId: string;
  price: number;
  userLimit: number;
  connectionLimit: number;
  description: string;
  sortOrder: number;
  family: PlanFamily;
};

export type CurrentPlanSummary = {
  planDocId: string | null;
  braintreePlanId: string;
  price: number | null;
  userLimit: number | null;
  connectionLimit: number | null;
  family: PlanFamily | null;
  selfServe: boolean;
  active: boolean;
};

export type BillingCatalog = {
  family: PlanFamily | null;
  plans: CatalogPlan[];
  currentPlan: CurrentPlanSummary;
};

export async function fetchBillingCatalog(
  companyId: string
): Promise<BillingCatalog> {
  const call = httpsCallable<{ companyId: string }, BillingCatalog>(
    functions,
    "getAvailableBillingPlans"
  );
  const { data } = await call({ companyId });
  return data;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  team: "Team",
  pro: "Pro",
  enterprise: "Enterprise",
  dist_max: "Max",
  supplier_free: "Supplier Free",
  supplier_starter: "Supplier Starter",
  supplier_growth: "Supplier Growth",
  supplier_network: "Supplier Network",
  supplier_national: "Supplier National",
  healy_plan: "Healy",
  custom_contract: "Custom contract",
};

export function formatPlanLabel(planId: string): string {
  return PLAN_LABELS[planId] ?? planId;
}

/** The word for the partner side of this family's connections. */
export function partnerNoun(family: PlanFamily | null): string {
  return family === "supplier" ? "distributor" : "supplier";
}

export function familyLabel(family: PlanFamily | null): string {
  if (family === "supplier") return "Supplier workspace";
  if (family === "distributor") return "Distributor workspace";
  return "Workspace";
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export type Usage = { users: number; connections: number };

export type CompanyCounts = {
  usersActiveTotal?: number;
  usersPendingTotal?: number;
  connectionsApprovedTotal?: number;
  connectionsPendingTotal?: number;
};

export function getUsage(counts: CompanyCounts | undefined | null): Usage | null {
  if (!counts) return null;
  return {
    users: (counts.usersActiveTotal ?? 0) + (counts.usersPendingTotal ?? 0),
    connections:
      (counts.connectionsApprovedTotal ?? 0) +
      (counts.connectionsPendingTotal ?? 0),
  };
}

export type MeterState = "normal" | "warning" | "limit";

export function meterState(used: number, limit: number | null): MeterState {
  if (!limit || limit <= 0) return "normal";
  const ratio = used / limit;
  if (ratio >= 1) return "limit";
  if (ratio >= 0.8) return "warning";
  return "normal";
}

// ---------------------------------------------------------------------------
// Deltas & recommendation
// ---------------------------------------------------------------------------

export type PlanDelta = {
  price: number;
  users: number;
  connections: number;
  direction: "upgrade" | "downgrade" | "same";
};

export function planDelta(
  plan: CatalogPlan,
  current: CurrentPlanSummary
): PlanDelta {
  const currentPrice = current.price ?? 0;
  return {
    price: plan.price - currentPrice,
    users: plan.userLimit - (current.userLimit ?? 0),
    connections: plan.connectionLimit - (current.connectionLimit ?? 0),
    direction:
      plan.price > currentPrice
        ? "upgrade"
        : plan.price < currentPrice
          ? "downgrade"
          : "same",
  };
}

export function isCurrentPlan(
  plan: CatalogPlan,
  current: CurrentPlanSummary
): boolean {
  if (current.planDocId) return plan.planDocId === current.planDocId;
  return (
    plan.braintreePlanId !== "" &&
    plan.braintreePlanId === current.braintreePlanId
  );
}

/**
 * One line explaining why a downgrade target is unavailable, or null when it
 * is allowed. A plan smaller than what the company currently uses cannot be
 * scheduled.
 */
export function downgradeBlockReason(
  plan: CatalogPlan,
  current: CurrentPlanSummary,
  usage: Usage | null,
  family: PlanFamily | null
): string | null {
  if (!usage) return null;
  if (planDelta(plan, current).direction !== "downgrade") return null;
  const over: string[] = [];
  if (usage.users > plan.userLimit) over.push(`${usage.users} team members`);
  if (usage.connections > plan.connectionLimit) {
    over.push(`${usage.connections} ${partnerNoun(family)} connections`);
  }
  if (over.length === 0) return null;
  return `Your ${over.join(" and ")} exceed this plan's limits.`;
}

/**
 * The smallest upgrade that fits current usage with growth headroom.
 *
 * Only recommends when it is defensible from real numbers: usage data exists
 * and at least one capacity is at 70%+ of the current plan (or the current
 * limits are unknown and usage exists). Returns null otherwise — the UI must
 * not fake a recommendation.
 */
export function recommendPlan(
  plans: CatalogPlan[],
  current: CurrentPlanSummary,
  usage: Usage | null
): { plan: CatalogPlan; reason: string } | null {
  if (!usage) return null;

  const userLimit = current.userLimit ?? 0;
  const connLimit = current.connectionLimit ?? 0;
  const strainedUsers = userLimit > 0 && usage.users / userLimit >= 0.7;
  const strainedConns = connLimit > 0 && usage.connections / connLimit >= 0.7;
  if (!strainedUsers && !strainedConns) return null;

  const currentPrice = current.price ?? 0;
  const upgrades = plans
    .filter((p) => p.price > currentPrice)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price);

  const fits = (p: CatalogPlan) =>
    usage.users <= p.userLimit * 0.7 && usage.connections <= p.connectionLimit * 0.7;

  const pick = upgrades.find(fits) ?? upgrades[upgrades.length - 1];
  if (!pick) return null;

  const parts: string[] = [];
  if (strainedUsers) parts.push(`${usage.users} of ${userLimit} seats`);
  if (strainedConns) parts.push(`${usage.connections} of ${connLimit} connections`);
  const d = planDelta(pick, current);
  const reason = `You're using ${parts.join(" and ")} — ${formatPlanLabel(
    pick.planDocId
  )} adds ${Math.max(0, d.users)} seats and ${Math.max(0, d.connections)} connections.`;

  return { plan: pick, reason };
}
