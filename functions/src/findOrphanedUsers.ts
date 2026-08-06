import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type OrphanedUserRow = {
  uid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: string | null;
  role: string | null;
  status: string | null;
};

/**
 * findOrphanedUsers
 *
 * Finds Firestore `users/{uid}` docs whose uid has no matching Firebase Auth
 * account. Known mechanism: acceptTeamInvite's Firestore transaction can
 * commit successfully (creating the users doc, marking the invite accepted)
 * while a later step in that same call (setCustomUserClaims / company count
 * recompute) throws. The client, having just created the Auth account for
 * this signup attempt, sees the call fail and "rolls back" by deleting the
 * Auth account it created — but the Firestore write already landed and is
 * never cleaned up. See acceptTeamInvite.ts and InviteAcceptForm.tsx.
 *
 * Gated to developer (any company) or super-admin (own company only), same
 * pattern as adminUpdateCompanyUser / createInviteAndEmail.
 */
export const findOrphanedUsers = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
  if (!callerSnap.exists) {
    throw new HttpsError("permission-denied", "Caller not found.");
  }

  const caller = callerSnap.data()!;
  const isDeveloper = caller.role === "developer";
  const isSuperAdmin = caller.role === "super-admin";

  if (!isDeveloper && !isSuperAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only developers or super-admins can run this."
    );
  }

  let usersQuery: FirebaseFirestore.Query = db.collection("users");

  if (!isDeveloper) {
    if (!caller.companyId) {
      throw new HttpsError("failed-precondition", "Missing companyId.");
    }
    // Super-admins only get to scan their own company.
    usersQuery = usersQuery.where("companyId", "==", caller.companyId);
  }

  const usersSnap = await usersQuery.get();
  const docs = usersSnap.docs;
  const orphaned: OrphanedUserRow[] = [];

  // admin.auth().getUsers() accepts at most 100 identifiers per call.
  const BATCH_SIZE = 100;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map((d) => ({ uid: d.id }));

    const { notFound } = await admin.auth().getUsers(identifiers);
    const notFoundUids = new Set(
      notFound
        .map((id) => ("uid" in id ? id.uid : undefined))
        .filter((uid): uid is string => Boolean(uid))
    );

    for (const d of batch) {
      if (notFoundUids.has(d.id)) {
        const data = d.data();
        orphaned.push({
          uid: d.id,
          email: data.email ?? null,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          companyId: data.companyId ?? null,
          role: data.role ?? null,
          status: data.status ?? null,
        });
      }
    }
  }

  return { scanned: docs.length, orphaned };
});
