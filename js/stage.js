/* Sneakers O'Toole — the stage: painted scenes, crowd, particles, sprites. */
(function (root) {
  'use strict';
  const D = root.DATA, C = root.Core, A = root.Art;
  const St = {};
  const $ = (s) => document.querySelector(s);
  const INK = '#1b1330';
  let stage, bg, bx, fxc, fx, W = 0, H = 0, DPR = 1, groundY = 0, sceneIdx = -1, staticLayer = null;
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
    staticLayer = null;
    St.layout();
  }
  St.size = () => ({ W, H, groundY });
  St.charH = () => Math.min(H * 0.5, 330);

  /* ---------------- scene painting ---------------- */
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function outline(c, w) { c.lineWidth = w || 3; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function grad(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function cloud(c, x, y, s, col) {
    c.beginPath();
    [[0, 0, 1], [0.9, -0.35, 0.8], [1.8, 0, 0.9], [0.9, 0.25, 0.85]].forEach(([dx, dy, r]) => { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); });
    c.fillStyle = col || '#ffffff'; c.fill();
  }
  const SCENES = [];
  // 0 Quahog
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h * 0.8, [[0, '#6fc3ff'], [1, '#d9f2ff']]),
    static(c, w, h, g) {
      const r = rng(11);
      c.fillStyle = '#a8dc8a'; c.beginPath(); c.moveTo(0, g - h * 0.2);
      for (let x = 0; x <= w; x += w / 6) c.quadraticCurveTo(x + w / 12, g - h * 0.28 - r() * h * 0.05, x + w / 6, g - h * 0.2);
      c.lineTo(w, g); c.lineTo(0, g); c.fill();
      const cols = ['#f4a261', '#e9c46a', '#8ecae6', '#e76f51', '#cdb4db', '#90be6d'];
      const n = Math.max(3, Math.round(w / 180));
      for (let i = 0; i < n; i++) {
        const hw = w / n * 0.72, hx = i * w / n + (w / n - hw) / 2, hh = h * (0.2 + r() * 0.06), hy = g - h * 0.07 - hh;
        c.fillStyle = cols[i % cols.length]; rrect(c, hx, hy, hw, hh, 4); c.fill(); outline(c);
        c.beginPath(); c.moveTo(hx - 8, hy + 2); c.lineTo(hx + hw / 2, hy - hh * 0.55); c.lineTo(hx + hw + 8, hy + 2); c.closePath();
        c.fillStyle = ['#8d3b2f', '#5a4a78', '#3d5a80'][i % 3]; c.fill(); outline(c);
        c.fillStyle = '#fff6c9';
        [[0.18, 0.25], [0.62, 0.25]].forEach(([fx_, fy]) => { rrect(c, hx + hw * fx_, hy + hh * fy, hw * 0.22, hh * 0.25, 3); c.fill(); outline(c, 2.5); });
        c.fillStyle = '#7a4a21'; rrect(c, hx + hw * 0.4, hy + hh * 0.6, hw * 0.2, hh * 0.4, 3); c.fill(); outline(c, 2.5);
        if (r() < 0.6) { const tx = hx + (r() < 0.5 ? -10 : hw + 10), ty = g - h * 0.1; c.fillStyle = '#6a4a2a'; c.fillRect(tx - 4, ty - h * 0.05, 8, h * 0.07); c.beginPath(); c.arc(tx, ty - h * 0.09, h * 0.06, 0, 7); c.fillStyle = '#5fa94a'; c.fill(); outline(c); }
      }
      // fence + sidewalk + street
      c.fillStyle = '#ffffff';
      for (let x = 6; x < w; x += 22) { c.beginPath(); c.moveTo(x, g - h * 0.02); c.lineTo(x, g - h * 0.085); c.lineTo(x + 7, g - h * 0.1); c.lineTo(x + 14, g - h * 0.085); c.lineTo(x + 14, g - h * 0.02); c.closePath(); c.fill(); outline(c, 2); }
      c.fillStyle = '#ffffff'; c.fillRect(0, g - h * 0.07, w, 6); c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(-2, g - h * 0.07, w + 4, 6);
      c.fillStyle = '#d6cfc2'; c.fillRect(0, g - h * 0.02, w, h * 0.09); c.strokeStyle = 'rgba(27,19,48,.25)'; c.lineWidth = 2;
      for (let x = 0; x < w; x += 60) { c.beginPath(); c.moveTo(x, g - h * 0.02); c.lineTo(x - 10, g + h * 0.07); c.stroke(); }
      c.fillStyle = '#9e978a'; c.fillRect(0, g + h * 0.07, w, 5);
      c.fillStyle = '#4f5268'; c.fillRect(0, g + h * 0.07 + 5, w, h);
      c.fillStyle = '#ffd23f'; for (let x = 20; x < w; x += 70) c.fillRect(x, g + h * 0.12, 34, 4);
    },
    dyn(c, w, h, g, t) {
      const sx = w * 0.84, sy = h * 0.16, sr = h * 0.065;
      St.sun = { x: sx, y: sy, r: sr * 1.4 };
      c.save(); c.translate(sx, sy); c.rotate(t * 0.2);
      c.fillStyle = 'rgba(255,210,63,.35)'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(sr * 1.1, -6); c.lineTo(sr * 1.9, 0); c.lineTo(sr * 1.1, 6); c.fill(); }
      c.restore();
      c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fillStyle = '#ffd23f'; c.fill(); outline(c);
      for (let i = 0; i < 4; i++) { const x = ((i * 0.31 + t * 0.008 * (1 + i * 0.3)) % 1.3 - 0.15) * w; cloud(c, x, h * (0.1 + i * 0.07), h * 0.035 * (1 + (i % 2) * 0.4), 'rgba(255,255,255,.95)'); }
    },
  });
  // 1 Texas
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h * 0.85, [[0, '#ff6f59'], [0.55, '#ffb26b'], [1, '#ffe29a']]),
    static(c, w, h, g) {
      c.beginPath(); c.arc(w * 0.5, g - h * 0.24, h * 0.2, 0, 7); c.fillStyle = '#ffe66d'; c.fill();
      c.fillStyle = 'rgba(255,230,109,.25)'; c.beginPath(); c.arc(w * 0.5, g - h * 0.24, h * 0.27, 0, 7); c.fill();
      const mesa = (x0, x1, top, col) => { c.beginPath(); c.moveTo(x0, g); c.lineTo(x0 + 20, top); c.lineTo(x1 - 25, top); c.lineTo(x1, g); c.closePath(); c.fillStyle = col; c.fill(); outline(c); };
      mesa(-30, w * 0.35, g - h * 0.3, '#c8553d'); mesa(w * 0.58, w * 1.1, g - h * 0.36, '#b2472f'); mesa(w * 0.3, w * 0.66, g - h * 0.18, '#d9734e');
      c.fillStyle = '#eec07b'; c.fillRect(0, g - h * 0.04, w, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.04); c.lineTo(w, g - h * 0.04); c.stroke();
      c.strokeStyle = 'rgba(27,19,48,.25)'; c.lineWidth = 2; const r = rng(4);
      for (let i = 0; i < 14; i++) { const x = r() * w, y = g + r() * h * 0.12; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 12, y + 4); c.lineTo(x + 20, y + 1); c.stroke(); }
      const cactus = (x, s) => {
        c.fillStyle = '#3f9b57';
        rrect(c, x - 9 * s, g - 90 * s, 18 * s, 92 * s, 9 * s); c.fill(); outline(c);
        rrect(c, x - 32 * s, g - 70 * s, 12 * s, 36 * s, 6 * s); c.fill(); outline(c);
        rrect(c, x - 30 * s, g - 42 * s, 24 * s, 11 * s, 5 * s); c.fill(); outline(c);
        rrect(c, x + 20 * s, g - 78 * s, 12 * s, 30 * s, 6 * s); c.fill(); outline(c);
        rrect(c, x + 6 * s, g - 56 * s, 24 * s, 11 * s, 5 * s); c.fill(); outline(c);
      };
      cactus(w * 0.12, h / 420); cactus(w * 0.88, h / 360);
    },
    dyn(c, w, h, g, t) {
      const p = (t * 0.09) % 1.4 - 0.2, x = p * w, y = g - h * 0.035 - Math.abs(Math.sin(t * 3)) * h * 0.04, r = h * 0.035;
      c.save(); c.translate(x, y); c.rotate(t * 5); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(0, 0, r * (0.4 + i * 0.1), i, i + 4); c.stroke(); }
      c.restore();
      St.sun = { x: w * 0.5, y: g - h * 0.24, r: h * 0.2 };
    },
  });
  // 2 Outer space
  const stars = Array.from({ length: 140 }, (_, i) => { const r = rng(i + 3); return [r(), r(), r() * 1.6 + 0.4, r() * 6]; });
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#07061a'], [0.7, '#231554'], [1, '#3b1f78']]),
    static(c, w, h, g) {
      [[0.25, 0.3, '#ff4df0'], [0.7, 0.2, '#4cc9f0'], [0.5, 0.55, '#9b5de5']].forEach(([x, y, col]) => {
        const gr = c.createRadialGradient(w * x, h * y, 0, w * x, h * y, h * 0.45); gr.addColorStop(0, col + '55'); gr.addColorStop(1, col + '00');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      });
      const px = w * 0.2, py = h * 0.28, pr = h * 0.11;
      c.beginPath(); c.arc(px, py, pr, 0, 7); c.fillStyle = '#f28482'; c.fill(); outline(c);
      c.save(); c.beginPath(); c.arc(px, py, pr, 0, 7); c.clip(); c.fillStyle = '#e56b6f'; for (let i = -2; i < 3; i++) c.fillRect(px - pr, py + i * pr * 0.35, pr * 2, pr * 0.14); c.restore();
      c.save(); c.translate(px, py); c.rotate(-0.35); c.beginPath(); c.ellipse(0, 0, pr * 1.9, pr * 0.45, 0, 0, 7); c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#ffd23f'; c.stroke(); c.restore();
      c.beginPath(); c.arc(w * 0.82, h * 0.18, h * 0.045, 0, 7); c.fillStyle = '#4cc9f0'; c.fill(); outline(c);
      c.fillStyle = '#9e9ac8'; c.beginPath(); c.moveTo(0, g - h * 0.03);
      for (let x = 0; x <= w; x += w / 8) c.quadraticCurveTo(x + w / 16, g - h * 0.06, x + w / 8, g - h * 0.03);
      c.lineTo(w, h); c.lineTo(0, h); c.fill(); outline(c);
      const r = rng(9); c.fillStyle = '#7f7aad';
      for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(r() * w, g + r() * h * 0.1, 18 + r() * 26, 5 + r() * 6, 0, 0, 7); c.fill(); outline(c, 2); }
    },
    dyn(c, w, h, g, t) {
      for (const [x, y, s, ph] of stars) { if (y * h > g - h * 0.05) continue; c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + ph); c.fillStyle = '#fff'; c.fillRect(x * w, y * h, s, s); }
      c.globalAlpha = 1;
      const sx = ((t * 0.05) % 1.6 - 0.3) * w, sy = h * 0.12 + ((t * 0.05) % 1.6) * h * 0.2;
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 60, sy - 18); c.stroke();
      St.sun = { x: w * 0.82, y: h * 0.18, r: h * 0.07 };
    },
  });
  // 3 Under the sea
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#2bb3d8'], [0.6, '#137aa6'], [1, '#0b4f75']]),
    static(c, w, h, g) {
      c.fillStyle = '#f0d9a0'; c.beginPath(); c.moveTo(0, g - h * 0.02);
      for (let x = 0; x <= w; x += w / 5) c.quadraticCurveTo(x + w / 10, g - h * 0.06, x + w / 5, g - h * 0.02);
      c.lineTo(w, h); c.lineTo(0, h); c.fill(); outline(c);
      const r = rng(21);
      for (let i = 0; i < 6; i++) { const x = r() * w, y = g + r() * h * 0.1; c.beginPath(); c.arc(x, y, 8, Math.PI, 0); c.fillStyle = ['#ff9f9f', '#ffd6a5', '#fdffb6'][i % 3]; c.fill(); outline(c, 2); }
      for (let i = 0; i < 3; i++) { const x = w * (0.1 + i * 0.38), rr = h * 0.06; c.fillStyle = ['#ff6b6b', '#c77dff', '#ff9f1c'][i]; c.beginPath(); c.ellipse(x, g - rr * 0.3, rr * 1.3, rr, 0, Math.PI, 0); c.fill(); outline(c); }
    },
    dyn(c, w, h, g, t) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const x = w * (0.1 + i * 0.22) + Math.sin(t * 0.4 + i) * 30; const gr = c.createLinearGradient(x, 0, x, g); gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(x - 20, 0); c.lineTo(x + 20, 0); c.lineTo(x + 90, g); c.lineTo(x - 10, g); c.fill(); }
      c.restore();
      for (let i = 0; i < 7; i++) {
        const bx_ = w * (0.04 + i * 0.16), hh = h * (0.25 + (i % 3) * 0.08);
        c.beginPath(); c.moveTo(bx_, g);
        for (let k = 1; k <= 8; k++) c.lineTo(bx_ + Math.sin(t * 1.3 + k * 0.6 + i) * k * 2.2, g - hh * k / 8);
        c.lineWidth = 12; c.strokeStyle = INK; c.stroke(); c.lineWidth = 7; c.strokeStyle = i % 2 ? '#2a9d8f' : '#52b788'; c.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const fx_ = ((t * (0.05 + i * 0.02) + i * 0.4) % 1.3 - 0.15) * w, fy = h * (0.25 + i * 0.13) + Math.sin(t * 2 + i) * 8, s = h * 0.03;
        c.fillStyle = ['#ffd23f', '#ff9f1c', '#ff4d6d'][i];
        c.beginPath(); c.ellipse(fx_, fy, s * 1.4, s, 0, 0, 7); c.fill(); outline(c, 2);
        c.beginPath(); c.moveTo(fx_ - s * 1.3, fy); c.lineTo(fx_ - s * 2.3, fy - s * 0.8); c.lineTo(fx_ - s * 2.3, fy + s * 0.8); c.closePath(); c.fill(); outline(c, 2);
        c.fillStyle = INK; c.beginPath(); c.arc(fx_ + s * 0.7, fy - s * 0.2, 2, 0, 7); c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
      for (let i = 0; i < 14; i++) { const p = (t * 0.12 + i * 0.137) % 1; c.beginPath(); c.arc(w * ((i * 0.071 + 0.03) % 1) + Math.sin(t * 2 + i) * 6, g - p * g, 3 + (i % 3) * 2, 0, 7); c.stroke(); }
      St.sun = null;
    },
  });
  // 4 The big stage
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#1b0f33'], [1, '#3b1a4f']]),
    static(c, w, h, g) {
      c.fillStyle = '#2a1745'; c.fillRect(w * 0.1, 0, w * 0.8, g);
      const curtain = (x0, x1, flip) => {
        c.fillStyle = '#b5172b'; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0);
        c.quadraticCurveTo(flip ? x1 - (x1 - x0) * 0.4 : x1 + (x0 - x1) * 0.4, g * 0.5, flip ? x0 + 30 : x1 - 30, g); c.lineTo(x0, g); c.fill(); outline(c);
        c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 4;
        for (let k = 1; k < 5; k++) { const x = x0 + (x1 - x0) * k / 5; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + (flip ? -10 : 10), g * 0.5, x, g); c.stroke(); }
      };
      curtain(0, w * 0.18, false); curtain(w * 0.82, w, true);
      c.fillStyle = '#b5172b'; c.fillRect(0, 0, w, h * 0.08); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(-2, -2, w + 4, h * 0.08 + 2);
      for (let x = 0; x < w; x += 30) { c.beginPath(); c.arc(x + 15, h * 0.08, 15, 0, Math.PI); c.fillStyle = '#d62839'; c.fill(); outline(c, 2); }
      c.fillStyle = '#8a5a2b'; c.fillRect(0, g - h * 0.03, w, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.03); c.lineTo(w, g - h * 0.03); c.stroke();
      c.strokeStyle = 'rgba(27,19,48,.35)'; c.lineWidth = 2; for (let y = g; y < h; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    },
    dyn(c, w, h, g, t) {
      c.save(); c.globalCompositeOperation = 'lighter';
      [[0.25, '#ffd23f'], [0.75, '#4cc9f0'], [0.5, '#ff4df0']].forEach(([x, col], i) => {
        const a = Math.sin(t * 0.7 + i * 2) * 0.35, ox = w * x, tx = ox + Math.sin(a) * h;
        const gr = c.createLinearGradient(ox, 0, tx, g); gr.addColorStop(0, col + '66'); gr.addColorStop(1, col + '08');
        c.fillStyle = gr; c.beginPath(); c.moveTo(ox - 8, 0); c.lineTo(ox + 8, 0); c.lineTo(tx + 70, g); c.lineTo(tx - 70, g); c.fill();
      });
      c.restore();
      const beat = Math.abs(Math.sin(t * Math.PI * 2));
      c.fillStyle = '#0f0820';
      for (let i = 0; i < 18; i++) { const x = (i + 0.5) * w / 18, bob = ((i % 3) === Math.floor(t * 2) % 3 ? beat : 0) * 8; c.beginPath(); c.arc(x, h - 6 - bob, h * 0.045, 0, 7); c.fill(); }
      St.sun = null;
    },
  });
  // 5 Snowy peaks
  const flakes = Array.from({ length: 70 }, (_, i) => { const r = rng(i + 50); return [r(), r(), r() * 2.5 + 1.5, r()]; });
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#9cc3ee'], [1, '#eef6ff']]),
    static(c, w, h, g) {
      const mtn = (x, pw, ph, col) => { c.beginPath(); c.moveTo(x - pw, g); c.lineTo(x, g - ph); c.lineTo(x + pw, g); c.closePath(); c.fillStyle = col; c.fill(); outline(c); c.beginPath(); c.moveTo(x - pw * 0.28, g - ph * 0.72); c.lineTo(x, g - ph); c.lineTo(x + pw * 0.28, g - ph * 0.72); c.lineTo(x + pw * 0.1, g - ph * 0.66); c.lineTo(x - pw * 0.05, g - ph * 0.74); c.closePath(); c.fillStyle = '#fff'; c.fill(); outline(c, 2); };
      mtn(w * 0.2, w * 0.35, h * 0.55, '#7a8fbd'); mtn(w * 0.75, w * 0.4, h * 0.62, '#6a7fad'); mtn(w * 0.5, w * 0.3, h * 0.4, '#8ea3cf');
      const pine = (x, s) => { c.fillStyle = '#2d6a4f'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - (26 - k * 6) * s, g - (10 + k * 22) * s); c.lineTo(x, g - (46 + k * 22) * s); c.lineTo(x + (26 - k * 6) * s, g - (10 + k * 22) * s); c.closePath(); c.fill(); outline(c, 2.5); } };
      [0.06, 0.14, 0.9, 0.96].forEach((x, i) => pine(w * x, h / 380 * (1 + (i % 2) * 0.25)));
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, g - h * 0.03); c.quadraticCurveTo(w * 0.5, g - h * 0.07, w, g - h * 0.03); c.lineTo(w, h); c.lineTo(0, h); c.fill(); outline(c);
    },
    dyn(c, w, h, g, t) {
      c.fillStyle = '#fff';
      for (const [x, y, s, ph] of flakes) { const yy = ((y + t * 0.05 * (0.5 + ph)) % 1) * h, xx = (x * w + Math.sin(t + ph * 6) * 20); c.beginPath(); c.arc(xx, yy, s, 0, 7); c.fill(); }
      St.sun = null;
    },
  });
  // 6 Neon city
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#0d0628'], [0.7, '#35125e'], [1, '#6b1f73']]),
    static(c, w, h, g) {
      const r = rng(33); let x = 0;
      while (x < w) {
        const bw = 50 + r() * 70, bh = h * (0.25 + r() * 0.45);
        c.fillStyle = ['#1f1446', '#261a55', '#1a1238'][Math.floor(r() * 3)]; c.fillRect(x, g - bh, bw, bh); c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(x, g - bh, bw, bh);
        for (let wy = g - bh + 10; wy < g - 14; wy += 16) for (let wx = x + 8; wx < x + bw - 10; wx += 14) if (r() < 0.45) { c.fillStyle = r() < 0.5 ? '#ffd23f' : '#ff9ff3'; c.fillRect(wx, wy, 6, 8); }
        x += bw + 4;
      }
      c.fillStyle = '#1b1330'; c.fillRect(0, g - h * 0.02, w, h);
      c.fillStyle = '#2b2150'; c.fillRect(0, g - h * 0.02, w, h * 0.06);
    },
    dyn(c, w, h, g, t) {
      const flick = Math.sin(t * 13) > -0.8 ? 1 : 0.3;
      c.save(); c.font = `${Math.round(h * 0.06)}px 'Lilita One', Impact, sans-serif`; c.textAlign = 'center';
      c.shadowBlur = 18; c.shadowColor = '#ff4df0'; c.fillStyle = `rgba(255,120,240,${flick})`; c.fillText('SNEAKERS', w * 0.3, h * 0.3);
      c.shadowColor = '#4cc9f0'; c.fillStyle = '#9bf0ff'; c.fillText('24/7', w * 0.74, h * 0.4); c.restore();
      c.strokeStyle = 'rgba(180,200,255,.45)'; c.lineWidth = 1.5;
      for (let i = 0; i < 50; i++) { const x = ((i * 0.137 + t * 0.03) % 1) * w, y = ((i * 0.291 + t * 1.8) % 1) * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke(); }
      c.globalAlpha = 0.25; c.fillStyle = '#ff4df0'; c.fillRect(w * 0.18, g + h * 0.03, w * 0.24, 3); c.fillStyle = '#4cc9f0'; c.fillRect(w * 0.64, g + h * 0.05, w * 0.18, 3); c.globalAlpha = 1;
      St.sun = null;
    },
  });
  // 7 The sneaker vault
  SCENES.push({
    sky: (c, w, h) => grad(c, 0, h, [[0, '#4a2c05'], [1, '#b8860b']]),
    static(c, w, h, g) {
      const cols = ['#ffffff', '#ff4d6d', '#4cc9f0', '#3ddc97', '#ffd23f', '#b86bff'];
      for (let row = 0; row < 3; row++) {
        const y = h * (0.18 + row * 0.19);
        c.fillStyle = '#6b4108'; c.fillRect(0, y + h * 0.1, w, 10); c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(-2, y + h * 0.1, w + 4, 10);
        for (let x = 20, i = 0; x < w - 40; x += 70, i++) {
          const s = h * 0.035, bx_ = x, by = y + h * 0.1;
          c.fillStyle = cols[(i + row) % cols.length];
          c.beginPath(); c.moveTo(bx_, by); c.quadraticCurveTo(bx_, by - s * 1.6, bx_ + s * 1.2, by - s * 1.6); c.lineTo(bx_ + s * 1.8, by - s * 1.9); c.lineTo(bx_ + s * 2.2, by - s * 1.1); c.quadraticCurveTo(bx_ + s * 3.4, by - s, bx_ + s * 3.4, by); c.closePath(); c.fill(); outline(c, 2);
        }
      }
      c.fillStyle = '#f2e6c9'; c.fillRect(0, g - h * 0.02, w, h); c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(0, g - h * 0.02); c.lineTo(w, g - h * 0.02); c.stroke();
      c.strokeStyle = 'rgba(160,120,60,.35)'; c.lineWidth = 2; for (let x = -h; x < w; x += 50) { c.beginPath(); c.moveTo(x, g); c.lineTo(x + h * 0.2, h); c.stroke(); }
      [0.08, 0.92].forEach(x => { c.fillStyle = '#d4a017'; c.fillRect(w * x - 5, g - h * 0.12, 10, h * 0.12); outline(c, 2); c.beginPath(); c.arc(w * x, g - h * 0.12, 9, 0, 7); c.fill(); outline(c, 2); });
      c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(w * 0.08, g - h * 0.1); c.quadraticCurveTo(w * 0.5, g - h * 0.02, w * 0.92, g - h * 0.1); c.stroke();
      c.strokeStyle = '#a4161a'; c.lineWidth = 5; c.stroke();
    },
    dyn(c, w, h, g, t) {
      for (let i = 0; i < 16; i++) {
        const x = ((i * 0.173) % 1) * w, y = ((i * 0.311) % 0.8) * h, s = 4 + 4 * Math.max(0, Math.sin(t * 2 + i * 1.7));
        c.fillStyle = '#fff8c4'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.3, y - s * 0.3); c.lineTo(x + s, y); c.lineTo(x + s * 0.3, y + s * 0.3); c.lineTo(x, y + s); c.lineTo(x - s * 0.3, y + s * 0.3); c.lineTo(x - s, y); c.lineTo(x - s * 0.3, y - s * 0.3); c.fill();
      }
      St.sun = null;
    },
  });
  St.SCENE_COUNT = SCENES.length;

  function buildStatic(i) {
    const sc = SCENES[i], c = document.createElement('canvas');
    c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
    const x = c.getContext('2d'); x.scale(DPR, DPR);
    x.fillStyle = sc.sky(x, W, H); x.fillRect(0, 0, W, H);
    sc.static(x, W, H, groundY);
    return c;
  }
  St.setScene = (i) => { sceneIdx = i % SCENES.length; staticLayer = null; };

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
      const side = k % 2 ? 1 : -1, lane = Math.floor(k / 2);
      const x = W / 2 + side * (W * 0.2 + lane * W * 0.045);
      if (x < 10 || x > W - 10) return;
      const y = groundY - H * 0.05 - (lane % 2) * H * 0.02;
      const ph = kind === 'choir' ? 0 : Math.max(0, Math.sin((beat + (kind === 'fan' ? 0.5 : 0)) * Math.PI));
      person(c, x, y, sc * (kind === 'kid' ? 0.75 : 0.9), SHIRTS[(k + (kind === 'fan' ? 3 : 0)) % 6], SKINS[k % 5], ph * hopAmp * (St.q.reduce ? 0 : 1), kind, k);
      slot++;
    });
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
    document.documentElement.style.setProperty('--charH', ch + 'px');
    document.documentElement.style.setProperty('--ground', (H - groundY) + 'px');
  };
  St.otCenter = () => ({ x: W / 2, y: groundY - St.charH() * 0.55, top: groundY - St.charH() * 1.02, feet: groundY });
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
  St.sleep = () => { asleep = true; ot.classList.add('asleep'); };
  St.wake = (silent) => { asleep = false; ot.classList.remove('asleep'); if (!silent) root.dispatchEvent(new CustomEvent('otoole-wake')); };
  St.isAsleep = () => asleep;

  /* ---------------- tuxedo men ---------------- */
  const enemyEls = new Map();
  St.enemyX = (e) => {
    const edge = W * 0.08, mid = W / 2 - St.charH() * 0.28;
    const p = e.type === 'golden' ? e.p / 2 : Math.min(1, e.p);
    if (e.type === 'golden') return e.side < 0 ? -80 + (W + 160) * p : W + 80 - (W + 160) * p;
    const from = -edge, to = mid;
    return e.side < 0 ? from + (to - from) * p : W - (from + (to - from) * p);
  };
  St.addEnemy = (e) => {
    const el = document.createElement('button');
    el.className = 'enemy walk' + (e.boss ? ' boss' : '') + (e.big ? ' big' : '') + (e.type === 'golden' ? ' golden' : '');
    el.setAttribute('aria-label', 'Kick ' + e.name);
    el.innerHTML = `<div class="en-body">${A.tux(e.look)}</div><div class="hp"><i></i></div><div class="say"></div>`;
    el.dataset.id = e.id;
    $('#sprites').appendChild(el);
    enemyEls.set(e.id, el);
    el.style.setProperty('--dir', e.side < 0 ? 1 : -1);
    if (e.type !== 'golden' && Math.random() < 0.7) setTimeout(() => St.enemySay(e, ['Take them off!', 'Sneakers OFF!', 'This is a black-tie event!', 'Remove the footwear, sir!', 'Take them off!!'][Math.floor(Math.random() * 5)]), 600 + Math.random() * 1500);
    if (e.type === 'golden') St.enemySay(e, 'Catch me!');
    return el;
  };
  St.enemySay = (e, txt) => {
    const el = enemyEls.get(e.id); if (!el) return;
    const s = el.querySelector('.say'); s.textContent = txt; s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  };
  St.enemyHit = (e, dmg, crit) => {
    const el = enemyEls.get(e.id); if (!el) return;
    el.querySelector('.hp i').style.width = Math.max(0, e.hp / e.max * 100) + '%';
    el.classList.add('show-hp');
    const body = el.querySelector('.en-body');
    body.animate([{ filter: 'brightness(3)', transform: 'translateX(0) rotate(0)' }, { filter: 'brightness(1)', transform: `translateX(${e.side * -10}px) rotate(${e.side * -6}deg)` }, { transform: 'translateX(0) rotate(0)' }], { duration: 220 });
    const x = St.enemyX(e), y = groundY - St.charH() * (e.big ? 0.7 : 0.6);
    St.burst('spark', x, y, crit ? 10 : 5, { speed: 280, size: crit ? 12 : 8, colors: ['#ffd23f', '#ffffff', '#ff9f1c'], gravity: 300, life: 0.4 });
    St.float((crit ? 'CRIT ' : '') + '-' + C.fmt(dmg), x, y - 30, { size: crit ? 26 : 18, color: crit ? '#ffd23f' : '#ffffff', vy: 110, life: 0.7 });
  };
  St.enemyDefeat = (e) => {
    const el = enemyEls.get(e.id); if (!el) return;
    enemyEls.delete(e.id);
    el.classList.remove('walk'); el.classList.add('dead');
    const dir = e.side < 0 ? -1 : 1;
    const x = St.enemyX(e), y = groundY - St.charH() * 0.5;
    St.burst('spark', x, y, 18, { speed: 380, size: 12, colors: ['#ffd23f', '#ffffff', '#ff4d6d'], gravity: 400, life: 0.6 });
    St.burst('ring', x, y, 1, { speed: 0, size: 90, color: '#ffffff', gravity: 0, life: 0.4 });
    el.animate([
      { transform: `translateX(-50%) translate(0,0) rotate(0) scaleX(${e.side < 0 ? 1 : -1})` },
      { transform: `translateX(-50%) translate(${dir * W * 0.35}px, ${-H * 0.7}px) rotate(${dir * 720}deg) scaleX(${e.side < 0 ? 1 : -1})`, opacity: 0.9 },
    ], { duration: 900, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = () => el.remove();
  };
  St.enemyLeave = (e) => {
    const el = enemyEls.get(e.id); if (!el) return;
    enemyEls.delete(e.id);
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => el.remove();
  };
  St.clearEnemies = () => { enemyEls.forEach(el => el.remove()); enemyEls.clear(); };
  function updateEnemies() {
    const s = C.get(), live = new Set();
    for (const e of s.enemies) {
      live.add(e.id);
      let el = enemyEls.get(e.id); if (!el) el = St.addEnemy(e);
      const x = St.enemyX(e);
      el.style.left = x + 'px';
      const walking = e.boss ? e.p < 0.62 : true;
      el.classList.toggle('walk', walking);
      el.classList.toggle('flee', !!e.flee);
      if (e.flee) el.style.setProperty('--dir', e.side < 0 ? -1 : 1);
      el.classList.toggle('near', !e.boss && e.type !== 'golden' && e.p > 0.72);
      el.classList.toggle('grab', !!e.boss && e.p >= 0.62);
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
    if (!staticLayer) staticLayer = buildStatic(sceneIdx);
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.drawImage(staticLayer, 0, 0);
    bx.setTransform(DPR, 0, 0, DPR, 0, 0);
    SCENES[sceneIdx].dyn(bx, W, H, groundY, St.q.bgAnim && !St.q.reduce ? t : 0);
    drawCrowd(bx);
    // fx layer
    fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawParts(fx, dt);
    updateEnemies(); updateGolden(); updateCams();
    // pose timing, idle & sleep
    if (poseUntil && performance.now() > poseUntil) { poseUntil = 0; St.setPose('stand'); }
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
