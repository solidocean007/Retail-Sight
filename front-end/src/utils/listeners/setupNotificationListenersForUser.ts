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
import { NotificationType, UserType } from "../types";
import { normalizeFirestoreData } from "../normalize";

export const setupNotificationListenersForUser = (user: UserType) => {
  return (dispatch: AppDispatch) => {
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("sentAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      // ✅ ignore cache echoes
      if (snapshot.metadata.fromCache) return;

      // ✅ hard clear when empty
      if (snapshot.empty) {
        dispatch(clearNotifications());
        return;
      }

      const items: NotificationType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(normalizeFirestoreData(doc.data()) as Omit<
          NotificationType,
          "id"
        >),
      }));

      dispatch(setNotifications(items));
    });

    return unsub;
  };
};
