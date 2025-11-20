// functions/src/notifications/sendNotification.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };

export interface NotificationPayload {
  type: string; // e.g. "post-like", "post-comment", "goal-updated"
  message: string;
  postId?: string;
  recipientUserIds?: string[];
  recipientCompanyIds?: string[];
  recipientRoles?: string[];
  sentByUid?: string | null; // uid of actor, or null for "system"
  extra?: Record<string, any>; // for future-safe extra fields
}

export const sendNotification = async (payload: NotificationPayload) => {
  const db = admin.firestore();
  const notificationRef = db.collection("notifications").doc();

  // 🔹 Build sentBy object or "system"
  let sentBy: any = "system";
  if (payload.sentByUid) {
    const userSnap = await db.doc(`users/${payload.sentByUid}`).get();
    if (userSnap.exists) {
      const data = userSnap.data() as any;
      sentBy = {
        uid: userSnap.id,
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        companyId: data.companyId ?? "",
        role: data.role ?? "",
      };
    }
  }

  const docData = {
    id: notificationRef.id,
    type: payload.type,
    message: payload.message,
    postId: payload.postId ?? "",
    recipientUserIds: payload.recipientUserIds ?? [],
    recipientCompanyIds: payload.recipientCompanyIds ?? [],
    recipientRoles: payload.recipientRoles ?? [],
    sentBy,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    readBy: [] as string[],
    ...(payload.extra ?? {}),
  };

  await notificationRef.set(docData);

  return notificationRef.id;
};
