import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  arrayUnion,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  setNotifications,
  addNotification,
  deleteNotification,
  setLoading,
  setError,
} from "../Slices/notificationsSlice";
import { NotificationType } from "../utils/types";
import { db } from "../utils/firebase";

//
// 🔁 1. Fetch All Notifications for a Company
//
export const fetchCompanyNotifications = createAsyncThunk(
  "notifications/fetchCompanyNotifications",
  async (companyId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));

      const q = query(
        collection(db, "notifications"),
        orderBy("sentAt", "desc")
      );
      const snapshot = await getDocs(q);

      const notifications: NotificationType[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as NotificationType;

        // 🔍 Only include notifications where this company is a recipient
        const isTargeted =
          (!data.recipientCompanyIds &&
            !data.recipientUserIds &&
            !data.recipientRoles) || // global
          data.recipientCompanyIds?.includes(companyId);

        if (isTargeted) {
          notifications.push(data);
        }
      });

      dispatch(setNotifications(notifications));
    } catch (err: any) {
      dispatch(setError(err.message));
    } finally {
      dispatch(setLoading(false));
    }
  }
);

//
// 📩 2. Send Notification (Flat collection)
//

export const sendNotification = createAsyncThunk(
  "notifications/sendNotification",
  async (
    { notification }: { notification: NotificationType },
    { dispatch }
  ) => {
    try {
      const docRef = doc(collection(db, "notifications"));

      const newNotif: NotificationType = {
        ...notification,
        id: docRef.id,
        recipientCompanyIds: notification.recipientCompanyIds || [],
        recipientUserIds: notification.recipientUserIds || [],
        recipientRoles: notification.recipientRoles || [],
      };

      // Save to Firestore
      await setDoc(docRef, newNotif);

      // 🔧 Normalize `sentAt` before dispatching to Redux
      const normalizedNotification = {
        ...newNotif,
        sentAt:
          newNotif.sentAt instanceof Timestamp
            ? newNotif.sentAt.toDate()
            : newNotif.sentAt,
      };

      dispatch(addNotification(normalizedNotification));
    } catch (err: any) {
      console.error("Error sending notification:", err);
      dispatch(setError(err.message));
    }
  }
);

//
// ✅ 3. Mark as Read
//
export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async ({ notificationId, uid }: { notificationId: string; uid: string }) => {
    const ref = doc(db, `notifications/${notificationId}`);
    await updateDoc(ref, { readBy: arrayUnion(uid) });
  }
);

//
// ❌ 4. Remove Notification
//
export const removeNotification = createAsyncThunk(
  "notifications/removeNotification",
  async ({ notificationId }: { notificationId: string }, { dispatch }) => {
    try {
      await deleteDoc(doc(db, `notifications/${notificationId}`));
      dispatch(deleteNotification(notificationId));
    } catch (err: any) {
      dispatch(setError(err.message));
    }
  }
);
