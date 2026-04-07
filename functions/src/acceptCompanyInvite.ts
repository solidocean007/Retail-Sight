import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { resolveDraftConnections } from "./acceptInviteAutoResolve";
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const acceptCompanyInvite = onCall(async (request) => {
  const { inviteId, firstName, lastName, companyName } = request.data;

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

  const inviteRef = db.doc(`pendingInvites/${inviteId}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "Invite not found.");
  }

  const invite = inviteSnap.data()!;

  if (invite.status === "accepted") {
    throw new HttpsError("failed-precondition", "Invite already used.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // 🔥 1. CREATE NEW COMPANY
  const newCompanyRef = db.collection("companies").doc();

  await newCompanyRef.set({
    companyName: companyName || invite.email,
    companyType: invite.fromCompanyType || "supplier",
    createdAt: now,

    billing: {
      plan: "free",
      billingStatus: "active",
      usageCounts: {
        users: 1,
        companyConnections: 0,
      },
    },
  });

  const newCompanyId = newCompanyRef.id;

  // 🔐 PRE ENFORCEMENT
  const counts = await recomputeCompanyCountsInternal(newCompanyId);

  const isFirstUser = (counts.usersActiveTotal ?? 0) === 0;
  const role = isFirstUser ? "admin" : invite?.role || "employee";

  // 🔁 TRANSACTION
  await db.runTransaction(async (tx) => {
    tx.set(
      db.doc(`users/${uid}`),
      {
        uid,
        email: invite.email ?? "",
        firstName,
        lastName,
        companyId: newCompanyId, // ✅ FIXED
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

  // 🔁 POST RECOMPUTE
  await recomputeCompanyCountsInternal(newCompanyId);
  await resolveDraftConnections(invite.email, newCompanyId);
  return { success: true };
});
