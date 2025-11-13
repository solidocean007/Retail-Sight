import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser } from "../Slices/userSlice";

import { fetchUserDocFromFirestore } from "./userData/fetchUserDocFromFirestore";
import { RootState } from "./store";
import { UserType } from "./types";

const toIso = (val: any) =>
  val?.toDate ? val.toDate().toISOString() : val || null;

function normalizeUserData(raw: UserType) {
  if (!raw) return raw;
  return {
    ...raw,
    createdAt: toIso(raw.createdAt),
    updatedAt: toIso(raw.updatedAt),
  };
}

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const [initializing, setInitializing] = useState(true);

  const handleUserChange = useCallback(
    async (user: User | null) => {
      if (user) {
        try {
          const userData = (await fetchUserDocFromFirestore(
            user.uid
          )) as UserType;

          dispatch(setUser(userData ? normalizeUserData(userData) : null));
        } catch (err) {
          console.error("Error fetching user:", err);
          dispatch(setUser(null));
        }
      } else {
        dispatch(setUser(null));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      await handleUserChange(fbUser);   // ⬅️ Wait for Firestore load
      setInitializing(false);           // ⬅️ AFTER currentUser is known
    });

    return () => unsub();
  }, [handleUserChange]);

  return { currentUser, initializing };
};
