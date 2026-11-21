/* Service Worker — Ministry School
 * Le worker ne prend en charge que les assets visuels immuables.
 *
 * Les pages, les navigations Next.js, les Server Actions et les API restent
 * entièrement gérées par le navigateur. Les intercepter avec une stratégie
 * "network first" peut laisser un clic suspendu pendant plusieurs minutes sur
 * un réseau mobile instable, sans que le navigateur puisse reprendre la main.
 */

const CACHE_NAME = "ms-v4-static-only";

const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Installation : mise en cache des assets critiques
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Chaque fichier est mis en cache séparément : l'absence de l'un d'eux ne doit pas empêcher l'installation
      .then((cache) => Promise.all(STATIC_ASSETS.map((url) => cache.add(url).catch(() => undefined))))
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

// Fetch : seul le cache des assets visuels est pris en charge ici.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

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
  }
});
