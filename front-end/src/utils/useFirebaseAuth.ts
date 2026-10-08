import { useEffect, useCallback, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { User, onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { setUser } from "../Slices/userSlice";

import { fetchUserDocWithRetry } from "./userData/fetchUserDocFromFirestore";
import { UserType } from "./types";
import { auth } from "./firebase";
import { normalizeFirestoreData } from "./normalize";
import {
  getValidatedUserProfile,
  saveValidatedUserProfile,
} from "../features/offlineCapture/offlineCaptureDb";

const isTransientProfileError = (error: unknown) => {
  if (!navigator.onLine) return true;
  const code = String(
    (error as { code?: string })?.code ??
      (error as Error)?.message ??
      "",
  ).toLowerCase();
  return (
    code.includes("unavailable") ||
    code.includes("network") ||
    code.includes("timed out") ||
    code.includes("timeout")
  );
};

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  /** True when we're signed in but couldn't load the Firestore profile. */
  const [profileError, setProfileError] = useState(false);
  const [usingCachedProfile, setUsingCachedProfile] = useState(false);

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
        setUsingCachedProfile(false);
        dispatch(setUser(null));
        return;
      }

      if (loadingProfileRef.current) return;
      loadingProfileRef.current = true;

      try {
        if (!navigator.onLine) {
          const cachedProfile = await getValidatedUserProfile(user.uid);
          if (cachedProfile) {
            setProfileError(false);
            setProfileErrorDetail(null);
            setUsingCachedProfile(true);
            dispatch(setUser(cachedProfile));
            return;
          }

          setProfileError(true);
          setProfileErrorDetail("profile-read: offline-no-cache");
          setUsingCachedProfile(false);
          dispatch(
            setUser({ uid: user.uid, email: user.email } as UserType),
          );
          return;
        }

        const { data, error } = await fetchUserDocWithRetry(user.uid);

        if (data) {
          const normalizedProfile = {
            ...normalizeFirestoreData(data),
            uid: user.uid,
            email: data.email ?? user.email ?? undefined,
          } as UserType;
          setProfileError(false);
          setProfileErrorDetail(null);
          setUsingCachedProfile(false);
          dispatch(setUser(normalizedProfile));
          void saveValidatedUserProfile(normalizedProfile).catch((cacheError) =>
            console.warn("Unable to cache the validated user profile:", cacheError),
          );
          return;
        }

        if (error && isTransientProfileError(error)) {
          const cachedProfile = await getValidatedUserProfile(user.uid);
          if (cachedProfile) {
            setProfileError(false);
            setProfileErrorDetail(null);
            setUsingCachedProfile(true);
            dispatch(setUser(cachedProfile));
            return;
          }
        }

        // Distinguish "read failed" from "user doc doesn't exist".
        // Both leave us without a companyId, but only the former is
        // worth retrying — and neither should hang silently.
        setProfileError(true);
        setUsingCachedProfile(false);
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

  useEffect(() => {
    if (!usingCachedProfile) return;

    const revalidateProfile = () => {
      if (auth.currentUser) void handleUserChange(auth.currentUser);
    };
    window.addEventListener("online", revalidateProfile);
    return () => window.removeEventListener("online", revalidateProfile);
  }, [usingCachedProfile, handleUserChange]);

  return {
    currentUser,
    initializing,
    profileError,
    profileErrorDetail,
    usingCachedProfile,
    retryProfileLoad,
  };
};
