import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { setNotifications } from "../../Slices/notificationsSlice";
import { NotificationType, UserType } from "../types";

export const setupNotificationListenersForUser = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const unsubscribers: Unsubscribe[] = [];
    const allNotifications: Record<string, NotificationType> = {};

    const dispatchCombinedNotifications = () => {
      dispatch(setNotifications(Object.values(allNotifications)));
    };

    const handleSnapshot = () => (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        const doc = change.doc;
        const raw = doc.data();
        const data: NotificationType = {
          ...raw,
          id: doc.id,
          sentAt: raw.sentAt?.toDate ? raw.sentAt.toDate() : raw.sentAt,
        };

        if (change.type === "removed") {
          delete allNotifications[doc.id];
        } else {
          allNotifications[doc.id] = data;
        }
      });

      dispatchCombinedNotifications();
    };

    // Shared base query
    const baseRef = collection(db, "notifications");

    // User-specific
    unsubscribers.push(
      onSnapshot(
        query(baseRef, where("recipientUserIds", "array-contains", user.uid)),
        handleSnapshot()
      )
    );

    // Role-specific
    unsubscribers.push(
      onSnapshot(
        query(
          baseRef,
          where("recipientRoles", "array-contains", user.role),
          where("companyId", "==", user.companyId)
        ),
        handleSnapshot()
      )
    );

    // Company-wide (for all, no specific roles or users)
    // Notifications for all users in the company (not targeting specific roles or users)
    unsubscribers.push(
      onSnapshot(
        query(
          baseRef,
          where("recipientCompanyIds", "array-contains", user.companyId)
        ),
        handleSnapshot()
      )
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  };
};
