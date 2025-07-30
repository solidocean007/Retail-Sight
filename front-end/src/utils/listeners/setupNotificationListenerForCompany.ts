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
import { setCompanyNotifications } from "../../Slices/notificationsSlice";
import { NotificationType, UserType } from "../types";

export const setupNotificationListenersForCompany = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const unsubscribers: Unsubscribe[] = [];
    const companyNotifications: Record<string, NotificationType> = {};

    const dispatchCompanyNotifications = () => {
      dispatch(setCompanyNotifications(Object.values(companyNotifications)));
    };

    const baseRef = collection(db, "notifications");

    const companyQuery = query(
      baseRef,
      where("recipientCompanyIds", "array-contains", user.companyId),
      orderBy("sentAt", "desc")
    );

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      snapshot.docChanges().forEach((change) => {
        const doc = change.doc;
        const raw = doc.data();

         const notification: NotificationType = {
          id: doc.id,
          title: raw.title,
          message: raw.message,
          sentAt: raw.sentAt?.toDate ? raw.sentAt.toDate() : raw.sentAt,
          scheduledAt: raw.scheduledAt?.toDate
            ? raw.scheduledAt.toDate()
            : raw.scheduledAt || null,
          sentBy: raw.sentBy,
          recipientCompanyIds: raw.recipientCompanyIds || [],
          recipientUserIds: raw.recipientUserIds || [],
          recipientRoles: raw.recipientRoles || [],
          readBy: raw.readBy || [],
          priority: raw.priority || "normal",
          pinned: raw.pinned || false,
          type: raw.type || "system",
        };

        if (change.type === "removed") {
          delete companyNotifications[doc.id];
        } else {
          companyNotifications[doc.id] = notification;
        }
      });

      dispatchCompanyNotifications();
    };

    unsubscribers.push(onSnapshot(companyQuery, handleSnapshot));

    return () => unsubscribers.forEach((unsub) => unsub());
  };
};
