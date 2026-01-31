import * as admin from "firebase-admin";

const db = admin.firestore();

type CreateDeveloperNotificationInput = {
  title: string;
  message: string;
  priority?: "low" | "normal" | "high";

  recipientCompanyIds: string[] | ["all"];

  sendEmail?: boolean;
  dryRun?: boolean;
};

export async function createDeveloperNotificationCore(
  input: CreateDeveloperNotificationInput,
  createdBy: { uid: string }
) {
  const {
    title,
    message,
    priority = "normal",
    recipientCompanyIds,
    sendEmail = false,
    dryRun = false,
  } = input;

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

    recipientCompanyIds,

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
