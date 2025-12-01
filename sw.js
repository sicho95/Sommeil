// Change le nom de cache pour forcer la mise à jour
const CACHE_NAME = 'suivi-bebe-v3';

const urlsToCache = [
  '/',
  'index.html',
  'css/main.css',
  'app.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

// Installe le nouveau cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Force l'activation immédiate
  );
});

// Supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// Sert depuis le cache puis réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
