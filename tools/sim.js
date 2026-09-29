// Balance simulator: plays the game with a simple bot and prints pacing milestones.
// usage: node tools/sim.js [hours] [accuracy 0-1]
const C = require('../js/core.js'), D = C.D;
const HOURS = +process.argv[2] || 8, ACC = +(process.argv[3] || 0.85);
let seed = 7; C.rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
C.load({});
const S = () => C.get();
const dt = 0.1; let t = 0, clickAcc = 0, kickAcc = 0, lastCut = 0, log = [];
const mark = (m) => { log.push(`${C.time(t).padStart(8)}  ${m}`); };
const seen = {};
C.on('cutaway', (g) => mark(`CUTAWAY #${S().cuts} +${g} SP (total ${S().spTotal})`));
C.on('bossSpawn', () => { if (!seen.boss) { seen.boss = 1; mark('first boss'); } });
C.on('tug', (e) => { if (e.boss) mark('boss FAILED'); });
function bestPurchase() {
  const s = S(), m = C.mods();
  let best = null, bestV = 0;
  D.BUILDINGS.forEach((b, i) => {
    if (!C.bldUnlocked(i) || C.capFor(b) < 1) return;
    const cost = C.cost(b, 1), gain = C.bldRate(b, m);
    const v = gain / cost; if (v > bestV) { bestV = v; best = { kind: 'b', id: b.id, cost }; }
  });
  return best;
}
for (t = 0; t < HOURS * 3600; t += dt) {
  const s = S();
  // the bot plays the rhythm game: restart the song after a short pause, hit words at ACC accuracy
  const song = C.song();
  if (!song) { if ((s.songIdle || 0) > 0.5) C.startSong(s.time); }
  else {
    const st = C.songTime();
    D.PHRASE.forEach((p, k) => {
      if (song.hits[k] || song.tried?.[k] || st + dt < p.t) return;
      (song.tried = song.tried || {})[k] = 1;
      if (C.rand() > ACC) return;
      const jitter = (C.rand() - 0.5) * (C.rand() < 0.6 ? 0.12 : 0.26);
      const real = C.clock; C.clock = () => song.t0 + p.t + jitter; C.tap(); C.clock = real;
    });
  }
  C.tick(dt);
  // kick enemies: 4 kicks/sec
  kickAcc += 4 * dt;
  while (kickAcc >= 1 && s.enemies.length) { kickAcc--; const e = s.enemies.slice().sort((a, b) => b.p - a.p)[0]; C.kick(e.id); }
  if (kickAcc > 1) kickAcc = 1;
  if (s.golden && s.golden.t > 2 && C.rand() < 0.9) C.clickGolden();
  s.cams.forEach(c => c.delay <= 0 && C.clickCam(c.id));
  if (Math.round(t * 10) % 10 === 0) {
    for (const u of C.availableUpgrades()) if (u.cost <= s.steps) C.buyUpgrade(u.id);
    for (let k = 0; k < 50; k++) { const b = bestPurchase(); if (b && b.cost <= s.steps) C.buy(b.id, 1); else break; }
    if (s.boxes) {
      C.openBoxes(s.boxes);
      const ids = Object.keys(s.sneakers).sort((a, b) => C.sneakerValue(b) * (D.SNEAKERS.find(x => x.id === b).fx.k === 'prod' ? 3 : 1) - C.sneakerValue(a) * (D.SNEAKERS.find(x => x.id === a).fx.k === 'prod' ? 3 : 1));
      s.equip = [null, null, null, null, null]; ids.slice(0, C.slots()).forEach((id, i) => s.equip[i] = id); C.refresh();
      for (const id of ids) while (C.starUp(id));
    }
    if (s.wheel.charges > 0) C.applyWheel(C.spinWheel());
    for (const n of D.TREE.slice().sort((a, b) => C.treeCost(a) - C.treeCost(b))) C.buyTree(n.id);
    for (const it of D.LOCKER) C.buyLocker(it.id);
    s.toggles.autobox = true;
    const g = C.spGain();
    if (g >= Math.max(s.cuts ? 2 : 3, s.spTotal * 0.75) && t - lastCut > 300) { lastCut = t; C.cutaway(); }
  }
  if (Math.round(t / dt) % Math.round(1800 / dt) === 0) mark(`steps=${C.fmt(s.steps)} sps=${C.fmt(C.sps())} all=${C.fmt(s.allSteps)} sp=${s.sp}/${s.spTotal} ach=${Object.keys(s.ach).length} uniq=${C.uniqueSneakers()} enemies=${s.stats.enemies} bosses=${s.stats.bosses} bld=${C.totalBuildings()} tree=${Object.keys(s.tree).length} gl=${s.gl}`);
  // first-time milestones
  D.BUILDINGS.forEach(b => { if (s.b[b.id] && !seen[b.id]) { seen[b.id] = 1; mark('first ' + b.name); } });
}
console.log(log.join('\n'));
