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
