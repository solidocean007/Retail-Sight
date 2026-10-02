import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const markAllNotificationsReadCallable = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required");

  const snapshot = await db.collection(`users/${uid}/notifications`).get();
  const unread = snapshot.docs.filter((document) => !document.data().readAt);
  if (unread.length === 0) return { updated: 0 };

  const systemNotificationCounts = new Map<string, number>();
  const writer = db.bulkWriter();

  for (const document of unread) {
    writer.update(document.ref, {
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const systemNotificationId = document.data().systemNotificationId;
    if (systemNotificationId) {
      systemNotificationCounts.set(
        systemNotificationId,
        (systemNotificationCounts.get(systemNotificationId) ?? 0) + 1
      );
    }
  }

  for (const [systemNotificationId, count] of systemNotificationCounts) {
    writer.update(
      db.collection("developerNotifications").doc(systemNotificationId),
      { "stats.read": admin.firestore.FieldValue.increment(count) }
    );
  }

  await writer.close();
  return { updated: unread.length };
});
