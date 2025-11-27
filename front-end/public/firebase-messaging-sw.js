/* eslint-disable no-undef */

// Required for Firebase v9+ modular SDK inside a service worker
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// -------------------------------------------
// Initialize Firebase in Service Worker
// -------------------------------------------
firebase.initializeApp({
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
});

// -------------------------------------------
// Messaging Instance
// -------------------------------------------
const messaging = firebase.messaging();

// -------------------------------------------
// Background Message Handler
// -------------------------------------------
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] background message received:", payload);

  const title = payload.notification?.title || "New Notification";
  const body = payload.notification?.body || "";
  const icon = "/icons/icon-192.png";

  self.registration.showNotification(title, {
    body,
    icon,
    data: payload.data || {},
  });
});

// -------------------------------------------
// Click Handler
// -------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = "/notifications"; // can route to a page inside your SPA

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If window is already open, focus it.
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "NOTIFICATION_CLICK", data: event.notification.data });
            return client.focus();
          }
        }

        // Otherwise, open a new window.
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
