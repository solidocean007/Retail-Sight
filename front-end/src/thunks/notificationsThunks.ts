import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../utils/firebase";

import { UserNotificationType } from "../utils/types";
import { normalizeUserNotification } from "../utils/normalize";

export const fetchUserNotifications = createAsyncThunk(
  "notifications/fetchUserNotifications",
  async (uid: string) => {
    const q = query(
      collection(db, `users/${uid}/notifications`),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) =>
      normalizeUserNotification({
        id: docSnap.id,
        ...(docSnap.data() as UserNotificationType),
      }),
    );
  },
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
  },
);
