import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";

if (!admin.apps.length) admin.initializeApp();

/**
 * sendSystemNotification
 *
 * Explicit admin/system message sender.
 * - Writes in-app notifications
 * - Optionally enqueues transactional emails via `mail` collection
 * - NO analytics, NO engagement tracking
 */
export const sendSystemNotification = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const callerSnap = await admin
      .firestore()
      .doc(`users/${request.auth.uid}`)
      .get();

    if (callerSnap.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admins only");
    }

    return await sendSystemNotificationCore(request.data);
  }
);
