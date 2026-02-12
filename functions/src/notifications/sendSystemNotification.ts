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

    const role = callerSnap.data()?.role;
    if (!["developer", "super-admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Developer only");
    }
    const input = request.data ?? {};

    if (!input.title || !input.message) {
      throw new HttpsError("invalid-argument", "Missing title or message");
    }

    const normalizedInput = {
      title: input.title,
      message: input.message,
      intent: input.intent ?? "system",
      priority: input.priority ?? "normal",
      link: input.link ?? null,
      recipientUserIds: input.recipientUserIds ?? [],
      recipientCompanyIds: input.recipientCompanyIds ?? [],
      recipientRoles: input.recipientRoles ?? [],
      sendEmail: input.sendEmail ?? false,
      dryRun: input.dryRun ?? false,
    };

    return await sendSystemNotificationCore(normalizedInput);
  }
);
