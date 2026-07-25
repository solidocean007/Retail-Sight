import { useEffect, useCallback, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { User, onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { setUser } from "../Slices/userSlice";

import { fetchUserDocWithRetry } from "./userData/fetchUserDocFromFirestore";
import { UserType } from "./types";
import { auth } from "./firebase";
import { normalizeFirestoreData } from "./normalize";

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  /** True when we're signed in but couldn't load the Firestore profile. */
  const [profileError, setProfileError] = useState(false);

  /**
   * Short, screenshot-able reason the profile load failed. This bug is not
   * reproducible in-house, so the failure has to explain itself on the
   * user's own screen.
   */
  const [profileErrorDetail, setProfileErrorDetail] = useState<string | null>(
    null,
  );

  // Guards against a token-refresh refetch racing the initial load
  const loadingProfileRef = useRef(false);

  const handleUserChange = useCallback(
    async (user: User | null) => {
      if (!user) {
        setProfileError(false);
        setProfileErrorDetail(null);
        dispatch(setUser(null));
        return;
      }

      if (loadingProfileRef.current) return;
      loadingProfileRef.current = true;

      try {
        const { data, error } = await fetchUserDocWithRetry(user.uid);

        if (data) {
          setProfileError(false);
          setProfileErrorDetail(null);
          dispatch(setUser(normalizeFirestoreData(data) as UserType));
          return;
        }

        // Distinguish "read failed" from "user doc doesn't exist".
        // Both leave us without a companyId, but only the former is
        // worth retrying — and neither should hang silently.
        setProfileError(true);
        dispatch(
          setUser({ uid: user.uid, email: user.email } as UserType),
        );

        if (error) {
          const code =
            (error as { code?: string })?.code ??
            (error as Error)?.message ??
            "unknown";
          setProfileErrorDetail(`profile-read: ${code}`);
          console.error("Profile load failed after retries:", error);
        } else {
          // Read succeeded but there's no /users/{uid} document at all
          setProfileErrorDetail("profile-read: no-user-doc");
        }
      } finally {
        loadingProfileRef.current = false;
      }
    },
    [dispatch],
  );

  /** Manual recovery hook for the loading screen's Retry button. */
  const retryProfileLoad = useCallback(async () => {
    if (auth.currentUser) {
      await handleUserChange(auth.currentUser);
    }
  }, [handleUserChange]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      await handleUserChange(user);

      setInitializing(false);
    });

    return unsubscribe;
  }, [handleUserChange]);

  // Recovery path: if the very first read failed because the ID token
  // wasn't ready yet (cold iOS PWA start), the token settling shortly
  // after gives us a free second chance.
  useEffect(() => {
    return onIdTokenChanged(auth, async (user) => {
      if (user && profileError) {
        await handleUserChange(user);
      }
    });
  }, [profileError, handleUserChange]);

  return {
    currentUser,
    initializing,
    profileError,
    profileErrorDetail,
    retryProfileLoad,
  };
};
