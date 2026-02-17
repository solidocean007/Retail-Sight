/* eslint-disable no-undef */
const IMAGE_CACHE = "dg-image-cache-v3";
const OFFLINE_CACHE_NAME = "dg-offline-v3";
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
// ----------------------------------------------------
// IMAGE CACHE CONFIG
// ----------------------------------------------------

const IMAGE_PATTERNS = [
  /_800x800\.(jpg|jpeg|png|webp)$/i,
  /_600x600\.(jpg|jpeg|png|webp)$/i,
  /_1200x1200\.(jpg|jpeg|png|webp)$/i,
  /resized\.(jpg|jpeg|png|webp)$/i,
  /\.appspot\.com\/v0\/b\/retail-sight\.appspot\.com\/o\//i, // general bucket rule
];

// Utility to test URL against allowed image patterns
function isOptimizedImageRequest(url) {
  return IMAGE_PATTERNS.some((p) => p.test(url));
}

// ----------------------------------------------------
// FETCH EVENT — STALE-WHILE-REVALIDATE FOR IMAGES
// ----------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== "GET") return;

  // Only handle Firebase Storage images
  if (!isOptimizedImageRequest(url)) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(req);

      // Kick off background update immediately
      const fetchPromise = fetch(req)
        .then((resp) => {
          if (resp.ok) {
            cache.put(req, resp.clone());
          }
          return resp;
        })
        .catch(() => null);

      // Return cache FIRST if available (fastest)
      return cached || fetchPromise;
    })
  );
});

// ----------------------------------------------------
// CLEANUP OLD IMAGE CACHES
// ----------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("dg-image-cache") && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
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
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "New Notification";

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "";

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
