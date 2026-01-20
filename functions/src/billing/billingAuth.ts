import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Asserts that the calling user is an **admin-level member** of the given company.
 *
 * This helper is intended for **billing, plan, seat, and connection–management**
 * operations where elevated privileges are required.
 *
 * Validation steps:
 * 1. Ensures the request is authenticated
 * 2. Loads the caller's user document
 * 3. Verifies the user belongs to the specified company
 * 4. Verifies the user's role is admin-level
 *
 * Admin-level roles:
 * - "admin"
 * - "owner"
 * - "super-admin"
 *
 * @param auth - The Firebase auth context (typically `request.auth`)
 * @param companyId - The company ID being acted upon
 *
 * @throws {HttpsError}
 * - `unauthenticated` if the user is not logged in
 * - `permission-denied` if the user does not exist, belongs to another company,
 *   or lacks admin privileges
 *
 * @returns An object containing the authenticated user's UID and role
 */
export async function assertCompanyBillingAdmin(
  auth: any,
  companyId: string
): Promise<{ uid: string; role: string }> {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Login required.");

  const userSnap = await db.doc(`users/${auth.uid}`).get();
  if (!userSnap.exists)
    throw new HttpsError("permission-denied", "No user record.");

  const user = userSnap.data()!;
  if (user.companyId !== companyId) {
    throw new HttpsError("permission-denied", "Wrong company.");
  }

  const role = user.role || user.companyRole;
  const isAdmin =
    role === "admin" || role === "owner" || role === "super-admin";

  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin required.");
  }

  console.log("🔐 Billing auth check", {
    uid: auth.uid,
    tokenClaims: auth.token,
    companyId,
  });

  return { uid: auth.uid, role };
}

/**
 * Asserts that the calling user is a **member** of the given company.
 *
 * This helper is intended for **read access** and **non-privileged operations**
 * where any authenticated company member is allowed.
 *
 * Validation steps:
 * 1. Ensures the request is authenticated
 * 2. Loads the caller's user document
 * 3. Verifies the user belongs to the specified company
 *
 * @param auth - The Firebase auth context (typically `request.auth`)
 * @param companyId - The company ID being accessed
 *
 * @throws {HttpsError}
 * - `unauthenticated` if the user is not logged in
 * - `permission-denied` if the user does not exist or belongs to another company
 *
 * @returns An object containing the authenticated user's UID
 */
export async function assertCompanyMember(
  auth: any,
  companyId: string
): Promise<{ uid: string }> {
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Login required.");

  const userSnap = await db.doc(`users/${auth.uid}`).get();
  if (!userSnap.exists)
    throw new HttpsError("permission-denied", "No user record.");

  const user = userSnap.data()!;
  if (user.companyId !== companyId) {
    throw new HttpsError("permission-denied", "Wrong company.");
  }

  return { uid: auth.uid };
}
