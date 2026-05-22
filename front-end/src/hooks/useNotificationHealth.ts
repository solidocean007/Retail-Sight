// hooks/useNotificationHealth.ts
import { useCallback, useEffect, useState } from "react";
import { hasTokenForThisDevice } from "../firebase/messaging";

export type NotificationPermissionState =
  | "unsupported"
  | "granted"
  | "denied"
  | "default";

export type NotificationTokenStatus = "unknown" | "ok" | "none" | "error";

export const useNotificationHealth = (uid?: string) => {
  const [permission, setPermission] =
    useState<NotificationPermissionState>("unsupported");

  const [tokenStatus, setTokenStatus] =
    useState<NotificationTokenStatus>("unknown");

  const refreshPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }

    const next = Notification.permission as NotificationPermissionState;
    setPermission(next);
    return next;
  }, []);

  const refreshTokenStatus = useCallback(async () => {
    if (!uid) {
      setTokenStatus("unknown");
      return;
    }

    try {
      const exists = await hasTokenForThisDevice(uid);
      setTokenStatus(exists ? "ok" : "none");
    } catch (err) {
      console.error("[notification-health] token check failed", err);
      setTokenStatus("error");
    }
  }, [uid]);

  const refreshHealth = useCallback(async () => {
    const nextPermission = refreshPermission();

    console.log("[notification-health]", {
      uid,
      permission: nextPermission,
      notificationInWindow:
        typeof window !== "undefined" && "Notification" in window,
    });

    await refreshTokenStatus();
  }, [uid, refreshPermission, refreshTokenStatus]);

  useEffect(() => {
    refreshHealth();

    window.addEventListener("focus", refreshHealth);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshHealth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshHealth);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshHealth]);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }

    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);

    await refreshTokenStatus();

    return result;
  };

  const notificationsAllowed = permission === "granted";
  const notificationsBlocked = permission === "denied";
  const notificationsUnset = permission === "default";
  const notificationsUnsupported = permission === "unsupported";

  const hasDeviceToken = tokenStatus === "ok";
  const missingDeviceToken = tokenStatus === "none" || tokenStatus === "error";

  return {
    permission,
    tokenStatus,

    notificationsAllowed,
    notificationsBlocked,
    notificationsUnset,
    notificationsUnsupported,

    hasDeviceToken,
    missingDeviceToken,

    notificationsNeedAttention:
      notificationsUnset ||
      notificationsBlocked ||
      notificationsUnsupported ||
      (notificationsAllowed && missingDeviceToken),

    refreshHealth,
    refreshPermission,
    refreshTokenStatus,
    requestPermission,
  };
};