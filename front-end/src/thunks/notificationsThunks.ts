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
  deleteNotification,
  setLoading,
  setError,
  addCompanyNotification,
  addRoleNotification,
  addUserNotification,
  setUserNotifications,
  setCompanyNotifications,
  setRoleNotifications,
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

      const userNotifs: NotificationType[] = [];
      const companyNotifs: NotificationType[] = [];
      const roleNotifs: NotificationType[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as NotificationType;
        const normalizedFetchedNotification: NotificationType = {
          ...data,
          id: docSnap.id,
          sentAt:
            data.sentAt instanceof Timestamp
              ? data.sentAt.toDate().toISOString()
              : data.sentAt, // assume already string
        };

        const { recipientUserIds, recipientCompanyIds, recipientRoles } =
          normalizedFetchedNotification;

        if (
          !recipientUserIds?.length &&
          !recipientCompanyIds?.length &&
          !recipientRoles?.length
        ) {
          // Global → Treat as company-wide
          companyNotifs.push(normalizedFetchedNotification);
        } else if (recipientCompanyIds?.includes(companyId)) {
          companyNotifs.push(normalizedFetchedNotification);
        } else if (recipientRoles?.length) {
          roleNotifs.push(normalizedFetchedNotification);
        } else {
          userNotifs.push(normalizedFetchedNotification);
        }
      });

      // ✅ Dispatch each group
      dispatch(setUserNotifications(userNotifs));
      dispatch(setCompanyNotifications(companyNotifs));
      dispatch(setRoleNotifications(roleNotifs));
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
        sentAt: notification.sentAt || Timestamp.now(),
      };

      await setDoc(docRef, newNotif);

      // Redux-safe version... this must not be a safe version.
      const normalizedNotification = {
        ...notification, // Use the original, which should include postId
        id: docRef.id,
        sentAt:
          notification.sentAt instanceof Timestamp
            ? notification.sentAt.toDate().toISOString()
            : typeof notification.sentAt === "string"
            ? notification.sentAt
            : Timestamp.now().toDate().toISOString(), // fallback
        recipientCompanyIds: notification.recipientCompanyIds || [],
        recipientUserIds: notification.recipientUserIds || [],
        recipientRoles: notification.recipientRoles || [],
        postId: notification.postId || "", // make sure this field is explicitly passed
      };

      // 🔀 Dispatch to correct notification group(s)
      const { recipientUserIds, recipientCompanyIds, recipientRoles } =
        normalizedNotification;

      if (recipientUserIds && recipientUserIds.length > 0) {
        dispatch(addUserNotification(normalizedNotification));
      }

      if (recipientCompanyIds && recipientCompanyIds.length > 0) {
        dispatch(addCompanyNotification(normalizedNotification));
      }

      if (recipientRoles && recipientRoles.length > 0) {
        dispatch(addRoleNotification(normalizedNotification));
      }

      // 📢 Global fallback (no target specified)
      if (
        (recipientUserIds?.length ?? 0) === 0 &&
        (recipientCompanyIds?.length ?? 0) === 0 &&
        (recipientRoles?.length ?? 0) === 0
      ) {
        dispatch(addCompanyNotification(normalizedNotification));
      }
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
