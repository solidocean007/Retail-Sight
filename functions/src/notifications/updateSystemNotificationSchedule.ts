// functions/updateSystemNotificationSchedule.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const updateSystemNotificationSchedule = onCall(
  { cors: true },
  async (request) => {
    const { notificationId, scheduledAt } = request.data;
    const auth = request.auth;

    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const caller = (await db.doc(`users/${auth.uid}`).get()).data();

    if (caller?.role !== "developer") {
      throw new HttpsError("permission-denied", "Developer only");
    }

    const ref = db.doc(`developerNotifications/${notificationId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const notif = snap.data()!;

    if (notif.sentAt) {
      throw new HttpsError(
        "failed-precondition",
        "Cannot reschedule a sent notification"
      );
    }

    if (scheduledAt) {
      const date = new Date(scheduledAt);
      if (date <= new Date()) {
        throw new HttpsError(
          "invalid-argument",
          "scheduledAt must be in the future"
        );
      }
    }

    await ref.update({
      scheduledAt: scheduledAt
        ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt))
        : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);
