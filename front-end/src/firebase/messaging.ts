import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { app, auth, db } from "../utils/firebase";

// --------------------------------------------
// CONFIG
// --------------------------------------------
const firebaseConfig = {
  // 'firebaseConfig' is declared but its value is never read. why is it here?
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
};

// IMPORTANT: Your VAPID key from Firebase Console > Cloud Messaging > Web Push Certificate
const VAPID_KEY =
  "BJiNiXm0teEtgSz77WuMwg9LtT84oOCqQpKTd1B4375arXLaKh__2vT2Mod2ZSSl3vGQoPrCUBgqSnYg6RbbjGc";

// Messaging instance
export const messaging = getMessaging(app);

// --------------------------------------------
// Detect iOS Standalone (iOS Safari PWA)
// --------------------------------------------
export function isIOSPWA(): boolean {
  return (
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS < 13 fallback
      (window.navigator as any).standalone === true)
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
    (window.navigator as any).standalone === true
  ); // iOS < 13
}

export async function registerFcmToken(): Promise<string | null> {
  try {
    // ─────────────────────────────────────────────
    // SAFE iOS DETECTION (never blocks page render)
    // ─────────────────────────────────────────────
    const iOS = /iphone|ipad|ipod/.test(
      window.navigator.userAgent.toLowerCase()
    );

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

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
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
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
// On-Message Listener (foreground notifications)
// --------------------------------------------
export function subscribeToForegroundMessages(cb: (payload: any) => void) {
  return onMessage(messaging, cb);
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
      const reg = await navigator.serviceWorker.ready;
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

// Expose for console testing
// @ts-ignore
window.registerFcmToken = registerFcmToken;
// @ts-ignore
window.requestNotificationPermission = requestNotificationPermission;
// @ts-ignore
window.subscribeToForegroundMessages = subscribeToForegroundMessages;
// @ts-ignore
window.deleteFcmToken = deleteFcmToken;
