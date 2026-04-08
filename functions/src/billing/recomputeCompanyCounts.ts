import * as admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Recomputes and persists aggregate usage counters for a company.
 *
 * This function performs authoritative counting of:
 * - Active users (`users` collection where status === "active")
 * - Pending user invites (`invites` collection where status === "pending")
 * - Company connections (both incoming and outgoing)
 *   - Approved connections
 *   - Pending connections
 *
 * The computed totals are written to:
 *   companies/{companyId}.counts
 *
 * This is intended to be used:
 * - Before enforcing plan limits (pre-validation)
 * - After user or connection mutations (post-sync)
 * - As a repair mechanism if counters drift
 *
 * ⚠️ Important:
 * - This function is NOT transactional across collections.
 * - It performs live queries and overwrites the counts snapshot.
 * - It should not be called excessively in hot paths.
 *
 * @param {string} companyId - The Firestore company document ID.
 *
 * @returns {Promise<{
 *   usersActiveTotal: number;
 *   usersPendingTotal: number;
 *   connectionsApprovedTotal: number;
 *   connectionsPendingTotal: number;
 * }>} The freshly computed usage snapshot.
 *
 * @throws Will propagate Firestore read/write errors.
 */
export async function recomputeCompanyCountsInternal(companyId: string) {
  //
  // ACTIVE USERS
  //
  const usersSnap = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .where("status", "==", "active")
    .get();

  const usersActiveTotal = usersSnap.size;

  //
  // PENDING INVITES TO JOIN THE COMPANY
  //
  const invitesSnap = await db
    .collection(`companies/${companyId}/invites`)
    .where("status", "==", "pending")
    .get();

  const usersPendingTotal = invitesSnap.size;

  //
  // CONNECTIONS — ONLY COUNT WHAT THIS COMPANY INITIATED
  //

  // ✅ Approved connections (initiated by this company)
  const approvedSnap = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", companyId)
    .where("status", "==", "approved")
    .get();

  // ✅ Pending connections (initiated by this company)
  const pendingInitiatedSnap = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", companyId)
    .where("status", "==", "pending")
    .get();

  // ✅ Draft connections (pre-user creation, initiated by this company)
  const draftSnap = await db
    .collection("companyConnectionDrafts")
    .where("initiatorCompanyId", "==", companyId)
    .get();

  // ❌ DO NOT count incoming pending toward limits
  const pendingReceivedSnap = await db
    .collection("companyConnections")
    .where("requestToCompanyId", "==", companyId)
    .where("status", "==", "pending")
    .get();

  //
  // TOTALS
  //
  const connectionsApprovedTotal = approvedSnap.size;

  const connectionsPendingInitiatedTotal =
    pendingInitiatedSnap.size + draftSnap.size;

  const connectionsPendingReceivedTotal = pendingReceivedSnap.size;

  //
  // WRITE COUNTS
  //
  await db.doc(`companies/${companyId}`).update({
    counts: {
      usersActiveTotal,
      usersPendingTotal,

      connectionsApprovedTotal,
      connectionsPendingInitiatedTotal,
      connectionsPendingReceivedTotal,
    },
    countsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    usersActiveTotal,
    usersPendingTotal,

    connectionsApprovedTotal,
    connectionsPendingInitiatedTotal,
    connectionsPendingReceivedTotal,
  };
}
