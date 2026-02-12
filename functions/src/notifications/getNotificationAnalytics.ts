import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const getNotificationAnalytics = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const { developerNotificationId } = request.data || {};

    if (!developerNotificationId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing developerNotificationId"
      );
    }

    // 🔐 Restrict to developer / super-admin
    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    const role = callerSnap.data()?.role;
    if (!["developer", "super-admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    // 🔍 Query all user notifications created from this system notification
    const snap = await db
      .collectionGroup("notifications")
      .where("systemNotificationId", "==", developerNotificationId)
      .get();

    let sent = 0;
    let read = 0;
    let clicked = 0;

    const clickedFrom = {
      push: 0,
      modal: 0,
      dropdown: 0,
    };

    snap.forEach((doc) => {
      const n = doc.data();
      sent++;

      if (n.readAt) read++;
      if (n.analytics?.clickedAt) {
        clicked++;

        const source = n.analytics.clickedFrom;
        if (
          source &&
          clickedFrom[source as keyof typeof clickedFrom] !== undefined
        ) {
          clickedFrom[source as keyof typeof clickedFrom]++;
        }
      }
    });

    const ctr = sent ? clicked / sent : 0;
    const readRate = sent ? read / sent : 0;

    return {
      sent,
      read,
      clicked,
      ctr,
      readRate,
      clickedFrom,
    };
  }
);
