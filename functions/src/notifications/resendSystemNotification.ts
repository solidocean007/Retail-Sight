import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Resend a previously sent system notification.
 * UI never writes Firestore directly.
 */
export const resendSystemNotification = onCall(
  { cors: true },
  async (request) => {
    const auth = request.auth;
    const {
      notificationId,
      sendEmail = false,
      dryRun = false,
    } = request.data || {};

    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const callerSnap = await db.doc(`users/${auth.uid}`).get();
    if (callerSnap.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admins only");
    }

    const notifSnap = await db
      .collection("notifications")
      .doc(notificationId)
      .get();

    if (!notifSnap.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const notif = notifSnap.data()!;

    return await sendSystemNotificationCore({
      title: notif.title,
      message: notif.message,
      recipientUserIds: notif.recipientUserIds,
      recipientCompanyIds: notif.recipientCompanyIds,
      recipientRoles: notif.recipientRoles,
      sendEmail,
      dryRun,
    });
  }
);
