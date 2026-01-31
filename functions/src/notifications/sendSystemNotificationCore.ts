import * as admin from "firebase-admin";

const db = admin.firestore();

type SendSystemNotificationInput = {
  title: string;
  message: string;

  recipientUserIds?: string[];
  recipientCompanyIds?: string[];
  recipientRoles?: string[];

  sendEmail?: boolean;
  dryRun?: boolean;
};

/**
 * sendSystemNotificationCore
 *
 * Shared backend helper that handles ALL system-level notification delivery.
 * This function is intentionally framework-agnostic and contains no HTTP,
 * auth, or Cloud Function trigger logic.
 *
 * Responsibilities:
 * - Resolve recipient users by explicit IDs and/or company + role
 * - Create a system notification artifact in `/notifications`
 * - Fan out user inbox notifications under `/users/{uid}/notifications`
 * - Optionally enqueue transactional emails via the `mail` collection
 *
 * This function is used by:
 * - sendSystemNotification (callable CF)
 * - resendSystemNotification (callable CF)
 *
 * IMPORTANT:
 * - UI must never call this directly
 * - Auth and permission checks must happen in the caller
 *
 * @param input - Notification payload and targeting instructions
 * @param input.title - Notification title shown to users
 * @param input.message - Notification body text
 * @param input.recipientUserIds - Explicit user IDs to notify
 * @param input.recipientCompanyIds - Company IDs whose users should be notified
 * @param input.recipientRoles - Optional role filter when targeting companies
 * @param input.sendEmail - Whether to enqueue transactional emails
 * @param input.dryRun - If true, resolves recipients but performs no writes
 *
 * @returns Result metadata including recipient count and notification ID
 */
export async function sendSystemNotificationCore(
  input: SendSystemNotificationInput
) {
  const {
    title,
    message,
    recipientUserIds = [],
    recipientCompanyIds = [],
    recipientRoles = [],
    sendEmail = false,
    dryRun = false,
  } = input;

  // ----------------------------------
  // Resolve recipients
  // ----------------------------------
  const users = new Map<string, any>();

  recipientUserIds.forEach((uid) => users.set(uid, null));

  if (recipientCompanyIds.length > 0) {
    const snap = await db
      .collection("users")
      .where("companyId", "in", recipientCompanyIds)
      .get();

    snap.docs.forEach((doc) => {
      const u = doc.data();
      if (recipientRoles.length === 0 || recipientRoles.includes(u.role)) {
        users.set(doc.id, u);
      }
    });
  }

  if (users.size === 0) {
    throw new Error("No recipients resolved");
  }

  if (dryRun) {
    return {
      dryRun: true,
      recipients: users.size,
      sendEmail,
    };
  }

  // ----------------------------------
  // Write system notification artifact
  // ----------------------------------
  const notifRef = db.collection("notifications").doc();

  await notifRef.set({
    id: notifRef.id,
    title,
    message,
    type: "system",
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    recipientUserIds,
    recipientCompanyIds,
    recipientRoles,
  });

  // ----------------------------------
  // Fan-out user notifications
  // ----------------------------------
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  users.forEach((_u, uid) => {
    const ref = db.collection(`users/${uid}/notifications`).doc();
    batch.set(ref, {
      id: ref.id,
      title,
      message,
      type: "system",
      sentAt: now,
      readBy: [],
    });
  });

  await batch.commit();

  // ----------------------------------
  // Optional email fan-out
  // ----------------------------------
  if (sendEmail) {
    for (const [uid, cached] of users.entries()) {
      const user = cached ?? (await db.doc(`users/${uid}`).get()).data();

      if (!user?.email || user.emailOptOut) continue;

      await db.collection("mail").add({
        to: user.email,
        category: "transactional",
        message: {
          subject: title,
          text: message,
        },
      });
    }
  }

  return {
    success: true,
    notificationId: notifRef.id,
    recipients: users.size,
  };
}
