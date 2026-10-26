// front-end/src/firebase/messaging.ts
import {
  getMessaging,
  getToken,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import { app, auth } from "../utils/firebase";
import {
  subscribeToForegroundMessages,
  type PushPayload,
} from "./foregroundMessages";
import { deleteFcmToken, saveFcmToken } from "./fcmTokenStore";

export { subscribeToForegroundMessages, type PushPayload };
export {
  deleteFcmToken,
  hasExistingFcmToken,
  hasTokenForThisDevice,
  saveFcmToken,
} from "./fcmTokenStore";

// IMPORTANT: Your VAPID key from Firebase Console > Cloud Messaging > Web Push Certificate
const VAPID_KEY =
  "BJiNiXm0teEtgSz77WuMwg9LtT84oOCqQpKTd1B4375arXLaKh__2vT2Mod2ZSSl3vGQoPrCUBgqSnYg6RbbjGc";

// Messaging instance — null on browsers that don't support FCM
// (e.g. iOS Safari not installed as PWA). Guarded so importing this
// module never crashes the app.
function initMessaging(): Messaging | null {
  try {
    return getMessaging(app);
  } catch (err) {
    console.warn("Firebase Messaging unsupported in this browser:", err);
    return null;
  }
}
export const messaging = initMessaging();

// --------------------------------------------
// Detect iOS Standalone (iOS Safari PWA)
// --------------------------------------------
export function isIOSPWA(): boolean {
  return (
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS < 13 fallback
      window.navigator.standalone === true)
  );
}

// --------------------------------------------
// Request FCM Permission + Token
// --------------------------------------------
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.error("Permission request error", e);
    return "denied";
  }
}

// iOS Safari DOES support push if installed as a PWA (iOS 16.4+).
// The only case to block is: iOS + NOT installed as PWA.
//

export function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  ); // iOS < 13
}

export async function registerFcmToken(): Promise<string | null> {
  try {
    // ─────────────────────────────────────────────
    // SAFE iOS DETECTION (never blocks page render)
    // ─────────────────────────────────────────────
    const iOS = /iphone|ipad|ipod/.test(
      window.navigator.userAgent.toLowerCase(),
    );

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // iOS Safari (NOT standalone/PWA) → allow app to load but disable push
    if (iOS && !standalone) {
      console.warn("iOS Safari (not PWA) — push disabled, UI allowed.");
      return null;
    }

    // ─────────────────────────────────────────────
    // REQUEST NOTIFICATION PERMISSION
    // ─────────────────────────────────────────────
    if (Notification.permission !== "granted") {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") return null;
    }

    // ─────────────────────────────────────────────
    // GET FCM TOKEN
    // ─────────────────────────────────────────────
    if (!messaging) {
      console.warn("Messaging unsupported — cannot register FCM token.");
      return null;
    }

    // NOTE: use getRegistration(), not .ready — .ready never resolves
    // if SW registration failed/was skipped, which would hang forever.
    const reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      console.error("Expected service-worker.js not registered");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.warn("FCM token unavailable.");
      return null;
    }

    // ─────────────────────────────────────────────
    // SAVE TO FIRESTORE
    // ─────────────────────────────────────────────
    const user = auth.currentUser;
    if (user) {
      await saveFcmToken(user.uid, token);
    }

    return token;
  } catch (err) {
    console.error("registerFcmToken failed:", err);
    return null;
  }
}

// --------------------------------------------
// Unregister this device's token (call BEFORE signOut,
// while Firestore rules still allow the delete)
// --------------------------------------------
export async function unregisterCurrentDeviceToken(uid: string) {
  try {
    if (!uid || !messaging) return;
    if (!("serviceWorker" in navigator)) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (token) {
      // Remove Firestore doc for the signed-out account…
      await deleteFcmToken(uid, token);
      // …and invalidate the browser-side token so the next login
      // mints a fresh one instead of resurrecting this one.
      await deleteToken(messaging).catch(() => {});
    }
  } catch (err) {
    // Never block logout on push cleanup
    console.warn("unregisterCurrentDeviceToken failed:", err);
  }
}

// --------------------------------------------
// Token Refresh Handling
// --------------------------------------------
export function handleTokenRefresh(uid: string) {
  // Firebase V9 does NOT auto-trigger a refresh listener anymore.
  // Instead, we re-request the token on service worker update.

  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    console.log("Service worker updated — refreshing token…");

    try {
      if (!messaging) return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;
      const newToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg,
      });

      if (newToken) {
        await saveFcmToken(uid, newToken);
      }
    } catch (err) {
      console.error("Failed to refresh token:", err);
    }
  });
}

// Expose for console testing (typed in src/global.d.ts)
window.registerFcmToken = registerFcmToken;
window.requestNotificationPermission = requestNotificationPermission;
window.subscribeToForegroundMessages = subscribeToForegroundMessages;
window.deleteFcmToken = deleteFcmToken;
