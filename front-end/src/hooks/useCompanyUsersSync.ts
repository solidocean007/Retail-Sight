import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectUser,
  selectCompanyUsers,
  setCompanyUsers,
} from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { normalizeFirestoreData } from "../utils/normalize";
import { selectCanSync } from "../utils/store";

const haveUsersChanged = (current: any[], fresh: any[]) => {
  if (current.length !== fresh.length) return true;

  const currentByUid = new Map(current.map((u) => [u.uid, u]));

  return fresh.some((freshUser) => {
    const currentUser = currentByUid.get(freshUser.uid);
    if (!currentUser) return true;

    return JSON.stringify(currentUser) !== JSON.stringify(freshUser);
  });
};

export default function useCompanyUsersSync(shouldStartSync = true) {
  const canSync = useSelector(selectCanSync);
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers);
  const usersRef = useRef(companyUsers);

  useEffect(() => {
    usersRef.current = companyUsers;
  }, [companyUsers]);

  useEffect(() => {
    if (!shouldStartSync) return;
    if (!canSync) return;
    if (!user?.companyId) return;

    const companyId = user.companyId;
    let unsub = () => {};

    (async () => {
      const cached = await getCompanyUsersFromIndexedDB(companyId);

      if (cached?.length && (!companyUsers || companyUsers.length === 0)) {
        const normalized = normalizeFirestoreData(cached);
        dispatch(setCompanyUsers(normalized));
      }

      const q = query(
        collection(db, "users"),
        where("companyId", "==", companyId)
      );

      if (
        (!companyUsers || companyUsers.length === 0) &&
        (!cached || cached.length === 0)
      ) {
        try {
          const snap = await getDocs(q);

          const users = snap.docs.map((d) => ({
            ...(d.data() as any),
            uid: d.id,
          }));

          const normalized = normalizeFirestoreData(users);

          dispatch(setCompanyUsers(normalized));
          await saveCompanyUsersToIndexedDB(companyId, normalized);
        } catch (err) {
          console.warn("[UserSync] Manual fetch failed:", err);
        }
      }

      unsub = onSnapshot(q, async (snap) => {
        const fresh = snap.docs.map((d) => ({
          ...(d.data() as any),
          uid: d.id,
        }));

        const normalized = normalizeFirestoreData(fresh);
        const curr = usersRef.current ?? [];

        if (haveUsersChanged(curr, normalized)) {
          dispatch(setCompanyUsers(normalized));
          await saveCompanyUsersToIndexedDB(companyId, normalized);
        }
      });
    })();

    return () => unsub();
  }, [dispatch, canSync, user?.companyId, shouldStartSync]);
}