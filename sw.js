// Pokédex Service Worker
// Implements a "cache-first" strategy for Pokémon images so repeat visits
// load instantly from local storage instead of re-downloading from Dropbox.
//
// IMPORTANT: if you ever replace/update an image at the same URL, bump the
// CACHE_NAME version below (e.g. 'pokedex-image-cache-v2') so browsers stop
// serving the old cached copy and fetch the new one instead.
const CACHE_NAME = 'pokedex-image-cache-v1';

self.addEventListener('install', (event) => {
    // Activate this service worker as soon as it finishes installing,
    // without waiting for old tabs to close.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Take control of any already-open page immediately.
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only ever cache simple GET requests.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isDropboxImage = url.hostname.includes('dropbox') || url.hostname.includes('dropboxusercontent');
    const isImageRequest = request.destination === 'image';

    if (isImageRequest || isDropboxImage) {
        event.respondWith(cacheFirst(request));
    }
});

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        // Dropbox doesn't send CORS headers for these direct-download links,
        // so responses come back "opaque" (status/body hidden from JS) —
        // they can still be cached and served to an <img> tag just fine.
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (err) {
        // Network failed and we have no cached copy — let it fail normally.
        throw err;
    }
}
