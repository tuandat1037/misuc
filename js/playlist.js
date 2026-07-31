/**
 * Playlist rendering and management module.
 * @module playlist
 */

import { formatTime, escapeHtml } from './utils.js';
import { getCurrentSong, getCurrentIndex, getPlaylist, playSong, playSongById } from './player.js';
import { isFavorite, toggleFavorite } from './storage.js';

export function renderSongList(songs, container, options = {}) {
    if (!container) return;
    const { showIndex = true, showAlbum = true, showCover = true } = options;
    const currentSong = getCurrentSong();
    const playlist = getPlaylist();
    container.innerHTML = '';

    if (songs.length === 0) return;

    songs.forEach((song, index) => {
        const isCurrentSong = currentSong && currentSong.id === song.id;
        const globalIndex = playlist.findIndex(s => s.id === song.id);

        const songItem = document.createElement('div');
        songItem.className = `song-item${isCurrentSong ? ' playing' : ''}`;
        songItem.setAttribute('data-song-id', song.id);
        songItem.setAttribute('data-index', globalIndex >= 0 ? globalIndex : index);

        let indexContent = '';
        if (isCurrentSong) {
            indexContent = `<div class="playing-indicator"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>`;
        } else if (showIndex) {
            indexContent = `<span class="song-index">${index + 1}</span>`;
        }

        let coverContent = '';
        if (showCover) {
            coverContent = `<div class="song-cover"><img src="${escapeHtml(song.cover)}" alt="${escapeHtml(song.title)}" loading="lazy"></div>`;
        }

        let albumContent = '';
        if (showAlbum && song.album) {
            albumContent = `<span class="song-album">${escapeHtml(song.album)}</span>`;
        }

        const fav = isFavorite(song.id);

        songItem.innerHTML = `
            ${indexContent ? `<div class="song-index-wrapper">${indexContent}</div>` : ''}
            ${coverContent}
            <div class="song-info">
                <span class="song-title">${escapeHtml(song.title)}</span>
                <span class="song-artist">${escapeHtml(song.artist)}</span>
            </div>
            ${albumContent}
            <span class="song-duration">${formatTime(song.duration || 0)}</span>
            <div class="song-actions">
                <button class="btn-icon btn-favorite ${fav ? 'active' : ''}" data-song-id="${song.id}" aria-label="Favorite">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">
                        <path d="M8 13.5L3 9C1.5 7.5 2 5 3.5 4C5 2.5 7 3.5 8 5C9 3.5 11 2.5 12.5 4C14 5 14.5 7.5 13 9L8 13.5Z" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        `;

        songItem.addEventListener('click', (e) => {
            if (e.target.closest('.btn-favorite')) return;
            const idx = parseInt(songItem.getAttribute('data-index'));
            if (!isNaN(idx) && idx >= 0) playSong(idx);
            else playSongById(song.id);
        });

        const favBtn = songItem.querySelector('.btn-favorite');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isNowFav = toggleFavorite(song.id);
                favBtn.classList.toggle('active', isNowFav);
                const svg = favBtn.querySelector('svg');
                if (svg) svg.setAttribute('fill', isNowFav ? 'currentColor' : 'none');
                updateAllFavoriteButtons(song.id, isNowFav);
            });
        }

        container.appendChild(songItem);
    });
}

function updateAllFavoriteButtons(songId, isFav) {
    document.querySelectorAll(`.btn-favorite[data-song-id="${songId}"]`).forEach(btn => {
        btn.classList.toggle('active', isFav);
        const svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
    });
    const npbFav = document.getElementById('npb-favorite');
    if (npbFav) {
        const currentSong = getCurrentSong();
        if (currentSong && currentSong.id === songId) {
            npbFav.classList.toggle('active', isFav);
            const svg = npbFav.querySelector('svg');
            if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
    }
}

export function updatePlaylistUI() {
    const currentSong = getCurrentSong();
    if (!currentSong) return;
    document.querySelectorAll('.song-item').forEach(item => {
        const songId = parseInt(item.getAttribute('data-song-id'));
        const isPlaying = currentSong.id === songId;
        item.classList.toggle('playing', isPlaying);
        const indexWrapper = item.querySelector('.song-index-wrapper');
        if (indexWrapper) {
            if (isPlaying) {
                indexWrapper.innerHTML = `<div class="playing-indicator"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>`;
            } else {
                const idx = parseInt(item.getAttribute('data-index'));
                if (!isNaN(idx)) indexWrapper.innerHTML = `<span class="song-index">${idx + 1}</span>`;
            }
        }
    });
}

export function scrollToCurrentSong() {
    const activeItem = document.querySelector('.song-item.playing');
    if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function getTotalDuration(songs) {
    return songs.reduce((total, song) => total + (song.duration || 0), 0);
}

export function getTotalCount(songs) {
    return songs.length;
}

// Listen for playlist update events from player
window.addEventListener('playlistUpdate', () => {
    updatePlaylistUI();
    scrollToCurrentSong();
});

// Listen for favorite UI updates
window.addEventListener('updateFavoriteUI', (e) => {
    const { songId } = e.detail;
    const fav = isFavorite(songId);
    const npbFav = document.getElementById('npb-favorite');
    if (npbFav) {
        npbFav.classList.toggle('active', fav);
        const svg = npbFav.querySelector('svg');
        if (svg) svg.setAttribute('fill', fav ? 'currentColor' : 'none');
    }
});
