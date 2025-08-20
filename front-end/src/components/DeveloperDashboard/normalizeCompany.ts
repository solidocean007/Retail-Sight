import { CompanyCounts, CompanyDoc, CompanyNormalized } from "./deverloperTypes";

function toISO(ts: any): string | undefined {
  if (!ts) return undefined;
  if (typeof ts === "string") return ts;
  if (ts?.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return undefined;
}

const EMPTY_COUNTS: CompanyCounts = { // this isnt used
  usersTotal: 0,
  usersPending: 0,
  connectionsApproved: 0,
  connectionsPending: 0,
  brands: 0,
  products: 0,
  accounts: 0,
  goalsActive: 0,
};

export function normalizeCompany(id: string, raw: CompanyDoc): CompanyNormalized {
  const verified = raw.companyVerified ?? raw.verified ?? false;

  const steps = [
    raw.onboarding?.hasMinUsers,
    raw.onboarding?.hasAccounts,
    raw.onboarding?.hasProductsOrBrands,
    raw.onboarding?.hasGoalsOrQuotas,
  ].filter((x) => x === true);

  const computedScore =
    typeof raw.onboardingScore === "number"
      ? raw.onboardingScore
      : Math.round((steps.length / 4) * 100) || 0;

  return {
    id,
    companyName: raw.companyName ?? "(unnamed)",
    normalizedName: raw.normalizedName,
    companyType: raw.companyType,
    createdAt: toISO(raw.createdAt),
    lastUpdated: toISO(raw.lastUpdated),
    verified,
    companyVerified: verified,
    tier: raw.tier ?? "free",
    limits: raw.limits ?? { maxUsers: 1, maxConnections: 1 },
    primaryContact: raw.primaryContact ?? {},
    counts: {
      usersTotal: raw.counts?.usersTotal ?? 0,
      usersPending: raw.counts?.usersPending ?? 0,
      connectionsApproved: raw.counts?.connectionsApproved ?? 0,
      connectionsPending: raw.counts?.connectionsPending ?? 0,
      brands: raw.counts?.brands ?? 0,
      products: raw.counts?.products ?? 0,
      accounts: raw.counts?.accounts ?? 0,
      goalsActive: raw.counts?.goalsActive ?? 0,
    },
    onboarding: raw.onboarding ?? {},
    onboardingScore: computedScore,
    accessStatus: raw.accessStatus ?? (verified ? "limited" : "off"),
    connections: {
      approvedWith: raw.connections?.approvedWith ?? [],
      pendingWith: raw.connections?.pendingWith ?? [],
    },
  };
}
