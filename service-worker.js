// ==========================================
// SERVICE WORKER – Melodify Music App
// ==========================================
const APP_VERSION = '1.2.0';               // ← Thay đổi mỗi lần deploy
const CACHE_NAME = `melodify-v${APP_VERSION}`;

// Các loại file
const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;
const AUDIO_EXTS = /\.(mp3|wav|ogg|flac|m4a)$/i;
const STATIC_EXTS = /\.(css|js)$/i;

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log('[SW] Install version:', APP_VERSION);
  // Không cache sẵn gì – skip waiting để activate ngay
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log('[SW] Activate version:', APP_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const acceptHeader = request.headers.get('accept') || '';

  // 1. HTML (navigation) → Network First
  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2. Manifest → Network First
  if (url.pathname.endsWith('manifest.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 3. Dữ liệu JSON thường xuyên thay đổi → Network Only
  if (url.pathname.match(/\/(music|playlist|config)\.json$/)) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 4. File nhạc → Network Only (không cache)
  if (url.pathname.startsWith('/music/') || AUDIO_EXTS.test(url.pathname)) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 5. CSS, JS → Stale While Revalidate
  if (STATIC_EXTS.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 6. Ảnh → Cache First
  if (IMAGE_EXTS.test(url.pathname) || url.pathname.startsWith('/covers/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 7. Còn lại → Network Only
  event.respondWith(networkOnly(request));
});

// ==================== CHIẾN LƯỢC ====================

// Network First – dùng cho HTML, Manifest
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Có thể cache lại để dùng offline (tuỳ chọn)
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 408 });
  }
}

// Stale While Revalidate – dùng cho CSS, JS
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request).then(networkResponse => {
    cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => {});

  return cachedResponse || networkPromise;
}

// Cache First – dùng cho ảnh
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return new Response('Image not available', { status: 404 });
  }
}

// Network Only – dùng cho JSON, nhạc
async function networkOnly(request) {
  return fetch(request);
}
