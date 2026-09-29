/* Sneakers O'Toole — game engine. No DOM here so the economy can be simulated in Node. */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined') ? require('./data.js') : root.DATA;
  const C = {};
  C.D = D;
  C.rand = Math.random;
  const R = () => C.rand();
  const pick = (arr, wf) => {
    let tot = 0; for (const a of arr) tot += wf(a);
    let r = R() * tot;
    for (const a of arr) { r -= wf(a); if (r <= 0) return a; }
    return arr[arr.length - 1];
  };

  /* ---------------- events ---------------- */
  const handlers = {};
  C.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
  C.emit = (ev, ...a) => { (handlers[ev] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); };

  /* ---------------- state ---------------- */
  const SP_DIV = 1e11;          // lifetime Steps needed for the first Sole Power
  C.SP_DIV = SP_DIV;
  C.defaults = () => ({
    v: 2, created: Date.now(), savedAt: Date.now(), time: 0,
    steps: 0, runSteps: 0, allSteps: 0,
    b: {}, up: {}, tree: {}, locker: {},
    wordIdx: 0, verseTimes: [], verseAuto: false, lastClick: -9, combo: 0, autoAcc: 0,
    heat: 0, bossMeter: 0, stun: 0, guardAcc: 0,
    enemies: [], eid: 1,
    golden: null, goldNext: 150, eventNext: 240, cams: [], encore: 0, scout: 0,
    buffs: [],
    boxes: 0, shards: 0, sp: 0, spTotal: 0, gl: 0,
    sneakers: {}, equip: [null, null, null, null, null], pity: { e: 0, l: 0 },
    ach: {}, cuts: 0, scene: 0,
    challenge: null, chStart: 0, chDone: {},
    wheel: { charges: 1, next: Date.now() + 20 * 60e3 },
    shinyOToole: 0,
    stats: {
      clicks: 0, manualClicks: 0, verses: 0, perfect: 0, bestCombo: 0, crits: 0, enemies: 0, bosses: 0, goldenTux: 0,
      tugs: 0, boxesOpened: 0, shinies: 0, golden: 0, wheelSpins: 0, jackpots: 0, events: 0, play: 0, bestSps: 0,
      upgrades: 0, stepsClicked: 0, bestVerse: 0, best: {}, bosskills: {},
    },
    toggles: { autobox: false, autobuy: false, autoup: false },
  });
  let S = C.defaults();
  C.get = () => S;

  function merge(def, src) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return src === undefined ? def : src;
    const out = Array.isArray(def) ? def.slice() : Object.assign({}, def);
    for (const k in src) out[k] = (def && typeof def[k] === 'object' && def[k] && !Array.isArray(def[k])) ? merge(def[k], src[k]) : src[k];
    return out;
  }
  C.load = (obj) => {
    S = merge(C.defaults(), obj || {});
    S.enemies = []; S.golden = null; S.cams = [];
    if (!Array.isArray(S.equip)) S.equip = [null, null, null, null, null];
    while (S.equip.length < 5) S.equip.push(null);
    C.refresh();
    return S;
  };
  C.serialize = () => {
    S.savedAt = Date.now();
    const o = Object.assign({}, S); delete o.enemies; delete o.golden; delete o.cams;
    return JSON.stringify(o);
  };

  /* ---------------- number formatting ---------------- */
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg', 'Tg'];
  const LONG = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion', ' decillion', ' undecillion', ' duodecillion', ' tredecillion', ' quattuordecillion', ' quindecillion', ' sexdecillion', ' septendecillion', ' octodecillion', ' novemdecillion', ' vigintillion'];
  C.numFmt = 'short';
  C.fmt = (n, dec) => {
    if (n === Infinity) return '∞';
    if (!isFinite(n)) return '0';
    if (n < 0) return '-' + C.fmt(-n, dec);
    if (n < 1000) {
      if (dec !== undefined && n < 100 && n % 1) return n.toFixed(dec);
      return Math.floor(n).toLocaleString('en-US');
    }
    if (n < 1e6 && C.numFmt !== 'sci') return Math.floor(n).toLocaleString('en-US');
    const e3 = Math.floor(Math.log10(n) / 3);
    if (C.numFmt === 'sci' || (C.numFmt === 'short' && e3 >= SUF.length) || (C.numFmt === 'long' && e3 >= LONG.length)) {
      const e = Math.floor(Math.log10(n)); return (n / Math.pow(10, e)).toFixed(2) + 'e' + e;
    }
    if (C.numFmt === 'eng') { const e = e3 * 3; return (n / Math.pow(10, e)).toFixed(2) + 'e' + e; }
    const v = n / Math.pow(1000, e3);
    const s = v >= 100 ? v.toFixed(1) : v.toFixed(2);
    return s + (C.numFmt === 'long' ? LONG[e3] : ' ' + SUF[e3]);
  };
  C.time = (s) => {
    s = Math.max(0, Math.floor(s));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm';
    return Math.floor(s / 86400) + 'd ' + Math.floor(s % 86400 / 3600) + 'h';
  };

  /* ---------------- modifiers ---------------- */
  const ADD = new Set(['clickSps', 'crit', 'comboCap', 'kick', 'bossTime', 'bossGl', 'guard', 'luck', 'offline', 'offlineCap', 'auto', 'spEff', 'verseShock', 'headStart']);
  function applyFx(m, fx, lv) {
    lv = lv || 1;
    for (const k in fx) {
      const v = fx[k];
      if (k.startsWith('b_')) { const id = k.slice(2); m.bld[id] = (m.bld[id] || 1) * Math.pow(v, lv); }
      else if (ADD.has(k)) m[k] = (m[k] || 0) + v * lv;
      else m[k] = (m[k] === undefined ? 1 : m[k]) * Math.pow(v, lv);
    }
  }
  const SNK_MULT = new Set(['prod', 'click', 'verse', 'box', 'gold', 'heat']);
  C.sneakerValue = (id) => {
    const sn = D.SNEAKERS.find(s => s.id === id), o = S.sneakers[id];
    if (!sn || !o) return 0;
    return sn.fx.v * D.STAR_MULT[o.star || 1] * (o.shiny ? 2 : 1);
  };
  let M = null;
  C.refresh = () => { M = null; };
  C.mods = () => {
    if (M) return M;
    const m = {
      prod: 1, click: 1, clickSps: 0, crit: 0.02, critMult: 1, comboCap: 50, comboWin: 1, verse: 1, kick: 0, kickMult: 1,
      heat: 1, enemyReward: 1, bossTime: 30, bossReward: 1, bossGl: 0, tug: 1, guard: 0, luck: 0, box: 1, shiny: 1,
      gold: 1, goldDur: 1, wheel: 1, shards: 1, offline: 0.5, offlineCap: 12, cost: 1, auto: 0, collect: 1, fame: 1,
      spEff: 0.02, verseShock: 0, mythic: 1, pity: 1, headStart: 0, bld: {}, loot: 1, heatRate: 1, noEnemy: false,
    };
    for (const id in S.up) { const u = UP[id]; if (u) applyFx(m, u.fx); }
    for (const id in S.tree) { const n = TREE[id]; if (n && S.tree[id] > 0) applyFx(m, n.fx, S.tree[id]); }
    for (const id in S.chDone) { const c = CH[id]; if (c) applyFx(m, c.fx); }
    if (S.locker.stitch) m.prod *= Math.pow(1.1, S.locker.stitch);
    const slots = C.slots();
    for (let i = 0; i < slots; i++) {
      const id = S.equip[i]; if (!id) continue;
      const sn = D.SNEAKERS.find(s => s.id === id); if (!sn) continue;
      const v = C.sneakerValue(id);
      if (SNK_MULT.has(sn.fx.k)) m[sn.fx.k] *= (1 + v);
      else if (sn.fx.k === 'combo') m.comboCap += v;
      else m[sn.fx.k] = (m[sn.fx.k] || 0) + v;
    }
    for (const b of S.buffs) if (b.fx) applyFx(m, b.fx);
    if (S.shinyOToole > 0) m.prod *= 7;
    // challenge restrictions
    const ch = S.challenge;
    if (ch === 'jinx') { m.luck = 0; m.gold = 0; }
    if (ch === 'monotone') { m.crit = 0; m.comboCap = 0; m.verse = 0; }
    if (ch === 'invasion') m.heatRate *= 4;
    // derived
    const uniq = C.uniqueSneakers(), shinies = Object.values(S.sneakers).filter(o => o.shiny).length;
    m.collection = (uniq * 0.02 + shinies * 0.02) * m.collect;
    m.achBonus = Object.keys(S.ach).length * 0.01 * m.fame;
    m.spBonus = C.effSp(S.spTotal) * m.spEff;
    m.global = m.prod * (1 + m.spBonus) * (1 + m.achBonus) * (1 + m.collection);
    m.kickDmg = Math.max(1, (1 + m.kick) * m.kickMult);
    M = m;
    return m;
  };

  /* ---------------- lookups ---------------- */
  const UP = {}; D.UPGRADES.forEach(u => UP[u.id] = u);
  const TREE = {}; D.TREE.forEach(n => TREE[n.id] = n);
  const CH = {}; D.CHALLENGES.forEach(c => CH[c.id] = c);
  const BLD = {}; D.BUILDINGS.forEach(b => BLD[b.id] = b);
  C.UP = UP; C.TREE = TREE; C.CH = CH; C.BLD = BLD;
  C.slots = () => 3 + (S.locker.slot4 ? 1 : 0) + (S.locker.slot5 ? 1 : 0);
  C.uniqueSneakers = () => Object.keys(S.sneakers).length;
  C.owned = (id) => S.b[id] || 0;
  C.totalBuildings = () => Object.values(S.b).reduce((a, b) => a + b, 0);
  C.buffActive = (id) => S.buffs.find(b => b.id === id);

  /* ---------------- production ---------------- */
  C.bldRate = (b, m) => { m = m || C.mods(); return b.sps * (m.bld[b.id] || 1) * m.global; };
  C.baseSps = (m) => {
    m = m || C.mods(); let t = 0;
    for (const b of D.BUILDINGS) { const n = S.b[b.id]; if (n) t += n * b.sps * (m.bld[b.id] || 1); }
    return t * m.global;
  };
  C.sps = (m) => { m = m || C.mods(); return C.baseSps(m) * (S.stun > 0 ? 0.5 : 1); };
  C.clickBase = (m) => {
    m = m || C.mods();
    if (S.challenge === 'silent') return 0;
    return m.click * (1 + m.spBonus) * (1 + m.achBonus) + C.sps(m) * m.clickSps;
  };
  C.comboMult = () => 1 + Math.min(S.combo, C.mods().comboCap) * 0.02;
  C.gain = (x) => { if (!(x > 0)) return; S.steps += x; S.runSteps += x; S.allSteps += x; };

  /* ---------------- buildings ---------------- */
  C.growth = () => S.challenge === 'budget' ? 1.3 : D.BGROWTH;
  C.costMult = (m) => { m = m || C.mods(); return m.cost * (C.buffActive('sale') ? 0.75 : 1); };
  C.cost = (b, n) => {
    const g = C.growth(), c = S.b[b.id] || 0;
    return b.cost * C.costMult() * Math.pow(g, c) * (Math.pow(g, n) - 1) / (g - 1);
  };
  C.capFor = (b) => S.challenge === 'minimal' ? Math.max(0, 10 - (S.b[b.id] || 0)) : Infinity;
  C.maxAfford = (b) => {
    const g = C.growth(), c = S.b[b.id] || 0;
    const first = b.cost * C.costMult() * Math.pow(g, c);
    if (S.steps < first) return 0;
    const n = Math.floor(Math.log(S.steps * (g - 1) / first + 1) / Math.log(g));
    return Math.min(Math.max(0, n), C.capFor(b));
  };
  C.buy = (id, n) => {
    const b = BLD[id]; if (!b) return false;
    if (n === 'max') n = C.maxAfford(b);
    n = Math.min(n, C.capFor(b));
    if (n < 1) return false;
    const cost = C.cost(b, n);
    if (S.steps < cost) return false;
    S.steps -= cost; S.b[id] = (S.b[id] || 0) + n; C.refresh();
    C.emit('buy', b, n);
    return true;
  };
  C.bldUnlocked = (i) => {
    if (i === 0) return true;
    const prev = D.BUILDINGS[i - 1];
    return (S.b[prev.id] || 0) > 0 || S.allSteps >= D.BUILDINGS[i].cost * 0.5 || (S.b[D.BUILDINGS[i].id] || 0) > 0;
  };

  /* ---------------- shop upgrades ---------------- */
  C.upReqMet = (u) => {
    const r = u.req || {};
    if (r.b && (S.b[r.b] || 0) < r.n) return false;
    const st = S.stats;
    if (r.clicks && st.clicks < r.clicks) return false;
    if (r.verses && st.verses < r.verses) return false;
    if (r.combo && st.bestCombo < r.combo) return false;
    if (r.crits && st.crits < r.crits) return false;
    if (r.enemies && st.enemies < r.enemies) return false;
    if (r.golden && st.golden < r.golden) return false;
    if (r.boxes && st.boxesOpened < r.boxes) return false;
    if (r.unique && C.uniqueSneakers() < r.unique) return false;
    if (r.ach && Object.keys(S.ach).length < r.ach) return false;
    if (r.steps && S.runSteps < r.steps) return false;
    return true;
  };
  C.upCost = (u) => u.cost;
  C.availableUpgrades = () => D.UPGRADES.filter(u => !S.up[u.id] && C.upReqMet(u)).sort((a, b) => a.cost - b.cost);
  C.buyUpgrade = (id) => {
    const u = UP[id]; if (!u || S.up[id] || !C.upReqMet(u)) return false;
    if (S.steps < u.cost) return false;
    S.steps -= u.cost; S.up[id] = 1; S.stats.upgrades++; C.refresh();
    C.emit('upgrade', u);
    return true;
  };

  /* ---------------- singing (clicking O'Toole) ---------------- */
  C.click = (auto, now) => {
    const m = C.mods();
    now = now === undefined ? S.time : now;
    const idx = S.wordIdx;
    if (!auto) {
      const win = 1.1 * m.comboWin;
      S.combo = (S.time - S.lastClick <= win) ? S.combo + 1 : 1;
      S.lastClick = S.time;
      if (S.combo > S.stats.bestCombo) S.stats.bestCombo = S.combo;
      S.stats.manualClicks++;
    }
    if (idx === 0) { S.verseTimes = []; S.verseAuto = false; }
    S.verseTimes.push(now); if (auto) S.verseAuto = true;
    let val = C.clickBase(m) * (auto ? 1 : C.comboMult());
    let crit = false;
    if (val > 0 && R() < m.crit * (1 + m.luck * 0.5)) { crit = true; val *= 10 * m.critMult; S.stats.crits++; }
    C.gain(val);
    S.stats.clicks++; S.stats.stepsClicked += val;
    S.wordIdx = (idx + 1) % D.PHRASE.length;
    C.emit('word', idx, val, crit, auto);
    if (S.wordIdx === 0) verseDone(m);
    return { idx, val, crit };
  };
  C.verseQuality = () => {
    const t = S.verseTimes;
    if (S.verseAuto || t.length !== D.PHRASE.length) return 0;
    const u = t.slice(1).map((x, i) => x - t[i]), r = D.RHYTHM;
    let num = 0, den = 0; u.forEach((x, i) => { num += x * r[i]; den += r[i] * r[i]; });
    const k = num / den;
    if (k < 0.45 || k > 2.2) return 0;
    let err = 0; u.forEach((x, i) => err += Math.abs(x - k * r[i]) / (k * r[i]));
    err /= u.length;
    return err < 0.22 ? 2 : err < 0.38 ? 1 : 0;   // 2 = perfect, 1 = great
  };
  function verseDone(m) {
    const q = C.verseQuality();
    let mult = m.verse * (q === 2 ? 3 : q === 1 ? 1.5 : 1);
    if (S.encore > 0) { mult *= 10; S.encore--; }
    if (S.scout > 0) { mult *= 10; S.scout = 0; }
    const val = S.challenge === 'monotone' || S.challenge === 'silent' ? 0 : Math.max(C.clickBase(m) * 5, C.sps(m) * 0.5) * mult;
    C.gain(val);
    S.stats.verses++;
    if (q === 2) S.stats.perfect++;
    if (val > S.stats.bestVerse) S.stats.bestVerse = val;
    if (m.verseShock) S.enemies.forEach(e => C.damage(e, m.kickDmg * 3, 'shock'));
    // Shiny O'Toole: a very rare glow-up
    if (R() < (1 / 4096) * (1 + m.luck)) { S.shinyOToole = 60; C.refresh(); C.emit('shinyOToole'); C.unlock('egg_shiny'); }
    if (R() < 0.01 * m.box * (1 + m.luck)) { S.boxes++; C.emit('boxDrop', 1, 'verse'); }
    C.emit('verse', val, q);
  }

  /* ---------------- tuxedo men ---------------- */
  C.heatRate = (m) => {
    m = m || C.mods();
    if (C.buffActive('repel') || C.buffActive('rain')) return 0;
    const base = 1.35 + 0.16 * Math.log10(1 + C.baseSps(m));
    return base * m.heat * m.heatRate * (C.buffActive('conv') ? 3 : 1);
  };
  C.bossNeed = () => Math.round(12 * (S.locker.radar ? 0.7 : 1));
  function spawnEnemy(forceType) {
    const m = C.mods();
    const bossReady = S.bossMeter >= C.bossNeed() && !S.enemies.some(e => e.boss);
    let e;
    const side = R() < 0.5 ? -1 : 1;
    if (bossReady && !forceType) {
      const bi = S.stats.bosses % D.BOSSES.length, bd = D.BOSSES[bi];
      const hits = 22 + 4 * Math.min(S.stats.bosses, 10);
      const hp = hits * m.kickDmg * (S.challenge === 'invasion' ? 2 : 1);
      e = { id: S.eid++, type: 'boss', boss: bd.id, name: bd.name, look: bd.look, hp, max: hp, side, p: 0, spd: 0.09, timer: m.bossTime, big: 1 };
      S.bossMeter = 0;
      C.emit('bossSpawn', e);
    } else {
      const pool = Object.entries(D.ENEMIES).filter(([k, t]) => S.stats.enemies >= (t.min || 0));
      const [k, t] = forceType ? [forceType, D.ENEMIES[forceType]] : pick(pool, ([k, t]) => t.w * (k === 'golden' ? (1 + m.luck) : 1));
      const hp = t.hp * Math.min(3, 1 + S.cuts * 0.08) * (S.challenge === 'invasion' ? 2 : 1);
      e = { id: S.eid++, type: k, name: t.name, look: t.look, hp, max: hp, side, p: 0, spd: t.spd * (0.9 + R() * 0.25), big: t.big };
    }
    S.enemies.push(e);
    C.emit('spawn', e);
    return e;
  }
  C.spawnEnemy = spawnEnemy;
  C.damage = (e, dmg, src) => {
    if (!e || e.dead) return;
    e.hp -= dmg;
    C.emit('hit', e, dmg, src);
    if (e.hp <= 0) defeat(e);
  };
  C.kick = (id) => {
    const e = S.enemies.find(x => x.id === id); if (!e) return;
    const m = C.mods();
    let dmg = m.kickDmg, crit = false;
    if (R() < m.crit * (1 + m.luck * 0.5)) { dmg *= 3; crit = true; }
    C.damage(e, dmg, crit ? 'crit' : 'kick');
  };
  function defeat(e) {
    e.dead = true;
    S.enemies = S.enemies.filter(x => x !== e);
    const m = C.mods();
    const loot = m.enemyReward * (C.buffActive('conv') ? 3 : 1);
    let steps, boxes = 0, gl = 0;
    if (e.boss) {
      steps = (C.sps(m) * 600 + C.clickBase(m) * 200) * loot * m.bossReward;
      gl = 1 + m.bossGl; boxes = 2;
      S.stats.bosses++; S.stats.bosskills[e.boss] = (S.stats.bosskills[e.boss] || 0) + 1;
    } else {
      const t = D.ENEMIES[e.type];
      steps = (C.sps(m) * t.sec + C.clickBase(m) * t.clk) * loot;
      if (t.boxes) boxes = t.boxes;
      else if (R() < t.box * m.box * (1 + m.luck)) boxes = 1;
      S.stats.enemies++; S.bossMeter++;
      if (e.type === 'golden') S.stats.goldenTux++;
    }
    steps = Math.max(steps, 10);
    C.gain(steps); S.boxes += boxes; S.gl += gl;
    C.emit('defeat', e, { steps, boxes, gl });
    if (boxes) C.emit('boxDrop', boxes, 'enemy');
  }
  function tug(e) {
    const m = C.mods();
    const cap = C.sps(m) * (e.boss ? 300 : 60) + C.clickBase(m) * 20;
    const loss = Math.min(S.steps * (e.boss ? 0.1 : 0.05), cap) * m.tug;
    S.steps = Math.max(0, S.steps - loss);
    S.stun = e.boss ? 8 : 4; S.stats.tugs++;
    S.enemies = S.enemies.filter(x => x !== e);
    if (e.boss) S.bossMeter = Math.floor(C.bossNeed() / 2);
    C.emit('tug', e, loss);
  }

  /* ---------------- golden sneaker, events, cameras ---------------- */
  C.goldInterval = () => {
    const m = C.mods();
    if (!m.gold) return Infinity;
    return (180 + R() * 180) / m.gold / (1 + m.luck * 0.3);
  };
  function spawnGolden() {
    const m = C.mods();
    S.golden = { t: 0, life: 13 * (S.locker.magnet ? 2 : 1), seed: R(), diamond: R() < 0.012 * (1 + m.luck) };
    C.emit('goldenSpawn', S.golden);
  }
  C.spawnGolden = spawnGolden;
  C.addBuff = (id, name, dur, fx) => {
    const ex = S.buffs.find(b => b.id === id);
    if (ex) { ex.t = Math.max(ex.t, dur); ex.dur = Math.max(ex.dur, dur); }
    else S.buffs.push({ id, name, t: dur, dur, fx });
    C.refresh(); C.emit('buff', id, name, dur);
  };
  C.clickGolden = () => {
    const g = S.golden; if (!g) return null;
    S.golden = null; S.stats.golden++;
    const m = C.mods(), d = m.goldDur;
    let eff, info = {};
    if (g.diamond) {
      eff = { id: 'dazzle', name: 'Diamond Dazzle', desc: 'Production x77 for 20 seconds and 3 Shoeboxes!' };
      C.addBuff('dazzle', 'Diamond Dazzle', 20 * d, { prod: 77 }); S.boxes += 3; C.emit('boxDrop', 3, 'golden');
    } else {
      eff = pick(D.GOLDEN, e => e.w);
      if (eff.id === 'frenzy') C.addBuff('frenzy', 'Sneaker Frenzy', 77 * d, { prod: 7 });
      if (eff.id === 'clickf') C.addBuff('clickf', 'Click Frenzy', 13 * d, { click: 77 });
      if (eff.id === 'lucky') { const s = C.baseSps(m); info.steps = Math.max(Math.min(S.steps * 0.15, s * 900), s * 60) + 13; C.gain(info.steps); }
      if (eff.id === 'rain') { info.boxes = 2 + Math.floor(R() * 4); S.boxes += info.boxes; C.emit('boxDrop', info.boxes, 'golden'); }
      if (eff.id === 'repel') { C.addBuff('repel', 'Tux Repellent', 120 * d, null); S.enemies.filter(e => !e.boss).forEach(e => { e.flee = 1; }); S.heat = 0; }
      if (eff.id === 'encore') S.encore += 5;
    }
    C.emit('golden', eff, info);
    return { eff, info };
  };
  function startEvent(forceId) {
    const ev = forceId ? D.EVENTS.find(e => e.id === forceId) : pick(D.EVENTS, () => 1);
    S.stats.events++;
    if (ev.id === 'viral') C.addBuff('viral', ev.name, ev.dur, { prod: 2 });
    if (ev.id === 'conv') C.addBuff('conv', ev.name, ev.dur, null);
    if (ev.id === 'sale') C.addBuff('sale', ev.name, ev.dur, null);
    if (ev.id === 'rain') C.addBuff('rain', ev.name, ev.dur, null);
    if (ev.id === 'mail') { S.boxes++; C.emit('boxDrop', 1, 'mail'); }
    if (ev.id === 'scout') S.scout = 1;
    if (ev.id === 'paps') {
      for (let i = 0; i < 5; i++) S.cams.push({ id: S.eid++, x: 0.1 + R() * 0.8, y: 0.12 + R() * 0.45, life: 9 + i * 0.8, delay: i * 0.8 });
    }
    C.emit('event', ev);
  }
  C.startEvent = startEvent;
  C.clickCam = (id) => {
    const c = S.cams.find(x => x.id === id); if (!c || c.delay > 0) return null;
    S.cams = S.cams.filter(x => x !== c);
    const m = C.mods(), steps = C.baseSps(m) * 12 + C.clickBase(m) * 12;
    C.gain(steps);
    let box = 0; if (R() < 0.15 * (1 + m.luck)) { box = 1; S.boxes++; C.emit('boxDrop', 1, 'cam'); }
    C.emit('cam', c, steps, box);
    return steps;
  };

  /* ---------------- shoeboxes & sneakers ---------------- */
  C.shoeboxPrice = () => Math.max(500, C.baseSps() * 240) * Math.pow(1.02, Math.min(200, S.stats.boxesOpened));
  C.buyBox = () => { const p = C.shoeboxPrice(); if (S.steps < p) return false; S.steps -= p; S.boxes++; C.emit('boxDrop', 1, 'shop'); return true; };
  C.pityCaps = () => { const m = C.mods(); return { e: Math.round(30 * m.pity), l: Math.round(100 * m.pity) }; };
  function rollOne() {
    const m = C.mods(), caps = C.pityCaps();
    S.pity.e++; S.pity.l++;
    if (R() < 1 / 500) { return { id: 'emptybox' }; }
    let ri;
    if (S.pity.l >= caps.l) ri = pick([4, 5], r => D.RARITY[r].w * (r === 5 ? m.mythic : 1));
    else if (S.pity.e >= caps.e) ri = pick([3, 4, 5], r => D.RARITY[r].w * (r === 5 ? m.mythic : 1));
    else ri = pick([0, 1, 2, 3, 4, 5], r => D.RARITY[r].w * (r >= 2 ? 1 + m.luck : 1) * (r === 5 ? m.mythic : 1));
    if (ri >= 3) S.pity.e = 0;
    if (ri >= 4) S.pity.l = 0;
    const pool = D.SNEAKERS.filter(s => s.r === ri && !s.secret);
    return { id: pool[Math.floor(R() * pool.length)].id };
  }
  C.openBoxes = (n) => {
    n = Math.min(n, S.boxes); if (n < 1) return [];
    const m = C.mods(), out = [];
    for (let i = 0; i < n; i++) {
      S.boxes--; S.stats.boxesOpened++;
      const { id } = rollOne();
      const sn = D.SNEAKERS.find(s => s.id === id);
      const shiny = R() < (1 / 64) * m.shiny * (1 + m.luck);
      const o = S.sneakers[id];
      let res = { id, sn, shiny, isNew: !o, shards: 0 };
      if (!o) S.sneakers[id] = { n: 1, star: 1, shiny, at: Date.now() };
      else {
        o.n++;
        if (shiny && !o.shiny) { o.shiny = true; res.shinyUpgrade = true; }
        else { res.shards = Math.round(D.RARITY[sn.r].shard * m.shards * (shiny ? 3 : 1)); S.shards += res.shards; }
      }
      if (shiny) S.stats.shinies++;
      if (id === 'emptybox') C.unlock('egg_empty');
      out.push(res);
    }
    C.refresh();
    C.emit('boxOpen', out);
    return out;
  };
  C.starCost = (id) => {
    const sn = D.SNEAKERS.find(s => s.id === id), o = S.sneakers[id];
    if (!o || o.star >= 5) return Infinity;
    return Math.round(D.RARITY[sn.r].star * D.STAR_COST[o.star]);
  };
  C.starUp = (id) => {
    const c = C.starCost(id); if (S.shards < c) return false;
    S.shards -= c; S.sneakers[id].star++; C.refresh(); C.emit('starUp', id); return true;
  };
  C.equip = (id, slot) => {
    if (!S.sneakers[id]) return false;
    const cur = S.equip.indexOf(id);
    if (slot === undefined) {
      if (cur >= 0) { S.equip[cur] = null; C.refresh(); C.emit('equip'); return true; }
      slot = S.equip.slice(0, C.slots()).indexOf(null);
      if (slot < 0) return false;
    }
    if (cur >= 0) S.equip[cur] = null;
    S.equip[slot] = id; C.refresh(); C.emit('equip'); return true;
  };

  /* ---------------- wheel ---------------- */
  C.wheelCap = () => 3 + (S.locker.wheelcap ? 3 : 0);
  C.wheelPeriod = () => 20 * 60e3 * C.mods().wheel;
  C.updateWheel = (now) => {
    now = now || Date.now();
    const w = S.wheel, cap = C.wheelCap();
    if (w.charges >= cap) { w.next = now + C.wheelPeriod(); return; }
    while (now >= w.next && w.charges < cap) { w.charges++; w.next += C.wheelPeriod(); }
    if (w.charges >= cap) w.next = now + C.wheelPeriod();
  };
  C.spinWheel = () => {
    if (S.wheel.charges < 1) return null;
    if (S.wheel.charges >= C.wheelCap()) S.wheel.next = Date.now() + C.wheelPeriod();
    S.wheel.charges--; S.stats.wheelSpins++;
    const i = D.WHEEL.indexOf(pick(D.WHEEL, s => s.w));
    return i;
  };
  C.applyWheel = (i) => {
    const s = D.WHEEL[i], sps = C.baseSps();
    if (s.id === 'prod10') C.gain(Math.max(sps * 600, 50));
    if (s.id === 'prod60') C.gain(Math.max(sps * 3600, 300));
    if (s.id === 'box1') S.boxes += 1;
    if (s.id === 'box3') S.boxes += 3;
    if (s.id === 'frenzy') C.addBuff('frenzy', 'Sneaker Frenzy', 60, { prod: 7 });
    if (s.id === 'shards') S.shards += 40;
    if (s.id === 'gl') S.gl += 1;
    if (s.id === 'jackpot') { S.boxes += 10; S.gl += 2; S.stats.jackpots++; }
    if (/box|jackpot/.test(s.id)) C.emit('boxDrop', s.id === 'box1' ? 1 : s.id === 'box3' ? 3 : 10, 'wheel');
    C.emit('wheel', s);
  };

  /* ---------------- tree & locker ---------------- */
  C.treeCost = (n) => Math.round(n.cost * Math.pow(2.2, S.tree[n.id] || 0));
  C.treeAvail = (n) => !n.req || (S.tree[n.req] || 0) > 0;
  C.buyTree = (id) => {
    const n = TREE[id]; if (!n || !C.treeAvail(n) || (S.tree[id] || 0) >= n.max) return false;
    const c = C.treeCost(n); if (S.sp < c) return false;
    S.sp -= c; S.tree[id] = (S.tree[id] || 0) + 1; C.refresh(); C.emit('tree', n); return true;
  };
  C.lockerCost = (it) => Math.round(it.cost[0] * Math.pow(it.cost[1] || 1, S.locker[it.id] || 0));
  C.buyLocker = (id) => {
    const it = D.LOCKER.find(x => x.id === id); if (!it) return false;
    const lv = S.locker[id] || 0; if (lv >= (it.max || 1)) return false;
    if (it.req && !S.locker[it.req]) return false;
    const c = C.lockerCost(it); if (S.gl < c) return false;
    S.gl -= c; S.locker[id] = lv + 1; C.refresh(); C.emit('locker', it); return true;
  };

  /* ---------------- cutaway (prestige) ---------------- */
  // Sole Power softcap: above 1,000 each point is worth less, so prestige loops can't run away
  C.effSp = (sp) => sp <= 1000 ? sp : 1000 * Math.pow(sp / 1000, 0.55);
  C.spFor = (steps) => Math.floor(Math.cbrt(steps / SP_DIV));
  C.spGain = () => Math.max(0, C.spFor(S.allSteps) - S.spTotal);
  C.nextSpAt = () => Math.pow(S.spTotal + C.spGain() + 1, 3) * SP_DIV;
  C.cutaway = (chId) => {
    const gain = C.spGain();
    if (gain < 1 && !chId) return false;
    const m = C.mods();
    S.spTotal += gain; S.sp += gain; S.cuts++;
    S.steps = 0; S.runSteps = 0; S.b = {}; S.up = {};
    S.enemies = []; S.heat = 0; S.bossMeter = 0; S.stun = 0; S.wordIdx = 0; S.combo = 0; S.verseTimes = [];
    S.buffs = S.buffs.filter(b => b.id === 'frenzy' && false); S.golden = null; S.cams = []; S.encore = 0; S.scout = 0;
    if (m.headStart) { S.b.kid = 10; S.b.fan = 10; S.b.choir = 5; }
    S.scene = S.cuts % D.SCENES.length;
    S.challenge = chId || null; S.chStart = S.time;
    C.refresh();
    C.emit('cutaway', gain, chId);
    return gain;
  };
  C.challengeUnlocked = () => S.cuts >= 3 || S.spTotal >= 10;
  C.abandonChallenge = () => { if (!S.challenge) return; const c = S.challenge; S.challenge = null; C.refresh(); C.emit('challengeEnd', c, false); };

  /* ---------------- achievements ---------------- */
  const A = [];
  const ach = (id, name, desc, check, hidden) => A.push({ id, name, desc, check, hidden });
  const st = () => S.stats;
  [[1e2, 'Baby Steps'], [1e3, 'First Mile'], [1e4, 'Around the Block'], [1e5, 'Cross-Town'], [1e6, 'Millionaire Hopper'], [1e8, 'Marathoner'],
   [1e10, 'Continental'], [1e12, 'Trillion-Step Trek'], [1e15, 'Orbital Hop'], [1e18, 'Interstellar'], [1e21, 'Galactic Stride'], [1e24, 'Heat Death Jog']]
    .forEach(([n, name], i) => ach('steps' + i, name, 'Earn ' + C.fmt(n) + ' Steps in total.', () => S.allSteps >= n));
  [[10, 'Warming Up'], [1e3, 'Getting Somewhere'], [1e5, 'Unstoppable'], [1e7, 'Sneaker Storm'], [1e9, 'Stampede'], [1e11, 'Seismic'], [1e13, 'Cosmic Cadence']]
    .forEach(([n, name], i) => ach('sps' + i, name, 'Reach ' + C.fmt(n) + ' Steps per second.', () => st().bestSps >= n));
  [[100, 'Tap Tap'], [1000, 'Clicky'], [1e4, 'Finger Athlete'], [5e4, 'Legend of the Left Button']]
    .forEach(([n, name], i) => ach('clicks' + i, name, 'Click O\'Toole ' + C.fmt(n) + ' times.', () => st().manualClicks >= n));
  [[1, 'First Verse'], [10, 'Sing-Along'], [100, 'Broken Record'], [1000, 'Earworm']]
    .forEach(([n, name], i) => ach('verse' + i, name, 'Finish ' + C.fmt(n) + ' verses.', () => st().verses >= n));
  [[1, 'Perfect Pitch'], [25, 'Metronome'], [100, 'Human Jukebox']]
    .forEach(([n, name], i) => ach('perfect' + i, name, 'Sing ' + n + ' Perfect Verses (click along with the song\'s rhythm).', () => st().perfect >= n));
  [[25, 'Combo Starter'], [50, 'On Fire'], [100, 'Blazing'], [150, 'Supernova Fingers']]
    .forEach(([n, name], i) => ach('combo' + i, name, 'Reach a x' + n + ' combo.', () => st().bestCombo >= n));
  [[1, 'Critical Hop'], [100, 'Sweet Spots'], [1000, 'Crit Machine']]
    .forEach(([n, name], i) => ach('crit' + i, name, 'Land ' + n + ' critical clicks.', () => st().crits >= n));
  D.BUILDINGS.forEach(b => ach('b50_' + b.id, b.name + ' x50', 'Own 50 ' + b.name + '.', () => (S.b[b.id] || 0) >= 50));
  ach('ball', 'One of Everything', 'Own at least 1 of every building.', () => D.BUILDINGS.every(b => (S.b[b.id] || 0) >= 1));
  ach('b100all', 'Real Estate Mogul', 'Own 100 of every building.', () => D.BUILDINGS.every(b => (S.b[b.id] || 0) >= 100));
  [[1, 'NO!'], [10, 'Not Today'], [100, 'Dress Code Violation'], [1000, 'Tux Buster'], [5000, 'Black Tie Nightmare']]
    .forEach(([n, name], i) => ach('enemy' + i, name, 'Defeat ' + C.fmt(n) + ' tuxedo men.', () => st().enemies >= n));
  [[1, 'Boss Fight'], [5, 'Formal Complaint'], [25, 'Gala Crasher'], [100, 'Etiquette Destroyer']]
    .forEach(([n, name], i) => ach('boss' + i, name, 'Defeat ' + n + ' bosses.', () => st().bosses >= n));
  ach('goldtux', 'Gold Standard', 'Defeat a Golden Tuxedo.', () => st().goldenTux >= 1);
  ach('tug10', 'Snug Fit', 'Get your sneakers tugged 10 times. They stayed on.', () => st().tugs >= 10);
  [[1, 'Unboxing'], [10, 'Box Collector'], [100, 'Sneakerhead'], [500, 'Hype Beast'], [2000, 'Warehouse']]
    .forEach(([n, name], i) => ach('box' + i, name, 'Open ' + n + ' Shoeboxes.', () => st().boxesOpened >= n));
  [[2, 'Rare Find'], [3, 'Epic Pull'], [4, 'Legendary!'], [5, 'Mythic!!']]
    .forEach(([r, name]) => ach('rar' + r, name, 'Find a ' + D.RARITY[r].name + ' sneaker.', () => Object.keys(S.sneakers).some(id => { const s = D.SNEAKERS.find(x => x.id === id); return s && s.r >= r && !s.secret; })));
  ach('shiny', 'Shiny!', 'Find a shiny sneaker.', () => st().shinies >= 1);
  ach('coll10', 'Starting a Collection', 'Collect 10 different sneakers.', () => C.uniqueSneakers() >= 10);
  ach('collall', 'Complete Closet', 'Collect every sneaker (secrets not required).', () => D.SNEAKERS.every(s => s.secret || S.sneakers[s.id]));
  ach('star5', 'Five Stars', 'Upgrade a sneaker to 5 stars.', () => Object.values(S.sneakers).some(o => o.star >= 5));
  [[1, 'Golden Glimpse'], [7, 'Lucky Seven'], [77, 'Gold Digger'], [777, 'Jackpot Hunter']]
    .forEach(([n, name], i) => ach('gold' + i, name, 'Click ' + n + ' Golden Sneakers.', () => st().golden >= n));
  ach('wheel1', 'Spin Cycle', 'Spin the Wheel of Laces.', () => st().wheelSpins >= 1);
  ach('wheel25', 'Wheel Regular', 'Spin the Wheel 25 times.', () => st().wheelSpins >= 25);
  ach('jackpot', 'JACKPOT!', 'Hit the jackpot on the Wheel.', () => st().jackpots >= 1);
  ach('event1', 'Breaking News', 'Experience a random event.', () => st().events >= 1);
  ach('event25', 'Eventful Life', 'Experience 25 random events.', () => st().events >= 25);
  [[1, 'Cutaway!'], [5, 'Scene Stealer'], [10, 'Season Regular'], [25, 'Syndicated'], [50, 'Long-Running Gag'], [100, 'Still Not Taking Them Off']]
    .forEach(([n, name], i) => ach('cut' + i, name, 'Cutaway ' + n + ' times.', () => S.cuts >= n));
  ach('tree1', 'Branching Out', 'Buy a Lace Tree node.', () => Object.keys(S.tree).length >= 1);
  ach('tree20', 'Deep Roots', 'Own 20 Lace Tree nodes.', () => Object.keys(S.tree).length >= 20);
  ach('treeall', 'The Whole Tree', 'Own every Lace Tree node.', () => D.TREE.every(n => S.tree[n.id]));
  ach('ch1', 'Special Episode', 'Complete a challenge.', () => Object.keys(S.chDone).length >= 1);
  ach('chall', 'Box Set', 'Complete every challenge.', () => D.CHALLENGES.every(c => S.chDone[c.id]));
  ach('up25', 'Upgraded', 'Buy 25 upgrades in total.', () => st().upgrades >= 25);
  ach('up100', 'Fully Loaded', 'Buy 100 upgrades in total.', () => st().upgrades >= 100);
  ach('play1', 'Dedicated', 'Play for 1 hour.', () => st().play >= 3600);
  ach('play10', 'Devoted', 'Play for 10 hours.', () => st().play >= 36000);
  // secrets
  ach('egg_konami', 'Up Up Down Down', 'Enter a very famous code.', null, 1);
  ach('egg_takeoff', 'Nice Try', 'Type what the tuxedo men want.', null, 1);
  ach('egg_kazoo', 'Kazoo Solo', 'Type the name of a humble instrument.', null, 1);
  ach('egg_solar', 'Solar Flare', 'Poke the sky seven times.', null, 1);
  ach('egg_nap', 'Power Nap', 'Let O\'Toole doze off, then wake him up.', null, 1);
  ach('egg_logo', 'Encore!', 'Click the title once for every word of the song.', null, 1);
  ach('egg_night', 'Night Owl', 'Play between 3 and 4 in the morning.', null, 1);
  ach('egg_feet', 'Hands Off', 'Try to pull the sneakers off yourself.', null, 1);
  ach('egg_bubble', 'Polite Society', 'Talk back to a tuxedo man.', null, 1);
  ach('egg_carpal', 'Carpal Tunnel', 'Click 100 times in 10 seconds.', null, 1);
  ach('egg_silence', 'Sound of Silence', 'Turn every volume slider to zero.', null, 1);
  ach('egg_quahog', 'Local Legend', 'Type the name of his hometown.', null, 1);
  ach('egg_shiny', 'Shiny O\'Toole', 'A 1 in 4,096 glow-up after a verse.', null, 1);
  ach('egg_empty', 'The Box Was Empty', 'Open a Shoebox with nothing inside.', null, 1);
  C.ACH = A;
  const AMAP = {}; A.forEach(a => AMAP[a.id] = a);
  C.AMAP = AMAP;
  C.unlock = (id) => {
    if (S.ach[id] || !AMAP[id]) return false;
    S.ach[id] = Date.now(); C.refresh(); C.emit('ach', AMAP[id]); return true;
  };
  C.checkAch = () => { for (const a of A) if (!S.ach[a.id] && a.check && a.check()) C.unlock(a.id); };

  /* ---------------- automation ---------------- */
  C.autoBuy = () => {
    if (S.locker.autoup && S.toggles.autoup) {
      for (const u of C.availableUpgrades()) if (u.cost <= S.steps * 0.5) C.buyUpgrade(u.id);
    }
    if (S.locker.autobuy && S.toggles.autobuy) {
      let best = null, bv = 0; const m = C.mods();
      D.BUILDINGS.forEach((b, i) => {
        if (!C.bldUnlocked(i) || C.capFor(b) < 1) return;
        const v = C.bldRate(b, m) / C.cost(b, 1);
        if (v > bv) { bv = v; best = b; }
      });
      if (best && C.cost(best, 1) <= S.steps * 0.5) C.buy(best.id, 1);
    }
    if (S.locker.autobox && S.toggles.autobox && S.boxes > 0) C.openBoxes(Math.min(S.boxes, 10));
  };

  /* ---------------- tick ---------------- */
  let achAcc = 0, autoAcc = 0;
  C.tick = (dt) => {
    if (dt <= 0) return;
    S.time += dt; S.stats.play += dt;
    // buffs
    let changed = false;
    for (const b of S.buffs) { b.t -= dt; if (b.t <= 0) changed = true; }
    if (changed) { const gone = S.buffs.filter(b => b.t <= 0); S.buffs = S.buffs.filter(b => b.t > 0); C.refresh(); gone.forEach(b => C.emit('buffEnd', b)); }
    if (S.shinyOToole > 0) { S.shinyOToole -= dt; if (S.shinyOToole <= 0) { S.shinyOToole = 0; C.refresh(); C.emit('shinyEnd'); } }
    if (S.stun > 0) S.stun = Math.max(0, S.stun - dt);
    const m = C.mods();
    const sps = C.sps(m);
    C.gain(sps * dt);
    if (sps > S.stats.bestSps) S.stats.bestSps = sps;
    // combo decays
    if (S.combo > 0 && S.time - S.lastClick > 1.1 * m.comboWin) { if (S.combo >= 10) C.emit('comboEnd', S.combo); S.combo = 0; }
    // auto-singer
    if (m.auto > 0) { S.autoAcc += m.auto * dt; let n = 0; while (S.autoAcc >= 1 && n < 20) { S.autoAcc -= 1; n++; C.click(true); } if (S.autoAcc > 1) S.autoAcc = 0; }
    // heat & spawning
    if (!C.buffActive('repel')) {
      S.heat += C.heatRate(m) * dt;
      if (S.heat >= 100 && S.enemies.length < 6) {
        S.heat = 0; spawnEnemy();
        const extra = C.buffActive('conv') ? 2 : (S.cuts >= 5 && R() < 0.25 ? 1 : 0);
        for (let i = 0; i < extra; i++) spawnEnemy(pick(['tux', 'waiter', 'tophat'], () => 1));
      }
    }
    // enemies walk
    for (const e of S.enemies.slice()) {
      if (e.flee) { e.p -= dt * 0.5; if (e.p <= -0.1) { S.enemies = S.enemies.filter(x => x !== e); C.emit('leave', e); } continue; }
      if (e.type === 'golden') { // golden tux crosses the whole screen and escapes
        e.p += e.spd * dt;
        if (e.p >= 2) { S.enemies = S.enemies.filter(x => x !== e); C.emit('leave', e); }
        continue;
      }
      if (e.boss) {
        if (e.p < 0.62) e.p = Math.min(0.62, e.p + e.spd * dt);
        else { e.timer -= dt; if (e.timer <= 0) { tug(e); C.emit('bossFail', e); } }
        continue;
      }
      e.p += e.spd * dt;
      if (e.p >= 1) tug(e);
    }
    // bodyguard
    if (m.guard > 0 && S.enemies.length) {
      S.guardAcc += m.guard * dt;
      while (S.guardAcc >= 1 && S.enemies.length) {
        S.guardAcc -= 1;
        const tgt = S.enemies.filter(e => !e.flee && e.type !== 'golden').sort((a, b) => b.p - a.p)[0];
        if (tgt) C.damage(tgt, Math.max(1, m.kickDmg * 0.5), 'guard'); else break;
      }
    } else S.guardAcc = 0;
    // golden sneaker
    if (S.golden) { S.golden.t += dt; if (S.golden.t >= S.golden.life) { S.golden = null; C.emit('goldenMiss'); } }
    else { S.goldNext -= dt; if (S.goldNext <= 0) { S.goldNext = C.goldInterval(); if (isFinite(S.goldNext)) spawnGolden(); else S.goldNext = 60; } }
    // events
    S.eventNext -= dt;
    if (S.eventNext <= 0) { S.eventNext = 240 + R() * 240; startEvent(); }
    for (const c of S.cams) { if (c.delay > 0) c.delay -= dt; else c.life -= dt; }
    if (S.cams.some(c => c.life <= 0)) { S.cams = S.cams.filter(c => c.life > 0); }
    // challenge
    if (S.challenge) {
      const ch = CH[S.challenge];
      if (S.runSteps >= ch.goal) { S.chDone[ch.id] = 1; S.challenge = null; C.refresh(); C.emit('challengeEnd', ch.id, true); }
      else if (ch.timer && S.time - S.chStart > ch.timer) { S.challenge = null; C.refresh(); C.emit('challengeEnd', ch.id, false); }
    }
    // periodic
    achAcc += dt; autoAcc += dt;
    if (autoAcc >= 0.5) { autoAcc = 0; C.autoBuy(); }
    if (achAcc >= 1) { achAcc = 0; C.checkAch(); C.updateWheel(); }
  };

  // background-tab tick: production and timers only, no spawning
  C.idleTick = (dt) => {
    if (dt <= 0) return;
    S.time += dt; S.stats.play += dt;
    for (const b of S.buffs) b.t -= dt;
    if (S.buffs.some(b => b.t <= 0)) { S.buffs = S.buffs.filter(b => b.t > 0); C.refresh(); }
    if (S.shinyOToole > 0) { S.shinyOToole = Math.max(0, S.shinyOToole - dt); if (!S.shinyOToole) C.refresh(); }
    S.stun = Math.max(0, S.stun - dt);
    C.gain(C.baseSps() * dt);
    S.combo = 0;
  };

  /* ---------------- offline ---------------- */
  C.offline = (sec) => {
    const m = C.mods();
    const capped = Math.min(sec, m.offlineCap * 3600);
    const rate = Math.min(1, m.offline);
    const steps = C.baseSps(m) * capped * rate;
    C.gain(steps); S.stats.play += 0;
    C.updateWheel();
    return { sec, capped, rate, steps };
  };

  if (typeof module !== 'undefined') module.exports = C; else root.Core = C;
})(typeof window !== 'undefined' ? window : globalThis);
