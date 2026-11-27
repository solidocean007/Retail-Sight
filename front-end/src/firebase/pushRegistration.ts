import { Capacitor } from "@capacitor/core";

import { auth } from "../utils/firebase";
import {
  deleteFcmToken,
  hasTokenForThisDevice,
  saveFcmToken,
} from "./fcmTokenStore";
import type { PushPayload } from "./foregroundMessages";

export type PushPermissionState =
  | "unsupported"
  | "granted"
  | "denied"
  | "default";

type NativePushAction = {
  data: Record<string, unknown>;
};

const NATIVE_TOKEN_KEY_PREFIX = "displaygram.nativePushToken";
const REGISTRATION_TIMEOUT_MS = 15_000;

export const isNativeAndroidPush = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const nativeTokenKey = (uid: string) => `${NATIVE_TOKEN_KEY_PREFIX}.${uid}`;

const mapNativePermission = (permission: string): PushPermissionState => {
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return "default";
};

export async function getCurrentDevicePushPermission(): Promise<PushPermissionState> {
  if (isNativeAndroidPush()) {
    try {
      const { NativePushNotifications } = await import(
        "../native/pushNotifications"
      );
      const status = await NativePushNotifications.checkPermissions();
      return mapNativePermission(status.receive);
    } catch (error) {
      console.error("Native push permission check failed:", error);
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission as PushPermissionState;
}

export async function requestCurrentDevicePushPermission(): Promise<PushPermissionState> {
  if (isNativeAndroidPush()) {
    try {
      const { NativePushNotifications } = await import(
        "../native/pushNotifications"
      );
      let status = await NativePushNotifications.checkPermissions();

      if (
        status.receive === "prompt" ||
        status.receive === "prompt-with-rationale"
      ) {
        status = await NativePushNotifications.requestPermissions();
      }

      return mapNativePermission(status.receive);
    } catch (error) {
      console.error("Native push permission request failed:", error);
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return (await Notification.requestPermission()) as PushPermissionState;
}

async function registerNativeAndroidToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const permission = await getCurrentDevicePushPermission();
  if (permission !== "granted") return null;

  const { NativePushNotifications } = await import(
    "../native/pushNotifications"
  );

  await NativePushNotifications.createChannel({
    id: "displaygram_activity",
    name: "Displaygram activity",
    description: "Likes, comments, replies, goals, and team activity",
    importance: 4,
    visibility: 1,
    vibration: true,
  });

  let resolveToken: (token: string) => void = () => {};
  let rejectToken: (error: Error) => void = () => {};
  const tokenPromise = new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });

  const registrationListener = await NativePushNotifications.addListener(
    "registration",
    ({ value }) => resolveToken(value),
  );
  const errorListener = await NativePushNotifications.addListener(
    "registrationError",
    ({ error }) => rejectToken(new Error(error)),
  );

  const timeout = globalThis.setTimeout(
    () => rejectToken(new Error("Native push registration timed out.")),
    REGISTRATION_TIMEOUT_MS,
  );

  try {
    await NativePushNotifications.register();
    const token = await tokenPromise;
    await saveFcmToken(user.uid, token, "android-native");
    localStorage.setItem(nativeTokenKey(user.uid), token);
    return token;
  } finally {
    globalThis.clearTimeout(timeout);
    await registrationListener.remove();
    await errorListener.remove();
  }
}

export async function registerCurrentDeviceForPush(options?: {
  requestPermission?: boolean;
}): Promise<string | null> {
  if (options?.requestPermission) {
    const permission = await requestCurrentDevicePushPermission();
    if (permission !== "granted") return null;
  }

  if (isNativeAndroidPush()) {
    return registerNativeAndroidToken();
  }

  const { registerFcmToken } = await import("./messaging");
  return registerFcmToken();
}

export async function hasCurrentDevicePushToken(uid: string): Promise<boolean> {
  return hasTokenForThisDevice(
    uid,
    isNativeAndroidPush() ? "android-native" : "web",
  );
}

export async function unregisterCurrentDevicePushToken(uid: string) {
  if (!isNativeAndroidPush()) {
    const { unregisterCurrentDeviceToken } = await import("./messaging");
    await unregisterCurrentDeviceToken(uid);
    return;
  }

  const { NativePushNotifications } = await import(
    "../native/pushNotifications"
  );
  const storedToken = localStorage.getItem(nativeTokenKey(uid));

  if (storedToken) {
    await deleteFcmToken(uid, storedToken);
  }

  await NativePushNotifications.unregister();
  localStorage.removeItem(nativeTokenKey(uid));
}

export async function subscribeToNativeAndroidPush(options: {
  onReceived: (payload: PushPayload) => void;
  onAction: (action: NativePushAction) => void;
}): Promise<() => void> {
  if (!isNativeAndroidPush()) return () => {};

  const { NativePushNotifications } = await import(
    "../native/pushNotifications"
  );

  const receivedListener = await NativePushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      options.onReceived({
        data: notification.data || {},
        notification: {
          title: notification.title,
          body: notification.body,
        },
      });
    },
  );

  const actionListener = await NativePushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      options.onAction({ data: action.notification.data || {} });
    },
  );

  return () => {
    void receivedListener.remove();
    void actionListener.remove();
  };
}
