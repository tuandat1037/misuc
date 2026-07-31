# Melodify - Personal Music Player

A minimal, elegant personal music player built with vanilla HTML, CSS, and JavaScript. Designed for GitHub Pages deployment.

## Features

- 🎵 Play local MP3 files
- 🎨 Dark theme, modern design
- 📱 Fully responsive (Desktop, Tablet, Mobile)
- 🔍 Real-time search
- ❤️ Favorites with LocalStorage
- 🕐 Recently played history
- 📝 LRC lyrics support
- 🔀 Shuffle & Repeat modes
- 🔊 Volume control with mute
- ⚡ Playback speed control (0.5x - 2x)
- 📻 Media Session API (lock screen controls)
- 📲 PWA with offline support
- 🎯 No frameworks, no backend

## Quick Start

### Deploy to GitHub Pages

1. Fork or clone this repository
2. Add your MP3 files to `/music/`
3. Add cover images to `/covers/`
4. Add lyrics files to `/lyrics/` (optional)
5. Update `/data/music.json` with your songs
6. Push to GitHub
7. Enable GitHub Pages in repository Settings

### Local Development

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
