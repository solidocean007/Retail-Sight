/* eslint-disable no-undef */

// -------------------------------------------------------
// 0. BASIC SERVICE WORKER LIFECYCLE
// -------------------------------------------------------
// No skipWaiting — required so Firebase Messaging works correctly

self.addEventListener("install", () => {
  // minimal install — do nothing
});

self.addEventListener("activate", (event) => {
  // Claim clients so background messages can reach pages immediately
  event.waitUntil(clients.claim());
});

// IMPORTANT:
// ❗ Remove fetch interception entirely.
// Future offline upload logic will be added with Workbox or custom handlers.
// self.addEventListener("fetch", () => {})


// -------------------------------------------------------
// 1. FIREBASE MESSAGING SETUP
// -------------------------------------------------------
try {
  importScripts(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
  );
  importScripts(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
  );
} catch (err) {
  console.error("SW importScripts error:", err);
  // Do NOT throw — allow SW to continue so app still loads
}

if (firebase?.initializeApp) {
  firebase.initializeApp({
    apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
    authDomain: "retail-sight.firebaseapp.com",
    projectId: "retail-sight",
    messagingSenderId: "484872165965",
    appId: "1:484872165965:web:feb232cfe100a4b9105a04",
  });

  const messaging = firebase.messaging();

  // -------------------------------------------------------
  // 2. BACKGROUND MESSAGE HANDLER
  // -------------------------------------------------------
  messaging.onBackgroundMessage((payload) => {

    const hasNativeNotification =
      payload.notification || (payload.data && payload.data.title);

    if (hasNativeNotification) {
      // Firebase already created the notification — no need to duplicate
      return;
    }

    const title = payload.data?.title || "New Notification";
    const body = payload.data?.body || "";
    const link = payload.data?.link || "/notifications";

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link },
    });
  });

  // -------------------------------------------------------
  // 3. NOTIFICATION CLICK HANDLING
  // -------------------------------------------------------
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const target = event.notification.data?.link || "/notifications";

    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: "NOTIFICATION_CLICK",
                data: event.notification.data,
              });
              return client.focus();
            }
          }
          return clients.openWindow(target);
        })
    );
  });

} else {
  console.warn("Firebase Messaging could not initialize in SW.");
}
