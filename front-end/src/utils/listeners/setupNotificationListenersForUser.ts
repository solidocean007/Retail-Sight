import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { setUserNotifications } from "../../Slices/notificationsSlice";
import { NotificationType, UserType } from "../types";

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
        const raw = structuredClone(doc.data()); // 🔐 safer clone for Redux


        const notification = {
          ...raw,
          id: doc.id,
          sentAt:
            raw.sentAt?.toDate instanceof Function
              ? raw.sentAt.toDate().toISOString()
              : typeof raw.sentAt === "string"
              ? raw.sentAt
              : new Date().toISOString(),
          scheduledAt:
            raw.scheduledAt?.toDate instanceof Function
              ? raw.scheduledAt.toDate()
              : raw.scheduledAt || null,
        } as NotificationType;

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
