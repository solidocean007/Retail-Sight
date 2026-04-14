import { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, getAuth, onAuthStateChanged } from "firebase/auth";
import { setUser } from "../Slices/userSlice";

import { fetchUserDocFromFirestore } from "./userData/fetchUserDocFromFirestore";
import { UserType } from "./types";
import { auth } from "./firebase";
import { normalizeFirestoreData } from "./normalize";

const toIso = (val: any) => {
  if (!val) return null;
  if (val?.toDate) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return val;
};

// function normalizeUserData(raw: UserType) {
//   if (!raw) return raw;
//   return {
//     ...raw,
//     createdAt: toIso(raw.createdAt),
//     updatedAt: toIso(raw.updatedAt),
//     lastUpdatedAt: toIso(raw.lastUpdatedAt),
//   };
// }

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
                ? normalizeFirestoreData(userData)
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      await handleUserChange(user);

      setInitializing(false);
    });

    return unsubscribe;
  }, [handleUserChange]);

  return { currentUser, initializing };
};
