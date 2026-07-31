/**
 * UI module.
 * @module ui
 */

import {
    getCurrentSong, getCurrentIndex, getPlaylist, playSong,
    togglePlay, next, previous, toggleShuffle, toggleRepeat,
    setPlaybackSpeed, setVolume, toggleMute, seekTo, getDuration
} from './player.js';
import { renderSongList } from './playlist.js';
import { getFavorites, getHistory, clearFavorites, clearHistory, isFavorite, toggleFavorite } from './storage.js';
import { formatTime } from './utils.js';

let allSongs = [];
let currentView = 'home';

export function initUI(songs) {
    allSongs = songs;
    setupNavigation();
    setupPlayerControls();
    setupProgressBar();
    setupVolumeControl();
    setupLyricsToggle();
    setupSettingsButtons();
    setupNowPlayingBarFavorite();
    setupFeaturedBanner();
    renderHomeView();
    renderRecentView();
    renderPlaylistsView();
    navigateTo('home');
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            navigateTo(view);
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar')?.classList.remove('open');
            }
        });
    });
}

export function navigateTo(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });
    currentView = viewName;
    if (viewName === 'favorites') renderFavoritesView();
    else if (viewName === 'recent') renderRecentView();
}

function setupPlayerControls() {
    document.getElementById('btn-play')?.addEventListener('click', togglePlay);
    document.getElementById('btn-prev')?.addEventListener('click', previous);
    document.getElementById('btn-next')?.addEventListener('click', next);
    document.getElementById('btn-shuffle')?.addEventListener('click', toggleShuffle);
    document.getElementById('btn-repeat')?.addEventListener('click', toggleRepeat);
    document.getElementById('btn-speed')?.addEventListener('click', setPlaybackSpeed);
}

function setupProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const duration = getDuration();
        if (duration > 0) seekTo(percent * duration);
    });

    let isDragging = false;
    progressBar.addEventListener('mousedown', (e) => { isDragging = true; handleDrag(e); });
    document.addEventListener('mousemove', (e) => { if (isDragging) handleDrag(e); });
    document.addEventListener('mouseup', () => { isDragging = false; });
    progressBar.addEventListener('touchstart', (e) => { isDragging = true; handleDrag(e.touches[0]); });
    document.addEventListener('touchmove', (e) => { if (isDragging) handleDrag(e.touches[0]); });
    document.addEventListener('touchend', () => { isDragging = false; });

    function handleDrag(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const duration = getDuration();
        if (duration > 0) seekTo(percent * duration);
    }
}

function setupVolumeControl() {
    const volumeSlider = document.getElementById('volume-slider');
    const btnVolume = document.getElementById('btn-volume');
    volumeSlider?.addEventListener('input', () => setVolume(parseInt(volumeSlider.value)));
    btnVolume?.addEventListener('click', toggleMute);
}

function setupLyricsToggle() {
    document.getElementById('btn-lyrics')?.addEventListener('click', () => {
        import('./lyrics.js').then(m => m.toggleLyricsPanel());
    });
    document.getElementById('btn-close-lyrics')?.addEventListener('click', () => {
        import('./lyrics.js').then(m => m.closeLyricsPanel());
    });
}

function setupSettingsButtons() {
    document.getElementById('btn-clear-favorites')?.addEventListener('click', () => {
        if (confirm('Clear all favorites?')) { clearFavorites(); renderFavoritesView(); }
    });
    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        if (confirm('Clear listening history?')) { clearHistory(); renderRecentView(); }
    });
    document.getElementById('setting-volume')?.addEventListener('input', (e) => setVolume(parseInt(e.target.value)));
}

function setupNowPlayingBarFavorite() {
    const npbFav = document.getElementById('npb-favorite');
    if (npbFav) {
        npbFav.addEventListener('click', () => {
            const currentSong = getCurrentSong();
            if (currentSong) {
                const isNowFav = toggleFavorite(currentSong.id);
                npbFav.classList.toggle('active', isNowFav);
                const svg = npbFav.querySelector('svg');
                if (svg) svg.setAttribute('fill', isNowFav ? 'currentColor' : 'none');
                if (currentView === 'favorites') renderFavoritesView();
            }
        });
    }
}

function setupFeaturedBanner() {
    const banner = document.getElementById('featured-banner');
    const btnPlayBanner = document.getElementById('btn-play-banner');
    if (banner && allSongs.length > 0) {
        banner.addEventListener('click', (e) => {
            if (e.target.closest('#btn-play-banner')) return;
            playSong(0);
        });
    }
    btnPlayBanner?.addEventListener('click', () => {
        if (allSongs.length > 0) playSong(0);
    });
}

function renderHomeView() {
    const homeSongList = document.getElementById('home-song-list');
    if (homeSongList && allSongs.length > 0) {
        renderSongList(allSongs.slice(0, 10), homeSongList, { showIndex: true, showAlbum: true, showCover: true });
    }
    if (allSongs.length > 0) {
        const first = allSongs[0];
        document.getElementById('banner-title').textContent = first.title;
        document.getElementById('banner-subtitle').textContent = first.artist;
        document.getElementById('banner-cover').innerHTML = `<img src="${first.cover}" alt="${first.title}" style="width:100%;height:100%;object-fit:cover;">`;
    }
}

function renderFavoritesView() {
    const favIds = getFavorites();
    const favSongs = allSongs.filter(s => favIds.includes(s.id));
    const list = document.getElementById('favorites-list');
    const empty = document.getElementById('favorites-empty');
    const count = document.getElementById('favorites-count');
    if (count) count.textContent = `${favSongs.length} ${favSongs.length === 1 ? 'song' : 'songs'}`;
    if (empty) empty.style.display = favSongs.length === 0 ? 'flex' : 'none';
    if (list) {
        list.style.display = favSongs.length === 0 ? 'none' : '';
        renderSongList(favSongs, list, { showIndex: false, showAlbum: true, showCover: true });
    }
}

function renderRecentView() {
    const history = getHistory();
    const recentSongs = history.map(id => allSongs.find(s => s.id === id)).filter(s => s);
    const list = document.getElementById('recent-list');
    const empty = document.getElementById('recent-empty');
    const count = document.getElementById('recent-count');
    if (count) count.textContent = `${recentSongs.length} ${recentSongs.length === 1 ? 'song' : 'songs'}`;
    if (empty) empty.style.display = recentSongs.length === 0 ? 'flex' : 'none';
    if (list) {
        list.style.display = recentSongs.length === 0 ? 'none' : '';
        renderSongList(recentSongs, list, { showIndex: false, showAlbum: true, showCover: true });
    }
}

function renderPlaylistsView() {
    document.getElementById('playlists-empty').style.display = 'flex';
    document.getElementById('playlist-grid').style.display = 'none';
}

export function getCurrentView() { return currentView; }
