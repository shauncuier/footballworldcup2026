// Service worker: cache the app shell for instant repeat loads and offline use.
// API responses are NOT cached here — live data always comes from the network
// so scores stay fresh; the SW only speeds up the static shell.
const CACHE = "wc2026-shell-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache cross-origin API calls (ESPN, worldcup26, open-meteo, GA, abacus).
  if (url.origin !== self.location.origin) return;

  // Bundled JS/CSS/data: cache-first (hashed filenames, safe to keep).
  if (/\.(?:js|css|json|png|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell when offline.
  event.respondWith(
    fetch(req).catch(() => caches.match("./index.html"))
  );
});
