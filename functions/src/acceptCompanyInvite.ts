import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const acceptCompanyInvite = onCall(async (request) => {
  const { inviteId, companyId, firstName, lastName } = request.data;
  if (!firstName?.trim() || !lastName?.trim()) {
    throw new HttpsError(
      "invalid-argument",
      "First and last name are required."
    );
  }

  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const inviteRef = db.doc(`companies/${companyId}/invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "Invite not found.");
  }

  const invite = inviteSnap.data()!;

  if (invite.status === "accepted") {
    throw new HttpsError("failed-precondition", "Invite already used.");
  }

  if (invite.expiresAt?.toDate?.() < new Date()) {
    throw new HttpsError("failed-precondition", "Invite expired.");
  }

  // 🔐 PRE ENFORCEMENT
  const counts = await recomputeCompanyCountsInternal(companyId);
  await enforcePlanLimitsInternal(companyId, "addUser");

  const isFirstUser = (counts.usersActiveTotal ?? 0) === 0;
  const role = isFirstUser ? "admin" : invite?.role || "employee";

  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    tx.set(
      db.doc(`users/${uid}`),
      {
        uid,
        email: invite.inviteeEmail ?? "",
        firstName,
        lastName,
        companyId,
        role,
        status: "active",
        lastUpdated: now,
      },
      { merge: true }
    );

    tx.update(inviteRef, {
      status: "accepted",
      acceptedBy: uid,
      acceptedAt: now,
    });
  });

  await recomputeCompanyCountsInternal(companyId);

  return { success: true };
});
