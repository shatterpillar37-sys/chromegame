# Sneakers O'Toole

An incremental rhythm game about a man who will not take his sneakers off. Click O'Toole (or press Space) to play the piano; each word falls down one of four columns, and pressing that column's key (F G H J by default, rebindable in Settings) on the beat makes him sing it. On-beat words earn Steps and carry him up the street, away from the tuxedo men chasing him; bosses who block the street get circled until they're too dizzy to stand. Fan-made and non-commercial; Sneakers O'Toole is from *Family Guy*.

## Play on a Chromebook (no Linux needed)

- **One file:** download `dist/sneakers-otoole.html`, open it from the Files app in Chrome. It works offline.
- **Installable app:** host this folder on any HTTPS site (for example GitHub Pages) and use Chrome's Install button.

## Development

Plain HTML, CSS and JavaScript with no build step. Open `index.html` directly.

- `js/data.js` content, `js/core.js` engine (runs in Node), `js/stage.js` scenes and sprites, `js/ui.js` panels, `js/audio.js` sound, `js/intro.js`, `js/main.js`
- `node tools/sim.js [hours] [accuracy]` simulates a player and prints pacing milestones
- `audio/` holds the normalized recordings (piano, vocals and full mix share one timeline); `python3 tools/make_assets.py` embeds them in `js/assets.js`
- `python3 tools/make_assets.py --lines CLIP.mp3` splits a clip of the tuxedo men's three lines ("Hey, take those sneakers off!", "Take them off, I said!", "Ah, let him go..."), separated by silence, into `audio/line_*.mp3`
- `python3 tools/build.py` rebuilds `dist/sneakers-otoole.html`; bump `CACHE` in `sw.js` when files change
