import { initPlayer, onSongChange } from './player.js';
import { initSearch } from './search.js';
import { initFavorites, renderFavorites } from './favorite.js';
import { initUI, getCurrentView } from './ui.js';
import { initLyrics, loadLyrics } from './lyrics.js';

// ==========================================
// APP VERSION – Phải giống service-worker.js
// ==========================================
const APP_VERSION = '1.2.0';

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    checkAndUpdateSW();
  });
}

async function checkAndUpdateSW() {
  try {
    // Lấy URL tuyệt đối cho service worker (cùng thư mục gốc)
    const swUrl = new URL('../service-worker.js', import.meta.url);
    
    const registration = await navigator.serviceWorker.getRegistration(swUrl);
    
    if (registration) {
      const activeWorker = registration.active;
      if (activeWorker) {
        // Hỏi version của SW hiện tại
        const swVersion = await getSWVersion(activeWorker);
        console.log('Current SW version:', swVersion, 'App version:', APP_VERSION);
        
        if (swVersion !== APP_VERSION) {
          console.log('SW version mismatch, unregistering old SW...');
          await registration.unregister();
          // Xóa tất cả cache
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          // Reload để tải SW mới
          window.location.reload();
          return;
        }
      }
    }
    
    // Đăng ký SW mới (hoặc SW hiện tại đã đúng version)
    const newRegistration = await navigator.serviceWorker.register(swUrl);
    console.log('SW registered:', newRegistration);
    
    newRegistration.addEventListener('updatefound', () => {
      const newWorker = newRegistration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New SW installed, will activate soon.');
        }
      });
    });
    
    // Lắng nghe message từ SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_VERSION') {
        if (event.data.version !== APP_VERSION) {
          console.log('Version mismatch from SW message, reloading...');
          window.location.reload();
        }
      }
    });
    
    // Khi controller thay đổi (SW mới claim), reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Controller changed, reloading...');
      window.location.reload();
    });
    
  } catch (error) {
    console.error('SW setup failed:', error);
  }
}

function getSWVersion(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data && event.data.type === 'SW_VERSION') {
        resolve(event.data.version);
      }
    };
    worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    setTimeout(() => resolve(null), 1000);
  });
}

// ==================== FETCH HELPERS ====================
/**
 * Fetch file JSON với version query và cache: no-store
 * Đảm bảo luôn lấy dữ liệu mới nhất từ server
 * @param {string} path - Đường dẫn tương đối từ thư mục gốc (ví dụ: 'data/music.json')
 */
async function fetchJSON(path) {
  // Tạo URL tuyệt đối từ đường dẫn tương đối so với thư mục gốc
  const base = new URL('..', import.meta.url); // Thư mục gốc (parent của js/)
  const url = new URL(path, base);
  url.searchParams.set('v', APP_VERSION);
  
  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

// ==================== INIT ====================
async function init() {
    try {
        // Sử dụng fetchJSON thay vì fetch trực tiếp để tránh cache
        const songs = await fetchJSON('data/music.json');

        if (!Array.isArray(songs) || songs.length === 0) {
            throw new Error('File music.json rỗng hoặc không đúng định dạng mảng.');
        }

        for (const song of songs) {
            if (!song.title || !song.artist || !song.audio || !song.cover) {
                throw new Error(`Bài hát "${song.title || 'không tên'}" thiếu trường bắt buộc.`);
            }
        }

        initLyrics();
        initPlayer(songs);
        initUI(songs);
        initSearch(songs);
        initFavorites(songs);

        onSongChange((song) => {
            if (song.lyrics) loadLyrics(song.lyrics);
            else loadLyrics(null);
            if (getCurrentView() === 'favorites') renderFavorites();
        });

        console.log(`Melodify đã sẵn sàng với ${songs.length} bài hát.`);
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;color:#F5F7FA;font-family:Inter,sans-serif;background:#0F1115;padding:20px;text-align:center;">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#EF4444" stroke-width="1.5">
                    <circle cx="24" cy="24" r="20"/>
                    <line x1="24" y1="14" x2="24" y2="28" stroke-linecap="round"/>
                    <circle cx="24" cy="32" r="1.5" fill="#EF4444" stroke="none"/>
                </svg>
                <p style="font-size:18px;font-weight:500;color:#F5F7FA;">Không thể tải dữ liệu nhạc</p>
                <p style="font-size:14px;color:#9CA3AF;max-width:500px;">${error.message}</p>
                <div style="margin-top:20px;padding:16px;background:#1B202A;border-radius:8px;text-align:left;font-size:13px;color:#9CA3AF;max-width:500px;width:100%;">
                    <p style="font-weight:600;color:#F5F7FA;margin-bottom:8px;">Hướng dẫn khắc phục:</p>
                    <ul style="padding-left:20px;line-height:1.8;">
                        <li>Chạy qua <strong>XAMPP</strong> (http://localhost/tên-thư-mục/)</li>
                        <li>Kiểm tra file <code>/data/music.json</code> tồn tại và đúng định dạng JSON</li>
                        <li>Đảm bảo các file nhạc/ảnh trong <code>music.json</code> có đường dẫn chính xác</li>
                        <li>Mở Console (F12) để xem chi tiết lỗi</li>
                    </ul>
                </div>
            </div>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
