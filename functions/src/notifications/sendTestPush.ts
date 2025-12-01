import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const sendTestPush = onCall(async (request) => {
  const token = request.data.token;
  const title = request.data.title || "Test Notification";
  const body = request.data.body || "This is a Displaygram test push.";

  if (!token) {
    throw new Error("FCM token missing");
  }

  const message: admin.messaging.Message = {
    token,
    notification: {
      title,
      body,
    },
    webpush: {
      fcmOptions: {
        link: "/notifications", // opens inside your SPA
      },
      notification: {
        icon: "/icons/icon-192.png",
      },
    },
  };

  try {
    const result = await admin.messaging().send(message);
    return { ok: true, result };
  } catch (err: any) {
    console.error("sendTestPush error:", err);
    return { ok: false, error: err?.message || String(err) };
  }
});
