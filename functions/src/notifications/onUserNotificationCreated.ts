import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const onUserNotificationCreated = onDocumentCreated(
  "/users/{uid}/notifications/{notificationId}",
  async (event) => {
    const uid = event.params.uid;
    const notificationId = event.params.notificationId;
    const notification = event.data?.data();

    if (!notification) return;

    // ------------------------------------------
    // Idempotency guard
    // ------------------------------------------
    if (notification.deliveredVia?.push) {
      console.log("Push already delivered, skipping.");
      return;
    }

    // ------------------------------------------
    // Push eligibility (basic rule)
    // ------------------------------------------
    const shouldSendPush =
      notification.priority === "high" || notification.type !== "system";

    if (!shouldSendPush) return;

    // ------------------------------------------
    // Fetch FCM tokens
    // ------------------------------------------
    const tokenSnap = await db
      .collection("users")
      .doc(uid)
      .collection("fcmTokens")
      .get();

    if (tokenSnap.empty) {
      console.log(`No tokens for user ${uid}`);
      return;
    }

    const tokens = tokenSnap.docs.map((d) => d.id);

    // ------------------------------------------
    // Build message
    // ------------------------------------------
    const msg = {
      tokens,
      data: {
        title: notification.title || "New Notification",
        body: notification.message || "",
        notificationId,
        type: notification.type || "generic",
        postId: notification.postId || "",
        goalId: notification.goalId || "",
        link: "/notifications",
      },
    };

    const messaging = getMessaging();
    const res = await messaging.sendEachForMulticast(msg);

    // ------------------------------------------
    // Cleanup invalid tokens
    // ------------------------------------------
    const batch = db.batch();

    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const err = r.error?.code;
        if (err === "messaging/registration-token-not-registered") {
          const badToken = tokens[idx];
          batch.delete(
            db
              .collection("users")
              .doc(uid)
              .collection("fcmTokens")
              .doc(badToken)
          );
        }
      }
    });

    // ------------------------------------------
    // Mark push delivered
    // ------------------------------------------
    const notifRef = db.doc(`users/${uid}/notifications/${notificationId}`);

    batch.update(notifRef, {
      "deliveredVia.push": FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(
      `Push sent to ${uid}. Success: ${res.successCount}, Fail: ${res.failureCount}`
    );
  }
);
