/* eslint-disable no-undef */

// -------------------------------------------------------
// 0. BASIC CONFIG
// -------------------------------------------------------
const OFFLINE_CACHE_NAME = "dg-offline-v1";
const OFFLINE_FALLBACK_PAGE = "/offline.html";

// -------------------------------------------------------
// 1. INSTALL – cache offline fallback
// -------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_FALLBACK_PAGE]);
    })
  );
});

// -------------------------------------------------------
// 2. ACTIVATE – claim clients & clean old caches
// -------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old offline caches if you bump OFFLINE_CACHE_NAME
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== OFFLINE_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
      // Ensure this SW controls open clients
      self.clients.claim(),
    ])
  );
});

// -------------------------------------------------------
// 3. FETCH – network-first with safe offline fallback
//      - Handles Safari correctly
//      - Does NOT break Firestore/Axios when online
// -------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; let others (POST, etc.) go straight through
  if (req.method !== "GET") {
    return;
  }

  const isNavigateRequest =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNavigateRequest) {
    // HTML navigation (page loads) → network-first, fallback to offline.html
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_FALLBACK_PAGE))
    );
    return;
  }

  // For other GET requests (images, CSS, JS, API GETs)
  // → try network, fallback to any cached match if available
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// -------------------------------------------------------
// 4. FIREBASE MESSAGING SETUP
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

if (self.firebase?.initializeApp) {
  self.firebase.initializeApp({
    apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
    authDomain: "retail-sight.firebaseapp.com",
    projectId: "retail-sight",
    messagingSenderId: "484872165965",
    appId: "1:484872165965:web:feb232cfe100a4b9105a04",
  });

  const messaging = self.firebase.messaging();

  // -----------------------------------------------------
  // 5. BACKGROUND MESSAGE HANDLER
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // 6. NOTIFICATION CLICK HANDLING
  // -----------------------------------------------------
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const target = event.notification.data?.link || "/notifications";

    event.waitUntil(
      self.clients
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
          return self.clients.openWindow(target);
        })
    );
  });
} else {
  console.warn("Firebase Messaging could not initialize in SW.");
}
