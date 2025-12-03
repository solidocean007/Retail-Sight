/* eslint-disable no-undef */

// -------------------------------------------------------
// 0. BASIC PWA LIFE-CYCLE (yours)
// -------------------------------------------------------
self.addEventListener("install", () => {
  // DO NOT skipWaiting() — required so Firebase Messaging can work
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Your minimal fetch passthrough
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// -------------------------------------------------------
// 1. FIREBASE MESSAGING SETUP
// -------------------------------------------------------
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
});

const messaging = firebase.messaging();

// -------------------------------------------------------
// 2. ERROR FORWARDING TO PAGE (debug helper)
// -------------------------------------------------------
self.addEventListener("error", (e) => {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "SW_ERROR",
        message: e.message,
        error: e.error,
      });
    }
  });
});

// -------------------------------------------------------
// 3. BACKGROUND MESSAGE HANDLER
// -------------------------------------------------------
messaging.onBackgroundMessage((payload) => {
  // Skip if FCM already included a notification block
  const hasNativeNotification =
    payload.notification || (payload.data && payload.data.title);

  if (hasNativeNotification) {
    console.log("[SW] Native notification already handled by FCM.");
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
// 4. HANDLE PUSH EVENTS (extra visibility for debugging)
// -------------------------------------------------------
self.addEventListener("push", () => {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "SW_PUSH_EVENT",
        message: "SW received push event",
      });
    }
  });
});

// -------------------------------------------------------
// 5. NOTIFICATION CLICK HANDLING
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
