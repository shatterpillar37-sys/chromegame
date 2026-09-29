# Sneakers O'Toole

An incremental game about a man who will not take his sneakers off. O'Toole walks up the street forever: buy buildings and upgrades to earn Steps, and every time this run's Steps grow 10x he reaches the next stop on a 16-stop route (Quahog, the Texas highway, the mountains, Broadway, Neon City, the Sneaker Mall, under the sea and the moon), with new scenery, loot and a production bonus for the rest of the run.

Click O'Toole (or press Space) to sing along: words fall down four columns and pressing that column's key (F G H J by default) on the beat makes him sing it. Singing earns Steps and builds Hype, spent on three moves (1 2 3): Strut multiplies production, Showstopper pays out a burst, Sprint leaves every chaser behind. Tuxedo men chase him from the left; bosses block the street until you run circles around them. Cut away to restart the walk for Sole Power and the Lace Tree. Fan-made and non-commercial; Sneakers O'Toole is from *Family Guy*.
## Play on a Chromebook (no Linux needed)

- **One file:** download `dist/sneakers-otoole.html`, open it from the Files app in Chrome. It works offline.
- **Installable app:** host this folder on any HTTPS site (for example GitHub Pages) and use Chrome's Install button.

## Development

Plain HTML, CSS and JavaScript with no build step. Open `index.html` directly.

- `js/data.js` content, `js/core.js` engine (runs in Node), `js/stage.js` scenes and sprites, `js/ui.js` panels, `js/audio.js` sound, `js/intro.js`, `js/main.js`
- `node tools/sim.js [hours] [accuracy]` simulates a player and prints pacing milestones (`SEED=n` for another random run; accuracy 0 plays idle)
- `audio/` holds the normalized recordings (piano, vocals and full mix share one timeline); `python3 tools/make_assets.py` embeds them in `js/assets.js`
- `python3 tools/make_assets.py --lines CLIP.mp3` splits a clip of the tuxedo men's three lines ("Hey, take those sneakers off!", "Take them off, I said!", "Ah, let him go..."), separated by silence, into `audio/line_*.mp3`
- `python3 tools/build.py` rebuilds `dist/sneakers-otoole.html`; bump `CACHE` in `sw.js` when files change
