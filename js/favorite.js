/**
 * Favorites module.
 * Manages favorite songs display and interactions.
 * @module favorite
 */

import { getFavorites, isFavorite, toggleFavorite } from './storage.js';
import { renderSongList } from './playlist.js';

/** @type {Array} */
let allSongs = [];

/**
 * Initialize favorites.
 * @param {Array} songs - All songs from music.json
 */
export function initFavorites(songs) {
    allSongs = songs;
    renderFavorites();
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'melodify_favorites') {
            renderFavorites();
        }
    });
}

/**
 * Render favorites list.
 */
export function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    const favoritesEmpty = document.getElementById('favorites-empty');
    const favoritesCount = document.getElementById('favorites-count');
    
    if (!favoritesList) return;
    
    const favIds = getFavorites();
    const favSongs = allSongs.filter(song => favIds.includes(song.id));
    
    // Update count
    if (favoritesCount) {
        favoritesCount.textContent = `${favSongs.length} ${favSongs.length === 1 ? 'song' : 'songs'}`;
    }
    
    // Show/hide empty state
    if (favoritesEmpty) {
        favoritesEmpty.style.display = favSongs.length === 0 ? 'flex' : 'none';
    }
    
    // Show/hide list
    favoritesList.style.display = favSongs.length === 0 ? 'none' : '';
    
    // Render
    renderSongList(favSongs, favoritesList, { showIndex: false, showAlbum: true, showCover: true });
}

/**
 * Check if a song is favorited.
 * @param {number} songId - Song ID
 * @returns {boolean}
 */
export function checkFavorite(songId) {
    return isFavorite(songId);
}

/**
 * Toggle favorite for a song.
 * @param {number} songId - Song ID
 * @returns {boolean} New favorite state
 */
export function toggleFav(songId) {
    const result = toggleFavorite(songId);
    renderFavorites();
    return result;
}
