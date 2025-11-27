import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();

// ------------------------------------------------------
// sendNotificationToUser(userId, payload)
// Central engine for ALL push notifications
// ------------------------------------------------------
export const sendNotificationToUser = onCall({ cors: true }, async (req) => {
  try {
    const { userId, notification } = req.data;

    if (!userId) {
      throw new HttpsError("invalid-argument", "Missing userId");
    }
    if (!notification) {
      throw new HttpsError("invalid-argument", "Missing notification payload");
    }

    // -----------------------------------------
    // 1. Write notification document
    // -----------------------------------------
    const notifRef = db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .doc();

    const notifData = {
      ...notification,
      id: notifRef.id,
      sentAt: Timestamp.now(),
      readBy: [],
    };

    await notifRef.set(notifData);

    // -----------------------------------------
    // 2. Fetch user's device tokens
    // -----------------------------------------
    const tokensSnap = await db
      .collection("users")
      .doc(userId)
      .collection("fcmTokens")
      .get();

    const tokens: string[] = tokensSnap.docs.map((d) => d.id);

    // If user has no devices, no push needed
    if (tokens.length === 0) {
      return {
        wroteToFirestore: true,
        sentToDevices: 0,
        message: "No device tokens for user",
      };
    }

    // -----------------------------------------
    // 3. Send FCM push notification
    // -----------------------------------------
    const messaging = getMessaging();

    const message = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: {
        notificationId: notifRef.id,
        type: notification.type || "generic",
        postId: notification.postId || "",
        goalId: notification.goalId || "",
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    return {
      wroteToFirestore: true,
      sentToDevices: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err: any) {
    console.error("sendNotificationToUser ERROR:", err);
    throw new HttpsError("unknown", err.message);
  }
});
