import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type AcceptTeamInvitePayload = {
  companyId: string;
  inviteId: string;
  firstName: string;
  lastName: string;
};

export const acceptTeamInvite = onCall<AcceptTeamInvitePayload>(
  async (request) => {
    const { companyId, inviteId, firstName, lastName } = request.data;

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required.");
    }

    const uid = request.auth.uid;
    const authEmail = request.auth.token.email?.toLowerCase();

    if (!companyId || !inviteId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing companyId or inviteId."
      );
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "First and last name are required."
      );
    }

    const inviteRef = db.doc(`companies/${companyId}/invites/${inviteId}`);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError("not-found", "Invite not found.");
    }

    const invite = inviteSnap.data()!;
    const inviteeEmailLower = String(
      invite.inviteeEmailLower || invite.inviteeEmail || ""
    ).toLowerCase();

    if (!inviteeEmailLower) {
      throw new HttpsError("failed-precondition", "Invite is missing email.");
    }

    if (invite.status === "accepted") {
      throw new HttpsError("failed-precondition", "Invite already accepted.");
    }

    if (invite.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Invite is no longer active."
      );
    }

    if (authEmail && authEmail !== inviteeEmailLower) {
      throw new HttpsError(
        "permission-denied",
        "Signed-in email does not match invited email."
      );
    }

    const expiresAt = invite.expiresAt;
    if (expiresAt?.toDate && expiresAt.toDate().getTime() < Date.now()) {
      throw new HttpsError("deadline-exceeded", "Invite has expired.");
    }

    const userRef = db.doc(`users/${uid}`);
    const mutexRef = db.doc(`invitesMutex/${inviteeEmailLower}_${companyId}`);
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
      const freshInviteSnap = await tx.get(inviteRef);

      if (!freshInviteSnap.exists) {
        throw new HttpsError("not-found", "Invite not found.");
      }

      const freshInvite = freshInviteSnap.data()!;

      if (freshInvite.status !== "pending") {
        throw new HttpsError(
          "failed-precondition",
          "Invite is no longer active."
        );
      }

      const existingUserSnap = await tx.get(userRef);
      const existingUser = existingUserSnap.exists
        ? existingUserSnap.data()
        : null;

      if (
        existingUser?.companyId &&
        existingUser.companyId !== companyId &&
        existingUser.status === "active"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This account already belongs to another company."
        );
      }

      tx.set(
        userRef,
        {
          uid,
          email: invite.inviteeEmail || authEmail || inviteeEmailLower,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyId,
          company: invite.companyName ?? null,
          role: invite.role || "employee",
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

      tx.set(
        mutexRef,
        {
          emailLower: inviteeEmailLower,
          companyId,
          inviteId,
          status: "accepted",
          acceptedBy: uid,
          updatedAt: now,
        },
        { merge: true }
      );
    });
    await admin.auth().setCustomUserClaims(uid, {
      companyId,
      role: invite.role || "employee",
      status: "active",
    });
    await recomputeCompanyCountsInternal(companyId);

    return { success: true };
  }
);
