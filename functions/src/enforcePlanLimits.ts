// functions/src/enforcePlanLimits.ts
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertCompanyMember } from "./billing/billingAuth";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Internal helper used by enforcePlanLimits and other Cloud Functions
 * to evaluate plan-based usage limits.
 */
export async function checkPlanLimit(
  companyId: string,
  type: "user" | "connection"
) {
  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists)
    throw new HttpsError("not-found", "Company not found.");

  const company = companySnap.data()!;
  const planId = company.billing?.plan;
  const planSnap = await db.collection("plans").doc(planId).get();
  const planData = planSnap.exists ? planSnap.data() : {};

  const userLimit = planData?.userLimit ?? 0;
  const connectionLimit = planData?.connectionLimit ?? 0;
  const addonUsers = company.billing?.addons?.extraUser ?? 0;
  const addonConnections = company.billing?.addons?.extraConnection ?? 0;

  if (type === "user") {
    const usersSnap = await db
      .collection("users")
      .where("companyId", "==", companyId)
      .get();
    const userCount = usersSnap.size;

    if (userCount >= userLimit + addonUsers)
      throw new HttpsError(
        "resource-exhausted",
        `You’ve reached your user limit (${userLimit + addonUsers}).`
      );

    return {
      allowed: true,
      used: userCount,
      remaining: userLimit + addonUsers - userCount,
      planLimit: userLimit + addonUsers,
    };
  }

  if (type === "connection") {
    const sent = await db
      .collection("companyConnections")
      .where("requestFromCompanyId", "==", companyId)
      .where("status", "==", "approved")
      .get();

    const received = await db
      .collection("companyConnections")
      .where("requestToCompanyId", "==", companyId)
      .where("status", "==", "approved")
      .get();

    const total = sent.size + received.size;

    if (total >= connectionLimit + addonConnections)
      throw new HttpsError(
        "resource-exhausted",
        `You’ve reached your connection limit (${connectionLimit + addonConnections}).`
      );

    return {
      allowed: true,
      used: total,
      remaining: connectionLimit + addonConnections - total,
      planLimit: connectionLimit + addonConnections,
    };
  }

  throw new HttpsError("invalid-argument", "Invalid limit type.");
}

/**
 * ✅ enforcePlanLimits
 * Cloud Function to enforce user or connection limits for a company
 * based on its current billing plan and addons.
 *
 * @param request.data.companyId The company ID to evaluate
 * @param request.data.type The limit type ("user" | "connection")
 * @returns Allowed status and limit usage details
 */
export const enforcePlanLimits = onCall(async (request) => {
  const { companyId, type } = request.data || {};
  if (!companyId || !type)
    throw new HttpsError("invalid-argument", "Missing args.");
  if (!request.auth)
    throw new HttpsError("unauthenticated", "User not logged in.");

  // ✅ must be in that company (admin not required to *check* limits)
  await assertCompanyMember(request.auth, companyId);

  return checkPlanLimit(companyId, type);
});
