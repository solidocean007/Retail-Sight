import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { setCompanyUsers } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { db } from "../utils/firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

export default function useCompanyUsersSync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.companyId) return;
    let unsub = () => {};

    (async () => {
      // 1️⃣ Load cached
      const cached = await getCompanyUsersFromIndexedDB();
      if (cached?.length) dispatch(setCompanyUsers(cached));

      const q = query(
        collection(db, "users"),
        where("companyId", "==", user.companyId)
      );

      // 2️⃣ Manual one-time fetch fallback
      try {
        const snap = await getDocs(q);
        const users = snap.docs.map((d) => ({
          ...(d.data() as any),
          uid: d.id,
        }));
        console.log("[UserSync] Fetched users manually:", users.length);
        dispatch(setCompanyUsers(users));
        await saveCompanyUsersToIndexedDB(users);
      } catch (err) {
        console.warn("[UserSync] Manual fetch failed:", err);
      }

      // 3️⃣ Live snapshot listener (may fail silently on mobile)
      unsub = onSnapshot(q, async (snap) => {
        const users = snap.docs.map((d) => ({
          ...(d.data() as any),
          uid: d.id,
        }));
        console.log("[UserSync] Snapshot update:", users.length);
        dispatch(setCompanyUsers(users));
        await saveCompanyUsersToIndexedDB(users);
      });
    })();

    return () => unsub();
  }, [dispatch, user?.companyId]);
}
