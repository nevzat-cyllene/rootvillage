const CACHE = "sop-shell-v3";
const SHELL = ["/", "/villages", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache App Router / RSC / auth — stale family pages freeze the UI.
  const isDocument = request.mode === "navigate";
  const isRsc =
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/auth/");
  if (isDocument || isRsc) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first only for static icons / manifest
  if (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Network-first for everything else; fall back to cache offline
  event.respondWith(
    fetch(request)
      .then((res) => res)
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
