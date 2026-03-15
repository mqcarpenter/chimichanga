const CACHE_NAME = 'wrangler-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', event => {
    // Basic network-first strategy for API, cache-first for static
    if (event.request.url.includes('api.php') || event.request.url.includes('googleapis.com')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    } else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
