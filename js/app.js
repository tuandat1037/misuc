import { initPlayer, onSongChange } from './player.js';
import { initSearch } from './search.js';
import { initFavorites, renderFavorites } from './favorite.js';
import { initUI, getCurrentView } from './ui.js';
import { initLyrics, loadLyrics } from './lyrics.js';

async function init() {
    try {
        const musicJsonUrl = new URL('../data/music.json', import.meta.url);
        const response = await fetch(musicJsonUrl);
        if (!response.ok) throw new Error(`Không tìm thấy file music.json (HTTP ${response.status})`);
        const songs = await response.json();

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
