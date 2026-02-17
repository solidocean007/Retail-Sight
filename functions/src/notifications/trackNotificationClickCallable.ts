import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const db = admin.firestore();

export const trackNotificationClickCallable = onCall(async (request) => {
  const { notificationId, source } = request.data || {};
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Auth required");
  }

  if (!notificationId || !source) {
    throw new HttpsError("invalid-argument", "Missing parameters");
  }

  const allowedSources = ["modal", "dropdown", "push"];
  if (!allowedSources.includes(source)) {
    throw new HttpsError("invalid-argument", "Invalid source");
  }

  const notifRef = db.doc(`users/${uid}/notifications/${notificationId}`);
  const snap = await notifRef.get();

  if (!snap.exists) return { success: false };

  const data = snap.data();
  if (!data) return { success: false };

  // Prevent double counting
  if (data.analytics?.clickedAt) {
    return { success: true };
  }

  await notifRef.update({
    "analytics.clickedAt": admin.firestore.FieldValue.serverTimestamp(),
    "analytics.clickedFrom": source,
  });

  if (data.systemNotificationId) {
    await db
      .collection("developerNotifications")
      .doc(data.systemNotificationId)
      .update({
        "stats.clicked": admin.firestore.FieldValue.increment(1),
        [`stats.clickedFrom.${source}`]:
          admin.firestore.FieldValue.increment(1),
      });
  }

  return { success: true };
});
