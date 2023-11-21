// useFirebaseAuth.ts
import { useEffect, useCallback } from "react";
import { AppDispatch } from "./store";
import { useDispatch } from "react-redux";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { setUser } from "../actions/userActions";
import { fetchUserDocFromFirestore } from "./userData/fetchUserDocFromFirestore";
import { firestoreRead } from "./firestoreUtils";

export const useFirebaseAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  const handleUserChange = useCallback(
    async (user: User | null) => {
      if (user) {
        try {
          // Wrap fetchUserDocFromFirestore with firestoreRead for tracking
          // In useFirebaseAuth.ts
          const userDataFromFirestore = await firestoreRead(
            () => fetchUserDocFromFirestore(user.uid),
            `Fetching user data for UID: ${user.uid}`
          );

          if (userDataFromFirestore) {
            dispatch(setUser({ uid: user.uid }));
          } else {
            dispatch(setUser({ uid: "" }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        dispatch(setUser({ uid: "" }));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, handleUserChange);

    return () => unsubscribe();
  }, [handleUserChange]);
};
