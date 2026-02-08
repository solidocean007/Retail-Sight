import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createDeveloperNotificationCore } from "./createDeveloperNotificationCore";
import { sendSystemNotificationCore } from "./sendSystemNotificationCore";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const createDeveloperNotification = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const userSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (userSnap.data()?.role !== "developer") {
      throw new HttpsError("permission-denied", "Developers only");
    }

    const input = request.data;

    // 1️⃣ Always record audit (or preview)
    const devResult = await createDeveloperNotificationCore(input, {
      uid: request.auth.uid,
    });

    // 2️⃣ STOP HERE if dry-run
    if (input.dryRun) {
      return {
        dryRun: true,
        developerNotificationId: devResult.developerNotificationId,
      };
    }

    // 3️⃣ Decide if delivery should happen now
    const shouldSendNow =
      !input.scheduledAt || input.scheduledAt.toMillis() <= Date.now();

    if (!shouldSendNow) {
      return {
        success: true,
        scheduled: true,
        developerNotificationId: devResult.developerNotificationId,
      };
    }

    // 4️⃣ Deliver immediately
    await sendSystemNotificationCore({
      title: input.title,
      message: input.message,
      recipientUserIds: input.recipientUserIds ?? [],
      recipientCompanyIds: input.recipientCompanyIds?.includes("all")
        ? [] // global
        : (input.recipientCompanyIds ?? []),
      sendEmail: input.sendEmail,
    });

    return {
      success: true,
      delivered: true,
      developerNotificationId: devResult.developerNotificationId,
    };
  }
);
