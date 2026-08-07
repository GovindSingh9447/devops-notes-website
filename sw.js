/* Service worker — app shell + recently opened PDF cache */
const STATIC_CACHE = 'devops-notes-static-v2';
const PDF_CACHE = 'devops-notes-pdfs-v1';
const MAX_CACHED_PDFS = 12;

const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './toc-styles.css',
    './script.js',
    './config.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== PDF_CACHE)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

async function trimPdfCache(cache) {
    const keys = await cache.keys();
    if (keys.length <= MAX_CACHED_PDFS) return;
    const overflow = keys.length - MAX_CACHED_PDFS;
    for (let i = 0; i < overflow; i += 1) {
        await cache.delete(keys[i]);
    }
}

self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'CACHE_PDF' && data.url) {
        event.waitUntil(
            caches.open(PDF_CACHE).then(async (cache) => {
                try {
                    await cache.add(data.url);
                    await trimPdfCache(cache);
                } catch (err) {
                    // Ignore opaque / CORS failures; raw GitHub usually allows GET cache
                    console.warn('[sw] PDF cache failed', err);
                }
            })
        );
    }
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Cache-first for PDF raw content
    if (url.hostname === 'raw.githubusercontent.com' && url.pathname.toLowerCase().endsWith('.pdf')) {
        event.respondWith(
            caches.open(PDF_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const response = await fetch(request);
                    if (response && response.ok) {
                        cache.put(request, response.clone());
                        trimPdfCache(cache);
                    }
                    return response;
                } catch (err) {
                    return cached || Response.error();
                }
            })
        );
        return;
    }

    // Same-origin: stale-while-revalidate for app assets
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const network = fetch(request)
                    .then((response) => {
                        if (response && response.ok) {
                            const copy = response.clone();
                            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || network;
            })
        );
    }
});
