// listeners/setupNotificationListener.ts
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AppDispatch } from "../store";
import { db } from "../firebase";
import { setNotifications } from "../../Slices/notificationsSlice";

export const setupNotificationListener = (companyId: string) => (dispatch: AppDispatch) => {
  const q = query(
    collection(db, `notifications/${companyId}/items`),
    orderBy("sentAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    dispatch(setNotifications(notifs));
  });

  return unsubscribe;
};
