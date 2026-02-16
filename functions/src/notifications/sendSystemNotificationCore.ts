import * as admin from "firebase-admin";
import { sendEmailNotificationCore } from "./sendEmailNotificationCore";

const db = admin.firestore();

type SendSystemNotificationInput = {
  title: string;
  message: string;
  intent: string;
  priority: string;
  link?: string; // ✅ ADD
  recipientUserIds?: string[];
  recipientCompanyIds?: string[];
  recipientRoles?: string[];
  sendEmail?: boolean;
  systemNotificationId?: string; // optional traceability
  dryRun?: boolean;
};

/**
 * sendSystemNotificationCore
 *
 * Shared backend helper that fans out a system notification
 * to user inboxes.
 *
 * This function is intentionally framework-agnostic and contains
 * no HTTP, auth, scheduling, push, or email logic.
 *
 * Responsibilities:
 * - Resolve recipient users by:
 *   - explicit user IDs
 *   - company IDs with optional role filtering
 * - Fan out per-user notification documents under:
 *   `/users/{uid}/notifications/{notificationId}`
 * - Record in-app delivery via `deliveredVia.inApp`
 *
 * Explicitly DOES NOT:
 * - Send push notifications
 * - Send emails
 * - Write to any top-level notifications collection
 * - Mutate read state
 * - Perform auth or permission checks
 *
 * This function is used by:
 * - Immediate system notification senders
 * - Scheduled notification processors
 * - Resend workflows
 *
 * IMPORTANT:
 * - UI must never call this directly
 * - Auth, role checks, and scheduling decisions
 *   must occur in the caller
 *
 * @param input - Notification payload and targeting instructions
 * @param input.title - Notification title shown to users
 * @param input.message - Notification body text
 * @param input.recipientUserIds - Explicit user IDs to notify
 * @param input.recipientCompanyIds - Company IDs whose users should be notified
 * @param input.recipientRoles - Optional role filter when targeting companies
 * @param input.sendEmail - Intent flag only (not acted on here)
 * @param input.systemNotificationId - Optional ID used to generate
 *        deterministic per-user notification IDs
 * @param input.dryRun - If true, resolves recipients but performs no writes
 *
 * @returns Result metadata including recipient count
 */
export async function sendSystemNotificationCore(
  input: SendSystemNotificationInput
) {
  const {
    title,
    message,
    intent = "system",
    priority = "normal",
    link,
    sendEmail,
    recipientUserIds = [],
    recipientCompanyIds = [],
    recipientRoles = [],
    systemNotificationId,
    dryRun = false,
  } = input;

  // -------------------------------
  // Resolve recipients
  // -------------------------------
  const users = new Map<string, any>();
  const recipientCount = users.size;

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
    };
  }

  // -------------------------------
  // Fan out user notifications
  // -------------------------------
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Generate a base ID once
  const baseId = systemNotificationId ?? db.collection("_").doc().id;

  users.forEach((_u, uid) => {
    const notificationId = `${baseId}_${uid}`;

    const ref = db.doc(`users/${uid}/notifications/${notificationId}`);

    batch.set(ref, {
      id: notificationId,
      systemNotificationId: baseId,
      userId: uid,
      title,
      message,
      type: "system",
      intent,
      priority,
      link: link ?? null,
      createdAt: now,
      deliveredVia: {
        inApp: now,
      },
    });
  });

  await batch.commit();

  await db
    .collection("developerNotifications")
    .doc(baseId)
    .set(
      {
        stats: {
          sent: admin.firestore.FieldValue.increment(recipientCount),
        },
      },
      { merge: true }
    );

  if (sendEmail) {
    await sendEmailNotificationCore({
      title,
      message,
      link,
      notificationId: baseId, // ✅ now always valid
      recipientUserIds: Array.from(users.keys()),
    });
  }

  return {
    success: true,
    recipients: users.size,
  };
}
