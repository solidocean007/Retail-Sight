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
import { normalizeFirestoreData } from "../normalize"; // ✅ add this


// depracted no longer using
export const setupNotificationListenersForCompany = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const unsubscribers: Unsubscribe[] = [];
    const companyNotifications: Record<string, NotificationType> = {};

    const dispatchCompanyNotifications = () => {
      dispatch(setNotifications(Object.values(companyNotifications)));
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

        // ✅ Deep normalize all Firestore timestamps (sentAt, scheduledAt, etc.)
        const normalizedData = normalizeFirestoreData(doc.data()) as NotificationType;

        const notification: NotificationType = {
          // id: doc.id,
          ...normalizedData,
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
