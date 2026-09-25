const CACHE_NAME = 'pcscrack-cache-v4';

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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // HTML Page Navigations (Back/Forward/Clicks)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return networkRes;
        })
        .catch(async () => {
          // Offline hone par exact page dhoondho (jaise topic.html?path=...)
          const cachedMatch = await caches.match(req, { ignoreSearch: false });
          if (cachedMatch) return cachedMatch;

          // Agar query match na ho toh basic topic.html ya index.html shell do
          if (url.pathname.includes('topic.html')) {
            return (await caches.match('/topic.html')) || caches.match('/index.html');
          }
          return caches.match('/index.html');
        })
    );
    return;
  }

  // JSON Chunks, Scripts, and CSS
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((networkRes) => {
          if (!networkRes || networkRes.status !== 200) return networkRes;
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(() => {
          // Offline JSON fallback
          return new Response(JSON.stringify({ error: "offline_cached" }), {
            headers: { "Content-Type": "application/json" }
          });
        });
    })
  );
});
