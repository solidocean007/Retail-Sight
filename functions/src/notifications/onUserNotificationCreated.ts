import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

// -------------------------------------------------------------
//  Trigger: When a user notification doc is created
//  Path:   /users/{uid}/notifications/{notificationId}
// -------------------------------------------------------------
export const onUserNotificationCreated = onDocumentCreated(
  "/users/{uid}/notifications/{notificationId}",
  async (event) => {
    try {
      const uid = event.params.uid;
      const notification = event.data?.data();

      if (!notification) return;

      // ------------------------------------------
      // 1. Fetch FCM device tokens
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
      // 2. Build FCM message
      // ------------------------------------------
      const msg = {
        tokens,
        notification: {
          title: notification.title || "New Notification",
          body: notification.message || "",
        },
        data: {
          notificationId: notification.id || "",
          type: notification.type || "generic",
          postId: notification.postId || "",
          goalId: notification.goalId || "",
        },
      };

      // ------------------------------------------
      // 3. Send push notification
      // ------------------------------------------
      const messaging = getMessaging();
      const res = await messaging.sendEachForMulticast(msg);

      console.log(
        `Sent notification to user ${uid}. Success: ${res.successCount}, Fail: ${res.failureCount}`
      );
    } catch (e) {
      console.error("Push trigger error:", e);
    }
  }
);
