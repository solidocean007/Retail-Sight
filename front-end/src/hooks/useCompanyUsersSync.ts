import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { setCompanyUsers } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { db } from "../utils/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function useCompanyUsersSync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.companyId) return;
    let unsub = () => {};

    (async () => {
      // 1️⃣ load cached
      const cached = await getCompanyUsersFromIndexedDB();
      if (cached?.length) dispatch(setCompanyUsers(cached));

      // 2️⃣ live Firestore listener
      const q = query(
        collection(db, "users"),
        where("companyId", "==", user.companyId)
      );
      unsub = onSnapshot(q, (snap) => {
        const users = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }));
        dispatch(setCompanyUsers(users));
        saveCompanyUsersToIndexedDB(users);
      });
    })();

    return () => unsub();
  }, [dispatch, user?.companyId]);
}
