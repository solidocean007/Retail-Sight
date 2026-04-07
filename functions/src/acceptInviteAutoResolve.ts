import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";

const db = admin.firestore();

/**
 * Resolves pending company connection drafts for a newly onboarded company.
 *
 * This function:
 * 1. Validates input (email and newCompanyId)
 * 2. Enforces plan limits for the new company
 * 3. Finds all `companyConnectionDrafts` created during the invite flow
 *    that match the invited user's email and are still in "pending-user-creation" status
 * 4. Converts each draft into a real `companyConnections` document
 * 5. Marks the original drafts as "resolved"
 * 6. Recomputes company counts after connection creation
 *
 * @param {string} email - The invited user's email address (must match `targetEmail` in drafts)
 * @param {string} newCompanyId - The ID of the newly created company for the onboarded user
 *
 * @throws {HttpsError} If required parameters are missing or invalid
 *
 * @returns {Promise<{ ok: boolean; message?: string }>}
 * Returns `{ ok: true }` if drafts were processed successfully, or
 * `{ ok: true, message: "No drafts found." }` if no matching drafts exist
 *
 * @example
 * await resolveDraftConnections("user@example.com", "company_123");
 */
export async function resolveDraftConnections(
  email: string,
  newCompanyId: string
) {
  if (!email || !newCompanyId) {
    throw new HttpsError("invalid-argument", "Missing email or companyId");
  }

  await recomputeCompanyCountsInternal(newCompanyId);

  const draftsSnap = await db
    .collection("companyConnectionDrafts")
    .where("targetEmail", "==", email.toLowerCase())
    .where("status", "==", "pending-user-creation")
    .get();

  if (draftsSnap.empty) {
    return { ok: true, message: "No drafts found." };
  }

  const batch = db.batch();

  draftsSnap.forEach((docSnap) => {
    const draft = docSnap.data();

    const newConnRef = db.collection("companyConnections").doc();

    batch.set(newConnRef, {
      requestFromCompanyId: draft.initiatorCompanyId,
      requestToCompanyId: newCompanyId,
      pendingBrands: draft.pendingBrands || [],
      sharedBrands: [],
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.update(docSnap.ref, {
      status: "resolved",
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  await recomputeCompanyCountsInternal(newCompanyId);

  return { ok: true };
}

// ✅ CALLABLE WRAPPER
export const acceptInviteAutoResolve = onCall(async (request) => {
  const { email, newCompanyId } = request.data;
  return await resolveDraftConnections(email, newCompanyId);
});
