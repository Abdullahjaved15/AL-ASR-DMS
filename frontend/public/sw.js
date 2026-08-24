// AL ASR Motors PWA Service Worker
const CACHE_NAME = 'alasr-motors-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle dynamic API requests and app assets
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
