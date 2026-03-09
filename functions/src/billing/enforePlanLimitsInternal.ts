import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type EnforceAction = "addUser" | "addConnection";

/**
 * Enforces subscription plan limits for a company before allowing
 * a usage-increasing action (e.g., adding a user or connection).
 *
 * This function:
 * 1. Loads the company document.
 * 2. Reads current billing + usage counts snapshot.
 * 3. Loads plan definitions from the `plans` collection.
 * 4. Determines the *effective limit*:
 *    - If no pending downgrade → current plan limits apply.
 *    - If a pending downgrade exists → the LOWER of current and upcoming
 *      plan limits is enforced immediately.
 * 5. Verifies that the requested increment will not exceed limits.
 *
 * It throws an HttpsError("failed-precondition") if the action would
 * exceed the effective plan limits.
 *
 * ⚠️ Important:
 * - This relies on `companies/{companyId}.counts` being accurate.
 * - It should be preceded by `recomputeCompanyCountsInternal()` when
 *   correctness is critical.
 * - This function does NOT mutate any data — it only validates.
 * - Plan definitions are loaded dynamically (can be optimized via caching).
 *
 * @param {string} companyId - The Firestore company document ID.
 * @param {"addUser" | "addConnection"} action - The type of usage being increased.
 * @param {number} [increment=1] - How much usage to simulate adding.
 *   Allows validation for bulk operations.
 *
 * @returns {Promise<void>} Resolves silently if allowed.
 *
 * @throws {HttpsError}
 * - "not-found" if the company does not exist.
 * - "failed-precondition" if billing data is missing or limits are exceeded.
 */
export async function enforcePlanLimitsInternal(
  companyId: string,
  action: EnforceAction,
  increment = 1
) {
  const companySnap = await db.doc(`companies/${companyId}`).get();

  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found");
  }

  const company = companySnap.data();
  const billing = company?.billing;
  const counts = company?.counts;

  if (!billing || !counts) {
    throw new HttpsError("failed-precondition", "Billing data not initialized");
  }

  //
  // Load plans (can optimize later)
  //
  const plansSnap = await db.collection("plans").get();
  const plans: Record<string, any> = {};

  plansSnap.forEach((doc) => {
    plans[doc.id] = doc.data();
  });

  const currentPlan = plans[billing.plan];
  if (!currentPlan) {
    throw new HttpsError("failed-precondition", "Current plan not found");
  }

  const upcomingPlan = billing.pendingChange
    ? plans[billing.pendingChange.nextPlanId]
    : null;

  //
  // Effective limits (respect downgrade)
  //
  const effectiveUserLimit = upcomingPlan
    ? Math.min(currentPlan.userLimit, upcomingPlan.userLimit)
    : currentPlan.userLimit;

  const effectiveConnectionLimit = upcomingPlan
    ? Math.min(currentPlan.connectionLimit, upcomingPlan.connectionLimit)
    : currentPlan.connectionLimit;

  //
  // Current totals
  //
  const currentUsers =
    (counts.usersActiveTotal ?? 0) + (counts.usersPendingTotal ?? 0);

  const currentConnections =
    (counts.connectionsApprovedTotal ?? 0) +
    (counts.connectionsPendingTotal ?? 0);

  //
  // Enforcement
  //
  if (action === "addUser") {
    if (currentUsers + increment > effectiveUserLimit) {
      throw new HttpsError(
        "failed-precondition",
        "User limit reached for your plan."
      );
    }
  }

  if (action === "addConnection") {
    if (currentConnections + increment > effectiveConnectionLimit) {
      throw new HttpsError(
        "failed-precondition",
        "Connection limit reached for your plan."
      );
    }
  }
}
