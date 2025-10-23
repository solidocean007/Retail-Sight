import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { setUserNotifications } from "../../Slices/notificationsSlice";
import { NotificationType, UserType } from "../types";
import { normalizeFirestoreData } from "../normalize"; // ✅ Add this import

export const setupNotificationListenersForUser = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const unsubscribers: Unsubscribe[] = [];
    const userNotifications: Record<string, NotificationType> = {};

    const dispatchUserNotifications = () => {
      dispatch(setUserNotifications(Object.values(userNotifications)));
    };

    const baseRef = collection(db, "notifications");

    const userQuery = query(
      baseRef,
      where("recipientUserIds", "array-contains", user.uid),
      orderBy("sentAt", "desc")
    );

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.docChanges().forEach((change) => {
        const doc = change.doc;

        // ✅ Deep normalize all timestamps and nested fields
        const normalizedData = normalizeFirestoreData(doc.data()) as NotificationType;

        const notification: NotificationType = {
          // id: doc.id,
          ...normalizedData,
        };

        if (change.type === "removed") {
          delete userNotifications[doc.id];
        } else {
          userNotifications[doc.id] = notification;
        }
      });

      dispatchUserNotifications();
    };

    unsubscribers.push(onSnapshot(userQuery, handleSnapshot));

    return () => unsubscribers.forEach((unsub) => unsub());
  };
};
