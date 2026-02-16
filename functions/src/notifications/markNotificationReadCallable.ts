import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * markNotificationReadCallable
 *
 * Marks a user notification as read and increments
 * the developer notification read counter.
 *
 * Prevents double counting.
 */
export const markNotificationReadCallable = onCall(async (request) => {
  const { notificationId } = request.data || {};
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Auth required");
  }

  if (!notificationId) {
    throw new HttpsError("invalid-argument", "Missing notificationId");
  }

  const notifRef = db.doc(`users/${uid}/notifications/${notificationId}`);
  const snap = await notifRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Notification not found");
  }

  const data = snap.data();

  // Prevent double increments
  if (data?.readAt) {
    return { alreadyRead: true };
  }

  await notifRef.update({
    readAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (data?.systemNotificationId) {
    await db
      .collection("developerNotifications")
      .doc(data.systemNotificationId)
      .update({
        "stats.read": admin.firestore.FieldValue.increment(1),
      });
  }

  return { success: true };
});
