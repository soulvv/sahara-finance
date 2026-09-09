/*
 * Sahara Finance service worker — hand-rolled, zero dependencies.
 *
 * Strategy:
 * - Navigations: network-first, fall back to the cached app shell (SPA) offline.
 * - Hashed static assets (/assets/*) and local images: cache-first (safe,
 *   because Vite asset filenames are content-hashed).
 * - Never touches cross-origin requests or the dev-only /__manus__ endpoints.
 */
const CACHE = "sahara-v1";

const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/images/hero-illustration.jpg",
  "/images/payment-success.jpg",
  "/images/trust-pattern.jpg",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/__manus__")) return;
  // Security & Freshness: Never cache sensitive API calls
  if (url.pathname.startsWith("/api/")) return;

  // App navigations: try the network, fall back to the cached shell offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put("/index.html", copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then(cached => cached || caches.match("/"))
        )
    );
    return;
  }

  // Static assets: cache-first (content-hashed filenames are immutable)
  if (url.pathname.startsWith("/assets/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        cached =>
          cached ||
          fetch(req).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(cache => cache.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
