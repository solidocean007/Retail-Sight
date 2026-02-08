import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../utils/firebase";

import { UserNotificationType } from "../utils/types";
import { normalizeUserNotification } from "../utils/normalize";

export const fetchUserNotifications = createAsyncThunk(
  "notifications/fetchUserNotifications",
  async (uid: string) => {
    const q = query(
      collection(db, `users/${uid}/notifications`),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) =>
      normalizeUserNotification(docSnap.data() as UserNotificationType)
    );
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
      readAt: serverTimestamp(),
    });

    return {
      notificationId,
      readAt: Timestamp.now(), // optimistic update
    };
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
