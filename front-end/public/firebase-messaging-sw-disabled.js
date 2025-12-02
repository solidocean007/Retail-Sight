/* eslint-disable no-undef */

// Firebase compat imports (required for SW)
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  // why do this again?  isnt it already done in the firebase.ts file?
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
});

// Messaging handler
const messaging = firebase.messaging();

self.addEventListener("error", (e) => {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "SW_ERROR",
        message: e.message,
        error: e.error
      });
    }
  });
});


// Background messages ✔
self.addEventListener("fetch", () => {});

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background push:", payload);

  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "BACKGROUND_MESSAGE",
        payload,
      });
    }
  });

  const title = payload.data.title || "New Notification";
  const body = payload.data.body || "";
  const link = payload.data.link || "/notifications";

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { link },
  });
});

// On-click navigation ✔
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.link || "/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
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

// Let page know SW woke up
self.addEventListener("push", (e) => {
  // Tell the page "SW received a push event"
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({
        type: "SW_PUSH_EVENT",
        message: "Service worker received a push event",
      });
    }
  });
});
