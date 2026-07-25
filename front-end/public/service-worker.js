/* eslint-disable no-undef */
// front-end/public/service-worker.js
const IMAGE_CACHE = "dg-image-cache-v3";
const OFFLINE_CACHE_NAME = "dg-offline-v3";
const OFFLINE_FALLBACK_PAGE = "/offline.html";

// -------------------------------------------------------
// 1. INSTALL — cache offline fallback
// -------------------------------------------------------
self.addEventListener("install", (event) => {
  // Activate immediately instead of waiting for all tabs/PWA instances
  // to close — critical for push fixes to reach devices on next refresh.
  self.skipWaiting();

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
// 4. PUSH HANDLER (raw Web Push — no Firebase SDK needed)
// -------------------------------------------------------
// FCM data-only messages arrive here as a JSON payload:
//   { data: { title, body, link, notificationId, ... }, from, ... }
// We handle the push event directly instead of importing
// firebase-messaging-compat from a CDN. This removes the CDN /
// version-mismatch failure mode that produced Chrome's blank
// fallback notification ("site updated in background") with no
// click data.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    console.error("SW push: could not parse payload", err);
  }

  const d = payload.data || {};
  const n = payload.notification || {};

  const title = n.title || d.title || "Displaygram";
  const body = n.body || d.body || "";
  const link = d.link || "/notifications";

  event.waitUntil(
    (async () => {
      // If the app is open and visible, hand the message to the page
      // (in-app toast) instead of a system notification. Skipping
      // showNotification is allowed when a visible client exists —
      // Chrome only shows its blank fallback when nothing is shown
      // AND no window is visible.
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const visibleClient = clientsArr.find(
        (c) =>
          c.visibilityState === "visible" &&
          c.url.includes(self.location.origin)
      );

      if (visibleClient) {
        visibleClient.postMessage({ type: "FOREGROUND_PUSH", payload });
        return;
      }

      // Otherwise ALWAYS show a notification: the push subscription is
      // userVisibleOnly, so skipping showNotification triggers the
      // browser's generic blank fallback.
      return self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        // tag dedupes if FCM redelivers the same notification
        tag: d.notificationId || undefined,
        data: {
          link,
          notificationId: d.notificationId || "",
          type: d.type || "",
          postId: d.postId || "",
          goalId: d.goalId || "",
        },
      });
    })()
  );
});

// -------------------------------------------------------
// 5. NOTIFICATION CLICK HANDLING
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
