'use strict';
const $ = (s, r = document) => r.querySelector(s);
const FAST = new URLSearchParams(location.search).has('fast') ? 50 : 1; // testing aid
const SAVE_KEY = 'sneakersOToole.v1';

/* ---------- content ---------- */
const BUILDINGS = [
  { id: 'kid',     name: 'Lace-Up Kid',      icon: '👟', desc: 'Hops in place. Never takes them off.', cost: 15,    sps: 0.5 },
  { id: 'fans',    name: 'Hopping Fan Club', icon: '🎉', desc: 'They hop along. Loudly.',              cost: 120,   sps: 4 },
  { id: 'factory', name: 'Sneaker Factory',  icon: '🏭', desc: 'Sneakers, sneakers, sneakers.',        cost: 1300,  sps: 35 },
  { id: 'edit',    name: 'Viral Edit Farm',  icon: '📱', desc: 'Remixes of you, everywhere.',          cost: 15000, sps: 300 },
];
const GROWTH = 1.15;

// fx: click/all/heat/walk are multipliers, bld = per-building multiplier, auto = auto-dodge
const TREE = [
  { branch: 'Speed', color: '#ffd166', nodes: [
    { id: 's1', name: 'Tighter Laces',        desc: 'Click power x2',                   cost: 100,   fx: { click: 2 } },
    { id: 's2', name: 'Exceptionally Fast',   desc: 'All Steps x1.5',                   cost: 2000,  req: 's1', fx: { all: 1.5 } },
    { id: 's3', name: 'Time-Skip Dash',       desc: 'All Steps x2',                     cost: 25000, req: 's2', fx: { all: 2 } },
  ]},
  { branch: 'Song', color: '#2ec4b6', nodes: [
    { id: 'g1', name: 'Verse One',            desc: 'Fan Clubs x2',                     cost: 300,   fx: { bld: { fans: 2 } } },
    { id: 'g2', name: 'Harmonies',            desc: 'All Steps x1.5',                   cost: 3000,  req: 'g1', fx: { all: 1.5 } },
    { id: 'g3', name: 'Full Musical',         desc: 'All Steps x2',                     cost: 40000, req: 'g2', fx: { all: 2 } },
  ]},
  { branch: 'Defiance', color: '#ef476f', nodes: [
    { id: 'd1', name: 'Quick Feet',           desc: 'Heat builds 30% slower',           cost: 200,   fx: { heat: 0.7 } },
    { id: 'd2', name: 'Decoy Sneakers',       desc: 'Men walk 60% slower',              cost: 1500,  req: 'd1', fx: { walk: 1.6 } },
    { id: 'd3', name: 'Auto-Dodge',           desc: 'O\'Toole dodges by himself',       cost: 12000, req: 'd2', fx: { auto: true } },
    { id: 'd4', name: 'Legal Loophole',       desc: 'Heat builds 50% slower',           cost: 60000, req: 'd3', fx: { heat: 0.5 } },
  ]},
];
const NODES = {};
TREE.forEach(b => b.nodes.forEach(n => { NODES[n.id] = n; n.color = b.color; }));

const SCENES = ['Quahog', 'Texas', 'Outer Space', 'Underwater', 'Candyland'];
const LINES = [
  '♪ La la, my sneakers stay on! ♪', '♪ Hop, hop, hop, hooray! ♪', '♪ Nobody tells me what to do! ♪',
  '♪ These babies make me fast! ♪', '♪ Laces tight, life is bright! ♪', '♪ Not taking them off, nope! ♪',
];

/* ---------- state ---------- */
const fresh = () => ({
  steps: 0, runTotal: 0, life: 0, sole: 0, cuts: 0, dodges: 0,
  b: {}, up: {}, heat: 0, stun: 0, last: Date.now(), muted: false,
});
let S = fresh();
let pursuers = [];
let buyAmt = 1;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = Object.assign(fresh(), JSON.parse(raw));
  } catch (e) { S = fresh(); }
}
function save() {
  try { S.last = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

/* ---------- maths ---------- */
function mods() {
  const m = { click: 1, all: 1, heat: 1, walk: 1, auto: false, bld: {} };
  for (const id in S.up) {
    const fx = NODES[id] && NODES[id].fx; if (!fx) continue;
    if (fx.click) m.click *= fx.click;
    if (fx.all) m.all *= fx.all;
    if (fx.heat) m.heat *= fx.heat;
    if (fx.walk) m.walk *= fx.walk;
    if (fx.auto) m.auto = true;
    if (fx.bld) for (const k in fx.bld) m.bld[k] = (m.bld[k] || 1) * fx.bld[k];
  }
  return m;
}
const soleMul = () => 1 + 0.25 * S.sole;
function baseSps(m) {
  let t = 0;
  for (const b of BUILDINGS) t += (S.b[b.id] || 0) * b.sps * (m.bld[b.id] || 1);
  return t * m.all * soleMul();
}
function sps(m) { return baseSps(m) * (S.stun > 0 ? 0.5 : 1) * FAST; }
function clickPower(m) { return (m.click * soleMul() + baseSps(m) * 0.05) * FAST; }
function costFor(b, n) {
  const c = S.b[b.id] || 0;
  return Math.ceil(b.cost * Math.pow(GROWTH, c) * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1));
}

const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
function fmt(n) {
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
  const e = Math.min(Math.floor(Math.log10(n) / 3), SUF.length - 1);
  return (n / Math.pow(1000, e)).toFixed(2) + SUF[e];
}

/* ---------- audio (synthesized, original) ---------- */
let ac = null, note = 0;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
function blip(semi, dur = 0.12, type = 'triangle', vol = 0.12) {
  if (S.muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = 330 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) {}
}
const hopSound = () => { blip(SCALE[note++ % SCALE.length]); };
function jingle() { [0, 4, 7, 12].forEach((s, i) => setTimeout(() => blip(s, .15, 'square', .08), i * 70)); }
function buzz() { blip(-12, .35, 'sawtooth', .1); }

/* ---------- ui helpers ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3300);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}
function floatText(txt, x, y) {
  const f = document.createElement('div'); f.className = 'float'; f.textContent = txt;
  f.style.left = x + 'px'; f.style.top = y + 'px';
  const st = $('#stage'); st.appendChild(f); setTimeout(() => f.remove(), 900);
  while (st.querySelectorAll('.float').length > 12) st.querySelector('.float').remove();
}

/* ---------- actions ---------- */
function hop(ev) {
  const m = mods(), p = clickPower(m);
  S.steps += p; S.runTotal += p; S.life += p;
  const o = $('#otoole'); o.classList.remove('hop'); void o.offsetWidth; o.classList.add('hop');
  const r = $('#stage').getBoundingClientRect();
  const cx = ev && ev.clientX ? ev.clientX - r.left : r.width / 2;
  const cy = ev && ev.clientY ? ev.clientY - r.top : r.height / 2;
  floatText('+' + fmt(p), cx, cy - 10);
  hopSound();
}
function buy(b) {
  let n = buyAmt;
  const cost = costFor(b, n);
  if (S.steps < cost) return;
  S.steps -= cost; S.b[b.id] = (S.b[b.id] || 0) + n; blip(7 + n, .1);
}
function buyNode(n) {
  if (S.up[n.id] || (n.req && !S.up[n.req]) || S.steps < n.cost) return;
  S.steps -= n.cost; S.up[n.id] = 1; jingle(); toast('Unlocked: ' + n.name);
}
function cutGain() { return Math.floor(Math.sqrt(S.runTotal / 100000)); }
function cutaway() {
  const g = cutGain(); if (g < 1) return;
  if (!confirm('Cut to the next scene? You keep ' + g + ' Sole Power, but lose Steps, buildings and tree upgrades.')) return;
  const keep = { sole: S.sole + g, cuts: S.cuts + 1, dodges: S.dodges, life: S.life, muted: S.muted };
  S = Object.assign(fresh(), keep);
  pursuers.forEach(p => p.el.remove()); pursuers = [];
  jingle(); toast('Cut to: ' + SCENES[S.cuts % SCENES.length] + '! +' + g + ' Sole Power'); save();
}

/* ---------- pursuers ---------- */
const MAN_SVG = `<svg viewBox="0 0 80 150"><ellipse cx="40" cy="146" rx="24" ry="4" fill="rgba(0,0,0,.25)"/>
<rect x="22" y="80" width="14" height="60" rx="5" fill="#222"/><rect x="44" y="80" width="14" height="60" rx="5" fill="#222"/>
<rect x="16" y="40" width="48" height="52" rx="10" fill="#3a3a48"/><path d="M40 42 l-6 16 l6 30 l6 -30z" fill="#e63946"/>
<path d="M16 50 q-16 -14 -6 -34" stroke="#f0c39a" stroke-width="9" fill="none" stroke-linecap="round"/>
<circle cx="40" cy="24" r="17" fill="#f0c39a"/><path d="M23 20 q3 -16 17 -16 q14 0 17 16 q-10 -8 -17 -6 q-8 -2 -17 6z" fill="#333"/>
<path d="M29 22 l9 4 M51 22 l-9 4" stroke="#222" stroke-width="3" stroke-linecap="round"/>
<circle cx="33" cy="28" r="2.4" fill="#222"/><circle cx="47" cy="28" r="2.4" fill="#222"/>
<path d="M33 37 q7 -5 14 0" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

function spawnMan() {
  const el = document.createElement('button'); el.className = 'man';
  el.innerHTML = '<div class="talk">Take them off!</div>' + MAN_SVG;
  const side = Math.random() < 0.5 ? -1 : 1;
  const p = { el, side, t: 0 };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); dodge(p, true); });
  $('#pursuers').appendChild(el); pursuers.push(p); buzz();
  toast('Two men approach! Click them to dodge!');
}
function dodge(p, manual) {
  if (p.done) return; p.done = true;
  pursuers = pursuers.filter(x => x !== p);
  p.el.classList.add('gone'); setTimeout(() => p.el.remove(), 500);
  const m = mods(), reward = sps(m) * 15 + clickPower(m) * 5;
  S.steps += reward; S.runTotal += reward; S.life += reward; S.dodges++;
  const o = $('#otoole'); o.classList.remove('hop'); void o.offsetWidth; o.classList.add('hop');
  toast('Dodged! +' + fmt(reward) + ' Steps'); jingle();
}
function tugged(p) {
  p.done = true; pursuers = pursuers.filter(x => x !== p);
  p.el.classList.add('gone'); setTimeout(() => p.el.remove(), 500);
  const loss = S.steps * 0.1; S.steps -= loss; S.stun = 5; buzz();
  toast('Sneakers tugged! -' + fmt(loss) + ' Steps, production halved for 5s');
}

/* ---------- static UI build ---------- */
const shopEls = {}, nodeEls = {};
function buildUI() {
  const shop = $('#shop');
  for (const b of BUILDINGS) {
    const row = document.createElement('button'); row.className = 'row';
    row.innerHTML = `<span class="ic">${b.icon}</span><span class="info"><div class="nm">${b.name}</div>
      <div class="ds">${b.desc} · <span class="each"></span></div><div class="cost"></div></span><span class="cnt">0</span>`;
    row.addEventListener('click', () => buy(b));
    shop.appendChild(row); shopEls[b.id] = row;
  }
  const tree = $('#tree'); tree.className = 'tree';
  for (const br of TREE) {
    const col = document.createElement('div'); col.className = 'branch';
    col.innerHTML = `<h4 style="color:${br.color}">${br.branch}</h4>`;
    for (const n of br.nodes) {
      const el = document.createElement('button'); el.className = 'node';
      el.innerHTML = `<div class="nm">${n.name}</div><div class="ds">${n.desc}</div><div class="cost">${fmt(n.cost)} Steps</div>`;
      el.addEventListener('click', () => buyNode(n));
      col.appendChild(el); nodeEls[n.id] = el;
    }
    tree.appendChild(col);
  }
}

function refreshShop(m) {
  for (const b of BUILDINGS) {
    const row = shopEls[b.id], cost = costFor(b, buyAmt);
    row.querySelector('.cnt').textContent = S.b[b.id] || 0;
    row.querySelector('.cost').textContent = (buyAmt > 1 ? 'x' + buyAmt + ' · ' : '') + fmt(cost) + ' Steps';
    row.querySelector('.each').textContent = fmt(b.sps * (m.bld[b.id] || 1) * m.all * soleMul()) + '/s each';
    row.classList.toggle('cant', S.steps < cost);
  }
  for (const id in nodeEls) {
    const n = NODES[id], el = nodeEls[id];
    const owned = !!S.up[id], locked = !owned && n.req && !S.up[n.req];
    el.classList.toggle('owned', owned);
    el.classList.toggle('locked', locked);
    el.classList.toggle('cant', !owned && !locked && S.steps < n.cost);
    el.querySelector('.cost').textContent = owned ? '✔ Owned' : locked ? 'Locked' : fmt(n.cost) + ' Steps';
  }
  const g = cutGain();
  $('#runTotal').textContent = fmt(S.runTotal); $('#cutGain').textContent = g;
  $('#cutBtn').disabled = g < 1;
  $('#stCuts').textContent = S.cuts; $('#stDodge').textContent = S.dodges; $('#stLife').textContent = fmt(S.life);
  const scene = S.cuts % SCENES.length;
  $('#stage').dataset.scene = scene; $('#sceneLabel').textContent = 'Scene: ' + SCENES[scene];
  $('#mute').textContent = S.muted ? '🔇' : '🔊';
}

/* ---------- main loop ---------- */
let lastSlow = 0, lastSave = 0, lastLine = 0;
function frame() {
  const now = Date.now();
  let dt = (now - S.last) / 1000;
  const m = mods();
  if (dt > 3) { // returned after being away: offline progress at 50%, capped at 8h
    const away = Math.min(dt, 8 * 3600), gain = baseSps(m) * FAST * away * 0.5;
    if (gain > 0) { S.steps += gain; S.runTotal += gain; S.life += gain; toast('While you were away: +' + fmt(gain) + ' Steps'); }
    dt = 0;
  }
  S.last = now;
  if (S.stun > 0) S.stun = Math.max(0, S.stun - dt);

  const p = sps(m) * dt;
  S.steps += p; S.runTotal += p; S.life += p;

  // heat and pursuers
  S.heat += dt * (1.5 + Math.pow(baseSps(m), 0.4) * 0.15) * m.heat;
  if (S.heat >= 100) { S.heat = 0; spawnMan(); }
  for (const q of pursuers.slice()) {
    q.t += dt / (6 * m.walk);
    const pos = q.side < 0 ? q.t * 38 : 100 - q.t * 38;
    q.el.style.left = pos + '%';
    if (m.auto && q.t > 0.55) dodge(q, false);
    else if (q.t >= 1) tugged(q);
  }
  $('#otoole').classList.toggle('stun', S.stun > 0);

  // display
  $('#steps').textContent = fmt(S.steps);
  $('#sps').textContent = fmt(sps(m));
  $('#sole').textContent = S.sole;
  $('#heatFill').style.width = Math.min(100, S.heat) + '%';
  $('#heatNote').textContent = S.stun > 0 ? '· stunned!' : pursuers.length ? '· men approaching!' : '';
  if (now - lastSlow > 150) { lastSlow = now; refreshShop(m); }
  if (now - lastSave > 5000) { lastSave = now; save(); }
  if (now - lastLine > 8000) { lastLine = now; $('#bubble').textContent = LINES[Math.floor(Math.random() * LINES.length)]; }
  requestAnimationFrame(frame);
}

/* ---------- wiring ---------- */
function wire() {
  $('#otoole').addEventListener('pointerdown', hop);
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && !$('#menu').open) {
      e.preventDefault();
      if (pursuers.length) dodge(pursuers[0], true); else hop();
    }
  });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
  }));
  document.querySelectorAll('.buyamt button').forEach(b => b.addEventListener('click', () => {
    buyAmt = +b.dataset.amt;
    document.querySelectorAll('.buyamt button').forEach(x => x.classList.toggle('on', x === b));
  }));
  $('#cutBtn').addEventListener('click', cutaway);
  $('#mute').addEventListener('click', () => { S.muted = !S.muted; });
  const menu = $('#menu');
  $('#menuBtn').addEventListener('click', () => menu.showModal());
  $('#closeMenu').addEventListener('click', () => menu.close());
  $('#saveBtn').addEventListener('click', () => { save(); toast('Saved'); });
  $('#exportBtn').addEventListener('click', () => { save(); $('#saveText').value = btoa(localStorage.getItem(SAVE_KEY)); $('#saveText').select(); });
  $('#importBtn').addEventListener('click', () => {
    try { S = Object.assign(fresh(), JSON.parse(atob($('#saveText').value.trim()))); save(); toast('Save imported'); menu.close(); }
    catch (e) { toast('That save text is not valid'); }
  });
  $('#resetBtn').addEventListener('click', () => {
    if (confirm('Erase everything and start over?')) { S = fresh(); save(); pursuers.forEach(p => p.el.remove()); pursuers = []; menu.close(); }
  });
  window.addEventListener('beforeunload', save);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

load(); buildUI(); wire(); S.last = S.last || Date.now(); requestAnimationFrame(frame);
