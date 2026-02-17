import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Delete a system notification artifact.
 * Does NOT affect already-delivered user inbox copies.
 */
export const deleteSystemNotification = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    const { notificationId } = request.data || {};

    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    if (!notificationId) {
      throw new HttpsError("invalid-argument", "Missing notificationId");
    }

    const callerSnap = await db.doc(`users/${auth.uid}`).get();
    const caller = callerSnap.data();

    if (
      !caller ||
      !["admin", "developer", "super-admin"].includes(caller.role)
    ) {
      throw new HttpsError(
        "permission-denied",
        "Admins, developer, or super-admin only"
      );
    }

    const ref = db.collection("developerNotifications").doc(notificationId);

    const snap = await ref.get();

    if (!snap.exists) {
      return {
        success: true,
        alreadyDeleted: true,
        notificationId,
      };
    }

    // Hard delete (simple + fine for now)
    await ref.delete();

    // OR soft delete (optional)
    // await ref.update({
    //   deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    //   deletedBy: auth.uid,
    // });

    return {
      success: true,
      deletedNotificationId: notificationId,
    };
  }
);
