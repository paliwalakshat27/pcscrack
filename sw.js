const CACHE_NAME = 'pcscrack-cache-v3';

// Core assets to pre-cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/topic.html',
  '/syllabus.json',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Cache-First with Dynamic Network Fallback & Caching
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests or chrome-extensions
  if (event.request.method !== 'GET' || !requestUrl.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: false }).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache immediately
        return cachedResponse;
      }

      // If not in cache, fetch from network and dynamically store in cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Only return index.html if user navigates to the root navigation, NOT for every failed asset
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network error occurred', { status: 408 });
      });
    })
  );
});
