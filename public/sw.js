/* Service Worker — Ministry School
 * Stratégie "cache then network" pour les assets statiques,
 * réseau prioritaire pour les pages et API.
 */

const CACHE_NAME = "ms-v1";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/etna-free-font.otf",
];

// Installation : mise en cache des assets critiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch : réseau prioritaire, cache en fallback
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET et les API Supabase
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("supabase.co")
  ) {
    return;
  }

  // Fonts & images statiques : cache first
  const url = new URL(event.request.url);
  const isStatic =
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/landing/") ||
    url.pathname.startsWith("/pictos/") ||
    url.pathname.startsWith("/ministeres/");

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Pages & API : réseau d'abord, cache en fallback silencieux
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
