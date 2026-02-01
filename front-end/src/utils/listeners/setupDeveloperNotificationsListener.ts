// utils/listeners/setupDeveloperNotificationsListener.ts
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { AppDispatch } from "../store";
import { normalizeFirestoreData } from "../normalize";
import { setDeveloperNotifications } from "../../Slices/developerNotificationSlice";
import { DeveloperNotificationType } from "../../utils/types";

export const setupDeveloperNotificationsListener = () => {
  return (dispatch: AppDispatch) => {
    const q = query(
      collection(db, "developerNotifications"),
      orderBy("sentAt", "desc"),
    );

    return onSnapshot(q, (snapshot) => {
      const items: DeveloperNotificationType[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(normalizeFirestoreData(doc.data()) as Omit<
          DeveloperNotificationType,
          "id"
        >),
      }));

      dispatch(setDeveloperNotifications(items));
    });
  };
};
