/* eslint-disable no-undef */
const IMAGE_CACHE = "dg-image-cache-v1";
const OFFLINE_CACHE_NAME = "dg-offline-v1";
const OFFLINE_FALLBACK_PAGE = "/offline.html";

// -------------------------------------------------------
// 1. INSTALL — cache offline fallback
// -------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME).then((cache) => cache.addAll([
      OFFLINE_FALLBACK_PAGE
    ]))
  );
});

// -------------------------------------------------------
// 2. ACTIVATE — cleanup + claim clients
// -------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== OFFLINE_CACHE_NAME && key !== IMAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// -------------------------------------------------------
// 3. FETCH — image caching only (network-first refresh)
// -------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only cache GET requests
  if (req.method !== "GET") return;

  const url = req.url;

  // Detect images (local or Firebase Storage)
  const isImage =
    url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ||
    url.includes("firebasestorage.googleapis.com");

  if (!isImage) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      // Try cache first
      const cached = await cache.match(req);
      if (cached) {
        // Update cache in background
        event.waitUntil(
          fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
            })
            .catch(() => {})
        );
        return cached;
      }

      // No cache → go to network
      try {
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        // No offline image fallback — return empty 404
        return new Response("", { status: 404 });
      }
    })
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
}

// Initialize Firebase in SW
if (self.firebase?.initializeApp) {
  self.firebase.initializeApp({
    apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
    authDomain: "retail-sight.firebaseapp.com",
    projectId: "retail-sight",
    messagingSenderId: "484872165965",
    appId: "1:484872165965:web:feb232cfe100a4b9105a04",
  });

  const messaging = self.firebase.messaging();

  // -------------------------------------------------------
  // 5. BACKGROUND MESSAGE HANDLER
  // -------------------------------------------------------
  messaging.onBackgroundMessage((payload) => {
    const hasNative =
      payload.notification || (payload.data && payload.data.title);

    if (hasNative) return;

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
  // 6. NOTIFICATION CLICK HANDLING
  // -------------------------------------------------------
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const target = event.notification.data?.link || "/notifications";

    event.waitUntil(
      self.clients
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
          return self.clients.openWindow(target);
        })
    );
  });
} else {
  console.warn("Firebase Messaging could not initialize in SW.");
}
