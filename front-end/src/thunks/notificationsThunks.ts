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
import { normalizeFirestoreData } from "../utils/normalize";

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
        // ✅ Normalize the Firestore data safely
        // ✅ Normalize the Firestore data safely
        const normalizedData = normalizeFirestoreData(
          docSnap.data()
        ) as NotificationType;
        const normalized: NotificationType = {
          ...normalizedData,
          id: docSnap.id,
        };

        const { recipientUserIds, recipientCompanyIds, recipientRoles } =
          normalized;

        if (
          (!recipientUserIds || recipientUserIds.length === 0) &&
          (!recipientCompanyIds || recipientCompanyIds.length === 0) &&
          (!recipientRoles || recipientRoles.length === 0)
        ) {
          companyNotifs.push(normalized); // global
        } else if (recipientCompanyIds?.includes(companyId)) {
          companyNotifs.push(normalized);
        } else if (recipientRoles?.length) {
          roleNotifs.push(normalized);
        } else {
          userNotifs.push(normalized);
        }
      });

      // ✅ Dispatch each group
      dispatch(setUserNotifications(userNotifs));
      dispatch(setCompanyNotifications(companyNotifs));
      dispatch(setRoleNotifications(roleNotifs));
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
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

      // 🧹 REMOVE ACTOR FROM RECIPIENT LISTS
      const actorUid =
        typeof notification.sentBy === "object"
          ? notification.sentBy.uid
          : null;

      const filteredUserRecipients = (
        notification.recipientUserIds ?? []
      ).filter((uid) => uid !== actorUid);

      const filteredCompanyRecipients = notification.recipientCompanyIds ?? [];
      const filteredRoleRecipients = notification.recipientRoles ?? [];

      // 📝 Firestore payload
      const firestorePayload: NotificationType = {
        ...notification,
        id: docRef.id,
        recipientCompanyIds: filteredCompanyRecipients,
        recipientUserIds: filteredUserRecipients,
        recipientRoles: filteredRoleRecipients,
        sentAt:
          notification.sentAt instanceof Timestamp
            ? notification.sentAt
            : notification.sentAt
            ? Timestamp.fromDate(new Date(notification.sentAt as any))
            : Timestamp.now(),
        postId: notification.postId ?? "",
      };

      await setDoc(docRef, firestorePayload);

      // 🔁 Normalize for Redux
      const normalized = {
        ...normalizeFirestoreData(firestorePayload),
      };

      const { recipientUserIds, recipientCompanyIds, recipientRoles } =
        normalized;

      let dispatched = false;

      if (recipientUserIds?.length) {
        dispatch(addUserNotification(normalized));
        dispatched = true;
      }
      if (recipientCompanyIds?.length) {
        dispatch(addCompanyNotification(normalized));
        dispatched = true;
      }
      if (recipientRoles?.length) {
        dispatch(addRoleNotification(normalized));
        dispatched = true;
      }

      if (!dispatched) dispatch(addCompanyNotification(normalized));
    } catch (err: any) {
      console.error("Error sending notification:", err);
      dispatch(setError(err.message || "Failed to send notification"));
      throw err;
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
