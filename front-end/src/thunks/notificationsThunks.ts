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
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import {
  setNotifications,
  addNotification,
  deleteNotification,
  setLoading,
  setError,
// } from "../Slices/notificationsSlice";
} from "../Slices/notificationsSlice";
import { NotificationType } from "../utils/types";
import { db } from "../utils/firebase";

// Fetch notifications for a company
export const fetchCompanyNotifications = createAsyncThunk(
  "notifications/fetchCompanyNotifications",
  async (companyId: string, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const q = query(
        collection(db, `notifications/${companyId}/items`),
        orderBy("sentAt", "desc")
      );
      const snapshot = await getDocs(q);
      const notifications: NotificationType[] = [];
      snapshot.forEach((docSnap) =>
        notifications.push({ id: docSnap.id, ...docSnap.data() } as NotificationType)
      );
      dispatch(setNotifications(notifications));
      dispatch(setLoading(false));
    } catch (err: any) {
      dispatch(setError(err.message));
      dispatch(setLoading(false));
    }
  }
);

interface SendNotificationPayload {
  companyId: string;
  notification: NotificationType;
  recipientUserIds?: string[]; // ✅ optional
}

export const sendNotification = createAsyncThunk(
  "notifications/sendNotification",
  async (
    { companyId, notification, recipientUserIds }: SendNotificationPayload,
    { dispatch }
  ) => {
    try {
      const docRef = await addDoc(
        collection(db, `notifications/${companyId}/items`),
        {
          ...notification,
          recipientUserIds: recipientUserIds || [],
        }
      );
      dispatch(addNotification({ ...notification, id: docRef.id }));
    } catch (err: any) {
      console.error("Error sending notification:", err);
      dispatch(setError(err.message));
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async ({ companyId, notificationId, uid }: { companyId: string; notificationId: string; uid: string }) => {
    const ref = doc(db, `notifications/${companyId}/items`, notificationId);
    await updateDoc(ref, { readBy: arrayUnion(uid) });
  }
);




// Delete a notification
export const removeNotification = createAsyncThunk(
  "notifications/removeNotification",
  async (
    { companyId, notificationId }: { companyId: string; notificationId: string },
    { dispatch }
  ) => {
    try {
      await deleteDoc(doc(db, `notifications/${companyId}/items/${notificationId}`));
      dispatch(deleteNotification(notificationId));
    } catch (err: any) {
      dispatch(setError(err.message));
    }
  }
);
