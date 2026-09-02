/**
 * IFFA service worker (v0.9, Phase U) — offline snapshot, never "live".
 *
 * Strategy:
 *  - navigations: network-first. On success the page is cached (so the last
 *    successful snapshot survives going offline) AND the fetch time is stored.
 *    On failure: the cached page for that URL, then the cached home page, then
 *    a generic offline notice. A cached page always renders its own "last
 *    fetched at" timestamp and the app shows an unmistakable OFFLINE — NOT LIVE
 *    banner, so cached data never passes for live.
 *  - static assets (/_next/static, fonts, icons): cache-first (content-hashed).
 *
 * No background sync, no push. Bump CACHE to invalidate.
 */
const CACHE = "iffa-v0.9";
const OFFLINE_URL = "./offline.html";
const HOME_URL = "./";
const META_URL = "./__iffa_sw_meta"; // synthetic key holding the last-fetch time

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([OFFLINE_URL, HOME_URL]).catch(() => c.add(OFFLINE_URL).catch(() => {})))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

async function recordFetchTime() {
  try {
    const c = await caches.open(CACHE);
    await c.put(META_URL, new Response(JSON.stringify({ at: new Date().toISOString() }), { headers: { "content-type": "application/json" } }));
  } catch {
    /* ignore */
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "iffa:last-fetch") {
    caches
      .open(CACHE)
      .then((c) => c.match(META_URL))
      .then((r) => (r ? r.json() : null))
      .then((v) => event.source && event.source.postMessage({ type: "iffa:last-fetch", at: v && v.at }))
      .catch(() => event.source && event.source.postMessage({ type: "iffa:last-fetch", at: null }));
  }
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
          recordFetchTime();
          return resp;
        })
        .catch(() =>
          caches
            .match(request)
            .then((c) => c || caches.match(HOME_URL))
            .then((c) => c || caches.match(OFFLINE_URL)),
        ),
    );
  }
});
