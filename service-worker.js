const CACHE_VERSION = 'v1.2.0';
const STATIC_CACHE = `melodify-static-${CACHE_VERSION}`;
const MUSIC_CACHE = `melodify-music-${CACHE_VERSION}`;
const IMAGE_CACHE = `melodify-images-${CACHE_VERSION}`;

// Các file tĩnh cần cache khi cài đặt
const STATIC_RESOURCES = [
    './',
    './index.html',
    './manifest.json',
    './css/variables.css',
    './css/layout.css',
    './css/style.css',
    './css/responsive.css',
    './css/animations.css',
    './js/app.js',
    './js/player.js',
    './js/playlist.js',
    './js/search.js',
    './js/favorite.js',
    './js/storage.js',
    './js/lyrics.js',
    './js/ui.js',
    './js/utils.js',
    './data/music.json',
];

// Cài đặt Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_RESOURCES))
            .then(() => self.skipWaiting())
    );
});

// Kích hoạt - xóa cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('melodify-') && name !== STATIC_CACHE && name !== MUSIC_CACHE && name !== IMAGE_CACHE)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Chiến lược fetch: Ưu tiên network, fallback về cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Chỉ xử lý request cùng origin
    if (url.origin !== self.location.origin) return;

    // File nhạc: network first
    if (url.pathname.endsWith('.mp3') || url.pathname.startsWith('/music/')) {
        event.respondWith(networkFirst(request, MUSIC_CACHE));
        return;
    }

    // Ảnh: network first
    if (url.pathname.startsWith('/covers/') || url.pathname.startsWith('/assets/')) {
        event.respondWith(networkFirst(request, IMAGE_CACHE));
        return;
    }

    // Lyrics: network first
    if (url.pathname.startsWith('/lyrics/')) {
        event.respondWith(networkFirst(request, STATIC_CACHE));
        return;
    }

    // Các file tĩnh khác: network first
    event.respondWith(networkFirst(request, STATIC_CACHE));
});

// Hàm network first: lấy từ mạng trước, nếu lỗi thì lấy cache
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
    }
}
