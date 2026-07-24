// front-end/src/firebase/messaging.ts
import {
  getMessaging,
  getToken,
  deleteToken,
  type Messaging,
} from "firebase/messaging";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import { app, auth, db } from "../utils/firebase";

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
// Save Token to Firestore
// --------------------------------------------
export async function saveFcmToken(uid: string, token: string) {
  if (!uid || !token) return;

  const tokenRef = doc(db, `users/${uid}/fcmTokens/${token}`);

  await setDoc(tokenRef, {
    token,
    createdAt: serverTimestamp(),
    device: navigator.userAgent,
  }).catch((err) => {
    console.error("Error saving FCM token:", err);
  });
}

// --------------------------------------------
// Delete Token from Firestore
// --------------------------------------------
export async function deleteFcmToken(uid: string, token: string) {
  if (!uid || !token) return;

  const tokenRef = doc(db, `users/${uid}/fcmTokens/${token}`);

  await deleteDoc(tokenRef).catch((err) => {
    console.error("Error deleting FCM token:", err);
  });
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

// Return TRUE if any token exists for this user
export async function hasExistingFcmToken(uid: string): Promise<boolean> {
  if (!uid) return false;

  try {
    const colRef = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(colRef);
    return snap.size > 0;
  } catch (err) {
    console.error("hasExistingFcmToken error:", err);
    return false;
  }
}

export async function hasTokenForThisDevice(uid: string): Promise<boolean> {
  if (!uid) return false;

  try {
    const ua = navigator.userAgent;
    const colRef = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(colRef);

    return snap.docs.some((d) => d.data().device === ua);
  } catch (err) {
    console.error("hasTokenForThisDevice error:", err);
    return false;
  }
}

// --------------------------------------------
// On-Message Listener (foreground notifications)
// --------------------------------------------
// Shape of the raw FCM payload the service worker forwards to the page
export type PushPayload = {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string };
};

// The service worker forwards pushes to visible windows as
// FOREGROUND_PUSH messages (we no longer use the Firebase SDK inside
// the SW, so firebase/messaging onMessage would never fire).
export function subscribeToForegroundMessages(
  cb: (payload: PushPayload) => void,
) {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "FOREGROUND_PUSH") {
      cb(event.data.payload);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
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
