import * as admin from "firebase-admin";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const processScheduledDeveloperNotifications = onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

    console.log("⏰ Scheduler fired");
    console.log("• now (Timestamp):", now);
    console.log("• now (Date):", now.toDate());
    console.log("• now.seconds:", now.seconds);

    // 🔍 STEP 1: fetch ALL unsent notifications (no time filter yet)
    const allUnsentSnap = await db
      .collection("developerNotifications")
      .where("sentAt", "==", null)
      .get();

    if (allUnsentSnap.empty) {
      return;
    }

    const eligibleDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    for (const doc of allUnsentSnap.docs) {
      const data = doc.data();
      const scheduledAt = data.scheduledAt;

      if (!scheduledAt) {
        eligibleDocs.push(doc);
        continue;
      }

      // Firestore Timestamp check
      if (scheduledAt instanceof admin.firestore.Timestamp) {
        const isEligible = scheduledAt.seconds <= now.seconds;

        if (isEligible) {
          eligibleDocs.push(doc);
        }
        continue;
      }
    }

    if (eligibleDocs.length === 0) {
      return;
    }

    // 🚀 STEP 2: send them
    for (const doc of eligibleDocs) {
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
    }

    console.log(`✅ Processed ${eligibleDocs.length} scheduled notifications`);
  }
);
