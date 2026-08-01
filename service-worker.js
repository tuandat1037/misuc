// ==========================================
// SERVICE WORKER – Melodify Music App
// ==========================================
const APP_VERSION = '1.2.0'; // ← Thay đổi mỗi lần deploy
const CACHE_NAME = `melodify-v${APP_VERSION}`;

// Các loại file
const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;
const AUDIO_EXTS = /\.(mp3|wav|ogg|flac|m4a)$/i;
const STATIC_EXTS = /\.(css|js)$/i;

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log('[SW] Install version:', APP_VERSION);
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
    .then(() => {
      // Gửi version cho tất cả client
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
        });
      });
    })
  );
});

// ==================== MESSAGE ====================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'SW_VERSION', version: APP_VERSION });
    }
  }
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

  // 3. Dữ liệu JSON → Network Only (không cache)
  if (url.pathname.match(/\/(music|playlist|config)\.json$/)) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 4. File nhạc → Network Only
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
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 408 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request).then(networkResponse => {
    cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => {});

  return cachedResponse || networkPromise;
}

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

async function networkOnly(request) {
  return fetch(request);
}
