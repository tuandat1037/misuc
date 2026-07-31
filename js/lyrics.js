/**
 * Lyrics module.
 * Handles LRC file parsing and synchronized display.
 * @module lyrics
 */

/** @type {Array<{time: number, text: string}>} */
let lyricsData = [];

/** @type {HTMLElement} */
let lyricsContainer;

/** @type {number} */
let lastActiveIndex = -1;

/**
 * Initialize lyrics module.
 */
export function initLyrics() {
    lyricsContainer = document.getElementById('lyrics-content');
}

/**
 * Load lyrics from an LRC file.
 * @param {string} lrcPath - Path to LRC file
 * @returns {Promise<void>}
 */
export async function loadLyrics(lrcPath) {
    if (!lrcPath) {
        lyricsData = [];
        renderLyrics();
        return;
    }
    
    try {
        const response = await fetch(lrcPath);
        if (!response.ok) throw new Error('Failed to load lyrics');
        const lrcText = await response.text();
        lyricsData = parseLRC(lrcText);
        renderLyrics();
    } catch (e) {
        console.warn('Failed to load lyrics:', e);
        lyricsData = [];
        renderLyrics();
    }
}

/**
 * Parse LRC format text.
 * @param {string} lrcText - Raw LRC text
 * @returns {Array<{time: number, text: string}>} Parsed lyrics
 */
function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;
    
    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                lyrics.push({ time, text });
            }
        }
    }
    
    return lyrics.sort((a, b) => a.time - b.time);
}

/**
 * Render lyrics in the lyrics panel.
 */
function renderLyrics() {
    if (!lyricsContainer) return;
    
    if (lyricsData.length === 0) {
        lyricsContainer.innerHTML = '<p class="lyrics-placeholder">No lyrics available</p>';
        return;
    }
    
    lyricsContainer.innerHTML = lyricsData.map((line, index) => {
        return `<p class="lyric-line" data-index="${index}" data-time="${line.time}">${escapeHtml(line.text)}</p>`;
    }).join('');
    
    lastActiveIndex = -1;
}

/**
 * Update lyrics display based on current playback time.
 * @param {number} currentTime - Current playback time in seconds
 */
export function updateLyrics(currentTime) {
    if (!lyricsContainer || lyricsData.length === 0) return;
    
    // Find the current lyric line
    let activeIndex = -1;
    for (let i = lyricsData.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsData[i].time) {
            activeIndex = i;
            break;
        }
    }
    
    if (activeIndex !== lastActiveIndex) {
        // Remove active class from all lines
        const allLines = lyricsContainer.querySelectorAll('.lyric-line');
        allLines.forEach(line => {
            line.classList.remove('active', 'past');
        });
        
        // Add past class to lines before active
        for (let i = 0; i < activeIndex; i++) {
            if (allLines[i]) allLines[i].classList.add('past');
        }
        
        // Add active class to current line
        if (activeIndex >= 0 && allLines[activeIndex]) {
            allLines[activeIndex].classList.add('active');
            
            // Scroll to active line
            allLines[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        lastActiveIndex = activeIndex;
    }
}

/**
 * Escape HTML special characters.
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Toggle lyrics panel visibility.
 */
export function toggleLyricsPanel() {
    const panel = document.getElementById('lyrics-panel');
    if (panel) {
        panel.classList.toggle('open');
    }
}

/**
 * Close lyrics panel.
 */
export function closeLyricsPanel() {
    const panel = document.getElementById('lyrics-panel');
    if (panel) {
        panel.classList.remove('open');
    }
}
