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

    const normalizedInput = {
      ...input,
      intent: input.intent ?? "system",
      priority: input.priority ?? "normal",
    };

    // ✅ Convert ONCE at the boundary
    const scheduledAt =
      typeof input.scheduledAt === "number"
        ? admin.firestore.Timestamp.fromMillis(input.scheduledAt)
        : null;

    // 1️⃣ Always record audit (or preview)
    // 1️⃣ Always record audit (or preview)
    const devResult = await createDeveloperNotificationCore(
      {
        ...normalizedInput,
        scheduledAt,
      },
      { uid: request.auth.uid }
    );

    const developerNotificationId = devResult.developerNotificationId;
    if (!developerNotificationId) {
      throw new Error("Missing developerNotificationId after creation");
    }

    // 2️⃣ STOP HERE if dry-run
    if (input.dryRun) {
      return {
        dryRun: true,
        developerNotificationId,
      };
    }

    // 3️⃣ Decide if delivery should happen now
    const shouldSendNow = !scheduledAt || scheduledAt.toMillis() <= Date.now();

    if (!shouldSendNow) {
      return {
        success: true,
        scheduled: true,
        developerNotificationId,
      };
    }

    // 4️⃣ Claim BEFORE delivering so the every-minute scheduled
    // processor can't pick this doc up mid-send (double emails).
    const notifRef = db
      .collection("developerNotifications")
      .doc(developerNotificationId);

    await notifRef.update({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await sendSystemNotificationCore({
        systemNotificationId: developerNotificationId,
        title: normalizedInput.title,
        message: normalizedInput.message,
        intent: normalizedInput.intent,
        priority: normalizedInput.priority,
        link: normalizedInput.link ?? null,
        recipientUserIds: normalizedInput.recipientUserIds ?? [],
        // "all" passes through — sendSystemNotificationCore resolves it
        recipientCompanyIds: normalizedInput.recipientCompanyIds ?? [],
        recipientRoles: normalizedInput.recipientRoles ?? [],
        sendEmail: normalizedInput.sendEmail,
      });
    } catch (err) {
      // Delivery failed — release the claim so it can be retried
      await notifRef.update({ sentAt: null });
      throw err;
    }

    return {
      success: true,
      delivered: true,
      developerNotificationId,
    };
  }
);
