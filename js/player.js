import { formatTime, shuffleArray } from './utils.js';
import {
    getSettings, saveSettings, saveCurrentState, addToHistory,
    saveQueue, getQueue, getCurrentState
} from './storage.js';
import { updateLyrics } from './lyrics.js';

let audio;
let playlist = [];
let currentIndex = -1;
let settings;
let isShuffled = false;
let shuffledPlaylist = [];
let originalPlaylist = [];

let onSongChangeCallback = null;
let onTimeUpdateCallback = null;
let onStateChangeCallback = null;

export function initPlayer(songs) {
    audio = document.getElementById('audio-player');
    settings = getSettings();

    const savedQueue = getQueue();
    if (savedQueue.queue.length > 0) {
        playlist = savedQueue.queue;
        currentIndex = savedQueue.currentIndex;
        originalPlaylist = [...playlist];
    } else {
        playlist = [...songs];
        originalPlaylist = [...songs];
        currentIndex = 0;
    }

    audio.volume = settings.volume / 100;
    audio.playbackRate = settings.playbackSpeed;
    if (settings.shuffle) enableShuffle(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    const lastState = getCurrentState();
    if (lastState.songId && songs.find(s => s.id === lastState.songId)) {
        const idx = playlist.findIndex(s => s.id === lastState.songId);
        if (idx >= 0) {
            currentIndex = idx;
            loadSong(playlist[currentIndex]);
            audio.currentTime = lastState.currentTime;
        }
    }

    setupMediaSession();
    updatePlayerUI();
    dispatchPlaylistUpdate();
}

function loadSong(song) {
    if (!song) return;
    audio.src = song.audio;
    audio.load();
    updateMediaSession(song);
}

export function play() {
    if (audio.src && audio.paused) {
        audio.play().catch(e => console.warn('Playback failed:', e));
    } else if (!audio.src && playlist.length > 0) {
        loadSong(playlist[currentIndex]);
        audio.play().catch(e => console.warn('Playback failed:', e));
    }
}

export function pause() { audio.pause(); }
export function togglePlay() { audio.paused ? play() : pause(); }

export function playSong(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const song = playlist[currentIndex];
    loadSong(song);
    play();
    addToHistory(song.id);
    saveCurrentState(song.id, 0);
    saveQueue(playlist, currentIndex);
    updatePlayerUI();
    dispatchPlaylistUpdate();
    if (onSongChangeCallback) onSongChangeCallback(song);
}

export function playSongById(songId) {
    const index = playlist.findIndex(s => s.id === songId);
    if (index >= 0) playSong(index);
}

export function next() {
    if (playlist.length === 0) return;
    if (settings.repeat === 'one') { audio.currentTime = 0; play(); return; }
    let nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
        if (settings.repeat === 'all') nextIndex = 0;
        else { pause(); return; }
    }
    playSong(nextIndex);
}

export function previous() {
    if (playlist.length === 0) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    playSong(prevIndex);
}

export function seekTo(time) { if (audio.src) audio.currentTime = time; }

export function setVolume(volume) {
    const vol = Math.max(0, Math.min(100, volume));
    audio.volume = vol / 100;
    settings.volume = vol;
    saveSettings({ volume: vol });
    updateVolumeUI();
}

export function toggleMute() {
    audio.volume = audio.volume > 0 ? 0 : settings.volume / 100;
    updateVolumeUI();
}

export function toggleShuffle() { isShuffled ? disableShuffle() : enableShuffle(true); }
function enableShuffle(savePref = true) {
    isShuffled = true;
    originalPlaylist = [...playlist];
    const currentSong = playlist[currentIndex];
    const remaining = playlist.filter((_, i) => i !== currentIndex);
    shuffledPlaylist = [currentSong, ...shuffleArray(remaining)];
    playlist = shuffledPlaylist;
    currentIndex = 0;
    if (savePref) saveSettings({ shuffle: true });
    updateShuffleUI();
}
function disableShuffle() {
    isShuffled = false;
    const currentSong = playlist[currentIndex];
    playlist = [...originalPlaylist];
    currentIndex = playlist.findIndex(s => s.id === currentSong?.id);
    if (currentIndex < 0) currentIndex = 0;
    saveSettings({ shuffle: false });
    updateShuffleUI();
}

export function toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const idx = modes.indexOf(settings.repeat);
    settings.repeat = modes[(idx + 1) % 3];
    saveSettings({ repeat: settings.repeat });
    updateRepeatUI();
}

export function setPlaybackSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = speeds.indexOf(settings.playbackSpeed);
    settings.playbackSpeed = speeds[(idx + 1) % speeds.length];
    audio.playbackRate = settings.playbackSpeed;
    saveSettings({ playbackSpeed: settings.playbackSpeed });
    updateSpeedUI();
}

// Event handlers
function handleTimeUpdate() {
    const currentTime = audio.currentTime;
    const duration = audio.duration || 0;
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('npb-current');
    if (progressFill && duration > 0) progressFill.style.width = `${(currentTime / duration) * 100}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
    if (Math.floor(currentTime) % 5 === 0 && playlist[currentIndex]) {
        saveCurrentState(playlist[currentIndex].id, currentTime);
    }
    if (onTimeUpdateCallback) onTimeUpdateCallback(currentTime, duration);
    updateLyrics(currentTime);
}

function handleLoadedMetadata() {
    const durationEl = document.getElementById('npb-duration');
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
}

function handleEnded() { next(); }
function handlePlay() {
    updatePlayButtonUI(true);
    if (onStateChangeCallback) onStateChangeCallback('playing');
}
function handlePause() {
    updatePlayButtonUI(false);
    if (onStateChangeCallback) onStateChangeCallback('paused');
}
function handleError() {
    console.warn('Audio playback error:', audio.error);
    setTimeout(() => next(), 1000);
}

// Media Session API
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) seekTo(details.seekTime);
    });
}
function updateMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title, artist: song.artist, album: song.album || '',
        artwork: [{ src: song.cover, sizes: '512x512', type: 'image/jpeg' }]
    });
}

// UI Updates
function updatePlayerUI() {
    const song = playlist[currentIndex];
    if (!song) return;
    const coverImg = document.getElementById('npb-cover-img');
    const titleEl = document.getElementById('npb-title');
    const artistEl = document.getElementById('npb-artist');
    const durationEl = document.getElementById('npb-duration');
    const nowPlayingBar = document.getElementById('now-playing-bar');
    if (nowPlayingBar) nowPlayingBar.style.display = 'flex';
    if (coverImg) coverImg.src = song.cover;
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    if (durationEl) durationEl.textContent = '0:00';
    updatePlayButtonUI(!audio.paused);
    updateVolumeUI();
    updateShuffleUI();
    updateRepeatUI();
    updateSpeedUI();
    dispatchFavoriteUIUpdate(song.id);
}

function updatePlayButtonUI(isPlaying) {
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    if (iconPlay) iconPlay.style.display = isPlaying ? 'none' : 'block';
    if (iconPause) iconPause.style.display = isPlaying ? 'block' : 'none';
}

function updateVolumeUI() {
    const volumeSlider = document.getElementById('volume-slider');
    const iconVolume = document.getElementById('icon-volume');
    const iconMute = document.getElementById('icon-mute');
    if (volumeSlider) volumeSlider.value = audio.volume * 100;
    if (iconVolume) iconVolume.style.display = audio.volume > 0 ? 'block' : 'none';
    if (iconMute) iconMute.style.display = audio.volume === 0 ? 'block' : 'none';
}

function updateShuffleUI() {
    const btn = document.getElementById('btn-shuffle');
    if (btn) btn.style.color = isShuffled ? 'var(--color-primary)' : '';
}

function updateRepeatUI() {
    const btn = document.getElementById('btn-repeat');
    if (!btn) return;
    if (settings.repeat === 'one') {
        btn.style.color = 'var(--color-primary)';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8H12V11L15 8L12 5V8H2Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8H4V5L1 8L4 11V8H14Z" stroke-linecap="round" stroke-linejoin="round"/><text x="8" y="15" text-anchor="middle" font-size="8" fill="currentColor" stroke="none">1</text></svg>`;
    } else if (settings.repeat === 'all') {
        btn.style.color = 'var(--color-primary)';
    } else {
        btn.style.color = '';
    }
}

function updateSpeedUI() {
    const label = document.getElementById('speed-label');
    if (label) label.textContent = `${settings.playbackSpeed}x`;
}

function dispatchPlaylistUpdate() {
    window.dispatchEvent(new CustomEvent('playlistUpdate'));
}
function dispatchFavoriteUIUpdate(songId) {
    window.dispatchEvent(new CustomEvent('updateFavoriteUI', { detail: { songId } }));
}

// Getters
export function getCurrentSong() { return playlist[currentIndex] || null; }
export function getCurrentIndex() { return currentIndex; }
export function getPlaylist() { return [...playlist]; }
export function isPlaying() { return !audio.paused; }
export function getCurrentTime() { return audio.currentTime; }
export function getDuration() { return audio.duration || 0; }
export function getPlayerSettings() { return { ...settings }; }

// Callbacks
export function onSongChange(callback) { onSongChangeCallback = callback; }
export function onTimeUpdate(callback) { onTimeUpdateCallback = callback; }
export function onStateChange(callback) { onStateChangeCallback = callback; }

// Set playlist (for search results, etc.)
export function setPlaylist(songs, startIndex = 0) {
    playlist = [...songs];
    originalPlaylist = [...songs];
    currentIndex = startIndex;
    isShuffled = false;
    saveSettings({ shuffle: false });
    updateShuffleUI();
}
