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
  // PENDING INVITES
  //
  const invitesSnap = await db
    .collection(`companies/${companyId}/invites`)
    .where("status", "==", "pending")
    .get();

  console.log(
    "Pending invite IDs:",
    invitesSnap.docs.map((d) => d.id)
  );

  const usersPendingTotal = invitesSnap.size;

  //
  // CONNECTIONS (both directions)
  //
  const fromSnap = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", companyId)
    .get();

  const toSnap = await db
    .collection("companyConnections")
    .where("requestToCompanyId", "==", companyId)
    .get();

  const allConnections = [...fromSnap.docs, ...toSnap.docs];

  let connectionsApprovedTotal = 0;
  let connectionsPendingTotal = 0;

  for (const doc of allConnections) {
    const data = doc.data();
    if (data.status === "approved") {
      connectionsApprovedTotal++;
    } else if (data.status === "pending") {
      connectionsPendingTotal++;
    }
  }

  await db.doc(`companies/${companyId}`).update({
    counts: {
      usersActiveTotal,
      usersPendingTotal,
      connectionsApprovedTotal,
      connectionsPendingTotal,
    },
    countsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    usersActiveTotal,
    usersPendingTotal,
    connectionsApprovedTotal,
    connectionsPendingTotal,
  };
}
