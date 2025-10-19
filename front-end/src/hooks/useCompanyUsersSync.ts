import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, selectCompanyUsers, setCompanyUsers } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { db } from "../utils/firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { normalizeTimestamps } from "../utils/normalizeTimestamps";

export default function useCompanyUsersSync() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers);
  const usersRef = useRef(companyUsers);
  useEffect(() => { usersRef.current = companyUsers; }, [companyUsers]);

  useEffect(() => {
    if (!user?.companyId) return;
    let unsub = () => {};

    (async () => {
      // If Redux already has users, you can skip the initial fetch, but keep the live listener.
      const cached = await getCompanyUsersFromIndexedDB();
      if (cached?.length && (!companyUsers || companyUsers.length === 0)) {
        const normalized = normalizeTimestamps(cached);
        dispatch(setCompanyUsers(normalized));
      }

      const q = query(collection(db, "users"), where("companyId", "==", user.companyId));

      // Manual fetch only if Redux & cache were empty
      if ((!companyUsers || companyUsers.length === 0) && (!cached || cached.length === 0)) {
        try {
          const snap = await getDocs(q);
          const users = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }));
          const normalized = normalizeTimestamps(users);
          dispatch(setCompanyUsers(normalized));
          await saveCompanyUsersToIndexedDB(normalized); // <-- save normalized
        } catch (err) {
          console.warn("[UserSync] Manual fetch failed:", err);
        }
      }

      // Real-time
      unsub = onSnapshot(q, async (snap) => {
        const fresh = snap.docs.map((d) => ({ ...(d.data() as any), uid: d.id }));
        const normalized = normalizeTimestamps(fresh);

        // compare with latest Redux (via ref)
        const curr = usersRef.current ?? [];
        const currIds = new Set(curr.map((u: any) => u.uid));
        const freshIds = new Set(normalized.map((u: any) => u.uid));

        const changed =
          normalized.length !== curr.length ||
          [...freshIds].some((id) => !currIds.has(id));

        if (changed) {
          dispatch(setCompanyUsers(normalized));
          await saveCompanyUsersToIndexedDB(normalized); // <-- save normalized
        }
      });
    })();

    return () => unsub();
  }, [dispatch, user?.companyId]);
}