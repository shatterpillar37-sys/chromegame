# Sneakers O'Toole

An incremental game about a man who will not take his sneakers off. Fan-made and non-commercial; Sneakers O'Toole is from *Family Guy*.

## Play on a Chromebook (no Linux needed)

- **One file:** download `dist/sneakers-otoole.html`, open it from the Files app in Chrome. It works offline.
- **Installable app:** host this folder on any HTTPS site (for example GitHub Pages) and use Chrome's Install button.

## Development

Plain HTML, CSS and JavaScript with no build step. Open `index.html` directly.

- `js/data.js` content, `js/core.js` engine (runs in Node), `js/stage.js` scenes and sprites, `js/ui.js` panels, `js/audio.js` sound, `js/intro.js`, `js/main.js`
- `node tools/sim.js [hours] [clicksPerSec]` simulates a player and prints pacing milestones
- `python3 tools/build.py` rebuilds `dist/sneakers-otoole.html`; bump `CACHE` in `sw.js` when files change
