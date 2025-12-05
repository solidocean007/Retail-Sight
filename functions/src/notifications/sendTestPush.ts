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

  // --- START OF FIX ---
  const message: admin.messaging.Message = {
    token,

    // 1. Use the 'data' key to send a Data Message.
    //    This is required to trigger your custom Service Worker code (onBackgroundMessage).
    data: {
      title: title,
      body: body,
      link: "/notifications",
    },

    // 2. (Optional but Recommended) Keep fcmOptions for click tracking/handling
    //    if you were using the Notification Message format, but for a
    //    Data Message, the 'link' is handled by your service worker click listener.
    //    We will remove the 'webpush' wrapper entirely for simplicity.
  };
  // --- END OF FIX ---

  console.log("sendTestPush message: ", message);
  try {
    const result = await admin.messaging().send(message);
    return { ok: true, result };
  } catch (err: any) {
    console.error("sendTestPush error:", err);
    return { ok: false, error: err?.message || String(err) };
  }
});
