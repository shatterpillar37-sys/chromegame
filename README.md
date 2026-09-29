# Sneakers O'Toole

An incremental rhythm game about a man who will not take his sneakers off. Click O'Toole to play the piano; click again as each word reaches the ring and he sings it. On-beat words earn Steps. Fan-made and non-commercial; Sneakers O'Toole is from *Family Guy*.

## Play on a Chromebook (no Linux needed)

- **One file:** download `dist/sneakers-otoole.html`, open it from the Files app in Chrome. It works offline.
- **Installable app:** host this folder on any HTTPS site (for example GitHub Pages) and use Chrome's Install button.

## Development

Plain HTML, CSS and JavaScript with no build step. Open `index.html` directly.

- `js/data.js` content, `js/core.js` engine (runs in Node), `js/stage.js` scenes and sprites, `js/ui.js` panels, `js/audio.js` sound, `js/intro.js`, `js/main.js`
- `node tools/sim.js [hours] [accuracy]` simulates a player and prints pacing milestones
- `audio/` holds the normalized recordings (piano, vocals and full mix share one timeline); `js/assets.js` embeds them
- `python3 tools/build.py` rebuilds `dist/sneakers-otoole.html`; bump `CACHE` in `sw.js` when files change
