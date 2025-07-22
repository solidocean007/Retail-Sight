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

// Send a new notification
export const sendNotification = createAsyncThunk(
  "notifications/sendNotification",
  async (
    { companyId, notification }: { companyId: string; notification: NotificationType },
    { dispatch }
  ) => {
    try {
      const docRef = await addDoc(
        collection(db, `notifications/${companyId}/items`),
        notification
      );
      dispatch(addNotification({ ...notification, id: docRef.id }));
    } catch (err: any) {
      dispatch(setError(err.message));
    }
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
