/* Sneakers O'Toole — interface: header, panels, tooltips, toasts, modals, box opening, wheel. */
(function (root) {
  'use strict';
  const D = root.DATA, C = root.Core, A = root.Art, Snd = root.Sound, St = root.Stage;
  const U = {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = (n, d) => C.fmt(n, d);
  const S = () => C.get();
  const RC = (r) => D.RARITY[r].color;
  const SNK = {}; D.SNEAKERS.forEach(s => SNK[s.id] = s);
  const TIER_COL = ['#b9c2dd', '#3ddc97', '#4cc9f0', '#b86bff', '#ffb627', '#ff4d6d', '#ff9f1c', '#ffd23f', '#9bf0ff', '#ffffff'];

  /* ---------------- settings ---------------- */
  const SET_KEY = 'sneakersOToole.settings';
  U.set = {
    master: 0.8, music: 0.3, piano: 0.85, sfx: 0.7, voice: 1, no: 1, voiceMode: 'vocals', lineVoice: 'auto', offset: 0, tts: false, autoSound: true,
    particles: 2, shake: true, floaters: true, bgAnim: true, reduce: false, numFmt: 'short', intro: true, confirmCut: true,
    kazoo: false, rainbow: false, rainbowOn: false, muted: false, tab: 'shop', buyAmt: 1,
  };
  try { Object.assign(U.set, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) {}
  if (U.set.voiceMode === 'piano') U.set.voiceMode = 'vocals';
  /* ---------------- keybinds ---------------- */
  const KEY_DEFAULTS = { lane0: 'f', lane1: 'g', lane2: 'h', lane3: 'j', start: ' ', dodge: 'e', golden: 'q', buy: 'b', wheel: 'w', mute: 'm' };
  const KEY_LABELS = { lane0: 'Note row 1 (top)', lane1: 'Note row 2', lane2: 'Note row 3', lane3: 'Note row 4 (bottom)', start: 'Start the song', dodge: 'Dodge the closest tuxedo man', golden: 'Grab the Golden Sneaker', buy: 'Buy the cheapest building', wheel: 'Open the Wheel', mute: 'Mute' };
  U.set.keys = Object.assign({}, KEY_DEFAULTS, U.set.keys || {});
  U.normKey = (k) => k.length === 1 ? k.toLowerCase() : k;
  const KEY_NAMES = { ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Backspace: 'Bksp' };
  U.keyText = (k) => KEY_NAMES[k] || (k.length === 1 ? k.toUpperCase() : k);
  U.keyName = (action) => U.keyText(U.set.keys[action] || '');
  let capture = null;
  U.capturing = () => !!capture;
  function keybindRows() {
    return Object.keys(KEY_DEFAULTS).map(a => `<div class="set-row"><label>${KEY_LABELS[a]}</label><button class="keybtn" data-act="${a}">${esc(U.keyName(a))}</button></div>`).join('');
  }
  function bindKeybinds(el) {
    const refresh = () => { $$('.keybtn', el).forEach(b => { b.textContent = U.keyName(b.dataset.act); b.classList.remove('wait'); }); U.refreshKeys(); };
    $$('.keybtn', el).forEach(b => b.onclick = () => {
      if (capture) capture.cancel();
      b.textContent = 'Press a key…'; b.classList.add('wait');
      const onKey = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.key !== 'Escape' && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key) && !/^[1-6]$/.test(e.key)) {
          const k = U.normKey(e.key), act = b.dataset.act, prev = U.set.keys[act];
          const clash = Object.keys(U.set.keys).find(x => x !== act && U.set.keys[x] === k);
          if (clash) U.set.keys[clash] = prev;   // swap so nothing is left unbound
          U.set.keys[act] = k; U.saveSet();
        }
        stop();
      };
      const stop = () => { document.removeEventListener('keydown', onKey, true); capture = null; refresh(); };
      capture = { cancel: stop };
      document.addEventListener('keydown', onKey, true);
    });
    const r = $('#keysReset', el); if (r) r.onclick = () => { U.set.keys = Object.assign({}, KEY_DEFAULTS); U.saveSet(); refresh(); };
  }
  try { if (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem(SET_KEY) === null) U.set.reduce = true; } catch (e) {}
  U.saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(U.set)); } catch (e) {} };
  U.applySet = () => {
    const s = U.set, m = s.muted ? 0 : 1;
    Object.assign(Snd.vol, { master: s.master * m, music: s.music, piano: s.piano, sfx: s.sfx, voice: s.voice, no: s.no });
    Snd.offset = (s.offset || 0) / 1000;
    Snd.lineVoice = s.lineVoice || 'auto';
    Snd.voice = s.voiceMode; Snd.tts = s.tts; Snd.applyVolumes();
    Object.assign(St.q, { particles: +s.particles, shake: s.shake, floaters: s.floaters, bgAnim: s.bgAnim, reduce: s.reduce });
    C.numFmt = s.numFmt;
    document.body.classList.toggle('reduce', !!s.reduce);
    $('#otoole').classList.toggle('rainbow', !!s.rainbowOn);
    $('#icoMute').innerHTML = A.icon(s.muted ? 'mute' : 'sound');
    U.saveSet();
  };

  /* ---------------- tooltips ---------------- */
  const tip = () => $('#tip');
  let tipEl = null, tipFn = null, pressTimer = null;
  U.tips = {};
  function showTip(el, x, y) {
    const key = el.dataset.tip, fn = U.tips[key.split(':')[0]];
    const html = fn ? fn(key.split(':').slice(1).join(':'), el) : esc(key);
    if (!html) return;
    tipEl = el; const t = tip(); t.innerHTML = html; t.classList.add('on'); placeTip(x, y);
  }
  function placeTip(x, y) {
    const t = tip(), r = t.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    let left = x + 16, top = y + 18;
    if (left + r.width > vw - 8) left = x - r.width - 16;
    if (top + r.height > vh - 8) top = y - r.height - 12;
    t.style.left = Math.max(8, left) + 'px'; t.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tipEl = null; tip().classList.remove('on'); }
  U.refreshTip = () => { if (tipEl && document.body.contains(tipEl)) { const key = tipEl.dataset.tip, fn = U.tips[key.split(':')[0]]; if (fn) tip().innerHTML = fn(key.split(':').slice(1).join(':'), tipEl) || ''; } else if (tipEl) hideTip(); };
  function bindTips() {
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest('[data-tip]');
      if (el && el !== tipEl) showTip(el, e.clientX, e.clientY);
      else if (!el && tipEl) hideTip();
    });
    document.addEventListener('pointermove', (e) => { if (tipEl && e.pointerType !== 'touch') placeTip(e.clientX, e.clientY); });
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      hideTip(); clearTimeout(pressTimer);
      const el = e.target.closest('[data-tip]'); if (!el) return;
      pressTimer = setTimeout(() => showTip(el, e.clientX, e.clientY - 60), 380);
    });
    ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(pressTimer); if (tipEl) setTimeout(hideTip, 1600); }));
    document.addEventListener('scroll', hideTip, true);
  }

  /* ---------------- toasts ---------------- */
  U.toast = (o) => {
    const el = h(`<div class="toast ${o.cls || ''}">${o.icon ? `<div class="tic">${o.icon}</div>` : ''}<div><b>${esc(o.title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</div></div>`);
    const box = $('#toasts'); box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), 4100);
  };

  /* ---------------- modal overlay ---------------- */
  let onCloseModal = null;
  U.modal = (content, opt) => {
    opt = opt || {};
    const ov = $('#overlay'); ov.innerHTML = ''; ov.hidden = false;
    const el = typeof content === 'string' ? h(content) : content;
    ov.appendChild(el);
    onCloseModal = opt.onClose || null;
    ov.onclick = (e) => { if (e.target === ov && !opt.sticky) U.close(); };
    $$('.x', el).forEach(x => x.onclick = () => U.close());
    hideTip();
    return el;
  };
  U.close = () => { if (capture) capture.cancel(); const ov = $('#overlay'); if (ov.hidden) return; ov.hidden = true; ov.innerHTML = ''; const f = onCloseModal; onCloseModal = null; if (f) f(); };
  U.modalOpen = () => !$('#overlay').hidden;
  // two-click confirmation (browser confirm() dialogs are unavailable in some viewers)
  U.armed = (btn, msg) => {
    if (btn.dataset.armed) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML = btn.dataset.label; return true; }
    btn.dataset.label = btn.innerHTML; btn.dataset.armed = 1; btn.classList.add('armed'); btn.textContent = msg;
    setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.classList.remove('armed'); btn.innerHTML = btn.dataset.label; } }, 3500);
    return false;
  };

  /* ---------------- header ---------------- */
  const CHIPS = [
    { id: 'box', icon: 'box', get: () => S().boxes, tip: 'chip:box', show: () => S().boxes > 0 || C.uniqueSneakers() > 0 },
    { id: 'shard', icon: 'shard', get: () => S().shards, tip: 'chip:shard', show: () => S().shards > 0 },
    { id: 'sp', icon: 'sp', get: () => S().sp, tip: 'chip:sp', show: () => S().spTotal > 0 },
    { id: 'gl', icon: 'gl', get: () => S().gl, tip: 'chip:gl', show: () => S().gl > 0 || S().stats.bosses > 0 },
  ];
  let shownSteps = 0;
  function buildHeader() {
    $('#logoSnk').innerHTML = A.logoSneaker();
    $('#bankIco').innerHTML = A.icon('steps');
    $('#icoWheel').innerHTML = A.icon('wheel');
    $('#icoGear').innerHTML = A.icon('gear');
    $('#icoHeat').innerHTML = A.icon('i:tux');
    $('#icoBoss').innerHTML = A.icon('boss');
    $('#bank').dataset.tip = 'bank';
    $('#btnWheel').dataset.tip = 'wheel';
    $('#chips').innerHTML = CHIPS.map(c => `<button class="chip" id="chip-${c.id}" data-tip="${c.tip}:${c.id}" hidden><span class="ci">${A.icon(c.icon)}</span><span class="cv">0</span></button>`).join('');
    $('#chip-box').onclick = () => U.tab('sneakers');
    $('#chip-sp').onclick = () => U.tab(S().cuts ? 'tree' : 'cut');
    $('#chip-gl').onclick = () => U.tab('cut');
    $('#chip-shard').onclick = () => U.tab('sneakers');
  }
  const chipLast = {};
  function updateHeader(dt) {
    const s = S();
    // rolling counter
    const target = s.steps;
    shownSteps = Math.abs(target - shownSteps) < 1 || target < shownSteps * 0.5 ? target : shownSteps + (target - shownSteps) * Math.min(1, dt * 12);
    $('#steps').textContent = f(shownSteps);
    $('#sps').textContent = f(C.sps(), 1);
    CHIPS.forEach(c => {
      const el = $('#chip-' + c.id), v = c.get();
      el.hidden = !c.show();
      if (chipLast[c.id] !== v) { if (chipLast[c.id] !== undefined && v > chipLast[c.id]) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); } chipLast[c.id] = v; el.querySelector('.cv').textContent = f(v); }
    });
    const w = s.wheel;
    $('#wheelDot').hidden = w.charges < 1; $('#wheelDot').textContent = w.charges;
    $('#btnWheel').classList.toggle('ready', w.charges > 0);
    // multiplier tags
    const tags = [];
    s.buffs.forEach(b => { if (b.fx && b.fx.prod) tags.push(`<span class="tag">x${b.fx.prod} ${esc(b.name.split(' ').pop())}</span>`); });
    if (s.stun > 0) tags.push('<span class="tag lace">TUGGED -50%</span>');
    if (s.shinyOToole > 0) tags.push('<span class="tag">SHINY x7</span>');
    const tg = tags.join('');
    if ($('#spsTags').innerHTML !== tg) $('#spsTags').innerHTML = tg;
  }
  U.bumpBank = () => { const b = $('.bank-main'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); };

  /* ---------------- tabs ---------------- */
  const TABS = [
    { id: 'shop', label: 'Shop', icon: 'shop' },
    { id: 'tree', label: 'Lace Tree', icon: 'tree', unlocked: () => S().spTotal > 0 || S().cuts > 0 },
    { id: 'sneakers', label: 'Sneakers', icon: 'gold', unlocked: () => S().stats.boxesOpened > 0 || S().boxes > 0 },
    { id: 'awards', label: 'Awards', icon: 'trophy' },
    { id: 'cut', label: 'Cutaway', icon: 'cut', unlocked: () => S().allSteps >= C.SP_DIV * 0.05 || S().cuts > 0 },
    { id: 'stats', label: 'Stats', icon: 'stats' },
  ];
  const tabSeen = {};
  let curTab = 'shop';
  function buildTabs() {
    $('#tabs').innerHTML = TABS.map(t => `<button class="tab" role="tab" data-t="${t.id}"><span class="tico">${A.icon(t.icon)}</span><span class="tl">${t.label}</span></button>`).join('');
    $$('#tabs .tab').forEach(b => b.onclick = () => { U.tab(b.dataset.t); Snd.fx('tab'); });
  }
  U.tab = (id) => {
    curTab = id; U.set.tab = id; U.saveSet();
    $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.t === id));
    $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + id));
    tabSeen[id] = true;
    renderView(true);
  };
  function updateTabs() {
    TABS.forEach(t => {
      const b = $(`#tabs [data-t="${t.id}"]`), un = !t.unlocked || t.unlocked();
      b.classList.toggle('locked', !un);
      const wasLocked = b.dataset.lk === '1';
      b.dataset.lk = un ? '0' : '1';
      if (wasLocked && un && !tabSeen[t.id]) { if (!b.querySelector('.dot')) b.appendChild(h('<i class="dot"></i>')); }
      if (tabSeen[t.id]) { const d = b.querySelector('.dot'); if (d) d.remove(); }
      b.dataset.tip = un ? '' : 'tablock:' + t.id;
      if (un) delete b.dataset.tip;
    });
  }

  /* ---------------- views ---------------- */
  const views = {};
  let lastRender = 0;
  function renderView(force) { const v = views[curTab]; if (v) v(force); }

  /* ----- shop ----- */
  let upSig = '', bldBuilt = false;
  views.shop = (force) => {
    const root_ = $('#v-shop'), s = S(), m = C.mods();
    if (!bldBuilt) {
      root_.innerHTML = `
        <div class="sec-h"><h3>Upgrades</h3><small id="upInfo"></small></div>
        <div class="ups" id="ups"></div>
        <div class="sec-h"><h3>Buildings</h3><div class="seg" id="buyAmt">${[1, 10, 100, 'max'].map(n => `<button data-n="${n}">${n === 'max' ? 'Max' : 'x' + n}</button>`).join('')}</div></div>
        <div class="toggle-row" id="autoTg"></div>
        <div id="blds">${D.BUILDINGS.map((b, i) => `<button class="bld" data-b="${b.id}" data-tip="bld:${b.id}"><span class="bic">${A.icon('b:' + b.id)}</span><span class="binfo"><div class="bn">${esc(b.name)}</div><div class="bcost"><span class="ci">${A.icon('steps')}</span><span class="bc">0</span></div><div class="brate"></div></span><span class="bcnt">0</span><i class="bprog"></i></button>`).join('')}</div>
        <div class="card shop-foot" data-tip="boxshop"><span style="width:64px;flex:none">${A.shoebox()}</span><div style="flex:1;min-width:0"><h4>Mystery Shoebox</h4><p>Could be anything. Probably sneakers.</p></div><button class="btn sm" id="buyBox">Buy</button></div>`;
      $$('#buyAmt button').forEach(b => b.onclick = () => { U.set.buyAmt = b.dataset.n === 'max' ? 'max' : +b.dataset.n; U.saveSet(); Snd.fx('ui'); views.shop(true); });
      $$('#blds .bld').forEach(el => el.onclick = (e) => {
        const id = el.dataset.b;
        if (C.buy(id, U.set.buyAmt)) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); const r = el.getBoundingClientRect(); U.coinBurst(r.left + 30, r.top + 30); }
        else Snd.fx('cant');
        views.shop(true); U.refreshTip();
      });
      $('#buyBox').onclick = () => { if (C.buyBox()) { Snd.fx('buy', 3); } else Snd.fx('cant'); views.shop(true); };
      bldBuilt = true;
    }
    $$('#buyAmt button').forEach(b => b.classList.toggle('on', String(U.set.buyAmt) === b.dataset.n));
    // upgrades
    const ups = C.availableUpgrades(), sig = ups.map(u => u.id).join(',');
    if (sig !== upSig) {
      upSig = sig;
      $('#ups').innerHTML = ups.length ? ups.map(u => `<button class="up" data-u="${u.id}" data-tip="up:${u.id}" style="--tc:${TIER_COL[u.tier || 0]}">${A.icon(u.icon)}</button>`).join('') : '';
      $$('#ups .up').forEach(el => el.onclick = () => {
        const u = C.UP[el.dataset.u];
        if (C.buyUpgrade(u.id)) { el.classList.add('bought'); const r = el.getBoundingClientRect(); U.coinBurst(r.left + r.width / 2, r.top + r.height / 2, true); setTimeout(() => views.shop(true), 300); }
        else Snd.fx('cant');
        U.refreshTip();
      });
    }
    $('#upInfo').textContent = ups.length ? ups.length + ' available' : 'None right now';
    $$('#ups .up').forEach(el => { const u = C.UP[el.dataset.u]; if (!u) return; const can = s.steps >= u.cost; el.classList.toggle('can', can); el.classList.toggle('cant', !can); });
    if (!ups.length && !$('#ups .ups-empty')) $('#ups').innerHTML = '<div class="ups-empty">Buy buildings and play to unlock upgrades.</div>';
    // automation toggles
    const tg = [];
    if (s.locker.autobuy) tg.push(['autobuy', 'Building Manager']);
    if (s.locker.autoup) tg.push(['autoup', 'Upgrade Intern']);
    const tsig = tg.map(t => t[0] + s.toggles[t[0]]).join();
    if ($('#autoTg').dataset.sig !== tsig) {
      $('#autoTg').dataset.sig = tsig;
      $('#autoTg').innerHTML = tg.map(([k, n]) => `<button class="toggle ${s.toggles[k] ? 'on' : ''}" data-k="${k}"><i></i>${n}</button>`).join('');
      $$('#autoTg .toggle').forEach(b => b.onclick = () => { s.toggles[b.dataset.k] = !s.toggles[b.dataset.k]; Snd.fx('ui'); views.shop(true); });
    }
    // buildings
    let teaserShown = false;
    D.BUILDINGS.forEach((b, i) => {
      const el = $(`#blds [data-b="${b.id}"]`), un = C.bldUnlocked(i), own = s.b[b.id] || 0;
      if (!un) { el.hidden = teaserShown; el.classList.add('hidden'); teaserShown = true; el.querySelector('.bc').textContent = f(C.cost(b, 1)); el.querySelector('.brate').textContent = 'Keep hopping to discover this'; el.querySelector('.bcnt').textContent = ''; return; }
      el.hidden = false; el.classList.remove('hidden');
      let n = U.set.buyAmt === 'max' ? Math.max(1, C.maxAfford(b)) : U.set.buyAmt;
      n = Math.min(n, Math.max(1, C.capFor(b)));
      const cost = C.cost(b, n);
      el.querySelector('.bc').textContent = (n > 1 ? 'x' + n + ' · ' : '') + f(cost);
      el.querySelector('.brate').textContent = f(C.bldRate(b, m), 1) + '/s each' + (own ? ' · ' + f(C.bldRate(b, m) * own, 1) + '/s total' : '');
      el.querySelector('.bcnt').textContent = own;
      el.classList.toggle('cant', s.steps < cost || C.capFor(b) < 1);
      const nextTier = D.TIERS.find(t => t.at > own), prevAt = D.TIERS.filter(t => t.at <= own).pop();
      el.querySelector('.bprog').style.width = nextTier ? ((own - (prevAt ? prevAt.at : 0)) / (nextTier.at - (prevAt ? prevAt.at : 0)) * 100) + '%' : '100%';
    });
    const bp = C.shoeboxPrice();
    $('#buyBox').textContent = f(bp);
    $('#buyBox').disabled = s.steps < bp;
  };
  U.coinBurst = (x, y, big) => {
    const sr = $('#stage').getBoundingClientRect();
    Snd.fx(big ? 'upgrade' : 'buy', 1);
    // little sparkle at the button
    const el = h('<div style="position:fixed;left:0;top:0;pointer-events:none;z-index:80"></div>');
    document.body.appendChild(el);
    for (let i = 0; i < (big ? 10 : 5); i++) {
      const p = h(`<span style="position:absolute;width:16px;height:16px;left:${x}px;top:${y}px">${A.icon(big ? 'star' : 'steps')}</span>`);
      el.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d - 8}px, ${Math.sin(a) * d - 8}px) scale(.3) rotate(180deg)`, opacity: 0 }], { duration: 500 + Math.random() * 300, easing: 'ease-out', fill: 'forwards' });
    }
    setTimeout(() => el.remove(), 900);
  };

  /* ----- lace tree ----- */
  let treeBuilt = false, treeSel = 'root', pan = { x: 0, y: 0, z: 1 }, treeSig = '';
  const SP = 78;
  views.tree = (force) => {
    const v = $('#v-tree'), s = S();
    if (!treeBuilt) {
      v.innerHTML = `<div class="tree-wrap" id="treeWrap"><svg id="treeSvg"><g id="treeG"></g></svg>
        <div class="tree-hud"><div class="chip" data-tip="chip:sp"><span class="ci">${A.icon('sp')}</span><span id="treeSp">0</span>&nbsp;<small class="muted">Sole Power</small></div>
        <div class="zoom"><button id="zIn">+</button><button id="zOut">−</button><button id="zHome">⌂</button></div></div>
        <div class="tree-info" id="treeInfo"></div><div class="tree-lock" id="treeLock" hidden><div><div style="width:90px;margin:0 auto">${A.icon('tree')}</div><h4>The Lace Tree</h4><p class="muted">Do your first Cutaway to earn Sole Power.<br>Spend it here on permanent upgrades that survive every Cutaway.</p></div></div></div>`;
      const wrap = $('#treeWrap');
      let drag = null;
      wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.tnode, .zoom, .tree-info, .chip')) return; drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; wrap.setPointerCapture(e.pointerId); });
      wrap.addEventListener('pointermove', (e) => { if (!drag) return; pan.x = drag.px + e.clientX - drag.x; pan.y = drag.py + e.clientY - drag.y; applyPan(); });
      wrap.addEventListener('pointerup', () => { drag = null; });
      wrap.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
      $('#zIn').onclick = () => zoom(1.2); $('#zOut').onclick = () => zoom(1 / 1.2); $('#zHome').onclick = () => { centerTree(); };
      treeBuilt = true; centerTree();
    }
    $('#treeLock').hidden = s.spTotal > 0 || s.cuts > 0;
    $('#treeSp').textContent = f(s.sp);
    const sig = D.TREE.map(n => (s.tree[n.id] || 0) + (C.treeAvail(n) ? 'a' : '') + (s.sp >= C.treeCost(n) ? 'c' : '')).join('') + treeSel;
    if (sig !== treeSig || force) { treeSig = sig; drawTree(); }
  };
  function centerTree() { const w = $('#treeWrap'); if (!w) return; pan = { x: w.clientWidth / 2, y: w.clientHeight / 2 - 30, z: Math.min(1, w.clientWidth / 900 + 0.35) }; applyPan(); }
  function zoom(k) { const w = $('#treeWrap'), cx = w.clientWidth / 2, cy = w.clientHeight / 2; const z = Math.max(0.35, Math.min(2, pan.z * k)); pan.x = cx - (cx - pan.x) * z / pan.z; pan.y = cy - (cy - pan.y) * z / pan.z; pan.z = z; applyPan(); }
  function applyPan() { const g = $('#treeG'); if (g) g.setAttribute('transform', `translate(${pan.x} ${pan.y}) scale(${pan.z})`); }
  function drawTree() {
    const s = S(), g = $('#treeG');
    let lines = '', nodes = '';
    D.TREE.forEach(n => {
      if (!n.req) return;
      const p = C.TREE[n.req], own = (s.tree[n.id] || 0) > 0, col = D.BRANCHES[n.br].color;
      lines += `<line x1="${p.x * SP}" y1="${p.y * SP}" x2="${n.x * SP}" y2="${n.y * SP}" stroke="${own ? col : '#4b3d9a'}" stroke-width="${own ? 8 : 5}" stroke-linecap="round" ${own ? '' : 'stroke-dasharray="2 10"'}/>`;
    });
    D.TREE.forEach(n => {
      const lv = s.tree[n.id] || 0, own = lv > 0, av = C.treeAvail(n), can = av && s.sp >= C.treeCost(n) && lv < n.max, col = D.BRANCHES[n.br].color;
      const cls = ['tnode', own ? 'own' : '', !av ? 'locked' : '', av && !own ? 'avail' : '', can ? 'can' : '', treeSel === n.id ? 'sel' : ''].join(' ');
      const r = n.id === 'root' ? 34 : n.max > 1 ? 30 : 26;
      const icon = n.id === 'root' ? 'sp' : (n.fx.prod ? 'prod' : n.fx.click ? 'click' : n.fx.verse ? 'lyric' : n.fx.comboCap || n.fx.comboWin ? 'combo' : n.fx.auto ? 'note' : n.fx.crit || n.fx.critMult ? 'crit' : n.fx.kick || n.fx.kickMult ? 'kick' : n.fx.heat ? 'heat' : n.fx.guard ? 'tux' : n.fx.enemyReward ? 'tux' : n.fx.bossTime || n.fx.bossGl ? 'boss' : n.fx.luck ? 'luck' : n.fx.gold || n.fx.goldDur ? 'gold' : n.fx.box ? 'box' : n.fx.wheel ? 'wheel' : n.fx.shiny ? 'star' : n.fx.shards ? 'shard' : n.fx.offline ? 'clock' : n.fx.cost ? 'shop' : n.fx.headStart ? 'kid' : n.fx.pity ? 'box' : n.fx.spEff ? 'sp' : n.fx.verseShock ? 'crit' : n.fx.tug ? 'kick' : 'star');
      nodes += `<g class="${cls}" data-n="${n.id}" transform="translate(${n.x * SP} ${n.y * SP})" data-tip="tree:${n.id}">
        <circle class="ring" r="${r + 6}" fill="${col}" opacity="${can ? 0.35 : 0}"/>
        <circle class="base" r="${r}" fill="${own ? col : '#2b2166'}"/>
        <g transform="translate(${-r * 0.62} ${-r * 0.62}) scale(${r * 1.24 / 64})">${A.I[icon] || A.I.star}</g>
        ${n.max > 1 && lv ? `<g transform="translate(${r * 0.7} ${r * 0.7})"><circle r="11" fill="#1b1330"/><text y="4.5" text-anchor="middle" font-size="12" fill="#fff" font-family="Lilita One, sans-serif">${lv}</text></g>` : ''}
      </g>`;
    });
    g.innerHTML = lines + nodes;
    $$('.tnode', g).forEach(el => el.onclick = () => { treeSel = el.dataset.n; Snd.fx('ui'); treeSig = ''; views.tree(); });
    const n = C.TREE[treeSel], lv = s.tree[n.id] || 0, cost = C.treeCost(n), av = C.treeAvail(n);
    const maxed = lv >= n.max;
    $('#treeInfo').innerHTML = `<div class="ti-t"><h4 style="color:${D.BRANCHES[n.br].color}">${esc(n.name)}${n.max > 1 ? ` <small class="muted">Lv ${lv}/${n.max}</small>` : ''}</h4><p>${esc(n.desc)}</p></div>
      <button class="btn ${maxed ? 'ghost' : 'gold'}" id="treeBuy" ${!av || maxed || s.sp < cost ? 'disabled' : ''}>${maxed ? 'Owned' : !av ? 'Locked' : `<span style="width:20px">${A.icon('sp')}</span> ${f(cost)}`}</button>`;
    const bb = $('#treeBuy'); if (bb) bb.onclick = () => {
      if (C.buyTree(n.id)) { Snd.fx('upgrade'); Snd.fx('star'); const r = bb.getBoundingClientRect(); U.coinBurst(r.left + r.width / 2, r.top, true); treeSig = ''; views.tree(true); }
    };
  }

  /* ----- sneakers ----- */
  let snkSig = '';
  const FXT = {
    prod: v => `+${Math.round(v * 100)}% production`, click: v => `+${Math.round(v * 100)}% click power`, kick: v => `+${f(v, 1)} dodge power`,
    luck: v => `+${Math.round(v * 100)}% luck`, offline: v => `+${Math.round(v * 100)}% offline progress`, verse: v => `+${Math.round(v * 100)}% verse bonus`,
    heat: v => `Heat builds ${Math.round(-v * 100)}% slower`, crit: v => `+${(v * 100).toFixed(1)}% crit chance`, combo: v => `+${Math.round(v)} combo cap`,
    box: v => `+${Math.round(v * 100)}% Shoebox drops`, gold: v => `Golden Sneakers ${Math.round(v * 100)}% more often`, auto: v => `+${f(v, 1)} auto-sung words/sec`,
  };
  U.fxText = (sn, v) => FXT[sn.fx.k] ? FXT[sn.fx.k](v) : '';
  views.sneakers = (force) => {
    const v = $('#v-sneakers'), s = S();
    const sig = [s.boxes, s.shards, C.slots(), s.equip.join(), JSON.stringify(s.sneakers), s.toggles.autobox, s.locker.autobox].join('|');
    if (sig === snkSig && !force) return;
    snkSig = sig;
    const caps = C.pityCaps(), uniq = C.uniqueSneakers(), total = D.SNEAKERS.filter(x => !x.secret).length, m = C.mods();
    const slots = C.slots();
    v.innerHTML = `
      <div class="card boxcard">
        <div class="boxpile ${s.boxes ? 'shake' : ''}" id="boxPile">${A.shoebox()}${s.boxes ? `<span class="bn">${f(s.boxes)}</span>` : ''}</div>
        <div style="flex:1;min-width:0">
          <h4>${s.boxes ? f(s.boxes) + ' Shoebox' + (s.boxes === 1 ? '' : 'es') : 'No Shoeboxes'}</h4>
          <p>Epic or better in <b>${Math.max(1, caps.e - s.pity.e)}</b> · Legendary in <b>${Math.max(1, caps.l - s.pity.l)}</b></p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
            <button class="btn sm" id="open1" ${s.boxes < 1 ? 'disabled' : ''}>Open 1</button>
            <button class="btn sm sky" id="open10" ${s.boxes < 2 ? 'disabled' : ''}>Open ${Math.min(10, Math.max(2, s.boxes))}</button>
            ${s.boxes > 10 ? `<button class="btn sm grape" id="openAll">Open all</button>` : ''}
            ${s.locker.autobox ? `<button class="toggle ${s.toggles.autobox ? 'on' : ''}" id="autoBox"><i></i>Auto-open</button>` : ''}
          </div>
        </div>
      </div>
      <div class="sec-h"><h3>Wearing</h3><small>${slots} slots</small></div>
      <div class="slots" style="margin-bottom:12px">${Array.from({ length: 5 }, (_, i) => {
        if (i >= slots) return `<div class="slot lockedslot" data-tip="slotlock:${i}"><span style="width:26px">${A.icon('lock')}</span></div>`;
        const id = s.equip[i]; if (!id || !s.sneakers[id]) return `<div class="slot">Empty slot<br>Tap a sneaker below</div>`;
        const sn = SNK[id];
        return `<button class="slot full" data-eq="${id}" data-tip="snk:${id}" style="--rc:${RC(sn.r)}">${A.sneaker(sn)}<span style="font:400 .72rem/1.1 var(--font-d)">${esc(U.fxText(sn, C.sneakerValue(id)))}</span></button>`;
      }).join('')}</div>
      <div class="sec-h"><h3>Collection</h3><small>${uniq}/${total} · +${Math.round(m.collection * 100)}% production · <span style="display:inline-block;width:16px;vertical-align:-3px">${A.icon('shard')}</span> ${f(s.shards)} shards</small></div>
      <div class="coll">${D.SNEAKERS.filter(sn => !sn.secret || s.sneakers[sn.id]).sort((a, b) => a.r - b.r).map(sn => {
        const o = s.sneakers[sn.id];
        const eq = s.equip.slice(0, slots).includes(sn.id);
        return `<button class="snk-card ${o ? '' : 'unknown'} ${o && o.shiny ? 'shiny' : ''}" data-s="${sn.id}" data-tip="snk:${sn.id}" style="--rc:${RC(sn.r)}">
          ${eq ? '<span class="eq tag mint">ON</span>' : ''}${A.sneaker(sn)}
          <div class="sn">${o ? esc(sn.name) : '???'}</div>
          <div class="rar">${D.RARITY[sn.r].name}</div>
          ${o ? `<div class="stars">${'★'.repeat(o.star)}${'☆'.repeat(5 - o.star)}</div>` : ''}
        </button>`;
      }).join('')}</div>`;
    const ob = (n) => () => U.openBoxes(n);
    if ($('#open1')) $('#open1').onclick = ob(1);
    if ($('#open10')) $('#open10').onclick = ob(Math.min(10, s.boxes));
    if ($('#openAll')) $('#openAll').onclick = ob(s.boxes);
    if ($('#autoBox')) $('#autoBox').onclick = () => { s.toggles.autobox = !s.toggles.autobox; Snd.fx('ui'); views.sneakers(true); };
    $('#boxPile').onclick = () => { if (s.boxes) U.openBoxes(1); };
    $$('.slot.full').forEach(el => el.onclick = () => { C.equip(el.dataset.eq); Snd.fx('ui'); views.sneakers(true); });
    $$('.snk-card').forEach(el => el.onclick = () => { if (s.sneakers[el.dataset.s]) U.sneakerModal(el.dataset.s); });
  };
  U.sneakerModal = (id) => {
    const s = S(), sn = SNK[id], o = s.sneakers[id];
    const v = C.sneakerValue(id), cost = C.starCost(id), eq = s.equip.slice(0, C.slots()).includes(id);
    const nextV = o.star < 5 ? sn.fx.v * D.STAR_MULT[o.star + 1] * (o.shiny ? 2 : 1) : null;
    const el = U.modal(`<div class="modal" style="text-align:center;--rc:${RC(sn.r)}"><button class="x">✕</button>
      <div class="reveal" style="margin:0;opacity:1;transform:none"><div class="rsn">${A.sneaker(sn)}</div></div>
      <div class="rar">${o.shiny ? 'Shiny ' : ''}${D.RARITY[sn.r].name}</div>
      <h2 style="margin:4px 0">${esc(sn.name)}</h2>
      <div class="stars" style="color:var(--gold);font-size:1.4rem">${'★'.repeat(o.star)}${'☆'.repeat(5 - o.star)}</div>
      <p class="muted"><i>${esc(sn.desc)}</i></p>
      <p><b>${esc(U.fxText(sn, v))}</b> while worn${nextV !== null ? ` <span class="muted">→ ${esc(U.fxText(sn, nextV))} at ${o.star + 1}★</span>` : ''}</p>
      <p class="muted">Found ${o.n} time${o.n === 1 ? '' : 's'}${o.shiny ? ' · Shiny: effect x2' : ''}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
        <button class="btn ${eq ? 'ghost' : 'mint'}" id="snkEq">${eq ? 'Take off' : 'Wear'}</button>
        ${o.star < 5 ? `<button class="btn grape" id="snkStar" ${s.shards < cost ? 'disabled' : ''}><span style="width:20px">${A.icon('shard')}</span> ${f(cost)} · Star up</button>` : '<span class="tag">MAX STARS</span>'}
      </div></div>`);
    $('#snkEq', el).onclick = () => {
      if (!C.equip(id)) { U.toast({ title: 'All slots are full', sub: 'Take off a sneaker first.' }); Snd.fx('error'); return; }
      Snd.fx('ui'); U.close(); views.sneakers(true);
    };
    const sb = $('#snkStar', el); if (sb) sb.onclick = () => { if (C.starUp(id)) { Snd.fx('star'); U.sneakerModal(id); views.sneakers(true); } };
  };

  /* ----- box opening ----- */
  U.openBoxes = (n) => {
    const res = C.openBoxes(n); if (!res.length) return;
    views.sneakers(true);
    if (res.length === 1) return revealOne(res[0]);
    revealMany(res);
  };
  function revealOne(r) {
    const sn = r.sn, rc = RC(sn.r), shakes = Math.min(4, 1 + Math.floor(sn.r / 1.5));
    const el = U.modal(`<div class="boxopen" style="--rc:${rc}"><div class="rays"></div>
      <div class="bigbox" id="bigBox">${A.shoebox(rc)}</div>
      <div class="reveal"><div class="rsn">${A.sneaker(sn)}</div>
        <div class="rar">${r.shiny ? '✦ SHINY ✦ ' : ''}${D.RARITY[sn.r].name}</div>
        <h3>${esc(sn.name)}</h3>
        <p>${r.isNew ? '<span class="newtag">NEW!</span> ' : r.shinyUpgrade ? '<span class="newtag">NOW SHINY!</span> ' : `Duplicate · +${r.shards} Lace Shards`}</p>
        <p class="muted">${esc(U.fxText(sn, sn.fx.v))} while worn</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">${S().boxes ? `<button class="btn" id="again">Open another (${S().boxes})</button>` : ''}<button class="btn ghost" id="done">Nice!</button></div>
      </div></div>`, { sticky: true });
    const box = $('#bigBox', el); let i = 0;
    const shake = () => {
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); Snd.fx('boxShake', i);
      if (++i < shakes) setTimeout(shake, 380);
      else setTimeout(() => {
        el.classList.add('revealed'); Snd.fx('boxOpen', sn.r); if (r.shiny) Snd.fx('shiny');
        if (sn.r >= 3 || r.shiny) U.confetti(sn.r >= 4 ? 120 : 60);
      }, 420);
    };
    setTimeout(shake, 200);
    $('#done', el).onclick = () => U.close();
    const ag = $('#again', el); if (ag) ag.onclick = () => U.openBoxes(1);
    el.onclick = (e) => { if (!el.classList.contains('revealed') && e.target.closest('.boxopen')) { i = shakes; } };
  }
  function revealMany(res) {
    const best = res.slice().sort((a, b) => b.sn.r - a.sn.r || (b.shiny - a.shiny))[0];
    const show = res.length > 10 ? res.slice().sort((a, b) => b.sn.r - a.sn.r).slice(0, 10) : res;
    const news = res.filter(r => r.isNew).length, shards = res.reduce((a, r) => a + r.shards, 0);
    const el = U.modal(`<div class="modal" style="width:min(640px,100%);text-align:center"><button class="x">✕</button>
      <h2>${res.length} Shoeboxes opened!</h2>
      <div class="multi">${show.map(r => `<div class="snk-card ${r.shiny ? 'shiny' : ''}" style="--rc:${RC(r.sn.r)}">${r.isNew ? '<span class="eq tag mint">NEW</span>' : ''}${A.sneaker(r.sn)}<div class="sn">${esc(r.sn.name)}</div><div class="rar">${D.RARITY[r.sn.r].name}</div></div>`).join('')}</div>
      <p class="muted">${news} new · +${f(shards)} Lace Shards${res.length > 10 ? ' · showing the best 10' : ''}</p>
      <button class="btn" id="done">Sweet</button></div>`);
    const cards = $$('.multi .snk-card', el);
    cards.forEach((c, i) => setTimeout(() => { c.classList.add('flip'); Snd.fx('boxOpen', Math.min(2, show[i].sn.r)); }, 150 + i * 140));
    setTimeout(() => { Snd.fx('boxOpen', best.sn.r); if (best.sn.r >= 3) U.confetti(80); }, 150 + cards.length * 140);
    $('#done', el).onclick = () => U.close();
  }
  U.confetti = (n) => {
    const { W } = St.size();
    St.burst('confetti', W / 2, 40, n, { speed: 500, gravity: 700, size: 12, colors: ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc97', '#b86bff', '#ff9f1c'], life: 2.2, angle: Math.PI / 2, spread: 3 });
  };

  /* ----- awards ----- */
  const ACH_G = (id) => {
    const p = [['steps', 'steps', '#ff9f1c'], ['sps', 'clock', '#4cc9f0'], ['clicks', 'click', '#ffd23f'], ['verse', 'lyric', '#3ddc97'], ['perfect', 'note', '#ff4d6d'], ['combo', 'combo', '#ff9f1c'], ['crit', 'crit', '#ffd23f'],
      ['b50_', null, '#4cc9f0'], ['ball', 'shop', '#3ddc97'], ['b100all', 'shop', '#ffd23f'], ['enemy', 'tux', '#ff4d6d'], ['boss', 'boss', '#ff4d6d'], ['goldtux', 'gold', '#ffd23f'], ['tug', 'kick', '#b86bff'],
      ['box', 'box', '#ff9f1c'], ['rar', 'star', '#b86bff'], ['shiny', 'star', '#ffd23f'], ['coll', 'coll', '#4cc9f0'], ['star5', 'star', '#ffd23f'], ['gold', 'gold', '#ffd23f'], ['wheel', 'wheel', '#3ddc97'], ['jackpot', 'wheel', '#ff4d6d'],
      ['event', 'camera', '#4cc9f0'], ['cut', 'cut', '#ff9f1c'], ['tree', 'tree', '#3ddc97'], ['ch', 'fame', '#b86bff'], ['up', 'fame', '#4cc9f0'], ['play', 'clock', '#b9c2dd'], ['egg', 'egg', '#ff4df0']];
    for (const [k, g, c] of p) if (id.startsWith(k)) return [g || id.slice(4), c];
    return ['star', '#ffd23f'];
  };
  let achSig = '';
  views.awards = (force) => {
    const s = S(), v = $('#v-awards'), sig = Object.keys(s.ach).length + '|' + C.mods().fame;
    if (sig === achSig && !force) return; achSig = sig;
    const got = Object.keys(s.ach).length, total = C.ACH.length, m = C.mods();
    const vis = C.ACH.filter(a => !a.hidden || s.ach[a.id]);
    const secretsLeft = C.ACH.filter(a => a.hidden && !s.ach[a.id]).length;
    v.innerHTML = `<div class="card"><h4>${got} / ${total} awards</h4><p>Each award gives <b>+${Math.round(m.fame * 100) / 100}%</b> production. Total: <b>+${Math.round(m.achBonus * 100)}%</b></p><div class="progress-big"><i style="width:${got / total * 100}%"></i></div><p class="muted">${secretsLeft} secret award${secretsLeft === 1 ? '' : 's'} still hidden. Try things. Type things.</p></div>
      <div class="ach-grid">${vis.map(a => { const [g, c] = ACH_G(a.id); return `<div class="ach" data-tip="ach:${a.id}">${A.badge(g, c, !s.ach[a.id])}</div>`; }).join('')}${Array.from({ length: secretsLeft }, () => `<div class="ach" data-tip="achsecret">${A.badge('egg', '#333', true)}</div>`).join('')}</div>`;
  };

  /* ----- cutaway ----- */
  let cutSig = '';
  views.cut = (force) => {
    const s = S(), v = $('#v-cut'), gain = C.spGain(), m = C.mods();
    const sig = [gain, s.sp, s.spTotal, s.gl, JSON.stringify(s.locker), JSON.stringify(s.chDone), s.challenge, s.cuts, Math.floor(s.allSteps / C.nextSpAt() * 50)].join('|');
    if (sig === cutSig && !force) return; cutSig = sig;
    const next = C.nextSpAt(), prevAt = Math.pow(C.spFor(s.allSteps), 3) * C.SP_DIV;
    const prog = Math.max(0, Math.min(1, (s.allSteps - prevAt) / (next - prevAt)));
    const nextScene = D.SCENES[(s.cuts + 1) % D.SCENES.length];
    const good = gain >= Math.max(1, s.spTotal * 0.5);
    let html = `<div class="card cut-hero">
      <div class="clap">${A.icon('cut')}</div>
      <p>A Cutaway right now earns</p>
      <div class="big-n">+${f(gain)} <span style="font-size:.5em">Sole Power</span></div>
      <p>Next Sole Power at <b>${f(next)}</b> lifetime Steps</p>
      <div class="progress-big"><i style="width:${prog * 100}%"></i></div>
      <p>You have <b>${f(s.sp)}</b> to spend (<b>${f(s.spTotal)}</b> earned) → <b>+${f(m.spBonus * 100)}%</b> production</p>
      <button class="btn big ${good ? 'gold' : ''}" id="doCut" ${gain < 1 ? 'disabled' : ''}>Cut to ${esc(nextScene)}</button>
      <p class="muted" style="font-size:.85rem;margin-top:10px">${gain < 1 ? 'Earn more Steps to unlock your first Cutaway.' : good ? 'Good time to cut away!' : 'Tip: waiting until you\'d gain at least half your current Sole Power makes each run count.'}<br>Resets Steps, buildings and upgrades. Keeps Sole Power, sneakers, awards, the Lace Tree and Golden Laces.</p>
    </div>`;
    if (C.challengeUnlocked()) {
      html += `<div class="sec-h"><h3>Special Episodes</h3><small>${Object.keys(s.chDone).length}/${D.CHALLENGES.length} done</small></div><div class="challenges" style="margin-bottom:12px">` +
        D.CHALLENGES.map(ch => {
          const done = s.chDone[ch.id], act = s.challenge === ch.id;
          return `<div class="lk ${done ? 'done' : ''} ${act ? 'owned' : ''}"><h5>${esc(ch.name)} ${done ? '<span class="tag mint">DONE</span>' : ''}</h5><p>${esc(ch.desc)}<br><b style="color:var(--text)">Goal:</b> ${f(ch.goal)} Steps this run<br><b style="color:var(--gold)">Reward:</b> ${esc(ch.reward)}</p>
            ${act ? `<button class="btn sm lace" data-ab="1">Abandon</button>` : done ? '' : `<button class="btn sm grape" data-ch="${ch.id}" ${s.challenge ? 'disabled' : ''}>Start${gain >= 1 ? ` (+${f(gain)} SP)` : ''}</button>`}</div>`;
        }).join('') + '</div>';
    } else html += `<div class="card"><h4>Special Episodes</h4><p>Challenge runs with permanent rewards. Unlock after 3 Cutaways.</p></div>`;
    if (s.gl > 0 || s.stats.bosses > 0 || Object.keys(s.locker).length) {
      html += `<div class="sec-h"><h3>Golden Lace Locker</h3><small><span style="display:inline-block;width:18px;vertical-align:-4px">${A.icon('gl')}</span> ${f(s.gl)} · Bosses drop Golden Laces</small></div><div class="locker">` +
        D.LOCKER.map(it => {
          const lv = s.locker[it.id] || 0, max = it.max || 1, own = lv >= max, cost = C.lockerCost(it), lockedReq = it.req && !s.locker[it.req];
          return `<div class="lk ${own ? 'owned' : ''}"><h5>${esc(it.name)}${max > 1 && lv ? ` <small class="muted">Lv ${lv}</small>` : ''}</h5><p>${esc(it.desc)}</p>
            ${own ? '<span class="tag mint">OWNED</span>' : `<button class="btn sm gold" data-lk="${it.id}" ${s.gl < cost || lockedReq ? 'disabled' : ''}>${lockedReq ? 'Needs previous' : `<span style="width:16px">${A.icon('gl')}</span> ${f(cost)}`}</button>`}</div>`;
        }).join('') + '</div>';
    }
    v.innerHTML = html;
    const cb = $('#doCut');
    if (cb) cb.onclick = () => { if (U.set.confirmCut && !U.armed(cb, 'Click again to cut away!')) return; U.cutaway(); };
    $$('[data-ch]', v).forEach(b => b.onclick = () => { if (!U.armed(b, 'Click again to start')) return; U.cutaway(b.dataset.ch); });
    $$('[data-ab]', v).forEach(b => b.onclick = () => { if (!U.armed(b, 'Click again')) return; C.abandonChallenge(); views.cut(true); });
    $$('[data-lk]', v).forEach(b => b.onclick = () => { if (C.buyLocker(b.dataset.lk)) { Snd.fx('upgrade'); views.cut(true); views.sneakers(true); } });
  };

  /* ----- stats ----- */
  views.stats = () => {
    const s = S(), st = s.stats, m = C.mods();
    const rows = [
      ['Steps this run', f(s.runSteps)], ['Lifetime Steps', f(s.allSteps)], ['Steps per second', f(C.sps(), 1)], ['Best Steps per second', f(st.bestSps, 1)],
      ['Steps per click', f(C.clickBase(m) * C.comboMult(), 1)], ['Total production multiplier', 'x' + f(m.global, 2)],
      ['Clicks', f(st.manualClicks)], ['Songs played', f(s.songs || 0)], ['Words hit on the beat', f(st.hits)], ['Perfect hits', f(st.perfectHits)], ['Misses', f(st.misses)], ['Accuracy', Math.round(C.accuracy() * 100) + '%'], ['Words sung (incl. auto)', f(st.clicks)], ['Verses sung', f(st.verses)], ['Perfect Verses', f(st.perfect)], ['Best verse', f(st.bestVerse)], ['Best combo', f(st.bestCombo)], ['Critical clicks', f(st.crits)],
      ['Buildings owned', f(C.totalBuildings())], ['Upgrades bought (all time)', f(st.upgrades)],
      ['Tuxedo men escaped', f(st.enemies)], ['Bosses outlasted', f(st.bosses)], ['Times tugged', f(st.tugs)], ['Dodge power', f(m.kickDmg, 1)], ['Luck', '+' + Math.round(m.luck * 100) + '%'], ['Crit chance', (m.crit * (1 + m.luck * 0.5) * 100).toFixed(1) + '%'],
      ['Golden Sneakers clicked', f(st.golden)], ['Shoeboxes opened', f(st.boxesOpened)], ['Shiny sneakers found', f(st.shinies)], ['Wheel spins', f(st.wheelSpins)], ['Random events', f(st.events)],
      ['Cutaways', f(s.cuts)], ['Sole Power earned', f(s.spTotal)], ['Golden Laces', f(s.gl)], ['Awards', Object.keys(s.ach).length + '/' + C.ACH.length],
      ['Time played', C.time(st.play)], ['Started', new Date(s.created).toLocaleDateString()],
    ];
    $('#v-stats').innerHTML = `<div class="card"><h4>Stats</h4><dl class="stat-list">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
  };

  /* ---------------- tooltips content ---------------- */
  const costLine = (cost, have, icon) => `<p class="tcost ${have < cost ? 'no' : ''}"><span style="display:inline-block;width:16px;vertical-align:-3px">${A.icon(icon || 'steps')}</span> ${f(cost)}</p>`;
  U.tips.bank = () => { const s = S(), m = C.mods(); return `<h5>Steps</h5><p>Earned by singing, buildings and getting away from tuxedo men.</p><p>Per click: <b>${f(C.clickBase(m) * C.comboMult(), 1)}</b> · Per verse: <b>${f(Math.max(C.clickBase(m) * 5, C.sps(m) * 0.5) * m.verse)}</b></p><p>Production multiplier: <b>x${f(m.global, 2)}</b></p>`; };
  U.tips.bld = (id) => {
    const b = C.BLD[id], s = S(), m = C.mods(), own = s.b[id] || 0, each = C.bldRate(b, m), tot = C.sps(m) || 1;
    const nextTier = D.TIERS.find(t => t.at > own);
    return `<h5>${esc(b.name)}</h5><p class="q">"${esc(b.desc)}"</p><p>Each makes <b>${f(each, 1)}</b> Steps/sec</p>${own ? `<p>${own} owned make <b>${f(each * own, 1)}</b>/sec (${(each * own / tot * 100).toFixed(1)}% of total)</p>` : ''}${nextTier ? `<p>Next upgrade unlocks at <b>${nextTier.at}</b> owned</p>` : ''}${s.challenge === 'minimal' ? '<p><b>Minimalist:</b> max 10 each</p>' : ''}`;
  };
  U.tips.up = (id) => { const u = C.UP[id]; if (!u) return ''; return `<h5>${esc(u.name)}</h5><p>${esc(u.desc)}</p>${costLine(u.cost, S().steps)}`; };
  U.tips.boxshop = () => `<h5>Mystery Shoebox</h5><p>Contains one random sneaker. Rarer sneakers give bigger bonuses when worn. Price grows as you buy more.</p>`;
  U.tips.tree = (id) => { const n = C.TREE[id], s = S(), lv = s.tree[id] || 0; return `<h5 style="color:${D.BRANCHES[n.br].color}">${esc(n.name)}</h5><p>${esc(n.desc)}</p>${lv >= n.max ? '<p><b>Owned</b></p>' : C.treeAvail(n) ? costLine(C.treeCost(n), s.sp, 'sp') : '<p>Buy the node before it first.</p>'}`; };
  U.tips.snk = (id) => { const sn = SNK[id], o = S().sneakers[id]; if (!o) return `<h5>???</h5><p class="rar" style="--rc:${RC(sn.r)}">${D.RARITY[sn.r].name}</p><p>Not found yet. Open Shoeboxes!</p>`; return `<h5>${esc(sn.name)}</h5><p class="rar" style="--rc:${RC(sn.r)}">${o.shiny ? 'Shiny ' : ''}${D.RARITY[sn.r].name} · ${o.star}★</p><p><b>${esc(U.fxText(sn, C.sneakerValue(id)))}</b> while worn</p><p class="q">${esc(sn.desc)}</p>`; };
  U.tips.slotlock = (i) => `<h5>Locked slot</h5><p>Buy the ${+i === 3 ? 'Fourth' : 'Fifth'} Sneaker Slot in the Golden Lace Locker (Cutaway tab).</p>`;
  U.tips.ach = (id) => { const a = C.AMAP[id], s = S(); return `<h5>${esc(a.name)}</h5><p>${esc(a.desc)}</p><p>${s.ach[id] ? '<b style="color:var(--mint)">Unlocked</b> ' + new Date(s.ach[id]).toLocaleDateString() : 'Locked'}</p>`; };
  U.tips.achsecret = () => `<h5>Secret award</h5><p>Who knows? Poke around, and try typing a word or two.</p>`;
  U.tips.chip = (id) => ({
    box: `<h5>Shoeboxes</h5><p>Open them in the Sneakers tab. Tuxedo men, Golden Sneakers, the Wheel and events drop them.</p>`,
    shard: `<h5>Lace Shards</h5><p>From duplicate sneakers. Spend them to add stars to a sneaker.</p>`,
    sp: `<h5>Sole Power</h5><p>Earned by Cutaways. Every point you've earned gives +${Math.round(C.mods().spEff * 100)}% production (softcapped past 1,000), and you can spend it on the Lace Tree.</p>`,
    gl: `<h5>Golden Laces</h5><p>Dropped by bosses. Spend them in the Golden Lace Locker (Cutaway tab).</p>`,
  })[id];
  U.tips.wheel = () => { const w = S().wheel; return `<h5>Wheel of Laces</h5><p>${w.charges ? `<b>${w.charges}</b> free spin${w.charges > 1 ? 's' : ''} ready!` : 'Next free spin in <b>' + C.time((w.next - Date.now()) / 1000) + '</b>'}</p><p>Recharges every ${Math.round(C.wheelPeriod() / 60000)} minutes, even while you're away.</p>`; };
  U.tips.lane = () => `<h5>The song</h5><p>Click O'Toole (or press ${U.keyName('start')}) to play the piano. Each word slides along one of four rows: press that row's key (${[0, 1, 2, 3].map(U.laneKey).join(' ')}) as it reaches the ring and he sings it.</p><p>Perfect hits earn x1.5. Misses break your combo. Hit all eleven for a Perfect Verse.</p><p>Accuracy: <b>${Math.round(C.accuracy() * 100)}%</b></p>`;
  U.tips.heat = () => `<h5>Heat</h5><p>The more you hop, the more attention you get. When Heat fills up, a tuxedo man comes to take the sneakers. Click him and O'Toole jumps out of reach. Dodge enough and he gives up.</p><p>Heat per second: <b>${C.heatRate().toFixed(2)}</b></p>`;
  U.tips.bossmeter = () => `<h5>Boss meter</h5><p>Every tuxedo man who gives up fills a pip. When it's full, a boss shows up. Wear him out before his timer runs out for Golden Laces!</p>`;
  U.tips.tablock = (id) => ({ tree: `<h5>Lace Tree</h5><p>Unlocks after your first Cutaway.</p>`, sneakers: `<h5>Sneakers</h5><p>Unlocks when you get your first Shoebox. Tuxedo men sometimes drop them.</p>`, cut: `<h5>Cutaway</h5><p>Unlocks as you approach ${f(C.SP_DIV)} lifetime Steps.</p>` })[id];

  /* ---------------- HUD on the stage ---------------- */
  const LANE_COL = ['#ff4d6d', '#ffd23f', '#3ddc97', '#4cc9f0'];
  U.laneKey = (i) => U.keyName('lane' + i);
  function buildHud() {
    $('#lyrics').innerHTML = `${[0, 1, 2, 3].map(r => `<div class="lrow" style="--lc:${LANE_COL[r]};--r:${r}"><button class="kcap" data-lane="${r}" aria-label="Lane ${r + 1}"></button></div>`).join('')}
      ${D.PHRASE.map((p, i) => `<div class="note" data-i="${i}"><span class="lbl">${esc(p.w)}</span></div>`).join('')}
      <div class="lane-idle">Click O'Toole to start the song</div><div class="judge"></div>`;
    U.refreshKeys();
    $('.combo-flame').innerHTML = A.icon('combo');
    $('#hud .meter.heat').dataset.tip = 'heat';
    $('#hud .meter.bossm').dataset.tip = 'bossmeter';
    $$('#lyrics .kcap').forEach(b => b.addEventListener('pointerdown', (e) => { e.preventDefault(); root.Game && root.Game.lane(+b.dataset.lane); }));
  }
  U.refreshKeys = () => { $$('#lyrics .kcap').forEach((b, i) => { b.textContent = U.laneKey(i); }); };
  // the rhythm lane: word notes slide left along their key's row and reach the ring on their beat
  const RING_X = 44;
  const PREVIEW = [0, 2, 1, 3, 2, 0, 3, 1, 2, 0, 3];
  let laneNotes = null, laneW = 0, playing = false, laneSig = '';
  U.laneFrame = () => {
    const lane = $('#lyrics');
    if (!laneNotes) laneNotes = $$('.note', lane);
    laneW = lane.clientWidth || laneW;
    const rowH = (lane.clientHeight - 8) / 4;
    const pps = Math.max(200, laneW * 0.34);
    const song = C.song(), t = song ? C.songTime() : -0.7;
    const lanes = song ? song.lanes : PREVIEW;
    if (!!song !== playing) { playing = !!song; lane.classList.toggle('playing', playing); }
    const sig = lanes.join('');
    if (sig !== laneSig) { laneSig = sig; laneNotes.forEach((el, i) => { el.style.setProperty('--lc', LANE_COL[lanes[i]]); el.dataset.lane = lanes[i]; }); }
    const near = [false, false, false, false];
    laneNotes.forEach((el, i) => {
      const p = D.PHRASE[i], x = RING_X + (p.t - t) * pps, y = 4 + rowH * (lanes[i] + 0.5);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = x < -60 || x > laneW + 30 ? 0 : 1;
      if (song && !song.hits[i] && Math.abs(p.t - t) < 0.09) near[lanes[i]] = true;
    });
    $$('.kcap', lane).forEach((b, r) => b.classList.toggle('near', near[r]));
  };
  U.songStart = () => { (laneNotes || $$('#lyrics .note')).forEach(el => el.classList.remove('perfect', 'good', 'missed', 'auto')); };
  U.judge = (txt, cls) => {
    const j = $('#lyrics .judge'); j.textContent = txt; j.className = 'judge ' + cls; void j.offsetWidth; j.classList.add('on');
  };
  U.pressLane = (lane) => { const b = $$('#lyrics .kcap')[lane]; if (b) { b.classList.remove('press'); void b.offsetWidth; b.classList.add('press'); } };
  U.word = (i, crit, grade) => {
    const n = $(`#lyrics .note[data-i="${i}"]`); if (n) n.classList.add(grade);
    if (grade !== 'auto') U.judge(crit ? 'CRIT!' : grade === 'perfect' ? 'PERFECT' : 'GOOD', crit ? 'crit' : grade);
    const b = $('#bubble'); b.querySelector('span').textContent = D.PHRASE[i].w + (i === D.PHRASE.length - 1 ? '!' : '');
    b.classList.toggle('crit', !!crit); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  };
  U.miss = (wrong) => { U.judge(wrong ? 'WRONG KEY' : 'MISS', 'miss'); const l = $('#lyrics'); l.classList.remove('shake'); void l.offsetWidth; l.classList.add('shake'); };
  U.wordMiss = (i) => { const n = $(`#lyrics .note[data-i="${i}"]`); if (n) n.classList.add('missed'); };
  U.verse = (q) => {
    const l = $('#lyrics'); l.classList.remove('done', 'perfect'); void l.offsetWidth; l.classList.add(q === 2 ? 'perfect' : 'done');
  };
  U.lyricState = () => {};
  U.noBurst = (txt) => { const n = $('#noBurst'); n.textContent = txt || 'NO!'; n.classList.remove('on'); void n.offsetWidth; n.classList.add('on'); };
  let bannerT = null;
  U.banner = (tag, title, text, ms) => {
    const b = $('#banner'); b.querySelector('.bn-tag').textContent = tag; b.querySelector('.bn-txt').innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
    b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), ms || 4200);
  };
  let buffSig = '';
  function updateHud() {
    const s = S(), m = C.mods();
    // combo
    const cb = $('#combo'), on = s.combo >= 3;
    cb.classList.toggle('on', on); cb.classList.toggle('hot', s.combo >= 25);
    if (on) { cb.querySelector('.combo-n').textContent = 'x' + C.comboMult().toFixed(2); cb.querySelector('.combo-c').textContent = s.combo + ' combo'; }
    // buffs
    const bs = s.buffs.map(b => b.id).join(',') + (s.encore ? 'enc' : '') + (s.scout ? 'sc' : '') + (s.shinyOToole > 0 ? 'sh' : '');
    if (bs !== buffSig) {
      buffSig = bs;
      const icon = { frenzy: 'gold', clickf: 'click', dazzle: 'star', repel: 'tux', viral: 'viral', conv: 'tux', sale: 'shop', rain: 'heat' };
      let html = s.buffs.map(b => `<div class="buff" data-b="${b.id}"><span class="bi"><span>${A.icon(icon[b.id] || 'star')}</span></span>${esc(b.name)} <small></small></div>`).join('');
      if (s.encore) html += `<div class="buff"><span class="bi"><span>${A.icon('note')}</span></span>Encore x10 <small>${s.encore} verses</small></div>`;
      if (s.scout) html += `<div class="buff"><span class="bi"><span>${A.icon('fame')}</span></span>Talent Scout <small>next verse x10</small></div>`;
      if (s.shinyOToole > 0) html += `<div class="buff" data-b="shiny"><span class="bi"><span>${A.icon('star')}</span></span>Shiny O'Toole x7 <small></small></div>`;
      $('#buffs').innerHTML = html;
    }
    $$('#buffs .buff[data-b]').forEach(el => {
      const b = s.buffs.find(x => x.id === el.dataset.b);
      const t = b ? b.t : s.shinyOToole, d = b ? b.dur : 60;
      el.querySelector('.bi').style.setProperty('--p', (t / d * 100) + '%');
      el.querySelector('small').textContent = Math.ceil(t) + 's';
    });
    // meters
    $('#heatFill').style.width = Math.min(100, s.heat) + '%';
    $('#hud .meter.heat').classList.toggle('hot', s.heat > 85);
    const need = C.bossNeed(), pips = $('#bossPips');
    if (pips.children.length !== need) pips.innerHTML = '<i></i>'.repeat(need);
    Array.from(pips.children).forEach((p, i) => p.classList.toggle('on', i < s.bossMeter));
    // boss bar
    const boss = s.enemies.find(e => e.boss), bb = $('#bossbar');
    bb.hidden = !boss;
    if (boss) {
      bb.querySelector('.bb-name').textContent = boss.name;
      bb.querySelector('.bb-hp i').style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
      bb.querySelector('.bb-time').textContent = boss.p < 0.62 ? 'Approaching...' : Math.ceil(boss.timer) + 's until he pulls the laces!';
      bb.classList.toggle('urgent', boss.p >= 0.62 && boss.timer < 8);
    }
    // scene + challenge
    $('#sceneTag').textContent = D.SCENES[s.scene] + (s.cuts ? ' · Cutaway #' + s.cuts : '');
    const ct = $('#chTag');
    if (s.challenge) {
      const ch = C.CH[s.challenge]; ct.hidden = false;
      const left = ch.timer ? Math.max(0, ch.timer - (s.time - s.chStart)) : null;
      ct.innerHTML = `<b>${esc(ch.name)}</b><div class="muted">${f(s.runSteps)} / ${f(ch.goal)}${left !== null ? ' · ' + C.time(left) + ' left' : ''}</div><div class="m-bar"><i style="width:${Math.min(100, s.runSteps / ch.goal * 100)}%"></i></div>`;
    } else ct.hidden = true;
  }

  /* ---------------- wheel ---------------- */
  U.wheel = () => {
    const s = S();
    const W_ICON = { prod10: 'steps', box1: 'box', frenzy: 'gold', shards: 'shard', box3: 'box', prod60: 'clock', gl: 'gl', jackpot: 'star' };
    const W_DESC = { prod10: '10 minutes of production, right now.', box1: 'One Mystery Shoebox.', frenzy: 'Production x7 for 60 seconds.', shards: '40 Lace Shards for starring up sneakers.', box3: 'Three Mystery Shoeboxes.', prod60: 'A full hour of production, right now.', gl: 'One Golden Lace for the Locker.', jackpot: '10 Shoeboxes and 2 Golden Laces!' };
    const tot = D.WHEEL.reduce((a, x) => a + x.w, 0), R = 153, C0 = 170;
    const pt = (a, r) => `${(C0 + r * Math.cos(a)).toFixed(2)} ${(C0 + r * Math.sin(a)).toFixed(2)}`;
    let a0 = -Math.PI / 2, defs = '', segs = '', decor = '', pegs = '';
    const ang = [];
    D.WHEEL.forEach((w, i) => {
      const a1 = a0 + w.w / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0, am = (a0 + a1) / 2, span = a1 - a0;
      defs += `<radialGradient id="wg${i}" cx="${C0}" cy="${C0}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${A.shade(w.color, 0.45)}"/><stop offset=".55" stop-color="${w.color}"/><stop offset="1" stop-color="${A.shade(w.color, -0.3)}"/></radialGradient>`;
      segs += `<path class="seg" data-i="${i}" d="M${C0} ${C0} L${pt(a0, R)} A${R} ${R} 0 ${large} 1 ${pt(a1, R)} Z" fill="url(#wg${i})" stroke="#1b1330" stroke-width="3"/>`;
      segs += `<path d="M${pt(a0 + 0.02, R - 8)} A${R - 8} ${R - 8} 0 ${large} 1 ${pt(a1 - 0.02, R - 8)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`;
      const deg = am * 180 / Math.PI, iconR = span > 0.5 ? 126 : 130, sz = span > 0.5 ? 34 : span > 0.35 ? 26 : 20;
      decor += `<g transform="translate(${pt(am, iconR).replace(' ', ' ')}) rotate(${deg + 90})"><g transform="translate(${-sz / 2} ${-sz / 2}) scale(${sz / 64})">${A.I[W_ICON[w.id]] || A.I.star}</g></g>`;
      const flip = Math.cos(am) < -0.01 ? 180 : 0;
      decor += `<text transform="translate(${pt(am, 92)}) rotate(${deg + flip})" text-anchor="middle" dominant-baseline="middle" font-family="Lilita One, sans-serif" font-size="${span > 0.5 ? 13 : 10}" fill="#fff" stroke="#1b1330" stroke-width="3" paint-order="stroke">${esc(w.name.replace(' of Steps', ''))}</text>`;
      pegs += `<circle cx="${pt(a0, R - 2).split(' ')[0]}" cy="${pt(a0, R - 2).split(' ')[1]}" r="5" fill="#fff4c2" stroke="#1b1330" stroke-width="2.5"/>`;
      ang.push([a0, a1]); a0 = a1;
    });
    let bulbs = '';
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; bulbs += `<circle class="bulb b${k % 2}" cx="${pt(a, 162).split(' ')[0]}" cy="${pt(a, 162).split(' ')[1]}" r="5.5"/>`; }
    const legend = D.WHEEL.map((w, i) => `<div class="wl" data-i="${i}"><span class="wli" style="--c:${w.color}">${A.icon(W_ICON[w.id])}</span><b>${esc(w.name)}</b><small>${Math.round(w.w / tot * 100)}%</small></div>`).join('');
    const el = U.modal(`<div class="modal wheel-modal"><button class="x">✕</button>
      <div class="wheel-rays"></div>
      <h2 class="wheel-title">Wheel of Laces</h2>
      <div class="wheel" id="wheelBox">
        <svg class="wframe" viewBox="0 0 340 340">
          <defs><linearGradient id="rimG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs>
          <circle cx="170" cy="170" r="168" fill="#1b1330"/><circle cx="170" cy="170" r="162" fill="none" stroke="url(#rimG)" stroke-width="16"/>
          <circle cx="170" cy="170" r="169" fill="none" stroke="#1b1330" stroke-width="3"/><circle cx="170" cy="170" r="154" fill="none" stroke="#1b1330" stroke-width="3"/>
          <g class="bulbs">${bulbs}</g>
        </svg>
        <svg class="disc" id="disc" viewBox="0 0 340 340"><defs>${defs}</defs>${segs}${decor}${pegs}<g class="winglow" id="winGlow"></g></svg>
        <svg class="wshine" viewBox="0 0 340 340"><ellipse cx="130" cy="95" rx="95" ry="55" fill="#fff" opacity=".13" transform="rotate(-30 130 95)"/></svg>
        <svg class="pointer" id="wptr" viewBox="0 0 60 80"><path d="M30 76 L8 22 Q8 4 30 4 Q52 4 52 22 Z" fill="#ff4d6d" stroke="#1b1330" stroke-width="5"/><circle cx="30" cy="22" r="9" fill="#fff" stroke="#1b1330" stroke-width="3"/><circle cx="27" cy="19" r="3" fill="#fff" opacity=".9"/></svg>
        <button class="hub" id="spin" ${s.wheel.charges < 1 ? 'disabled' : ''}><span class="hub-snk">${A.logoSneaker()}</span><b>SPIN</b><small id="wcharges"></small></button>
      </div>
      <div class="wheel-res" id="wres"></div>
      <p class="muted wnext" id="wnext"></p>
      <div class="wlegend">${legend}</div></div>`);
    const disc = $('#disc', el), res = $('#wres', el), btn = $('#spin', el), ptr = $('#wptr', el), box = $('#wheelBox', el);
    let rot = 0, spinning = false, chase = 0;
    const bulbsEl = $$('.bulb', el);
    const chaser = setInterval(() => { chase++; bulbsEl.forEach((b, k) => b.classList.toggle('lit', spinning ? (k + chase) % 3 === 0 : (k + chase) % 2 === 0)); }, 140);
    const upd = () => {
      const w = S().wheel;
      $('#wnext', el).textContent = w.charges >= C.wheelCap() ? 'Charges full: spin away!' : 'Next free spin in ' + C.time((w.next - Date.now()) / 1000);
      $('#wcharges', el).textContent = w.charges ? w.charges + ' spin' + (w.charges > 1 ? 's' : '') : 'no spins';
      if (!spinning) btn.disabled = w.charges < 1;
    };
    upd(); const iv = setInterval(upd, 1000);
    onCloseModal = () => { clearInterval(iv); clearInterval(chaser); };
    btn.onclick = () => {
      if (spinning) return;
      const i = C.spinWheel(); if (i === null) { Snd.fx('cant'); return; }
      spinning = true; btn.disabled = true; res.innerHTML = ''; box.classList.remove('won', 'jackpot'); $('#winGlow', el).innerHTML = '';
      $$('.wl', el).forEach(x => x.classList.remove('on'));
      Snd.fx('whooshBig');
      const [a, b] = ang[i];
      const target = (a + (b - a) * (0.25 + Math.random() * 0.5)) * 180 / Math.PI + 90;
      const final = rot + 360 * 7 + ((360 - target - rot % 360) % 360 + 360) % 360;
      const start = rot, dur = 5600, t0 = performance.now(), over = 5 + Math.random() * 4;
      let lastSeg = -1, lastT = t0;
      const bounds = ang.map(([x]) => ((x * 180 / Math.PI + 90) % 360 + 360) % 360);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        // fast start, long tense slow-down, then a tiny settle back past the peg
        const e = k < 0.92 ? 1 - Math.pow(1 - k / 0.92, 3.6) : 1;
        const back = k < 0.92 ? 0 : Math.sin((k - 0.92) / 0.08 * Math.PI) * -over * (1 - (k - 0.92) / 0.08);
        const prev = rot;
        rot = start + (final + over - start) * e - (k >= 0.92 ? over : 0) * Math.min(1, (k - 0.92) / 0.08) + back * 0.3;
        const speed = Math.abs(rot - prev) / Math.max(1, now - lastT); lastT = now;
        disc.style.transform = `rotate(${rot}deg)`;
        disc.style.filter = speed > 0.6 ? `blur(${Math.min(2.5, (speed - 0.6) * 1.5).toFixed(2)}px)` : '';
        const pointerAt = ((360 - rot % 360) % 360 + 360) % 360;
        let seg = 0; bounds.forEach((bd, j) => { if (pointerAt >= bd) seg = j; });
        if (seg !== lastSeg) {
          lastSeg = seg; Snd.fx('tick');
          ptr.classList.remove('tick'); void ptr.getBoundingClientRect(); ptr.classList.add('tick');
          $$('.wl', el).forEach(x => x.classList.toggle('peek', +x.dataset.i === seg));
        }
        if (k < 1) requestAnimationFrame(step);
        else {
          spinning = false; disc.style.filter = '';
          rot = final;
          disc.style.transform = `rotate(${rot}deg)`;
          C.applyWheel(i);
          const w = D.WHEEL[i], jack = w.id === 'jackpot';
          const [ga, gb] = ang[i], lg = gb - ga > Math.PI ? 1 : 0;
          $('#winGlow', el).innerHTML = `<path d="M${C0} ${C0} L${pt(ga, R)} A${R} ${R} 0 ${lg} 1 ${pt(gb, R)} Z" fill="#fff" stroke="#fff" stroke-width="6"/>`;
          box.classList.add('won'); if (jack) box.classList.add('jackpot');
          $$('.wl', el).forEach(x => { x.classList.remove('peek'); x.classList.toggle('on', +x.dataset.i === i); });
          res.innerHTML = `<div class="wprize" style="--c:${w.color}"><span class="wpi">${A.icon(W_ICON[w.id])}</span><div><b>${esc(w.name)}!</b><small>${esc(W_DESC[w.id])}</small></div></div>`;
          Snd.fx(jack ? 'jackpot' : 'golden'); Snd.fx('ach');
          U.confetti(jack ? 200 : 70);
          upd();
        }
      };
      requestAnimationFrame(step);
    };
  };

  /* ---------------- settings ---------------- */
  U.settings = () => {
    const s = U.set;
    const slider = (k, label) => `<div class="set-row"><label for="set-${k}">${label}</label><input type="range" id="set-${k}" min="0" max="1" step="0.05" value="${s[k]}" data-k="${k}"></div>`;
    const tog = (k, label, sub) => `<div class="set-row"><label>${label}${sub ? `<small>${sub}</small>` : ''}</label><button class="toggle ${s[k] ? 'on' : ''}" data-t="${k}"><i></i></button></div>`;
    const sel = (k, label, opts) => `<div class="set-row"><label for="set-${k}">${label}</label><select id="set-${k}" data-s="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(s[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    const voices = [['vocals', 'O\'Toole (original vocals)'], ['box', 'Music box'], ['chip', 'Chiptune'], ['choir', 'Choir']].concat(s.kazoo ? [['kazoo', 'Kazoo']] : []);
    const el = U.modal(`<div class="modal"><button class="x">✕</button><h2>Settings</h2>
      <div class="set-group"><h3>Sound</h3>${slider('master', 'Master')}${slider('piano', 'Piano')}${slider('voice', 'O\'Toole\'s singing')}${slider('music', 'Background music')}${slider('sfx', 'Effects')}${slider('no', '"No!" voice')}
        ${sel('voiceMode', 'Singing voice', voices)}${tog('autoSound', 'Hear the Auto-Singer')}${sel('lineVoice', 'Tuxedo men\'s voices', [['auto', 'Recordings (computer voice if missing)'], ['speech', 'Computer voice'], ['off', 'Off']])}</div>
      <div class="set-group"><h3>Rhythm</h3><div class="set-row"><label for="set-offset">Timing offset <small id="offVal">${s.offset || 0} ms · raise it if your hits register as late</small></label><input type="range" id="set-offset" min="-200" max="200" step="5" value="${s.offset || 0}"></div>${tog('tts', 'Speak each word', 'Uses your device\'s text-to-speech')}</div>
      <div class="set-group"><h3>Visuals</h3>${sel('particles', 'Particles', [[0, 'Off'], [1, 'Low'], [2, 'High']])}${tog('shake', 'Screen shake')}${tog('floaters', 'Floating numbers')}${tog('bgAnim', 'Animated backgrounds')}${tog('reduce', 'Reduce motion')}${s.rainbow ? tog('rainbowOn', 'Rainbow O\'Toole', 'Secret unlocked!') : ''}</div>
      <div class="set-group"><h3>Game</h3>${sel('numFmt', 'Numbers', [['short', '1.23 M'], ['long', '1.23 million'], ['sci', '1.23e6'], ['eng', '1.23e6 (engineering)']])}${tog('confirmCut', 'Confirm before a Cutaway')}${tog('intro', 'Play the intro on launch')}</div>
      <div class="set-group"><h3>Save</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm mint" id="sSave">Save now</button><button class="btn sm sky" id="sExport">Export</button><button class="btn sm" id="sImport">Import</button><button class="btn sm lace" id="sReset">Erase everything</button><button class="btn sm ghost" id="sIntro">Replay intro</button></div>
        <textarea id="sText" placeholder="Exported save text appears here. To import, paste a save here and press Import."></textarea></div>
      <div class="set-group"><h3>Keys</h3>${keybindRows()}<div style="margin-top:8px;display:flex;gap:8px;align-items:center"><button class="btn sm ghost" id="keysReset">Reset keys</button><small class="muted">Click a key, then press the new one. 1-6 switch tabs.</small></div></div>
      <p class="muted" style="font-size:.8rem">Fan-made, non-commercial. Sneakers O'Toole is from <i>Family Guy</i> (20th Television / Fox).</p></div>`);
    $$('input[type=range]', el).forEach(r => r.oninput = () => {
      s[r.dataset.k] = +r.value; U.applySet();
      if (['master', 'music', 'piano', 'sfx', 'voice', 'no'].every(k => s[k] === 0)) root.dispatchEvent(new CustomEvent('egg', { detail: 'silence' }));
    });
    const off = $('#set-offset', el); off.oninput = () => { s.offset = +off.value; $('#offVal', el).textContent = s.offset + ' ms · raise it if your hits register as late'; U.applySet(); };
    $$('[data-t]', el).forEach(b => b.onclick = () => { s[b.dataset.t] = !s[b.dataset.t]; b.classList.toggle('on', s[b.dataset.t]); U.applySet(); Snd.fx('ui'); });
    $$('select[data-s]', el).forEach(x => x.onchange = () => { s[x.dataset.s] = x.dataset.s === 'particles' ? +x.value : x.value; U.applySet(); U.render(true); });
    bindKeybinds(el);
    $('#sSave', el).onclick = () => { root.Game.save(); U.toast({ title: 'Saved' }); };
    $('#sExport', el).onclick = () => {
      const txt = root.Game.exportSave(); const ta = $('#sText', el); ta.value = txt; ta.select();
      try { navigator.clipboard.writeText(txt).then(() => U.toast({ title: 'Save copied to clipboard' }), () => {}); } catch (e) {}
    };
    $('#sImport', el).onclick = () => { if (root.Game.importSave($('#sText', el).value.trim())) { U.toast({ title: 'Save imported' }); U.close(); } else U.toast({ title: 'That save text is not valid', sub: 'Paste the whole exported text and try again.' }); };
    $('#sReset', el).onclick = (e) => { if (!U.armed(e.currentTarget, 'Really? Click again')) return; root.Game.hardReset(); U.close(); };
    $('#sIntro', el).onclick = () => { U.close(); root.Intro.play(true); };
  };

  /* ---------------- offline ---------------- */
  U.welcome = (info) => {
    const el = U.modal(`<div class="modal" style="text-align:center"><button class="x">✕</button>
      <img src="img/otoole-stand.png" alt="" style="height:170px;filter:drop-shadow(0 4px 0 #1b1330)">
      <h2>Welcome back!</h2><p class="muted">You were away for <b>${C.time(info.sec)}</b>. O'Toole kept hopping${info.rate < 1 ? ` at ${Math.round(info.rate * 100)}% speed` : ''}.</p>
      <div class="cut-hero card" style="margin:12px 0"><div class="big-n" style="font-size:2.2rem">+${f(info.steps)}</div><p>Steps while you were away${info.capped < info.sec ? ` (capped at ${C.time(info.capped)})` : ''}</p></div>
      ${S().wheel.charges ? `<p>You have <b>${S().wheel.charges}</b> free Wheel spin${S().wheel.charges > 1 ? 's' : ''} waiting!</p>` : ''}
      <button class="btn big" id="wbOk">Keep hopping</button></div>`);
    $('#wbOk', el).onclick = () => U.close();
  };

  /* ---------------- cutaway transition ---------------- */
  U.cutaway = (chId) => {
    const cf = $('#cutFx'), iris = cf.querySelector('.cf-iris'), card = cf.querySelector('.cf-card');
    cf.hidden = false; cf.classList.remove('card');
    Snd.fx('cutaway'); Snd.stopMelody(); hideTip();
    const fast = U.set.reduce ? 0.05 : 1;
    const close = iris.animate([{ width: '260vmax', height: '260vmax' }, { width: '0px', height: '0px' }], { duration: 650 * fast, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
    close.onfinish = () => {
      const gain = C.cutaway(chId);
      St.clearEnemies(); root.Game.onCutaway(gain, chId);
      card.querySelector('b').textContent = D.SCENES[S().scene];
      cf.classList.add('card');
      setTimeout(() => {
        const open = iris.animate([{ width: '0px', height: '0px' }, { width: '260vmax', height: '260vmax' }], { duration: 700 * fast, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        St.walkIn();
        open.onfinish = () => { cf.hidden = true; cf.classList.remove('card'); iris.getAnimations().forEach(a => a.cancel()); };
      }, 1150 * fast);
    };
  };

  /* ---------------- ticker ---------------- */
  let tickAnim = null, tickIdx = 0;
  function nextNews() {
    const s = S();
    const pool = D.NEWS.filter(([n]) => s.allSteps >= n).map(x => x[1]);
    const dyn = [
      `O'Toole has now sung ${f(s.stats.clicks)} words. Sneakers: still on.`,
      `${f(s.stats.enemies)} tuxedo men have given up the chase. Rental shop "concerned."`,
      s.stats.bosses ? `Formalwear bosses who gave up the chase: ${s.stats.bosses}. Etiquette in shambles.` : null,
      C.uniqueSneakers() ? `Collector's corner: ${C.uniqueSneakers()} different sneakers in the closet.` : null,
    ].filter(Boolean);
    const all = pool.concat(dyn);
    const msg = all[(tickIdx++ * 7 + Math.floor(Math.random() * all.length)) % all.length];
    const el = $('#tickText'), track = $('.tk-track');
    el.textContent = msg;
    const w = el.getBoundingClientRect().width, tw = track.clientWidth;
    if (tickAnim) tickAnim.cancel();
    tickAnim = el.animate([{ transform: `translate(${tw}px, -50%)` }, { transform: `translate(${-w}px, -50%)` }], { duration: (tw + w) / 80 * 1000, easing: 'linear' });
    tickAnim.onfinish = nextNews;
  }

  /* ---------------- init & frame ---------------- */
  U.init = () => {
    buildHeader(); buildTabs(); buildHud(); bindTips();
    $('#btnSettings').onclick = () => { Snd.fx('ui'); U.settings(); };
    $('#btnWheel').onclick = () => { Snd.fx('ui'); U.wheel(); };
    $('#btnMute').onclick = () => { U.set.muted = !U.set.muted; U.applySet(); };
    U.applySet();
    U.tab(U.set.tab && $('#v-' + U.set.tab) ? U.set.tab : 'shop');
    setTimeout(nextNews, 800);
  };
  U.render = (force) => renderView(force);
  U.frame = (dt, now) => {
    updateHeader(dt);
    U.laneFrame();
    if (now - lastRender > 150) { lastRender = now; renderView(false); updateTabs(); updateHud(); U.refreshTip(); }
  };
  U.curTab = () => curTab;

  root.UI = U;
})(window);
