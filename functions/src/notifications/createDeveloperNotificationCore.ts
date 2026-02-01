import * as admin from "firebase-admin";

const db = admin.firestore();

type CreateDeveloperNotificationInput = {
  title: string;
  message: string;
  priority?: "low" | "normal" | "high";

  recipientCompanyIds?: string[] | ["all"];
  recipientUserIds?: string[];

  sendEmail?: boolean;
  dryRun?: boolean;
};

/**
 * createDeveloperNotificationCore
 *
 * Internal backend helper that records a developer-authored notification
 * in the `/developerNotifications` collection.
 *
 * This function represents the **source-of-truth audit record** for messages
 * sent by Displaygram developers (announcements, tutorials, etc.).
 *
 * Responsibilities:
 * - Persist a developer notification artifact for dashboard visibility
 * - Capture audience targeting (companies or all)
 * - Record delivery channels (in-app, email)
 * - Support dry-run mode for preview/testing
 *
 * IMPORTANT:
 * - This function does NOT deliver notifications to users directly
 * - Actual user delivery is handled separately via system notification logic
 * - Auth, role checks, and orchestration must occur in the calling Cloud Function
 *
 * @param input - Developer notification payload
 * @param input.title - Short headline shown in dashboard and user notifications
 * @param input.message - Body text of the message
 * @param input.priority - Visual importance hint (low | normal | high)
 * @param input.recipientCompanyIds - Target company IDs or ["all"] for global
 * @param input.sendEmail - Whether email delivery was requested
 * @param input.dryRun - If true, performs no Firestore writes
 *
 * @param createdBy - Metadata about the developer creating the notification
 * @param createdBy.uid - UID of the developer user
 *
 * @returns Result metadata including developerNotificationId or dry-run info
 */
export async function createDeveloperNotificationCore(
  input: CreateDeveloperNotificationInput,
  createdBy: { uid: string }
) {
  const {
    title,
    message,
    priority = "normal",
    recipientCompanyIds,
    recipientUserIds,
    sendEmail = false,
    dryRun = false,
  } = input;

  if (
    (!recipientCompanyIds || recipientCompanyIds.length === 0) &&
    (!recipientUserIds || recipientUserIds.length === 0)
  ) {
    throw new Error(
      "Developer notification must target at least one company or user"
    );
  }

  if (dryRun) {
    return {
      dryRun: true,
      recipientCompanyIds,
      sendEmail,
    };
  }

  const ref = db.collection("developerNotifications").doc();

  await ref.set({
    id: ref.id,
    title,
    message,
    priority,

    recipientCompanyIds: recipientCompanyIds ?? [],
    recipientUserIds: recipientUserIds ?? [],

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: admin.firestore.FieldValue.serverTimestamp(),

    createdBy: {
      uid: createdBy.uid,
      role: "developer",
    },

    channels: {
      inApp: true,
      email: sendEmail,
    },
  });

  return {
    success: true,
    developerNotificationId: ref.id,
  };
}
