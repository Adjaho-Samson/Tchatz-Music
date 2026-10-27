/* Tchatz Music PWA — cache uniquement l'interface, jamais les morceaux personnels. */
const CACHE_PREFIX = 'tchatz-music-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const SHELL_FILES = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];
const SHELL_PATHS = new Set(SHELL_FILES.map((path) => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.destination === 'audio' || request.destination === 'video') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedIndex = await caches.match(new URL('./index.html', self.registration.scope).href);
        if (cachedIndex) return cachedIndex;
        const offline = await caches.match(new URL('./offline.html', self.registration.scope).href);
        return offline || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      })
    );
    return;
  }

  if (!SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
