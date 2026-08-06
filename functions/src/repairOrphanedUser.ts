import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type RepairPayload = {
  uid: string;
};

/**
 * repairOrphanedUser
 *
 * Pairs with findOrphanedUsers. Deleting an orphaned users/{uid} doc is
 * tempting but risky: other docs can point at that uid (most notably
 * `reportsTo` on anyone who reports to this person — see the
 * couldSupervise/canStillSupervise cleanup in adminUpdateCompanyUser.ts,
 * which only runs when a role/status changes through that function, not
 * when a doc is deleted directly). Deleting the doc silently strands those
 * references instead of triggering that cleanup.
 *
 * So instead of delete-and-redo-the-invite, this recreates the missing
 * Firebase Auth account with the SAME uid as the existing Firestore doc,
 * re-applies the custom claims that acceptTeamInvite would have set, and
 * hands back a password-reset link so the person can sign in. Nothing in
 * Firestore changes — the doc, any reportsTo pointers to it, and the
 * already-"accepted" invite all stay exactly as they are, because they
 * become correct again once the Auth account exists.
 */
export const repairOrphanedUser = onCall<RepairPayload>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const targetUid = (request.data?.uid || "").trim();
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "uid is required.");
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

  const targetDocSnap = await db.doc(`users/${targetUid}`).get();
  if (!targetDocSnap.exists) {
    throw new HttpsError("not-found", "No users doc for that uid.");
  }
  const targetData = targetDocSnap.data()!;

  if (!isDeveloper && caller.companyId !== targetData.companyId) {
    throw new HttpsError(
      "permission-denied",
      "You can only repair users within your own company."
    );
  }

  if (!targetData.email) {
    throw new HttpsError(
      "failed-precondition",
      "That users doc has no email on file — can't recreate an Auth account without one."
    );
  }

  // Safety check: if an Auth account already exists for this uid, this
  // isn't actually orphaned (findOrphanedUsers result may be stale) —
  // refuse rather than clobber a real account.
  try {
    await admin.auth().getUser(targetUid);
    throw new HttpsError(
      "failed-precondition",
      "An Auth account already exists for this uid — nothing to repair."
    );
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    // auth/user-not-found is the expected path — fall through and create it.
  }

  // Firebase enforces one Auth account per email. If someone (or something)
  // re-triggered auto-provisioning in the meantime — e.g. the person tried
  // "Continue with Google" again while their real account was still
  // missing — a NEW, different-uid account may now be squatting on this
  // exact email, and createUser below would fail on it. Surface that
  // clearly instead of a generic Auth error, so the admin knows exactly
  // which stray account to delete first.
  try {
    const squatter = await admin.auth().getUserByEmail(targetData.email);
    const providers = squatter.providerData.map((p) => p.providerId).join(", ");
    throw new HttpsError(
      "already-exists",
      `${targetData.email} is already claimed by a different Auth account ` +
        `(uid ${squatter.uid}, provider(s): ${providers || "password"}). ` +
        "That's almost certainly a stray duplicate created by another " +
        "sign-in attempt — delete it in Firebase Auth first, then repair again."
    );
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    // auth/user-not-found is the expected path — the email is free.
  }

  await admin.auth().createUser({
    uid: targetUid,
    email: targetData.email,
    emailVerified: false,
  });

  await admin.auth().setCustomUserClaims(targetUid, {
    companyId: targetData.companyId ?? null,
    role: targetData.role ?? "employee",
    status: targetData.status ?? "active",
  });

  const resetLink = await admin
    .auth()
    .generatePasswordResetLink(targetData.email);

  await db.collection("auditLogs").add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    action: "user.repairOrphanedAuth",
    actorUid: request.auth.uid,
    actorRole: caller.role,
    targetUid,
    targetEmail: targetData.email,
    companyId: targetData.companyId ?? null,
  });

  return {
    success: true,
    uid: targetUid,
    email: targetData.email,
    resetLink,
  };
});
