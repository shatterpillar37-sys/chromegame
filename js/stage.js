/* Sneakers O'Toole — the stage: painted scenes, crowd, particles, sprites. */
(function (root) {
  'use strict';
  const D = root.DATA, C = root.Core, A = root.Art;
  const St = {};
  const $ = (s) => document.querySelector(s);
  const INK = '#1b1330';
  let stage, bg, bx, fxc, fx, W = 0, H = 0, DPR = 1, groundY = 0, sceneIdx = -1;
  let t = 0;
  St.q = { particles: 2, shake: true, floaters: true, bgAnim: true, reduce: false };

  /* ---------------- setup ---------------- */
  St.init = () => {
    stage = $('#stage'); bg = $('#bg'); fxc = $('#fx');
    bx = bg.getContext('2d'); fx = fxc.getContext('2d');
    new ResizeObserver(resize).observe(stage);
    resize();
  };
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(10, r.width); H = Math.max(10, r.height);
    DPR = Math.min(root.devicePixelRatio || 1, St.q.particles >= 2 ? 2 : 1.25);
    [bg, fxc].forEach(c => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); c.style.width = W + 'px'; c.style.height = H + 'px'; });
    groundY = H * 0.86;
    compact = W < 560 || H < 430;
    stage.classList.toggle('compact', compact);
    layers = null;
    St.layout();
  }
  St.size = () => ({ W, H, groundY });
  // tall enough to read, short enough to clear the rhythm lane (and its speech bubble) above his head
  let compact = false, laneR = 0, otX = 0;
  St.charH = () => Math.max(90, Math.min(H * 0.55, 420, groundY - 70));

  /* ---------------- scrolling street scenes ----------------
     Each scene is a static sky plus three tiling layers (far, mid, near) that scroll at
     different speeds as O'Toole walks right. Tiles wrap seamlessly: anything drawn across
     the tile edge is drawn again on the other side. */
  // small seeds need scrambling or the first few values all land near zero
  const rng = (seed) => { let s = (Math.floor(seed * 2654435761) % 2147483646) + 1; const next = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; next(); next(); return next; };
  function outline(c, w) { c.lineWidth = w || 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function grad(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function cloud(c, x, y, s, col) {
    c.beginPath();
    [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [0.9, 0.25, 0.85]].forEach(([dx, dy, r]) => { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); });
    c.fillStyle = col || '#ffffff'; c.fill();
  }
  // draw f at x, and again one tile over when it crosses an edge
  const wrap = (tw) => (x, span, f) => { f(x); if (x + span > tw) f(x - tw); if (x < 0) f(x + tw); };
  // a smooth ridge that tiles: sum of sines whose periods divide the tile width
  function ridge(c, tw, base, amps, g, col, seed) {
    const r = rng(seed); const ph = amps.map(() => r() * 6.28);
    c.beginPath(); c.moveTo(0, g);
    for (let x = 0; x <= tw; x += 6) { let y = base; amps.forEach(([a, n], i) => { y -= a * Math.sin(x / tw * Math.PI * 2 * n + ph[i]); }); c.lineTo(x, y); }
    c.lineTo(tw, g); c.closePath(); c.fillStyle = col; c.fill(); outline(c);
  }
  const even = (tw, target) => { const n = Math.max(1, Math.round(tw / target)); return tw / n; };
  function tree(c, x, y, s, col) { c.fillStyle = '#6a4a2a'; c.fillRect(x - 4 * s, y - 40 * s, 8 * s, 40 * s); c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x - 4 * s, y - 40 * s, 8 * s, 40 * s); c.beginPath(); c.arc(x, y - 52 * s, 22 * s, 0, 7); c.fillStyle = col || '#5fa94a'; c.fill(); outline(c); c.beginPath(); c.arc(x - 7 * s, y - 58 * s, 7 * s, 0, 7); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); }
  function road(c, tw, g, h, top, col, dash, dashCol) {
    c.fillStyle = col; c.fillRect(0, top, tw, h - top);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, top); c.lineTo(tw, top); c.stroke();
    if (dash) { const st = even(tw, 90); c.fillStyle = dashCol || '#ffd23f'; for (let x = 10; x < tw; x += st) rrect(c, x, top + (h - top) * 0.45, st * 0.45, 5, 2), c.fill(); }
  }
  function sidewalk(c, tw, top, bottom, col, seam) {
    c.fillStyle = col; c.fillRect(0, top, tw, bottom - top);
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, top); c.lineTo(tw, top); c.stroke();
    c.strokeStyle = seam || 'rgba(27,19,48,.22)'; c.lineWidth = 2; const st = even(tw, 64);
    for (let x = 0; x < tw; x += st) { c.beginPath(); c.moveTo(x, top); c.lineTo(x - 8, bottom); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, bottom - 5, tw, 5);
  }
  const SCENES = [];
  // 0 Quahog: suburban street
  SCENES.push({
    sky(c, w, h, g) { c.fillStyle = grad(c, 0, g, [[0, '#62bbff'], [1, '#d9f2ff']]); c.fillRect(0, 0, w, h); },
    far(c, tw, h, g) {
      ridge(c, tw, g - h * 0.23, [[h * 0.035, 2], [h * 0.02, 5]], g, '#b6e39a', 3);
      const W_ = wrap(tw), r = rng(8);
      for (let i = 0; i < 9; i++) { const x = r() * tw, s = h / 700; W_(x, 40, xx => { c.beginPath(); c.arc(xx, g - h * 0.2 - r() * 4, 16 * s + 6, 0, 7); c.fillStyle = '#7fc46a'; c.fill(); }); }
      ridge(c, tw, g - h * 0.14, [[h * 0.02, 3], [h * 0.012, 7]], g, '#9ad07f', 11);
    },
    mid(c, tw, h, g) {
      const cols = ['#f4a261', '#e9c46a', '#8ecae6', '#e76f51', '#cdb4db', '#90be6d', '#f7b2bd'], roofs = ['#8d3b2f', '#5a4a78', '#3d5a80', '#6b3e26'];
      const st = even(tw, 230), r = rng(21);
      for (let i = 0, x = 0; x < tw - 1; x += st, i++) {
        const hw = st * (0.56 + r() * 0.1), hx = x + (st - hw) / 2, hh = h * (0.17 + r() * 0.06), hy = g - h * 0.045 - hh;
        c.fillStyle = cols[i % cols.length]; rrect(c, hx, hy, hw, hh, 4); c.fill(); outline(c);
        c.beginPath(); c.moveTo(hx - 10, hy + 3); c.lineTo(hx + hw / 2, hy - hh * (0.5 + r() * 0.2)); c.lineTo(hx + hw + 10, hy + 3); c.closePath(); c.fillStyle = roofs[i % 4]; c.fill(); outline(c);
        if (r() < 0.5) { c.fillStyle = '#b5523b'; rrect(c, hx + hw * 0.7, hy - hh * 0.45, hw * 0.1, hh * 0.3, 2); c.fill(); outline(c, 2); }
        c.fillStyle = '#fff6c9'; [[0.14, 0.24], [0.62, 0.24]].forEach(([a, b]) => { rrect(c, hx + hw * a, hy + hh * b, hw * 0.24, hh * 0.26, 3); c.fill(); outline(c, 2.5); c.beginPath(); c.moveTo(hx + hw * (a + 0.12), hy + hh * b); c.lineTo(hx + hw * (a + 0.12), hy + hh * (b + 0.26)); c.lineWidth = 2; c.stroke(); });
        c.fillStyle = ['#7a4a21', '#3d5a80', '#b5172b'][i % 3]; rrect(c, hx + hw * 0.41, hy + hh * 0.58, hw * 0.18, hh * 0.42, 3); c.fill(); outline(c, 2.5);
        tree(c, x + st * 0.02 + 6, g - h * 0.03, h / 620, i % 2 ? '#5fa94a' : '#4f9a3e');
      }
    },
    near(c, tw, h, g) {
      const fst = even(tw, 22);
      c.fillStyle = '#fff';
      for (let x = 0; x < tw; x += fst) { c.beginPath(); c.moveTo(x + 2, g - h * 0.02); c.lineTo(x + 2, g - h * 0.085); c.lineTo(x + 8, g - h * 0.1); c.lineTo(x + 14, g - h * 0.085); c.lineTo(x + 14, g - h * 0.02); c.closePath(); c.fill(); outline(c, 2); }
      c.fillRect(0, g - h * 0.075, tw, 6); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-2, g - h * 0.075, tw + 4, 6);
      sidewalk(c, tw, g - h * 0.025, g + h * 0.065, '#d6cfc2');
      road(c, tw, g, h, g + h * 0.065, '#4f5268', true);
      const lst = even(tw, 520);
      for (let x = lst * 0.4; x < tw; x += lst) { c.fillStyle = '#3d405b'; c.fillRect(x - 3, g - h * 0.3, 6, h * 0.3); outline(c, 2); c.beginPath(); c.arc(x, g - h * 0.31, 9, 0, 7); c.fillStyle = '#fff6c9'; c.fill(); outline(c, 2); c.fillStyle = '#e63946'; rrect(c, x + lst * 0.45, g - h * 0.05, 12, h * 0.03, 3); c.fill(); outline(c, 2); }
    },
    dyn(c, w, h, g, t, cam) {
      const sx = w * 0.84, sy = h * 0.16, sr = h * 0.065;
      St.sun = { x: sx, y: sy, r: sr * 1.4 };
      c.save(); c.translate(sx, sy); c.rotate(t * 0.2);
      c.fillStyle = 'rgba(255,210,63,.35)'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(sr * 1.1, -6); c.lineTo(sr * 1.9, 0); c.lineTo(sr * 1.1, 6); c.fill(); }
      c.restore(); c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fillStyle = '#ffd23f'; c.fill(); outline(c);
      for (let i = 0; i < 4; i++) { const x = (((i * 0.31 + t * 0.006 * (1 + i * 0.3)) * w - cam * 0.05) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15; cloud(c, x, h * (0.09 + i * 0.065), h * 0.035 * (1 + (i % 2) * 0.4), 'rgba(255,255,255,.95)'); }
    },
  });
  // 1 Texas: desert highway at sunset
  SCENES.push({
    sky(c, w, h, g) {
      c.fillStyle = grad(c, 0, g, [[0, '#ff6f59'], [0.55, '#ffb26b'], [1, '#ffe29a']]); c.fillRect(0, 0, w, h);
      c.beginPath(); c.arc(w * 0.62, g - h * 0.28, h * 0.17, 0, 7); c.fillStyle = '#ffe66d'; c.fill();
      c.beginPath(); c.arc(w * 0.62, g - h * 0.28, h * 0.23, 0, 7); c.fillStyle = 'rgba(255,230,109,.25)'; c.fill();
      St.sunStatic = { x: w * 0.62, y: g - h * 0.28, r: h * 0.17 };
    },
    far(c, tw, h, g) {
      const W_ = wrap(tw), r = rng(4);
      for (let i = 0; i < 4; i++) {
        const x = i * tw / 4 + r() * 60, mw = tw * (0.16 + r() * 0.08), top = g - h * (0.2 + r() * 0.14);
        W_(x, mw, xx => { c.beginPath(); c.moveTo(xx, g - h * 0.1); c.lineTo(xx + 18, top); c.lineTo(xx + mw - 22, top); c.lineTo(xx + mw, g - h * 0.1); c.closePath(); c.fillStyle = ['#c8553d', '#b2472f', '#d9734e'][i % 3]; c.fill(); outline(c); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(xx + 18, top + 10, mw - 40, 6); });
      }
      ridge(c, tw, g - h * 0.09, [[h * 0.012, 3]], g, '#e4a85f', 5);
    },
    mid(c, tw, h, g) {
      const W_ = wrap(tw), s = h / 420;
      const cactus = (x) => {
        c.fillStyle = '#3f9b57';
        rrect(c, x - 9 * s, g - 90 * s, 18 * s, 92 * s, 9 * s); c.fill(); outline(c);
        rrect(c, x - 32 * s, g - 70 * s, 12 * s, 36 * s, 6 * s); c.fill(); outline(c);
        rrect(c, x - 30 * s, g - 42 * s, 24 * s, 11 * s, 5 * s); c.fill(); outline(c);
        rrect(c, x + 20 * s, g - 78 * s, 12 * s, 30 * s, 6 * s); c.fill(); outline(c);
        rrect(c, x + 6 * s, g - 56 * s, 24 * s, 11 * s, 5 * s); c.fill(); outline(c);
      };
      const st = even(tw, 360);
      for (let x = st * 0.3; x < tw; x += st) W_(x - 35 * s, 70 * s, xx => cactus(xx + 35 * s));
      const bx = tw * 0.55, bw = 170 * s, bh = 80 * s;
      W_(bx, bw, xx => { c.fillStyle = '#8a5a2b'; c.fillRect(xx + bw * 0.2, g - 150 * s, 8, 150 * s); c.fillRect(xx + bw * 0.75, g - 150 * s, 8, 150 * s); c.fillStyle = '#fff4c2'; rrect(c, xx, g - 150 * s - bh, bw, bh, 6); c.fill(); outline(c); c.font = `${Math.round(24 * s)}px 'Lilita One', Impact, sans-serif`; c.textAlign = 'center'; c.fillStyle = '#e0303c'; c.fillText('SNEAKERS', xx + bw / 2, g - 150 * s - bh * 0.5); c.fillStyle = '#1b1330'; c.font = `${Math.round(14 * s)}px 'Lilita One', Impact, sans-serif`; c.fillText('NEXT EXIT · NEVER REMOVED', xx + bw / 2, g - 150 * s - bh * 0.2); });
      const pst = even(tw, 80);
      c.strokeStyle = '#6b4a2b'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, g - h * 0.07); c.lineTo(tw, g - h * 0.07); c.moveTo(0, g - h * 0.05); c.lineTo(tw, g - h * 0.05); c.stroke();
      for (let x = 0; x < tw; x += pst) { c.fillStyle = '#8a5a2b'; c.fillRect(x, g - h * 0.09, 5, h * 0.07); }
    },
    near(c, tw, h, g) {
      c.fillStyle = '#eec07b'; c.fillRect(0, g - h * 0.03, tw, h * 0.1); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.03); c.lineTo(tw, g - h * 0.03); c.stroke();
      const r = rng(7); c.strokeStyle = 'rgba(27,19,48,.25)'; c.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const x = r() * tw, y = g + r() * h * 0.05; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12, y + 3); c.lineTo(x + 20, y); c.stroke(); }
      road(c, tw, g, h, g + h * 0.07, '#5a4e4a', true, '#fff1a8');
    },
    dyn(c, w, h, g, t, cam) {
      const p = ((t * 0.09 + cam * 0.0006) % 1.4) - 0.2, x = w - p * w, y = g - h * 0.035 - Math.abs(Math.sin(t * 3)) * h * 0.04, r = h * 0.035;
      c.save(); c.translate(x, y); c.rotate(-t * 5); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(0, 0, r * (0.4 + i * 0.1), i, i + 4); c.stroke(); }
      c.restore(); St.sun = St.sunStatic;
    },
  });
  // 2 Moon base
  const stars = Array.from({ length: 160 }, (_, i) => { const r = rng(i + 3); return [r(), r(), r() * 1.6 + 0.4, r() * 6]; });
  SCENES.push({
    sky(c, w, h, g) {
      c.fillStyle = grad(c, 0, h, [[0, '#07061a'], [0.7, '#231554'], [1, '#3b1f78']]); c.fillRect(0, 0, w, h);
      [[0.3, 0.3, '#ff4df0'], [0.75, 0.2, '#4cc9f0'], [0.55, 0.5, '#9b5de5']].forEach(([x, y, col]) => { const gr = c.createRadialGradient(w * x, h * y, 0, w * x, h * y, h * 0.45); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
      const px = w * 0.8, py = h * 0.22, pr = h * 0.1;
      c.beginPath(); c.arc(px, py, pr, 0, 7); c.fillStyle = '#4cc9f0'; c.fill(); outline(c);
      c.save(); c.beginPath(); c.arc(px, py, pr, 0, 7); c.clip(); c.fillStyle = '#3ddc97'; c.beginPath(); c.ellipse(px - pr * 0.3, py - pr * 0.1, pr * 0.4, pr * 0.25, 0.4, 0, 7); c.ellipse(px + pr * 0.4, py + pr * 0.4, pr * 0.3, pr * 0.2, -0.3, 0, 7); c.fill(); c.restore();
      St.sunStatic = { x: px, y: py, r: pr * 1.2 };
    },
    far(c, tw, h, g) {
      ridge(c, tw, g - h * 0.16, [[h * 0.05, 2], [h * 0.02, 5]], g, '#6e6a9e', 17);
      const r = rng(19), W_ = wrap(tw); c.fillStyle = '#5c588a';
      for (let i = 0; i < 7; i++) { const x = r() * tw, rx = 20 + r() * 30; W_(x - rx, rx * 2, xx => { c.beginPath(); c.ellipse(xx + rx, g - h * 0.11 + r() * 8, rx, rx * 0.25, 0, 0, 7); c.fill(); }); }
    },
    mid(c, tw, h, g) {
      const W_ = wrap(tw), s = h / 520, st = even(tw, 420);
      for (let x = st * 0.2; x < tw; x += st) {
        W_(x - 70 * s, 200 * s, xx => {
          const cx = xx + 70 * s, base = g - h * 0.05;
          c.fillStyle = '#dfe3f0'; c.beginPath(); c.arc(cx, base, 62 * s, Math.PI, 0); c.closePath(); c.fill(); outline(c);
          c.strokeStyle = 'rgba(27,19,48,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, base, 42 * s, Math.PI, 0); c.stroke();
          c.fillStyle = '#4cc9f0'; rrect(c, cx - 12 * s, base - 30 * s, 24 * s, 30 * s, 10 * s); c.fill(); outline(c, 2);
          c.fillStyle = '#9aa6c8'; c.fillRect(cx + 110 * s, base - 120 * s, 6 * s, 120 * s); outline(c, 2);
          c.beginPath(); c.moveTo(cx + 90 * s, base - 130 * s); c.quadraticCurveTo(cx + 113 * s, base - 100 * s, cx + 136 * s, base - 130 * s); c.closePath(); c.fillStyle = '#dfe3f0'; c.fill(); outline(c, 2);
          c.beginPath(); c.arc(cx + 113 * s, base - 124 * s, 4 * s, 0, 7); c.fillStyle = '#ff4d6d'; c.fill();
        });
      }
    },
    near(c, tw, h, g) {
      c.fillStyle = '#9e9ac8'; c.fillRect(0, g - h * 0.02, tw, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.02); c.lineTo(tw, g - h * 0.02); c.stroke();
      c.fillStyle = '#b8bdd6'; c.fillRect(0, g - h * 0.02, tw, h * 0.07); c.strokeStyle = INK; c.strokeRect(-2, g - h * 0.02, tw + 4, h * 0.07);
      const st = even(tw, 70); c.fillStyle = '#6c6a8e';
      for (let x = 0; x < tw; x += st) { c.fillRect(x, g - h * 0.02, 2, h * 0.07); c.beginPath(); c.arc(x + 8, g, 2.5, 0, 7); c.arc(x + 8, g + h * 0.035, 2.5, 0, 7); c.fill(); }
      const r = rng(9), W_ = wrap(tw); c.fillStyle = '#7f7aad';
      for (let i = 0; i < 10; i++) { const x = r() * tw, rx = 18 + r() * 24; W_(x - rx, rx * 2, xx => { c.beginPath(); c.ellipse(xx + rx, g + h * 0.09 + r() * h * 0.04, rx, 5 + r() * 5, 0, 0, 7); c.fill(); outline(c, 2); }); }
    },
    dyn(c, w, h, g, t, cam) {
      for (const [x, y, s, ph] of stars) { if (y * h > g - h * 0.2) continue; c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + ph); c.fillStyle = '#fff'; c.fillRect(((x * w - cam * 0.02) % w + w) % w, y * h, s, s); }
      c.globalAlpha = 1; St.sun = St.sunStatic;
    },
  });
  // 3 Under the sea
  SCENES.push({
    sky(c, w, h, g) { c.fillStyle = grad(c, 0, h, [[0, '#2bb3d8'], [0.6, '#137aa6'], [1, '#0b4f75']]); c.fillRect(0, 0, w, h); },
    far(c, tw, h, g) { ridge(c, tw, g - h * 0.2, [[h * 0.06, 2], [h * 0.03, 5]], g, '#0e5f82', 23); ridge(c, tw, g - h * 0.12, [[h * 0.03, 3]], g, '#127096', 29); },
    mid(c, tw, h, g) {
      const W_ = wrap(tw), r = rng(31), st = even(tw, 150);
      for (let x = 0, i = 0; x < tw; x += st, i++) {
        const kx = x + r() * st * 0.5, kh = h * (0.22 + r() * 0.14);
        W_(kx - 20, 40, xx => { c.beginPath(); c.moveTo(xx, g); for (let k = 1; k <= 8; k++) c.lineTo(xx + Math.sin(k * 0.9 + i) * k * 2.2, g - kh * k / 8); c.lineWidth = 12; c.strokeStyle = INK; c.stroke(); c.lineWidth = 7; c.strokeStyle = i % 2 ? '#2a9d8f' : '#52b788'; c.stroke(); });
        if (i % 2) { const rr = h * 0.05, cx = x + st * 0.7; W_(cx - rr * 1.4, rr * 2.8, xx => { c.fillStyle = ['#ff6b6b', '#c77dff', '#ff9f1c'][i % 3]; c.beginPath(); c.ellipse(xx + rr * 1.4, g - rr * 0.2, rr * 1.3, rr, 0, Math.PI, 0); c.fill(); outline(c); }); }
      }
      const cx = tw * 0.6, s = h / 600;
      W_(cx, 60 * s, xx => { c.fillStyle = '#8a5a2b'; rrect(c, xx, g - 36 * s, 60 * s, 36 * s, 4); c.fill(); outline(c); c.fillStyle = '#a0692f'; c.beginPath(); c.moveTo(xx, g - 36 * s); c.quadraticCurveTo(xx + 30 * s, g - 62 * s, xx + 60 * s, g - 36 * s); c.closePath(); c.fill(); outline(c); c.fillStyle = '#ffd23f'; c.fillRect(xx + 26 * s, g - 30 * s, 8 * s, 10 * s); });
    },
    near(c, tw, h, g) {
      c.fillStyle = '#f0d9a0'; c.fillRect(0, g - h * 0.02, tw, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.02); c.lineTo(tw, g - h * 0.02); c.stroke();
      const r = rng(21), W_ = wrap(tw);
      for (let i = 0; i < 12; i++) { const x = r() * tw, y = g + r() * h * 0.1; W_(x - 8, 16, xx => { c.beginPath(); c.arc(xx + 8, y, 8, Math.PI, 0); c.fillStyle = ['#ff9f9f', '#ffd6a5', '#fdffb6'][i % 3]; c.fill(); outline(c, 2); }); }
      c.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(r() * tw, g + r() * h * 0.12, 2 + r() * 3, 0, 7); c.fill(); }
    },
    dyn(c, w, h, g, t, cam) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const x = w * (0.1 + i * 0.22) + Math.sin(t * 0.4 + i) * 30; const gr = c.createLinearGradient(x, 0, x, g); gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(x - 20, 0); c.lineTo(x + 20, 0); c.lineTo(x + 90, g); c.lineTo(x - 10, g); c.fill(); }
      c.restore();
      for (let i = 0; i < 3; i++) {
        const fx_ = (((t * (0.05 + i * 0.02) + i * 0.4) * w - cam * 0.3) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15, fy = h * (0.25 + i * 0.12) + Math.sin(t * 2 + i) * 8, s = h * 0.03;
        c.fillStyle = ['#ffd23f', '#ff9f1c', '#ff4d6d'][i]; c.beginPath(); c.ellipse(fx_, fy, s * 1.4, s, 0, 0, 7); c.fill(); outline(c, 2);
        c.beginPath(); c.moveTo(fx_ - s * 1.3, fy); c.lineTo(fx_ - s * 2.3, fy - s * 0.8); c.lineTo(fx_ - s * 2.3, fy + s * 0.8); c.closePath(); c.fill(); outline(c, 2);
        c.fillStyle = INK; c.beginPath(); c.arc(fx_ + s * 0.7, fy - s * 0.2, 2, 0, 7); c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const p = (t * 0.12 + i * 0.137) % 1; c.beginPath(); c.arc(((w * ((i * 0.071 + 0.03) % 1) - cam * 0.5) % w + w) % w + Math.sin(t * 2 + i) * 6, g - p * g, 3 + (i % 3) * 2, 0, 7); c.stroke(); }
      St.sun = null;
    },
  });
  // 4 Broadway: theater district at night
  SCENES.push({
    sky(c, w, h, g) {
      c.fillStyle = grad(c, 0, g, [[0, '#120b2e'], [1, '#3b1a4f']]); c.fillRect(0, 0, w, h);
      c.beginPath(); c.arc(w * 0.82, h * 0.14, h * 0.05, 0, 7); c.fillStyle = '#fff4c2'; c.fill(); outline(c);
      St.sunStatic = { x: w * 0.82, y: h * 0.14, r: h * 0.07 };
    },
    far(c, tw, h, g) {
      const r = rng(41); let x = 0;
      while (x < tw) { const bw = 40 + r() * 70, bh = h * (0.3 + r() * 0.35); const w_ = Math.min(bw, tw - x); c.fillStyle = '#23153f'; c.fillRect(x, g - bh, w_, bh); for (let wy = g - bh + 8; wy < g - 10; wy += 14) for (let wx = x + 6; wx < x + w_ - 8; wx += 12) if (r() < 0.3) { c.fillStyle = '#ffd23f88'; c.fillRect(wx, wy, 5, 7); } x += bw; }
    },
    mid(c, tw, h, g) {
      const st = even(tw, 300), s = h / 560, names = ["O'TOOLE LIVE!", 'THE SNEAKERS', 'NO! THE MUSICAL', 'LACED UP'];
      for (let x = 0, i = 0; x < tw - 1; x += st, i++) {
        const bw = st * 0.9, bx = x + st * 0.05, top = g - h * 0.42;
        c.fillStyle = ['#5a1a4a', '#2d3a7a', '#6b2a1a', '#1a4a4a'][i % 4]; c.fillRect(bx, top, bw, g - top); outline(c);
        c.fillStyle = '#1b1330'; c.fillRect(bx + bw * 0.3, g - h * 0.14, bw * 0.4, h * 0.14);
        c.fillStyle = '#ffd23f'; rrect(c, bx - 6, top + h * 0.1, bw + 12, h * 0.1, 6); c.fill(); outline(c);
        c.fillStyle = '#b5172b'; rrect(c, bx + 6, top + h * 0.115, bw - 12, h * 0.07, 4); c.fill();
        c.font = `${Math.round(Math.min(26 * s, bw / 8))}px 'Lilita One', Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff4c2'; c.fillText(names[i % 4], bx + bw / 2, top + h * 0.152);
        for (let k = 0; k < 14; k++) { c.beginPath(); c.arc(bx - 2 + (bw + 4) * k / 13, top + h * 0.1, 3, 0, 7); c.arc(bx - 2 + (bw + 4) * k / 13, top + h * 0.2, 3, 0, 7); c.fillStyle = '#fffbe0'; c.fill(); }
        c.fillStyle = '#fff'; rrect(c, bx + bw * 0.06, g - h * 0.17, bw * 0.18, h * 0.12, 3); c.fill(); outline(c, 2); rrect(c, bx + bw * 0.76, g - h * 0.17, bw * 0.18, h * 0.12, 3); c.fill(); outline(c, 2);
      }
    },
    near(c, tw, h, g) {
      sidewalk(c, tw, g - h * 0.025, g + h * 0.065, '#8f8aa8', 'rgba(27,19,48,.3)');
      const st = even(tw, 180); for (let x = st * 0.5; x < tw; x += st) { c.fillStyle = '#e8a0b4'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 5 : 11; c.lineTo(x + Math.cos(a) * rr, g + h * 0.02 + Math.sin(a) * rr * 0.5); } c.closePath(); c.fill(); outline(c, 1.5); }
      road(c, tw, g, h, g + h * 0.065, '#2e2a40', true, '#fff');
    },
    dyn(c, w, h, g, t, cam) {
      c.save(); c.globalCompositeOperation = 'lighter';
      [[0.3, '#ffd23f'], [0.7, '#4cc9f0']].forEach(([x, col], i) => { const a = Math.sin(t * 0.6 + i * 2) * 0.5, ox = w * x, tx = ox + Math.sin(a) * h * 0.8; const gr = c.createLinearGradient(ox, g, tx, 0); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00'); c.fillStyle = gr; c.beginPath(); c.moveTo(ox - 6, g - h * 0.4); c.lineTo(ox + 6, g - h * 0.4); c.lineTo(tx + 50, 0); c.lineTo(tx - 50, 0); c.fill(); });
      c.restore(); St.sun = St.sunStatic;
    },
  });
  // 5 Snowy peaks: mountain village
  const flakes = Array.from({ length: 80 }, (_, i) => { const r = rng(i + 50); return [r(), r(), r() * 2.5 + 1.5, r()]; });
  SCENES.push({
    sky(c, w, h, g) { c.fillStyle = grad(c, 0, h, [[0, '#9cc3ee'], [1, '#eef6ff']]); c.fillRect(0, 0, w, h); },
    far(c, tw, h, g) {
      const W_ = wrap(tw), r = rng(51);
      for (let i = 0; i < 5; i++) {
        const x = i * tw / 5 + r() * 40, pw = tw * (0.14 + r() * 0.06), ph = h * (0.35 + r() * 0.2);
        W_(x - pw, pw * 2, xx => { const cx = xx + pw; c.beginPath(); c.moveTo(cx - pw, g); c.lineTo(cx, g - ph); c.lineTo(cx + pw, g); c.closePath(); c.fillStyle = ['#7a8fbd', '#6a7fad', '#8ea3cf'][i % 3]; c.fill(); outline(c); c.beginPath(); c.moveTo(cx - pw * 0.28, g - ph * 0.72); c.lineTo(cx, g - ph); c.lineTo(cx + pw * 0.28, g - ph * 0.72); c.lineTo(cx + pw * 0.1, g - ph * 0.66); c.lineTo(cx - pw * 0.05, g - ph * 0.74); c.closePath(); c.fillStyle = '#fff'; c.fill(); outline(c, 2); });
      }
    },
    mid(c, tw, h, g) {
      const W_ = wrap(tw), s = h / 420, st = even(tw, 140);
      const pine = (x, k) => { c.fillStyle = '#2d6a4f'; for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(x - (26 - j * 6) * k, g - (10 + j * 22) * k); c.lineTo(x, g - (46 + j * 22) * k); c.lineTo(x + (26 - j * 6) * k, g - (10 + j * 22) * k); c.closePath(); c.fill(); outline(c, 2.5); c.fillStyle = '#fff'; c.fillRect(x - (14 - j * 3) * k, g - (14 + j * 22) * k, (28 - j * 6) * k, 3 * k); c.fillStyle = '#2d6a4f'; } };
      for (let x = 0, i = 0; x < tw; x += st, i++) W_(x - 30 * s, 60 * s, xx => pine(xx + 30 * s, s * (0.9 + (i % 3) * 0.15)));
      const cx = tw * 0.4; W_(cx, 120 * s, xx => { c.fillStyle = '#8a5a2b'; c.fillRect(xx, g - 70 * s, 120 * s, 70 * s); outline(c); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(xx - 12 * s, g - 68 * s); c.lineTo(xx + 60 * s, g - 118 * s); c.lineTo(xx + 132 * s, g - 68 * s); c.closePath(); c.fill(); outline(c); c.fillStyle = '#ffd23f'; c.fillRect(xx + 20 * s, g - 50 * s, 24 * s, 20 * s); outline(c, 2); c.fillStyle = '#5a3a1a'; c.fillRect(xx + 70 * s, g - 44 * s, 26 * s, 44 * s); outline(c, 2); });
    },
    near(c, tw, h, g) {
      c.fillStyle = '#ffffff'; c.fillRect(0, g - h * 0.03, tw, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.03); c.lineTo(tw, g - h * 0.03); c.stroke();
      c.fillStyle = '#dde8f6'; c.fillRect(0, g + h * 0.04, tw, h * 0.05);
      const st = even(tw, 46); c.fillStyle = 'rgba(120,140,180,.35)'; for (let x = 0; x < tw; x += st) { c.beginPath(); c.ellipse(x + 10, g + h * 0.06, 6, 3, 0, 0, 7); c.ellipse(x + 28, g + h * 0.075, 6, 3, 0, 0, 7); c.fill(); }
      const fst = even(tw, 110); for (let x = 0; x < tw; x += fst) { c.fillStyle = '#8a5a2b'; c.fillRect(x, g - h * 0.09, 6, h * 0.07); outline(c, 1.5); } c.fillRect(0, g - h * 0.075, tw, 4);
    },
    dyn(c, w, h, g, t, cam) {
      c.fillStyle = '#fff';
      for (const [x, y, s, ph] of flakes) { const yy = ((y + t * 0.05 * (0.5 + ph)) % 1) * h, xx = (((x * w + Math.sin(t + ph * 6) * 20 - cam * 0.6) % w) + w) % w; c.beginPath(); c.arc(xx, yy, s, 0, 7); c.fill(); }
      St.sun = null;
    },
  });
  // 6 Neon city
  SCENES.push({
    sky(c, w, h, g) { c.fillStyle = grad(c, 0, h, [[0, '#0d0628'], [0.7, '#35125e'], [1, '#6b1f73']]); c.fillRect(0, 0, w, h); },
    far(c, tw, h, g) {
      const r = rng(33); let x = 0;
      while (x < tw) { const bw = 50 + r() * 70, bh = h * (0.3 + r() * 0.4), w_ = Math.min(bw, tw - x); c.fillStyle = ['#1f1446', '#261a55', '#1a1238'][Math.floor(r() * 3)]; c.fillRect(x, g - bh, w_, bh); for (let wy = g - bh + 10; wy < g - 14; wy += 16) for (let wx = x + 8; wx < x + w_ - 10; wx += 14) if (r() < 0.4) { c.fillStyle = r() < 0.5 ? '#ffd23f' : '#ff9ff3'; c.fillRect(wx, wy, 6, 8); } x += bw + 4; }
    },
    mid(c, tw, h, g) {
      const st = even(tw, 260), signs = [['SNEAKERS', '#ff4df0'], ['24/7', '#4cc9f0'], ['KICKS', '#3ddc97'], ['LACES', '#ffd23f'], ['NO!', '#ff4d6d']];
      for (let x = 0, i = 0; x < tw - 1; x += st, i++) {
        const bw = st * 0.94, bx = x + st * 0.03, top = g - h * 0.28;
        c.fillStyle = '#2b1f55'; c.fillRect(bx, top, bw, g - top); outline(c);
        c.fillStyle = 'rgba(76,201,240,.25)'; c.fillRect(bx + bw * 0.08, g - h * 0.15, bw * 0.55, h * 0.13); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(bx + bw * 0.08, g - h * 0.15, bw * 0.55, h * 0.13);
        c.fillStyle = '#140d2e'; c.fillRect(bx + bw * 0.7, g - h * 0.15, bw * 0.2, h * 0.15);
        const [txt, col] = signs[i % signs.length];
        c.save(); c.font = `${Math.round(h * 0.05)}px 'Lilita One', Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 16; c.shadowColor = col; c.fillStyle = col; c.fillText(txt, bx + bw / 2, top + h * 0.06); c.restore();
      }
    },
    near(c, tw, h, g) {
      sidewalk(c, tw, g - h * 0.025, g + h * 0.06, '#3a2f63', 'rgba(0,0,0,.35)');
      road(c, tw, g, h, g + h * 0.06, '#1b1330', false);
      const st = even(tw, 600); for (let x = st * 0.3; x < tw; x += st) for (let k = 0; k < 6; k++) { c.fillStyle = '#e8e4f5'; c.fillRect(x + k * 18, g + h * 0.07, 10, h * 0.1); }
      c.globalAlpha = 0.18; c.fillStyle = '#ff4df0'; c.fillRect(0, g + h * 0.12, tw, 3); c.globalAlpha = 1;
    },
    dyn(c, w, h, g, t, cam) {
      c.strokeStyle = 'rgba(180,200,255,.45)'; c.lineWidth = 1.5;
      for (let i = 0; i < 60; i++) { const x = ((i * 0.137 + t * 0.03) % 1) * w, y = ((i * 0.291 + t * 1.8) % 1) * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke(); }
      St.sun = null;
    },
  });
  // 7 The sneaker mall
  SCENES.push({
    sky(c, w, h, g) {
      c.fillStyle = grad(c, 0, g, [[0, '#f6e7c8'], [1, '#e9cf9c']]); c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(w * (i / 6), 0); c.lineTo(w * (i / 6) + w * 0.08, 0); c.lineTo(w * (i / 6) + w * 0.02, h * 0.07); c.lineTo(w * (i / 6) - w * 0.06, h * 0.07); c.fill(); }
    },
    far(c, tw, h, g) {
      const top = h * 0.12, st = even(tw, 180);
      c.fillStyle = '#d9b77a'; c.fillRect(0, top, tw, h * 0.2); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(-2, top, tw + 4, h * 0.2);
      for (let x = 0, i = 0; x < tw; x += st, i++) { c.fillStyle = ['#ff4d6d', '#4cc9f0', '#3ddc97', '#b86bff'][i % 4]; rrect(c, x + st * 0.15, top + h * 0.03, st * 0.7, h * 0.05, 5); c.fill(); outline(c, 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x + st * 0.12, top + h * 0.1, st * 0.76, h * 0.08); }
      c.fillStyle = '#b8b8c8'; c.fillRect(0, top + h * 0.2, tw, 6); outline(c, 2);
    },
    mid(c, tw, h, g) {
      const st = even(tw, 240), s = h / 560, cols = ['#ffffff', '#ff4d6d', '#4cc9f0', '#3ddc97', '#ffd23f', '#b86bff'];
      for (let x = 0, i = 0; x < tw - 1; x += st, i++) {
        const bx = x + st * 0.04, bw = st * 0.92, top = g - h * 0.46;
        c.fillStyle = '#fff9ec'; c.fillRect(bx, top, bw, g - top); outline(c);
        c.fillStyle = ['#b5172b', '#1b1330', '#2d6a4f', '#3d5a80'][i % 4]; c.fillRect(bx, top, bw, h * 0.06); outline(c, 2);
        c.fillStyle = 'rgba(140,210,240,.35)'; c.fillRect(bx + bw * 0.06, top + h * 0.1, bw * 0.88, h * 0.22); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(bx + bw * 0.06, top + h * 0.1, bw * 0.88, h * 0.22);
        for (let k = 0; k < 3; k++) { const px = bx + bw * (0.2 + k * 0.3), py = top + h * 0.28; c.fillStyle = '#e8dcc0'; c.fillRect(px - 14 * s, py, 28 * s, h * 0.04); outline(c, 1.5); const sc = 12 * s; c.fillStyle = cols[(i + k) % cols.length]; c.beginPath(); c.moveTo(px - sc * 1.6, py); c.quadraticCurveTo(px - sc * 1.6, py - sc * 1.4, px - sc * 0.4, py - sc * 1.4); c.lineTo(px + sc * 0.2, py - sc * 1.7); c.lineTo(px + sc * 0.6, py - sc); c.quadraticCurveTo(px + sc * 1.8, py - sc * 0.9, px + sc * 1.8, py); c.closePath(); c.fill(); outline(c, 1.5); }
        c.fillStyle = '#6b4108'; c.fillRect(bx + bw * 0.4, g - h * 0.1, bw * 0.2, h * 0.1);
      }
    },
    near(c, tw, h, g) {
      const top = g - h * 0.02, st = even(tw, 48);
      for (let x = 0, i = 0; x < tw; x += st, i++) for (let row = 0; row < 4; row++) { c.fillStyle = (i + row) % 2 ? '#f2e6c9' : '#d9c79c'; c.fillRect(x, top + row * h * 0.045, st, h * 0.045); }
      c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, top); c.lineTo(tw, top); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, top + 3, tw, 4);
      const pst = even(tw, 400); for (let x = pst * 0.5; x < tw; x += pst) { c.fillStyle = '#6b4108'; rrect(c, x, g - h * 0.07, 40, h * 0.07, 4); c.fill(); outline(c, 2); c.beginPath(); c.arc(x + 20, g - h * 0.09, 18, 0, 7); c.fillStyle = '#3ddc97'; c.fill(); outline(c, 2); }
    },
    dyn(c, w, h, g, t, cam) {
      for (let i = 0; i < 12; i++) {
        const x = ((((i * 0.173) % 1) * w - cam * 0.45) % w + w) % w, y = h * 0.15 + ((i * 0.311) % 0.5) * h, s = 3 + 4 * Math.max(0, Math.sin(t * 2 + i * 1.7));
        c.fillStyle = '#fff8c4'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.3); c.lineTo(x + s, y); c.lineTo(x + s * 0.3, y + s * 0.3); c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y + s * 0.3); c.lineTo(x - s, y); c.lineTo(x - s * 0.3, y - s * 0.3); c.fill();
      }
      St.sun = null;
    },
  });
  St.SCENE_COUNT = SCENES.length;
  const PARALLAX = { far: 0.15, mid: 0.45, near: 1 };
  let layers = null, TW = 0;
  function layersFor(i, w, h, g, dpr) {
    const sc = SCENES[i], tw = Math.max(900, Math.ceil(w * 1.25));
    const mk = (cw, fn) => { const cv = document.createElement('canvas'); cv.width = Math.round(cw * dpr); cv.height = Math.round(h * dpr); const x = cv.getContext('2d'); x.scale(dpr, dpr); fn(x); return cv; };
    return {
      tw, dpr, w, h, g, i,
      sky: mk(w, x => sc.sky(x, w, h, g)),
      far: mk(tw, x => sc.far(x, tw, h, g)),
      mid: mk(tw, x => sc.mid(x, tw, h, g)),
      near: mk(tw, x => sc.near(x, tw, h, g)),
    };
  }
  function drawLayers(ctx, L, cam, time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(L.sky, 0, 0);
    ['far', 'mid', 'near'].forEach(k => {
      const off = ((cam * PARALLAX[k]) % L.tw + L.tw) % L.tw, px = Math.round(off * L.dpr);
      ctx.drawImage(L[k], -px, 0);
      if (L.tw - off < L.w) ctx.drawImage(L[k], Math.round((L.tw - off) * L.dpr), 0);
    });
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    SCENES[L.i].dyn(ctx, L.w, L.h, L.g, time, cam);
  }
  function buildLayers(i) { const L = layersFor(i, W, H, groundY, DPR); TW = L.tw; return L; }
  // a standalone scrolling street for other screens (the intro)
  St.backdrop = (cv, sceneI) => {
    let L = null, cam = 0, time = 0;
    const ctx = cv.getContext('2d');
    const build = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      L = layersFor(sceneI || 0, r.width, r.height, r.height * 0.86, dpr);
    };
    return {
      resize: build,
      frame(dt, speed) { if (!L) build(); cam += (speed || 0) * dt; time += dt; drawLayers(ctx, L, cam, time); },
    };
  };
  // animate = walk into the new scene: it slides in from the right behind a road sign
  let trans = null;
  St.setScene = (i, sign) => {
    i = ((i % SCENES.length) + SCENES.length) % SCENES.length;
    if (sign && layers && !St.q.reduce) trans = { from: layers, t: 0, dur: 2.2, sign, same: i === sceneIdx };
    sceneIdx = i; layers = null;
  };
  // the camera follows O'Toole up the street: a steady walk from production, plus a stride for every note
  St.camX = 0; let camTarget = 0;
  St.advance = (px) => { camTarget += px === undefined ? Math.max(30, W * 0.05) : px; };
  St.walking = () => camTarget - St.camX > 2;
  St.walkSpeed = () => C.pace() * Math.max(90, W * 0.16);
  function drawScene(dt) {
    if (!layers) layers = buildLayers(sceneIdx);
    camTarget += St.walkSpeed() * dt;
    St.camX += (camTarget - St.camX) * Math.min(1, dt * 7);
    const time = St.q.bgAnim && !St.q.reduce ? t : 0;
    drawLayers(bx, layers, St.camX, time);
    if (trans) {
      if (trans.from.w !== W || trans.from.h !== H) { trans = null; return; }
      trans.t += dt;
      const p = Math.min(1, trans.t / trans.dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const edge = W * (1.08 - 1.16 * e);   // the old scene stays to the left of the sign
      if (!trans.same && edge > 0) {
        bx.save(); bx.setTransform(1, 0, 0, 1, 0, 0); bx.beginPath(); bx.rect(0, 0, Math.max(0, edge) * DPR, H * DPR); bx.clip();
        drawLayers(bx, trans.from, St.camX, time); bx.restore();
      }
      bx.setTransform(DPR, 0, 0, DPR, 0, 0);
      roadSign(bx, trans.same ? W * (1.1 - 1.3 * e) : edge, trans.sign);
      if (p >= 1) trans = null;
    }
  }
  // a big green highway sign on a post, planted at the border between scenes
  function roadSign(c, x, txt) {
    const s = Math.max(0.6, Math.min(1.2, H / 520)), top = groundY - Math.min(H * 0.5, St.charH() * 0.95);
    c.save();
    c.fillStyle = '#8a93a6'; c.fillRect(x - 5 * s, top, 10 * s, groundY - top); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(x - 5 * s, top, 10 * s, groundY - top);
    c.font = `${Math.round(22 * s)}px 'Lilita One', 'Arial Black', sans-serif`;
    const tw = c.measureText(txt.name).width, bw = Math.max(tw + 40 * s, 170 * s), bh = 74 * s, by = top - bh * 0.7;
    rrect(c, x - bw / 2, by, bw, bh, 10 * s); c.fillStyle = '#1f7a4a'; c.fill(); outline(c, 4);
    rrect(c, x - bw / 2 + 5 * s, by + 5 * s, bw - 10 * s, bh - 10 * s, 7 * s); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt.name, x, by + bh * 0.62);
    c.font = `${Math.round(12 * s)}px 'Lilita One', 'Arial Black', sans-serif`;
    c.fillStyle = '#ffd23f'; c.fillText(txt.sub, x, by + bh * 0.28);
    c.restore();
  }

  /* ---------------- the crowd: your buildings, hopping along ---------------- */
  const SHIRTS = ['#ff4d6d', '#4cc9f0', '#ffd23f', '#3ddc97', '#b86bff', '#ff9f1c'];
  const SKINS = ['#f4c9a0', '#e0ac7e', '#c68d62', '#8d5a3b', '#f1d3b8'];
  function person(c, x, y, s, shirt, skin, hop, kind, i) {
    c.save(); c.translate(x, y - hop);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, hop, 12 * s, 3 * s, 0, 0, 7); c.fill();
    c.lineWidth = 2; c.strokeStyle = INK;
    c.fillStyle = '#34406e'; c.fillRect(-7 * s, -22 * s, 6 * s, 20 * s); c.fillRect(1 * s, -22 * s, 6 * s, 20 * s);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-5 * s, -2 * s, 6 * s, 3.4 * s, 0, 0, 7); c.ellipse(5 * s, -2 * s, 6 * s, 3.4 * s, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = shirt; rrect(c, -10 * s, -46 * s, 20 * s, 26 * s, 6 * s); c.fill(); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.arc(0, -56 * s, 10 * s, 0, 7); c.fill(); c.stroke();
    if (kind === 'kid') { c.fillStyle = shirt; c.beginPath(); c.arc(0, -58 * s, 10 * s, Math.PI, 0); c.fill(); c.stroke(); c.fillRect(0, -60 * s, 14 * s, 3 * s); }
    else { c.fillStyle = ['#2b2118', '#7a4a21', '#e0a15c', '#1b1330'][i % 4]; c.beginPath(); c.arc(0, -59 * s, 10 * s, Math.PI * 1.05, -0.05); c.fill(); }
    c.fillStyle = INK; c.beginPath(); c.arc(-3 * s, -56 * s, 1.4 * s, 0, 7); c.arc(3 * s, -56 * s, 1.4 * s, 0, 7); c.fill();
    if (kind === 'fan') { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(10 * s, -40 * s); c.lineTo(16 * s, -78 * s); c.stroke(); c.fillStyle = SHIRTS[(i + 2) % 6]; c.beginPath(); c.moveTo(16 * s, -78 * s); c.lineTo(34 * s, -72 * s); c.lineTo(16 * s, -64 * s); c.closePath(); c.fill(); c.stroke(); }
    if (kind === 'choir') { c.fillStyle = INK; c.beginPath(); c.ellipse(0, -50 * s, 3 * s, 2.5 * s * (1 + Math.max(0, Math.sin(t * 6 + i))), 0, 0, 7); c.fill(); }
    c.restore();
  }
  function drawCrowd(c) {
    const s = C.get(), sc = Math.max(0.55, Math.min(1.1, H / 520));
    const groups = [['kid', Math.min(s.b.kid || 0, 10)], ['fan', Math.min(s.b.fan || 0, 8)], ['choir', Math.min(s.b.choir || 0, 6)]];
    const beat = (t * 2) % 1, hopAmp = 10 * sc;
    let slot = 0;
    const total = groups.reduce((a, g) => a + g[1], 0); if (!total) return;
    const positions = [];
    groups.forEach(([kind, n]) => { for (let i = 0; i < n; i++) positions.push([kind, i]); });
    positions.forEach(([kind, i], k) => {
      // the fan club follows along behind him on the right; the left side is where the chasers come from
      const x = otX + St.charH() * 0.45 + k * Math.max(16, W * 0.032);
      if (x > W - 10) return;
      const lane = k;
      const y = groundY - H * 0.04 - (k % 2) * H * 0.02;
      const ph = kind === 'choir' ? 0 : Math.max(0, Math.sin((beat + (kind === 'fan' ? 0.5 : 0)) * Math.PI));
      person(c, x, y, sc * (kind === 'kid' ? 0.75 : 0.9), SHIRTS[(k + (kind === 'fan' ? 3 : 0)) % 6], SKINS[k % 5], ph * hopAmp * (St.q.reduce ? 0 : 1), kind, k);
      slot++;
    });
  }

  // bigger buildings show up too: a camera crew tails him, a blimp and a satellite cross the sky
  function drawEntourage(c) {
    const s = C.get(), sc = Math.max(0.55, Math.min(1.1, H / 520));
    if (s.b.sat) {
      const x = ((t * 34) % (W + 200)) - 100, y = H * 0.07;
      c.save(); c.translate(x, y); c.rotate(-0.2);
      c.fillStyle = '#4361ee'; c.fillRect(-26 * sc, -5 * sc, 16 * sc, 10 * sc); c.fillRect(10 * sc, -5 * sc, 16 * sc, 10 * sc);
      c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-26 * sc, -5 * sc, 16 * sc, 10 * sc); c.strokeRect(10 * sc, -5 * sc, 16 * sc, 10 * sc);
      rrect(c, -8 * sc, -7 * sc, 16 * sc, 14 * sc, 3); c.fillStyle = '#cfd6e6'; c.fill(); outline(c, 2);
      if ((t * 2) % 1 < 0.5) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(0, -10 * sc, 2.5 * sc, 0, 7); c.fill(); }
      c.restore();
    }
    if (s.b.mall) {
      const bw = 150 * sc, x = W + bw - ((t * 16) % (W + bw * 2)), y = H * 0.2 + Math.sin(t * 0.7) * 6;
      c.save(); c.translate(x, y);
      c.beginPath(); c.ellipse(0, 0, bw / 2, 26 * sc, 0, 0, 7); c.fillStyle = '#e9edf5'; c.fill(); outline(c, 3);
      c.beginPath(); c.moveTo(bw / 2 - 8 * sc, 0); c.lineTo(bw / 2 + 16 * sc, -20 * sc); c.lineTo(bw / 2 + 16 * sc, 20 * sc); c.closePath(); c.fillStyle = '#ff4d6d'; c.fill(); outline(c, 2.5);
      rrect(c, -16 * sc, 22 * sc, 32 * sc, 10 * sc, 3); c.fillStyle = '#ffd23f'; c.fill(); outline(c, 2);
      c.fillStyle = '#ff4d6d'; c.font = `${Math.round(17 * sc)}px 'Lilita One', 'Arial Black', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText("O'TOOLE", -6 * sc, 1);
      c.restore();
    }
    if (s.b.studio) {
      // a camera operator walking backwards ahead of him, filming the whole thing
      const x = Math.min(W - 30 * sc, otX + St.charH() * 0.5 + W * 0.22), y = groundY - H * 0.035, bob = Math.abs(Math.sin(t * 6)) * 4 * sc;
      c.save(); c.translate(x, y - bob); c.scale(-1, 1);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0, bob, 14 * sc, 3.5 * sc, 0, 0, 7); c.fill();
      c.fillStyle = '#2b2d42'; c.fillRect(-7 * sc, -22 * sc, 6 * sc, 21 * sc); c.fillRect(1 * sc, -22 * sc, 6 * sc, 21 * sc);
      rrect(c, -10 * sc, -48 * sc, 20 * sc, 28 * sc, 6 * sc); c.fillStyle = '#e0303c'; c.fill(); outline(c, 2);
      c.beginPath(); c.arc(0, -58 * sc, 10 * sc, 0, 7); c.fillStyle = '#e0ac7e'; c.fill(); outline(c, 2);
      c.fillStyle = INK; c.fillRect(-10 * sc, -69 * sc, 20 * sc, 5 * sc); c.fillRect(0, -69 * sc, 15 * sc, 3 * sc);
      rrect(c, 4 * sc, -66 * sc, 24 * sc, 16 * sc, 3); c.fillStyle = '#2b2d42'; c.fill(); outline(c, 2);
      c.beginPath(); c.arc(30 * sc, -58 * sc, 6 * sc, 0, 7); c.fillStyle = '#4cc9f0'; c.fill(); outline(c, 2);
      if ((t * 1.5) % 1 < 0.5) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(10 * sc, -62 * sc, 2 * sc, 0, 7); c.fill(); }
      c.restore();
    }
  }

  /* ---------------- particles & floating text ---------------- */
  const parts = [];
  const MAXP = [0, 140, 420];
  St.burst = (type, x, y, n, opt) => {
    opt = opt || {};
    const cap = MAXP[St.q.particles]; if (!cap) return;
    n = Math.round(n * (St.q.particles === 1 ? 0.4 : 1));
    for (let i = 0; i < n && parts.length < cap; i++) {
      const a = opt.angle !== undefined ? opt.angle + (Math.random() - 0.5) * (opt.spread || 1) : Math.random() * Math.PI * 2;
      const sp = (opt.speed || 260) * (0.4 + Math.random() * 0.8);
      parts.push({
        type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0), life: opt.life || (0.7 + Math.random() * 0.6), t: 0,
        s: (opt.size || 6) * (0.6 + Math.random() * 0.8), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        col: opt.colors ? opt.colors[Math.floor(Math.random() * opt.colors.length)] : (opt.color || '#fff'), g: opt.gravity === undefined ? 600 : opt.gravity, txt: opt.txt,
      });
    }
  };
  St.float = (txt, x, y, opt) => {
    if (!St.q.floaters && !(opt && opt.force)) return;
    opt = opt || {};
    parts.push({ type: 'text', x, y, vx: (Math.random() - 0.5) * 30, vy: -(opt.vy || 90), life: opt.life || 1.1, t: 0, txt, s: opt.size || 24, col: opt.color || '#ffffff', g: 0, wob: opt.wobble });
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  };
  function drawParts(c, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.type === 'text') p.vy *= 0.96;
      const k = p.t / p.life, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      c.globalAlpha = a;
      if (p.type === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }
      else if (p.type === 'spark') { const s = p.s * (1 - k * 0.5); c.fillStyle = p.col; c.beginPath(); c.moveTo(p.x, p.y - s); c.lineTo(p.x + s * 0.25, p.y - s * 0.25); c.lineTo(p.x + s, p.y); c.lineTo(p.x + s * 0.25, p.y + s * 0.25); c.lineTo(p.x, p.y + s); c.lineTo(p.x - s * 0.25, p.y + s * 0.25); c.lineTo(p.x - s, p.y); c.lineTo(p.x - s * 0.25, p.y - s * 0.25); c.fill(); }
      else if (p.type === 'dust') { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.s * (0.5 + k), 0, 7); c.fill(); }
      else if (p.type === 'ring') { c.strokeStyle = p.col; c.lineWidth = 4 * (1 - k); c.beginPath(); c.arc(p.x, p.y, p.s * (0.2 + k * 1.2), 0, 7); c.stroke(); }
      else if (p.type === 'note') { c.save(); c.translate(p.x + Math.sin(p.t * 6) * 8, p.y); c.font = `${Math.round(p.s * 3)}px 'Lilita One', sans-serif`; c.fillStyle = p.col; c.strokeStyle = INK; c.lineWidth = 3; c.strokeText(p.txt || '♪', 0, 0); c.fillText(p.txt || '♪', 0, 0); c.restore(); }
      else if (p.type === 'text') {
        const pop = p.t < 0.12 ? 0.6 + p.t / 0.12 * 0.5 : p.t < 0.22 ? 1.1 - (p.t - 0.12) : 1;
        c.save(); c.translate(p.x, p.y); if (p.wob) c.rotate(Math.sin(p.t * 20) * 0.08); c.scale(pop, pop);
        c.font = `${p.s}px 'Lilita One', 'Arial Black', sans-serif`; c.textAlign = 'center'; c.lineJoin = 'round';
        c.lineWidth = Math.max(4, p.s * 0.22); c.strokeStyle = INK; c.strokeText(p.txt, 0, 0); c.fillStyle = p.col; c.fillText(p.txt, 0, 0); c.restore();
      }
    }
    c.globalAlpha = 1;
  }

  /* ---------------- shake ---------------- */
  let shakeAmt = 0;
  St.shake = (amt) => { if (St.q.shake && !St.q.reduce) shakeAmt = Math.min(24, shakeAmt + amt); };

  /* ---------------- O'Toole sprite ---------------- */
  const POSE = { stand: 1, walk: 1.03, no: 0.95 };
  let ot, otRig, otImgs = {}, pose = 'stand', poseUntil = 0, idleT = 0, asleep = false;
  St.initSprites = () => {
    ot = $('#otoole'); otRig = ot.querySelector('.rig');
    ot.querySelectorAll('img.pose').forEach(im => otImgs[im.dataset.pose] = im);
    St.setPose('stand');
  };
  St.setPose = (p, ms) => {
    pose = p; poseUntil = ms ? performance.now() + ms : 0;
    for (const k in otImgs) otImgs[k].classList.toggle('on', k === p);
  };
  St.layout = () => {
    if (!ot) return;
    const ch = St.charH();
    ot.style.height = ch + 'px';
    for (const k in otImgs) otImgs[k].style.height = (ch * POSE[k]) + 'px';
    ot.style.bottom = (H - groundY) + 'px';
    const lane = $('#lyrics');
    laneR = lane ? lane.offsetLeft + lane.offsetWidth : 0;
    otX = laneR + (W - laneR) / 2;
    stage.style.setProperty('--laneR', laneR + 'px');
    stage.style.setProperty('--otx', otX + 'px');
    document.documentElement.style.setProperty('--charH', ch + 'px');
    document.documentElement.style.setProperty('--ground', (H - groundY) + 'px');
  };
  St.otCenter = () => ({ x: otX, y: groundY - St.charH() * 0.55, top: groundY - St.charH() * 1.02, feet: groundY });
  St.sing = (crit) => {
    idleT = 0;
    if (asleep) St.wake();
    St.setPose('walk', 260);
    otRig.getAnimations().forEach(a => a.id === 'hop' && a.cancel());
    const up = crit ? -30 : -16;
    const an = otRig.animate([
      { transform: 'translateY(0) scale(1,1)' },
      { transform: 'translateY(2px) scale(1.06,0.92)', offset: 0.15 },
      { transform: `translateY(${up}px) scale(0.96,1.05) rotate(-2deg)`, offset: 0.45 },
      { transform: 'translateY(0) scale(1.03,0.97)', offset: 0.8 },
      { transform: 'translateY(0) scale(1,1)' },
    ], { duration: St.q.reduce ? 1 : 300, easing: 'ease-out' });
    an.id = 'hop';
    const c = St.otCenter();
    St.burst('dust', c.x + (Math.random() - 0.5) * 40, c.feet - 4, 3, { speed: 60, gravity: -40, size: 7, color: 'rgba(255,255,255,.7)', life: 0.5 });
    if (Math.random() < 0.5) St.burst('note', c.x + 30, c.top + 40, 1, { angle: -1.2, spread: 0.6, speed: 90, gravity: -30, size: 7, colors: ['#ffd23f', '#ff4d6d', '#4cc9f0', '#3ddc97'], txt: Math.random() < 0.5 ? '♪' : '♫', life: 1.2 });
  };
  // hop out of reach, away from the grabbing hand
  St.dodge = (away, big) => {
    idleT = 0; if (asleep) St.wake(true);
    St.setPose('walk', 380);
    const d = away * (big ? 46 : 30), up = big ? -48 : -32;
    otRig.getAnimations().forEach(a => a.id === 'hop' && a.cancel());
    const an = otRig.animate([
      { transform: 'translate(0,0) scale(1,1)' },
      { transform: 'translate(0,3px) scale(1.08,.9)', offset: 0.12 },
      { transform: `translate(${d}px, ${up}px) rotate(${away * 6}deg) scale(.96,1.05)`, offset: 0.45 },
      { transform: `translate(${d * 0.6}px, 0) scale(1.04,.96)`, offset: 0.75 },
      { transform: 'translate(0,0) scale(1,1)' },
    ], { duration: St.q.reduce ? 1 : 420, easing: 'ease-out' });
    an.id = 'hop';
    const c = St.otCenter();
    St.burst('dust', c.x, c.feet - 4, 4, { speed: 80, gravity: -40, size: 8, color: 'rgba(255,255,255,.7)', life: 0.5 });
  };
  St.flinch = () => {
    otRig.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg) translateX(-3px)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: St.q.reduce ? 1 : 220 });
  };
  St.sayNo = () => {
    idleT = 0; if (asleep) St.wake(true);
    St.setPose('no', 700);
    otRig.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-2deg)' }, { transform: 'translateX(6px) rotate(2deg)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: St.q.reduce ? 1 : 360 });
  };
  St.tugged = (side) => {
    St.setPose('no', 900);
    otRig.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${side * 26}px) rotate(${side * 8}deg)` }, { transform: `translateX(${side * 10}px) rotate(${side * 3}deg)` }, { transform: 'translateX(0)' }], { duration: St.q.reduce ? 1 : 700, easing: 'ease-out' });
  };
  St.walkIn = () => {
    St.setPose('walk', 1400);
    otRig.animate([{ transform: `translateX(${-W * 0.6}px)` }, { transform: 'translateX(0)' }], { duration: St.q.reduce ? 1 : 1400, easing: 'cubic-bezier(.2,.7,.3,1)' });
  };
  // Hype moves
  St.move = (id) => {
    idleT = 0; if (asleep) St.wake(true);
    const c = St.otCenter();
    if (id === 'strut') {
      // a proud little spin, then sparkles
      St.setPose('walk', 700);
      otRig.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-26px) rotate(-8deg) scale(1.06)', offset: 0.35 }, { transform: 'translateY(0) rotate(4deg) scale(.97,1.03)', offset: 0.7 }, { transform: 'translateY(0) rotate(0)' }], { duration: St.q.reduce ? 1 : 520, easing: 'ease-out' });
      St.burst('spark', c.x, c.feet - 10, 18, { speed: 260, size: 9, colors: ['#ffd23f', '#fff1a8', '#ff9f1c'], gravity: 200, angle: -Math.PI / 2, spread: 2.4 });
    } else if (id === 'show') {
      St.setPose('no', 900);
      otRig.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12, .9)', offset: 0.2 }, { transform: 'translateY(-40px) scale(.95, 1.08)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: St.q.reduce ? 1 : 650, easing: 'ease-out' });
      St.burst('ring', c.x, c.y, 1, { speed: 0, size: Math.max(W, H) * 0.7, color: '#ff4d6d', gravity: 0, life: 0.6 });
      St.burst('ring', c.x, c.y, 1, { speed: 0, size: Math.max(W, H) * 0.45, color: '#ffd23f', gravity: 0, life: 0.45 });
      const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    } else {
      St.setPose('walk', 900);
      St.advance(W * 0.9);
      otRig.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(24px) rotate(6deg)', offset: 0.3 }, { transform: 'translateX(10px) rotate(3deg)', offset: 0.7 }, { transform: 'translateX(0)' }], { duration: St.q.reduce ? 1 : 900, easing: 'ease-out' });
      for (let k = 0; k < 4; k++) setTimeout(() => St.burst('dust', c.x - 20, c.feet - 6, 6, { speed: 160, gravity: -30, size: 12, color: 'rgba(255,255,255,.8)', life: 0.6, angle: Math.PI, spread: 0.8 }), k * 120);
    }
  };
  St.sleep = () => { asleep = true; ot.classList.add('asleep'); };
  St.wake = (silent) => { asleep = false; ot.classList.remove('asleep'); if (!silent) root.dispatchEvent(new CustomEvent('otoole-wake')); };
  St.isAsleep = () => asleep;

  /* ---------------- tuxedo men ---------------- */
  const enemyEls = new Map();
  // chasers: placed by how far behind they are (gap 1 = at the lane's edge, 0 = grabbing O'Toole)
  // bosses: walk in from the right and plant themselves just ahead of him
  St.enemyX = (e) => {
    const reach = St.charH() * 0.26;
    if (e.boss) return (W + 90) - (W + 90 - Math.min(W - St.charH() * 0.3, otX + St.charH() * 0.6)) * Math.min(1, e.p);
    const g = Math.max(0, Math.min(1.25, e.gap));
    return (otX - reach) - ((otX - reach) - (laneR - 40)) * g;
  };
  St.addEnemy = (e) => {
    const el = document.createElement('button');
    el.className = 'enemy walk' + (e.boss ? ' boss' : '') + (e.big ? ' big' : '') + (e.type === 'golden' ? ' golden' : '');
    el.setAttribute('aria-label', 'Dodge ' + e.name);
    el.innerHTML = `<div class="en-body">${A.tux(e.look)}</div><div class="hp"><i></i></div><div class="say"></div>`;
    el.dataset.id = e.id;
    $('#sprites').appendChild(el);
    enemyEls.set(e.id, el);
    el.style.setProperty('--dir', e.side < 0 ? 1 : -1);
    if (e.type === 'golden') St.enemySay(e, 'Catch me!');
    return el;
  };
  // speech bubbles live in the HUD layer (above banners, never mirrored) and follow their speaker
  const bubbles = new Map();
  St.enemySay = (e, txt, ms) => {
    const owner = enemyEls.get(e.id) || leaving.get(e.id); if (!owner) return;
    let b = bubbles.get(e.id);
    if (!b) { b = { el: document.createElement('div'), owner }; b.el.className = 'tsay'; b.el.dataset.id = e.id; $('#hud').appendChild(b.el); bubbles.set(e.id, b); }
    b.el.textContent = txt; b.until = performance.now() + (ms || 2400);
    b.el.classList.toggle('long', txt.length > 22);
    b.el.classList.remove('on', 'out'); void b.el.offsetWidth; b.el.classList.add('on');
    placeBubble(b);
  };
  function placeBubble(b) {
    const r = b.owner.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const w = b.el.offsetWidth, h = b.el.offsetHeight, cx = r.left + r.width / 2 - sr.left;
    const left = Math.max(8, Math.min(W - w - 8, cx - w / 2));
    b.el.style.left = left + 'px';
    b.el.style.top = Math.max(4, r.top - sr.top - h + r.height * 0.02) + 'px';
    b.el.style.setProperty('--tail', Math.max(14, Math.min(w - 14, cx - left)) + 'px');
  }
  function updateBubbles() {
    const now = performance.now();
    bubbles.forEach((b, id) => {
      if (!b.owner.isConnected || now > b.until + 300) { b.el.remove(); bubbles.delete(id); return; }
      if (now > b.until) b.el.classList.add('out');
      placeBubble(b);
    });
  }
  // a grab at the sneakers: he lunges, O'Toole hops out of reach
  // a sung note: chasers get left behind (a stumble), a boss gets circled and grows dizzier
  St.enemyHit = (e, dmg, crit) => {
    const el = enemyEls.get(e.id); if (!el) return;
    const body = el.querySelector('.en-body');
    if (e.boss) {
      el.querySelector('.hp i').style.width = Math.min(100, (1 - Math.max(0, e.hp) / e.max) * 100) + '%';
      el.classList.add('show-hp');
      body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)', offset: 0.3 }, { transform: 'rotate(5deg)', offset: 0.65 }, { transform: 'rotate(0)' }], { duration: 420, easing: 'ease-in-out' });
      St.circle(e, crit);
      const x = St.enemyX(e), y = groundY - St.charH() * 1.2;
      St.burst('spark', x, y, crit ? 6 : 3, { speed: 120, size: 9, colors: ['#ffd23f', '#fff'], gravity: 60, life: 0.6 });
      return;
    }
    body.animate([{ transform: 'rotate(0)' }, { transform: 'translateX(-10px) rotate(-8deg)', offset: 0.4 }, { transform: 'rotate(0)' }], { duration: 300, easing: 'ease-out' });
    const x = (e._x || St.enemyX(e)), y = groundY - 6;
    St.burst('dust', x - 10, y, crit ? 5 : 2, { speed: 70, gravity: -20, size: 8, color: 'rgba(255,255,255,.7)', life: 0.45 });
  };
  // O'Toole runs a loop around the boss: past him, behind him, and back out front
  St.circle = (boss, big) => {
    const bx = (boss._x || St.enemyX(boss)) - otX, d = St.charH();
    St.setPose('walk', 420);
    otRig.getAnimations().forEach(a => a.id === 'hop' && a.cancel());
    const an = otRig.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: `translate(${bx * 0.6}px, ${-d * 0.04}px) scale(1)`, offset: 0.2 },
      { transform: `translate(${bx + d * 0.32}px, ${-d * 0.08}px) scale(.86)`, offset: 0.45 },
      { transform: `translate(${bx * 0.8}px, ${-d * 0.09}px) scale(.84) scaleX(-1)`, offset: 0.62 },
      { transform: `translate(${bx * 0.2}px, ${-d * 0.02}px) scale(1) scaleX(-1)`, offset: 0.85 },
      { transform: 'translate(0,0) scale(1)' },
    ], { duration: St.q.reduce ? 1 : (big ? 520 : 420), easing: 'ease-in-out' });
    an.id = 'hop';
    ot.classList.remove('behind');
    setTimeout(() => ot.classList.add('behind'), (big ? 520 : 420) * 0.4);
    setTimeout(() => ot.classList.remove('behind'), (big ? 520 : 420) * 0.72);
    St.burst('dust', otX + bx * 0.5, groundY - 4, 4, { speed: 90, gravity: -30, size: 8, color: 'rgba(255,255,255,.7)', life: 0.5 });
  };
  // he's out of breath: stumble, shake it off, then trudge back the way he came
  const leaving = new Map();
  St.enemyGiveUp = (e) => {
    const el = enemyEls.get(e.id); if (!el) return;
    enemyEls.delete(e.id); leaving.set(e.id, el);
    if (e.boss) {   // too dizzy to stand: a last wobble, a spin, and down he goes
      el.classList.add('dead', 'fallen'); el.classList.remove('walk', 'grab', 'show-hp');
      const body = el.querySelector('.en-body'), dir = -1;
      body.animate([
        { transform: 'rotate(0)' }, { transform: 'rotate(-12deg)', offset: 0.15 }, { transform: 'rotate(10deg)', offset: 0.3 },
        { transform: 'rotate(-16deg)', offset: 0.45 }, { transform: `translate(${dir * -20}px, 12%) rotate(${dir * -86}deg)`, offset: 0.8 },
        { transform: `translate(${dir * -24}px, 16%) rotate(${dir * -90}deg)` },
      ], { duration: St.q.reduce ? 1 : 1100, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => { St.shake(12); St.burst('dust', e._x || St.enemyX(e), groundY - 6, 16, { speed: 200, gravity: -20, size: 14, color: 'rgba(255,255,255,.8)', life: 0.8 }); }, St.q.reduce ? 1 : 900);
      setTimeout(() => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).onfinish = () => { el.remove(); leaving.delete(e.id); }, 3200);
      return;
    }
    el.classList.add('dead', 'gaveup'); el.classList.remove('near', 'grab', 'show-hp');
    const face = e.side < 0 ? 1 : -1, x0 = St.enemyX(e), x1 = e.side < 0 ? -W * 0.15 : W * 1.15;
    const body = el.querySelector('.en-body');
    body.animate([{ transform: 'rotate(0)' }, { transform: 'translateY(10px) rotate(22deg)', offset: 0.3 }, { transform: 'translateY(14px) rotate(26deg)', offset: 0.55 }, { transform: 'translateY(4px) rotate(8deg)' }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
    St.burst('dust', x0 + face * 30, groundY - 6, 6, { speed: 120, gravity: -30, size: 10, color: 'rgba(255,255,255,.7)', life: 0.6 });
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add('walk', 'turned');
      body.getAnimations().forEach(a => a.cancel());
      body.style.transform = 'rotate(6deg) translateY(4px)';
      const dur = Math.abs(x1 - x0) / Math.max(120, W * 0.22) * 1000;
      el.animate([
        { transform: `translateX(-50%) scaleX(${-face})` },
        { transform: `translateX(calc(-50% + ${x1 - x0}px)) scaleX(${-face})` },
      ], { duration: St.q.reduce ? 1 : dur, easing: 'linear', fill: 'forwards' }).onfinish = () => { el.remove(); leaving.delete(e.id); };
    }, St.q.reduce ? 1 : 650);
  };
  St.enemyDefeat = St.enemyGiveUp;
  St.enemyLeave = (e) => {
    const el = enemyEls.get(e.id); if (!el) return;
    enemyEls.delete(e.id);
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => el.remove();
  };
  St.clearEnemies = () => { enemyEls.forEach(el => el.remove()); enemyEls.clear(); leaving.forEach(el => el.remove()); leaving.clear(); bubbles.forEach(b => b.el.remove()); bubbles.clear(); };
  function updateEnemies() {
    const s = C.get(), live = new Set();
    for (const e of s.enemies) {
      live.add(e.id);
      let el = enemyEls.get(e.id); if (!el) el = St.addEnemy(e);
      const x = St.enemyX(e);
      e._x = e._x === undefined ? x : e._x + (x - e._x) * 0.2;   // glide rather than jump when a note pushes him back
      el.style.left = e._x + 'px';
      el.classList.toggle('walk', e.boss ? e.p < 1 : true);
      el.classList.toggle('flee', !!e.flee);
      if (e.flee) el.style.setProperty('--dir', -1);
      const near = e.boss ? e.p >= 1 : e.type !== 'golden' && e.gap < 0.45;
      if (near && !e._near) { e._near = 1; St.onNear && St.onNear(e); }
      if (!e.boss && e.gap > 0.7) e._near = 0;
      el.classList.toggle('near', !e.boss && e.gap < 0.3);
      el.classList.toggle('grab', !!e.boss && e.p >= 1);
      if (e.boss) { const dz = 1 - Math.max(0, e.hp) / e.max; el.style.setProperty('--dz', dz.toFixed(3)); el.classList.toggle('dizzy', dz > 0.05); }
    }
    enemyEls.forEach((el, id) => { if (!live.has(id) && !el.classList.contains('dead')) { el.remove(); enemyEls.delete(id); } });
  }

  /* ---------------- golden sneaker & paparazzi ---------------- */
  let goldEl = null;
  function updateGolden() {
    const g = C.get().golden;
    if (!g) { if (goldEl) { goldEl.remove(); goldEl = null; } return; }
    if (!goldEl) {
      goldEl = document.createElement('button');
      goldEl.className = 'golden-sneaker' + (g.diamond ? ' diamond' : '');
      goldEl.setAttribute('aria-label', 'Golden Sneaker');
      const sn = g.diamond ? { id: 'dia', style: 'high', c: ['#e8fbff', '#7ae6ff', '#ffffff', '#b5f5ff'] } : { id: 'gold', style: 'high', c: ['#ffd23f', '#e2a712', '#fff1a8', '#fff8d6'] };
      goldEl.innerHTML = `<div class="gs-rays"></div>${A.sneaker(sn, { noShadow: true })}`;
      $('#sprites').appendChild(goldEl);
    }
    const k = g.t / g.life, dir = g.seed < 0.5 ? 1 : -1;
    const x = dir > 0 ? -60 + (W + 120) * k : W + 60 - (W + 120) * k;
    const y = H * (0.2 + g.seed * 0.25) + Math.sin(g.t * 2.2) * H * 0.08;
    goldEl.style.transform = `translate(${x}px, ${y}px) rotate(${Math.sin(g.t * 3) * 12}deg) scaleX(${dir})`;
    goldEl.style.opacity = k > 0.9 ? (1 - k) * 10 : Math.min(1, g.t * 3);
    St.goldPos = { x, y };
    if (Math.random() < 0.35) St.burst('spark', x + (Math.random() - 0.5) * 40, y + 20, 1, { speed: 30, gravity: 40, size: 6, color: g.diamond ? '#bff6ff' : '#fff1a8', life: 0.7 });
  }
  const camEls = new Map();
  function updateCams() {
    const s = C.get(), live = new Set();
    for (const c of s.cams) {
      live.add(c.id);
      let el = camEls.get(c.id);
      if (c.delay > 0) continue;
      if (!el) {
        el = document.createElement('button'); el.className = 'cam'; el.innerHTML = A.icon('i:camera'); el.dataset.id = c.id;
        el.style.left = (c.x * 100) + '%'; el.style.top = (c.y * 100) + '%';
        $('#sprites').appendChild(el); camEls.set(c.id, el);
      }
      el.classList.toggle('fading', c.life < 2);
    }
    camEls.forEach((el, id) => { if (!live.has(id)) { el.remove(); camEls.delete(id); } });
  }
  St.camFlash = (id) => {
    const el = camEls.get(+id);
    if (el) { const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(); St.burst('ring', r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 1, { speed: 0, size: 80, color: '#fff', gravity: 0, life: 0.3 }); }
    const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  };

  /* ---------------- frame ---------------- */
  let lastBeatHop = 0;
  St.frame = (dt) => {
    t += dt;
    const s = C.get();
    if (sceneIdx !== s.scene) St.setScene(s.scene);
    drawScene(dt);
    // walking: the walk pose struts in time with the pace
    const pace = C.pace(), walk = pace > 0;
    if (!poseUntil && pose !== (walk ? 'walk' : 'stand')) St.setPose(walk ? 'walk' : 'stand');
    ot.classList.toggle('walking', walk && pose === 'walk');
    if (walk) ot.style.setProperty('--strut', (0.62 / (0.55 + pace * 0.6)).toFixed(3) + 's');
    drawCrowd(bx);
    drawEntourage(bx);
    // fx layer
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawParts(fx, dt);
    updateEnemies(); updateBubbles(); updateGolden(); updateCams();
    // pose timing, idle & sleep
    if (poseUntil && performance.now() > poseUntil) { poseUntil = 0; St.setPose(C.pace() > 0 ? 'walk' : 'stand'); }
    idleT += dt;
    if (!asleep && idleT > 120 && !s.enemies.length) St.sleep();
    if (asleep && Math.random() < dt * 0.8) { const c = St.otCenter(); St.burst('note', c.x + 30, c.top + 30, 1, { angle: -1.3, spread: 0.4, speed: 40, gravity: -20, size: 6, color: '#ffffff', txt: 'z', life: 2 }); }
    // shake
    if (shakeAmt > 0.2) { stage.style.transform = `translate(${(Math.random() - 0.5) * shakeAmt}px, ${(Math.random() - 0.5) * shakeAmt}px)`; shakeAmt *= Math.pow(0.001, dt); }
    else if (shakeAmt) { shakeAmt = 0; stage.style.transform = ''; }
    ot.classList.toggle('stunned', s.stun > 0);
    ot.classList.toggle('shiny', s.shinyOToole > 0);
  };
  St.idleReset = () => { idleT = 0; };

  root.Stage = St;
})(window);
