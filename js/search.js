/**
 * Search module for real-time song filtering.
 * @module search
 */

import { debounce } from './utils.js';
import { renderSongList } from './playlist.js';

/** @type {Array} */
let allSongs = [];

/** @type {HTMLElement} */
let searchInput;

/** @type {HTMLElement} */
let clearButton;

/** @type {HTMLElement} */
let songListContainer;

/** @type {HTMLElement} */
let noResultsEl;

/** @type {HTMLElement} */
let songCountEl;

/**
 * Initialize search functionality.
 * @param {Array} songs - All songs from music.json
 */
export function initSearch(songs) {
    allSongs = songs;
    searchInput = document.getElementById('search-input');
    clearButton = document.getElementById('btn-clear-search');
    songListContainer = document.getElementById('all-songs-list');
    noResultsEl = document.getElementById('no-results');
    songCountEl = document.getElementById('all-songs-count');
    
    if (!searchInput) return;
    
    const debouncedSearch = debounce(performSearch, 200);
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearButton.style.display = query ? 'flex' : 'none';
        debouncedSearch(query);
    });
    
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        performSearch('');
        searchInput.focus();
    });
    
    // Initial render
    performSearch('');
}

/**
 * Perform search and render results.
 * @param {string} query - Search query
 */
function performSearch(query) {
    let results;
    
    if (!query) {
        results = allSongs;
    } else {
        const lowerQuery = query.toLowerCase();
        results = allSongs.filter(song => {
            return (
                song.title.toLowerCase().includes(lowerQuery) ||
                song.artist.toLowerCase().includes(lowerQuery) ||
                (song.album && song.album.toLowerCase().includes(lowerQuery))
            );
        });
    }
    
    // Update count
    if (songCountEl) {
        songCountEl.textContent = `${results.length} ${results.length === 1 ? 'song' : 'songs'}`;
    }
    
    // Show/hide no results
    if (noResultsEl) {
        noResultsEl.style.display = results.length === 0 && query ? 'flex' : 'none';
    }
    
    // Show/hide song list
    if (songListContainer) {
        songListContainer.style.display = results.length === 0 && query ? 'none' : '';
    }
    
    // Render
    renderSongList(results, songListContainer, { showIndex: true, showAlbum: true, showCover: true });
}

/**
 * Get current search query.
 * @returns {string} Current search query
 */
export function getSearchQuery() {
    return searchInput ? searchInput.value.trim() : '';
}

/**
 * Clear search.
 */
export function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        clearButton.style.display = 'none';
        performSearch('');
    }
}
