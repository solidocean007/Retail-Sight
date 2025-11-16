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
import { NotificationType, UserType } from "../utils/types";
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
        const normalizedData = normalizeFirestoreData(docSnap.data()) as NotificationType;

        const normalized: NotificationType = {
          ...normalizedData,
          id: docSnap.id,
        };

        const { recipientUserIds, recipientCompanyIds, recipientRoles } =
          normalized;

        // GLOBAL
        if (
          (!recipientUserIds || recipientUserIds.length === 0) &&
          (!recipientCompanyIds || recipientCompanyIds.length === 0) &&
          (!recipientRoles || recipientRoles.length === 0)
        ) {
          companyNotifs.push(normalized);
          return;
        }

        // COMPANY
        if (recipientCompanyIds?.includes(companyId)) {
          companyNotifs.push(normalized);
          return;
        }

        // ROLE  (CURRENTLY KEEP SIMPLE)
        // Just collect them — not actively filtering by current user's role yet.
        if (recipientRoles?.length) {
          roleNotifs.push(normalized);
          return;
        }

        // USER
        if (recipientUserIds?.length) {
          userNotifs.push(normalized);
          return;
        }
      });

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
    { dispatch, getState }
  ) => {
    try {
      const docRef = doc(collection(db, "notifications"));

      // -----------------------------
      // REMOVE ACTOR FROM RECIPIENT LISTS
      // -----------------------------
      const actorUid =
        typeof notification.sentBy === "object"
          ? notification.sentBy.uid
          : null;

      const filteredUserRecipients = (
        notification.recipientUserIds ?? []
      ).filter((uid) => uid !== actorUid);

      const filteredCompanyRecipients = notification.recipientCompanyIds ?? [];
      const filteredRoleRecipients = notification.recipientRoles ?? [];

      // 🚫 If nobody left to notify → return early
      if (
        filteredUserRecipients.length === 0 &&
        filteredCompanyRecipients.length === 0 &&
        filteredRoleRecipients.length === 0
      ) {
        return;
      }

      // -----------------------------
      // FIRESTORE PAYLOAD
      // -----------------------------
      const firestorePayload: NotificationType = {
        ...notification,
        id: docRef.id,
        recipientUserIds: filteredUserRecipients,
        recipientCompanyIds: filteredCompanyRecipients,
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

      // -----------------------------
      // REFRESH
      // -----------------------------
      // Only refresh for ACTUAL intended recipients.
      // (System notifications don't refresh anything—yet.)
      if (typeof notification.sentBy === "object") {
        const senderCompanyId = notification.sentBy.companyId;
        if (senderCompanyId) {
          dispatch(fetchCompanyNotifications(senderCompanyId));
        }
      }

      // System notifications? Do nothing for now.
      // We'll define logic later.
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
