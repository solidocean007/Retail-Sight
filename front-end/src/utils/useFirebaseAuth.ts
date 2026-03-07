import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser } from "../Slices/userSlice";

import { fetchUserDocFromFirestore } from "./userData/fetchUserDocFromFirestore";
import { RootState } from "./store";
import { UserType } from "./types";

const toIso = (val: any) => {
  if (!val) return null;
  if (val?.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return val;
};

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
            user.uid,
          )) as UserType;

          dispatch(
            setUser(
              userData
                ? normalizeUserData(userData)
                : ({ uid: user.uid, email: user.email } as UserType),
            ),
          );
        } catch (err) {
          console.error("Error fetching user:", err);
          dispatch(setUser(null));
        }
      } else {
        dispatch(setUser(null));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setInitializing(false); // auth state is now known

      try {
        await handleUserChange(fbUser);
      } catch (err) {
        console.error("User load failed:", err);
      }
    });

    return () => unsub();
  }, [handleUserChange]);

  return { currentUser, initializing };
};
