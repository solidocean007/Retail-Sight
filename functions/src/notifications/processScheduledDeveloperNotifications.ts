import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * processScheduledDeveloperNotifications
 *
 * Runs periodically to deliver scheduled developer notifications.
 */
export const processScheduledDeveloperNotifications = onCall(
  { cors: false },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const snap = await db
      .collection("developerNotifications")
      .where("sentAt", "==", null)
      .where("scheduledAt", "<=", now)
      .get();

    if (snap.empty) {
      return { processed: 0 };
    }

    let processed = 0;

    for (const doc of snap.docs) {
      const notif = doc.data();

      await sendSystemNotificationCore({
        title: notif.title,
        message: notif.message,

        recipientUserIds: notif.recipientUserIds ?? [],
        recipientCompanyIds: notif.recipientCompanyIds ?? [],
        recipientRoles: notif.recipientRoles ?? [],

        systemNotificationId: doc.id,
      });

      await doc.ref.update({
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      processed++;
    }

    return { processed };
  }
);
