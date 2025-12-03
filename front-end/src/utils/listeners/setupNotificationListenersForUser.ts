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
import { setNotifications } from "../../Slices/notificationsSlice";
import { NotificationType, UserType } from "../types";
import { normalizeFirestoreData } from "../normalize"; // ✅ Add this import

export const setupNotificationListenersForUser = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const unsubscribers: Unsubscribe[] = [];
    const userNotifications: Record<string, NotificationType> = {};

    const dispatchUserNotifications = () => {
      dispatch(setNotifications(Object.values(userNotifications)));
    };

    // 🔥 The correct notifications path
    const baseRef = collection(db, "users", user.uid, "notifications");

    // If you want ordering:
    const userQuery = query(baseRef, orderBy("sentAt", "desc"));

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.docChanges().forEach((change) => {
        const doc = change.doc;

        const normalizedData = normalizeFirestoreData(doc.data()) as NotificationType;

        if (change.type === "removed") {
          delete userNotifications[doc.id];
        } else {
          userNotifications[doc.id] = {
            id: doc.id, // 'id' is specified more than once, so this usage will be overwritten.
            ...normalizedData,
          };
        }
      });

      dispatchUserNotifications();
    };

    unsubscribers.push(onSnapshot(userQuery, handleSnapshot));

    return () => unsubscribers.forEach((unsub) => unsub());
  };
};

