import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Asserts that a company is within its allowed seat or connection limit.
 *
 * This helper is used to **hard-block** creation or activation of:
 * - users (seat count)
 * - company connections
 *
 * The effective limit is calculated as:
 *   base plan limit + purchased add-ons
 *
 * This function does **not** mutate usage.
 * It only validates that the requested action is allowed.
 *
 * Usage is expected to be incremented separately **only after**
 * the action successfully completes (e.g. user activated, connection approved).
 *
 * @param companyId - The company whose limits should be enforced
 * @param type - The resource being checked:
 *   - `"user"` → user seats
 *   - `"connection"` → approved company connections
 *
 * @throws {HttpsError}
 * - `not-found` if the company does not exist
 * - `resource-exhausted` if the company has reached or exceeded its limit
 *
 * @example
 * // Before activating a user
 * await assertWithinSeatLimit(companyId, "user");
 *
 * @example
 * // Before approving a connection
 * await assertWithinSeatLimit(companyId, "connection");
 */
export async function assertWithinSeatLimit(
  companyId: string,
  type: "user" | "connection"
): Promise<void> {
  const snap = await db.doc(`companies/${companyId}`).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const data = snap.data()!;
  const limits = data.limits || {};
  const usage = data.usage || {};
  const addons = data.billing?.addons || {};

  const limit =
    type === "user"
      ? (limits.userLimit ?? 0) + (addons.extraUser ?? 0)
      : (limits.connectionLimit ?? 0) + (addons.extraConnection ?? 0);

  const used = type === "user" ? (usage.users ?? 0) : (usage.connections ?? 0);

  if (used >= limit) {
    throw new HttpsError(
      "resource-exhausted",
      "Seat limit reached. Please upgrade your plan or add more seats."
    );
  }
}
