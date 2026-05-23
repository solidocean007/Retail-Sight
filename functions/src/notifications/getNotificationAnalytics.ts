import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
type ClickSource = "push" | "modal" | "dropdown" | "email";
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

    if (
      !developerNotificationId ||
      typeof developerNotificationId !== "string"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Missing developerNotificationId"
      );
    }

    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    const callerRole = callerSnap.data()?.role;

    if (!["developer", "super-admin"].includes(callerRole)) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    const devSnap = await db
      .collection("developerNotifications")
      .doc(developerNotificationId)
      .get();

    if (!devSnap.exists) {
      throw new HttpsError("not-found", "Developer notification not found");
    }

    const notifSnap = await db
      .collectionGroup("notifications")
      .where("systemNotificationId", "==", developerNotificationId)
      .get();

    const clickedFrom: Record<ClickSource, number> = {
      push: 0,
      modal: 0,
      dropdown: 0,
      email: 0,
    };

    let sent = 0;
    let read = 0;
    let clicked = 0;

    const userIds = new Set<string>();

    const rows = notifSnap.docs.map((docSnap) => {
      const data = docSnap.data();

      const userRef = docSnap.ref.parent.parent;
      const uid = userRef?.id ?? data.recipientUid ?? null;

      if (uid) userIds.add(uid);

      sent += 1;

      if (data.readAt) {
        read += 1;
      }

      const clickedAt = data.analytics?.clickedAt ?? null;
      const source = data.analytics?.clickedFrom as ClickSource | undefined;

      if (clickedAt) {
        clicked += 1;

        if (source && clickedFrom[source] !== undefined) {
          clickedFrom[source] += 1;
        }
      }

      return {
        uid,
        notificationId: docSnap.id,
        title: data.title ?? "",
        createdAt: data.createdAt ?? null,
        readAt: data.readAt ?? null,
        clickedAt,
        clickedFrom: source ?? null,
      };
    });

    const userRefs = [...userIds].map((uid) => db.doc(`users/${uid}`));
    const userSnaps = userRefs.length ? await db.getAll(...userRefs) : [];

    const usersByUid = new Map<string, FirebaseFirestore.DocumentData>();

    userSnaps.forEach((snap) => {
      if (snap.exists) {
        usersByUid.set(snap.id, snap.data() || {});
      }
    });

    const recipients = rows.map((row) => {
      const user = row.uid ? usersByUid.get(row.uid) : null;

      return {
        ...row,
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "",
        companyId: user?.companyId ?? "",
        companyName: user?.companyName ?? "",
      };
    });

    return {
      sent,
      read,
      clicked,
      ctr: sent ? clicked / sent : 0,
      readRate: sent ? read / sent : 0,
      clickedFrom,
      recipients,
    };
  }
);
