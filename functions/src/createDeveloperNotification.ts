import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createDeveloperNotificationCore } from "./notifications/createDeveloperNotificationCore";
import { sendSystemNotificationCore } from "./notifications/sendSystemNotificationCore";

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

    // 3️⃣ Deliver ONLY on confirm
    await sendSystemNotificationCore({
      title: input.title,
      message: input.message,
      recipientUserIds: input.recipientUserIds ?? [],
      recipientCompanyIds: input.recipientCompanyIds?.includes("all")
        ? [] // means global
        : (input.recipientCompanyIds ?? []),
      sendEmail: input.sendEmail,
    });

    return {
      success: true,
      developerNotificationId: devResult.developerNotificationId,
    };
  }
);
