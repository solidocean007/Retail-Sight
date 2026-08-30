import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export type FreePlanAssignment = {
  planDocId: "free" | "supplier_free";
  userLimit: number;
  connectionLimit: number;
};

/**
 * `billing.plan` remains the Braintree-facing value (`free`) for every free
 * workspace. `billing.planDocId` selects the family-specific Firestore plan
 * that owns limits and catalog presentation.
 */
export function getFreePlanDocId(
  companyType: unknown
): FreePlanAssignment["planDocId"] {
  return companyType === "supplier" ? "supplier_free" : "free";
}

/** Load and validate the family-specific free-plan limits from Firestore. */
export async function loadFreePlanAssignment(
  companyType: unknown
): Promise<FreePlanAssignment> {
  const planDocId = getFreePlanDocId(companyType);
  const snap = await db.collection("plans").doc(planDocId).get();

  if (!snap.exists) {
    throw new Error(`Required free plan ${planDocId} not found`);
  }

  const plan = snap.data() || {};
  const userLimit = Number(plan.userLimit);
  const connectionLimit = Number(plan.connectionLimit);
  if (!Number.isFinite(userLimit) || !Number.isFinite(connectionLimit)) {
    throw new Error(`Required free plan ${planDocId} has invalid limits`);
  }

  return { planDocId, userLimit, connectionLimit };
}

/** Resolve the Firestore plan doc governing current or scheduled limits. */
export function resolvePlanDocId(
  planId: unknown,
  planDocId: unknown,
  companyType: unknown
): string | null {
  if (planId === "free") return getFreePlanDocId(companyType);
  if (typeof planDocId === "string" && planDocId) return planDocId;
  return typeof planId === "string" && planId ? planId : null;
}
