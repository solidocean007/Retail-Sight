import { HttpsError, onCall } from "firebase-functions/https";
import { recomputeCompanyCountsInternal } from "./recomputeCompanyCounts";

/**
 * Developer-only callable function to force a full recomputation of a company's
 * usage counts (users and connections).
 *
 * This function recalculates:
 * - Active users
 * - Pending invites
 * - Approved connections (both directions)
 * - Pending connections (both directions)
 *
 * The computed totals are written to:
 * `companies/{companyId}.counts`
 *
 * ⚠️ Intended for administrative reconciliation, debugging, or manual sync.
 * Should be restricted to super-admin or developer roles in production.
 *
 * @function developerRecomputeCompanyCounts
 *
 * @param {import("firebase-functions").https.CallableRequest} req
 * @param {Object} req.data
 * @param {string} req.data.companyId - The Firestore company ID to recompute counts for.
 *
 * @throws {HttpsError}
 * - "unauthenticated" if the caller is not authenticated.
 * - "invalid-argument" if companyId is missing.
 *
 * @returns {Promise<{
 *   usersActiveTotal: number,
 *   usersPendingTotal: number,
 *   connectionsApprovedTotal: number,
 *   connectionsPendingTotal: number
 * }>}
 * The updated counts snapshot written to the company document.
 */
export const developerRecomputeCompanyCounts = onCall(async (req) => {
  console.log("🔥 developerRecomputeCompanyCounts invoked");
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required");
  }

  const { companyId } = req.data;
  if (!companyId) {
    throw new HttpsError("invalid-argument", "companyId required");
  }

  return await recomputeCompanyCountsInternal(companyId);
});
