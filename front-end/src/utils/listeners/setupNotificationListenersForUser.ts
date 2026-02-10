import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import {
  setNotifications,
  clearNotifications,
} from "../../Slices/notificationsSlice";
import { UserNotificationType, UserType } from "../types";
import { normalizeFirestoreData } from "../normalize";

export const setupNotificationListenersForUser = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        dispatch(clearNotifications());
        return;
      }

      const items: UserNotificationType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(normalizeFirestoreData(doc.data()) as Omit<
          UserNotificationType,
          "id"
        >),
      }));

      dispatch(setNotifications(items));
    });

    return unsub;
  };
};

