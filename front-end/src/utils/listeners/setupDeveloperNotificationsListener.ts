// utils/listeners/setupDeveloperNotificationsListener.ts
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { normalizeFirestoreData } from "../normalize";
import {
  setDeveloperNotifications,
  clearDeveloperNotifications,
} from "../../Slices/developerNotificationSlice";
import { DeveloperNotificationType } from "../../utils/types";

export const setupDeveloperNotificationsListener = () => {
  return (dispatch: AppDispatch) => {
    const q = query(
      collection(db, "developerNotifications"),
      orderBy("sentAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.metadata.fromCache) return;

      if (snapshot.empty) {
        dispatch(clearDeveloperNotifications());
        return;
      }

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(normalizeFirestoreData(doc.data()) as Omit<
          DeveloperNotificationType,
          "id"
        >),
      }));

      dispatch(setDeveloperNotifications(items));
    });

    return unsub; // 👈 REQUIRED
  };
};
