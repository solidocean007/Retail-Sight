import { useEffect, useState, useCallback } from "react";
import { auth } from "../utils/firebase";
import {
  registerFcmToken,
  deleteFcmToken,
  subscribeToForegroundMessages,
  handleTokenRefresh,
} from "../firebase/messaging";
import { onAuthStateChanged } from "firebase/auth";

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  token: string | null;
  loading: boolean;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>({
    supported: "Notification" in window && "serviceWorker" in navigator,
    permission: Notification.permission,
    token: null,
    loading: false,
  });

  const requestPermissionAndRegister = useCallback(async () => {
    if (!status.supported) return null;

    setStatus((s) => ({ ...s, loading: true }));

    const token = await registerFcmToken();

    setStatus((s) => ({
      ...s,
      token,
      permission: Notification.permission,
      loading: false,
    }));

    return token;
  }, [status.supported]);

  // -------------------------------------------
  // AUTH LISTENER → register token on login
  // -------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // logged out → no token
        setStatus((s) => ({ ...s, token: null }));
        return;
      }

      // Logged in → request permission and get token
      const token = await requestPermissionAndRegister();

      if (token) {
        // Handle token refresh for this user
        handleTokenRefresh(user.uid);
      }
    });

    return () => unsub();
  }, [requestPermissionAndRegister]);

  // -------------------------------------------
  // On logout → delete stored token
  // (Called manually from the logout button)
  // -------------------------------------------
  const cleanupToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !status.token) return;

    await deleteFcmToken(user.uid, status.token);

    setStatus((s) => ({ ...s, token: null }));
  }, [status.token]);

  // -------------------------------------------
  // Foreground push notifications (in-app toasts)
  // -------------------------------------------
  useEffect(() => {
    const unsub = subscribeToForegroundMessages((payload) => {
      console.log("Foreground push:", payload);
      // Optional: Show your own toast UI here
    });

    return () => unsub();
  }, []);

  return {
    ...status,
    requestPermissionAndRegister,
    cleanupToken,
  };
}
