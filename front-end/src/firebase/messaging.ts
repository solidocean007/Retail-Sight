import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../utils/firebase";

// --------------------------------------------
// CONFIG
// --------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
};

// IMPORTANT: Your VAPID key from Firebase Console > Cloud Messaging > Web Push Certificate
const VAPID_KEY =
  "BJiNiXm0teEtgSz77WuMwg9LtT84oOCqQpKTd1B4375arXLaKh__2vT2Mod2ZSSl3vGQoPrCUBgqSnYg6RbbjGc";

// Only initialize once
const app = initializeApp(firebaseConfig);

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

// --------------------------------------------
// Get & Register FCM Token
// --------------------------------------------
export async function registerFcmToken(): Promise<string | null> {
  // Block if iOS Safari not installed as PWA
  if (isIOSPWA()) {
    console.log("iOS PWA detected — push not supported yet.");
    return null;
  }

  if (Notification.permission !== "granted") {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (!token) {
      console.warn("Failed to obtain FCM token.");
      return null;
    }

    const user = auth.currentUser;
    if (user) {
      await saveFcmToken(user.uid, token);
    }

    return token;
  } catch (e) {
    console.error("Error getting FCM token:", e);
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
