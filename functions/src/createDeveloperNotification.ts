import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createDeveloperNotificationCore } from "./notifications/createDeveloperNotificationCore";

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

    return await createDeveloperNotificationCore(request.data, {
      uid: request.auth.uid,
    });
  }
);
