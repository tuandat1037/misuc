/**
 * LocalStorage management for the music player.
 * Handles favorites, history, and settings persistence.
 * @module storage
 */

const STORAGE_KEYS = {
    FAVORITES: 'melodify_favorites',
    HISTORY: 'melodify_history',
    SETTINGS: 'melodify_settings',
    CURRENT_SONG: 'melodify_current_song',
    CURRENT_TIME: 'melodify_current_time',
    QUEUE: 'melodify_queue',
    QUEUE_INDEX: 'melodify_queue_index',
};

/**
 * Get item from localStorage with JSON parsing.
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Parsed value
 */
function getItem(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        console.warn(`Failed to parse localStorage item: ${key}`, e);
        return defaultValue;
    }
}

/**
 * Set item to localStorage with JSON stringify.
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`Failed to set localStorage item: ${key}`, e);
    }
}

/**
 * Remove item from localStorage.
 * @param {string} key - Storage key
 */
function removeItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn(`Failed to remove localStorage item: ${key}`, e);
    }
}

// Favorites
export function getFavorites() {
    return getItem(STORAGE_KEYS.FAVORITES, []);
}

export function addFavorite(songId) {
    const favorites = getFavorites();
    if (!favorites.includes(songId)) {
        favorites.push(songId);
        setItem(STORAGE_KEYS.FAVORITES, favorites);
    }
}

export function removeFavorite(songId) {
    const favorites = getFavorites().filter(id => id !== songId);
    setItem(STORAGE_KEYS.FAVORITES, favorites);
}

export function isFavorite(songId) {
    return getFavorites().includes(songId);
}

export function toggleFavorite(songId) {
    if (isFavorite(songId)) {
        removeFavorite(songId);
        return false;
    } else {
        addFavorite(songId);
        return true;
    }
}

export function clearFavorites() {
    removeItem(STORAGE_KEYS.FAVORITES);
}

// History (Recently Played)
export function getHistory() {
    return getItem(STORAGE_KEYS.HISTORY, []);
}

export function addToHistory(songId) {
    let history = getHistory();
    // Remove if already exists
    history = history.filter(id => id !== songId);
    // Add to front
    history.unshift(songId);
    // Keep max 50 items
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    setItem(STORAGE_KEYS.HISTORY, history);
}

export function clearHistory() {
    removeItem(STORAGE_KEYS.HISTORY);
}

// Settings
const DEFAULT_SETTINGS = {
    volume: 70,
    shuffle: false,
    repeat: 'none', // 'none', 'one', 'all'
    playbackSpeed: 1,
    theme: 'dark',
};

export function getSettings() {
    return { ...DEFAULT_SETTINGS, ...getItem(STORAGE_KEYS.SETTINGS, {}) };
}

export function saveSettings(settings) {
    const current = getSettings();
    setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
}

// Current song state
export function saveCurrentState(songId, currentTime) {
    setItem(STORAGE_KEYS.CURRENT_SONG, songId);
    setItem(STORAGE_KEYS.CURRENT_TIME, currentTime);
}

export function getCurrentState() {
    return {
        songId: getItem(STORAGE_KEYS.CURRENT_SONG, null),
        currentTime: getItem(STORAGE_KEYS.CURRENT_TIME, 0),
    };
}

// Queue
export function saveQueue(queue, currentIndex) {
    setItem(STORAGE_KEYS.QUEUE, queue);
    setItem(STORAGE_KEYS.QUEUE_INDEX, currentIndex);
}

export function getQueue() {
    return {
        queue: getItem(STORAGE_KEYS.QUEUE, []),
        currentIndex: getItem(STORAGE_KEYS.QUEUE_INDEX, -1),
    };
}
