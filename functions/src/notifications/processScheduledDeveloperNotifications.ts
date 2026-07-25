import * as admin from "firebase-admin";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const processScheduledDeveloperNotifications = onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

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

      // Claim atomically BEFORE sending — prevents double-delivery if
      // an immediate send or overlapping scheduler run touches this doc.
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        if (fresh.data()?.sentAt) return false; // someone else sent it
        tx.update(doc.ref, {
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
      });

      if (!claimed) continue;

      try {
        await sendSystemNotificationCore({
          title: notif.title,
          intent: notif.intent,
          priority: notif.priority,
          link: notif.link,
          sendEmail: notif.channels?.email ?? false,
          message: notif.message,
          recipientUserIds: notif.recipientUserIds ?? [],
          recipientCompanyIds: notif.recipientCompanyIds ?? [],
          recipientRoles: notif.recipientRoles ?? [],
          systemNotificationId: doc.id,
        });
      } catch (err) {
        // Release the claim so the next run retries
        await doc.ref.update({ sentAt: null });
        console.error(`Failed to send scheduled notification ${doc.id}:`, err);
      }
    }

    console.log(`✅ Processed ${eligibleDocs.length} scheduled notifications`);
  }
);
