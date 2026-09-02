/**
 * IFFA service worker (v0.8, Phase N) — minimal offline shell.
 *
 * Strategy:
 *  - navigations: network-first, fall back to the cached page, then to a
 *    generic offline notice. The page itself always shows its own "last
 *    fetched at" timestamp, so a cached page never pretends to be live.
 *  - static assets (/_next/static, fonts, icons): cache-first (they are
 *    content-hashed, so a cached copy is always correct).
 *
 * No background sync, no push. Bump CACHE to invalidate.
 */
const CACHE = "iffa-v0.8";
const OFFLINE_URL = "./offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isAsset = /\/_next\/static\/|\.(?:css|js|woff2?|ico|png|svg|webmanifest)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return resp;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(OFFLINE_URL))),
    );
  }
});
