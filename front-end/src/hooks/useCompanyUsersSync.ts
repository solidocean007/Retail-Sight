import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, selectCompanyUsers, setCompanyUsers } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { db } from "../utils/firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

export default function useCompanyUsersSync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers); // ✅ read from Redux

  useEffect(() => {
    if (!user?.companyId) return;
    let unsub = () => {};

    (async () => {
      // 🚫 Skip everything if Redux already has users
      if ((companyUsers || []).length > 0) {
        // console.log("[UserSync] Redux already has users, skipping initial load");
        return;
      }

      // 1️⃣ Try loading from IndexedDB
      const cached = await getCompanyUsersFromIndexedDB();
      if (cached?.length) {
        // console.log("[UserSync] Loaded cached users:", cached.length);
        dispatch(setCompanyUsers(cached));
      }

      const q = query(
        collection(db, "users"),
        where("companyId", "==", user.companyId)
      );

      // 2️⃣ Manual fallback fetch from Firestore (only if cache was empty)
      if (!cached?.length) {
        try {
          const snap = await getDocs(q);
          const users = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }));
          // console.log("[UserSync] Fetched from Firestore:", users.length);
          dispatch(setCompanyUsers(users));
          await saveCompanyUsersToIndexedDB(users);
        } catch (err) {
          console.warn("[UserSync] Manual fetch failed:", err);
        }
      }

      // 3️⃣ Real-time sync: update on add/delete/change
      unsub = onSnapshot(q, async (snap) => {
        const fresh = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }));
        // console.log("[UserSync] Snapshot update:", fresh.length);

        // Only update if something changed
        const currentUids = new Set(companyUsers?.map((u) => u.uid));
        const newUids = new Set(fresh.map((u) => u.uid));
        const changed = fresh.length !== companyUsers?.length ||
          [...newUids].some((uid) => !currentUids.has(uid));

        if (changed) {
          dispatch(setCompanyUsers(fresh));
          await saveCompanyUsersToIndexedDB(fresh);
        } else {
          // console.log("[UserSync] No change in users, skipping update");
        }
      });
    })();

    return () => unsub();
  }, [dispatch, user?.companyId]);
}
