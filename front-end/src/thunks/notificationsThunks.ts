import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { NotificationType } from "../utils/types";

// -------------------------------------------------
// Fetch user-specific notifications
// -------------------------------------------------
export const fetchUserNotifications = createAsyncThunk(
  "notifications/fetchUserNotifications",
  async (uid: string) => {
    const q = query(
      collection(db, `users/${uid}/notifications`),
      orderBy("sentAt", "desc")
    );

    const snapshot = await getDocs(q);

    const results: NotificationType[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as NotificationType);
    });

    return results;
  }
);

// -------------------------------------------------
// Fetch global + company developer notifications
// Called by DeveloperNotificationsTable
// -------------------------------------------------
export const fetchCompanyNotifications = createAsyncThunk(
  "notifications/fetchCompanyNotifications",
  async (companyId: string | "all") => {
    const ref = collection(db, "notifications");

    const q =
      companyId === "all"
        ? query(ref, orderBy("sentAt", "desc"))
        : query(
            ref,
            where("recipientCompanyIds", "array-contains", companyId),
            orderBy("sentAt", "desc")
          );

    const snapshot = await getDocs(q);

    const results: NotificationType[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as NotificationType);
    });

    return results;
  }
);

// -------------------------------------------------
// Mark notification read (user notifications ONLY)
// -------------------------------------------------
export const markNotificationRead = createAsyncThunk(
  "notifications/markNotificationRead",
  async ({ notificationId, uid }: { notificationId: string; uid: string }) => {
    const notifRef = doc(db, `users/${uid}/notifications/${notificationId}`);

    await updateDoc(notifRef, {
      readBy: [uid], // user-specific notifications have only 1 reader
    });

    return { notificationId, uid };
  }
);

// -------------------------------------------------
// Remove user notification completely
// -------------------------------------------------
export const removeNotification = createAsyncThunk(
  "notifications/removeNotification",
  async ({ notificationId }: { notificationId: string }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not authenticated");

    const notifRef = doc(db, `users/${uid}/notifications/${notificationId}`);
    await deleteDoc(notifRef);

    return { notificationId };
  }
);

// -------------------------------------------------
// Send Developer Notification (global broadcast)
// Stored under /notifications/{id}
// -------------------------------------------------
export const sendDeveloperNotification = createAsyncThunk(
  "notifications/sendDeveloperNotification",
  async (notification: NotificationType) => {
    const newRef = doc(collection(db, "notifications"));

    const payload = {
      ...notification,
      id: newRef.id,
      sentAt: Timestamp.now(),
    };

    await setDoc(newRef, payload);

    return payload;
  }
);

// -------------------------------------------------
// Write user-specific notification
// Called when your backend
// triggers goal assignments, likes, comments, etc.
// -------------------------------------------------
export const writeUserNotification = createAsyncThunk(
  "notifications/writeUserNotification",
  async ({
    uid,
    data,
  }: {
    uid: string;
    data: Omit<NotificationType, "id" | "sentAt">;
  }) => {
    const newRef = doc(collection(db, `users/${uid}/notifications`));

    const payload: NotificationType = {
      ...data,
      id: newRef.id,
      sentAt: Timestamp.now(),
    };

    await setDoc(newRef, payload);

    return payload;
  }
);
