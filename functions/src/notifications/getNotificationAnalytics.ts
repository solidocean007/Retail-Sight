import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * getNotificationAnalytics
 *
 * Returns aggregated analytics for a single developer notification.
 *
 * This function reads pre-computed statistics directly from:
 *   /developerNotifications/{developerNotificationId}
 *
 * It does NOT scan user subcollections.
 * It does NOT compute analytics dynamically.
 *
 * The stats object is expected to be incrementally maintained
 * during delivery and engagement events (read, click, email click, etc.).
 *
 * Security:
 * - Requires authenticated user
 * - Restricted to roles: developer, super-admin
 *
 * Request Data:
 * @param developerNotificationId - ID of the developer notification document
 *
 * Firestore Structure Expected:
 * developerNotifications/{id}
 *   stats: {
 *     sent: number
 *     read: number
 *     clicked: number
 *     clickedFrom: {
 *       push: number
 *       modal: number
 *       dropdown: number
 *       email: number
 *     }
 *   }
 *
 * Returns:
 * {
 *   sent: number,
 *   read: number,
 *   clicked: number,
 *   ctr: number,        // clicked / sent
 *   readRate: number,   // read / sent
 *   clickedFrom: {
 *     push: number,
 *     modal: number,
 *     dropdown: number,
 *     email: number
 *   }
 * }
 *
 * Throws:
 * - unauthenticated
 * - invalid-argument
 * - permission-denied
 * - not-found
 *
 * Scalability:
 * O(1) read — constant-time analytics retrieval.
 * Suitable for large-scale notification systems.
 */
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

    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    const role = callerSnap.data()?.role;

    if (!["developer", "super-admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    const snap = await db
      .collection("developerNotifications")
      .doc(developerNotificationId)
      .get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const stats = snap.data()?.stats || {};

    const sent = stats.sent || 0;
    const read = stats.read || 0;
    const clicked = stats.clicked || 0;

    const clickedFrom = stats.clickedFrom || {
      push: 0,
      modal: 0,
      dropdown: 0,
      email: 0,
    };

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
