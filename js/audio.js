/* Sneakers O'Toole — audio: the piano song, O'Toole's vocals, synth voices, the "No!", effects, background pad. */
(function (root) {
  'use strict';
  const D = root.DATA;
  const S = {};
  let ac = null, master, comp, bus = {}, buffers = {}, ready = false;
  const vol = { master: 0.8, music: 0.3, piano: 0.85, sfx: 0.7, voice: 1, no: 1 };
  S.vol = vol;
  S.voice = 'vocals';
  S.tts = false;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function dataToBuf(uri) {
    const b64 = uri.split(',')[1], bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  S.init = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return Promise.resolve(); }
    try { ac = new (root.AudioContext || root.webkitAudioContext)(); } catch (e) { return Promise.resolve(); }
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ac.createGain(); master.connect(comp); comp.connect(ac.destination);
    ['music', 'piano', 'sfx', 'voice', 'no'].forEach(k => { bus[k] = ac.createGain(); bus[k].connect(master); });
    // a short plate-ish reverb for sparkle
    const rev = ac.createConvolver(), len = ac.sampleRate * 1.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir; bus.rev = ac.createGain(); bus.rev.gain.value = 0.22; bus.rev.connect(rev); rev.connect(master);
    S.applyVolumes();
    const loads = Object.entries(root.ASSETS || {}).map(([k, uri]) =>
      ac.decodeAudioData(dataToBuf(uri)).then(b => { buffers[k] = b; }).catch(() => {}));
    return Promise.all(loads).then(() => { ready = true; });
  };
  S.ctx = () => ac;
  S.ready = () => ready;
  S.applyVolumes = () => {
    if (!ac) return;
    const t = ac.currentTime;
    master.gain.setTargetAtTime(vol.master, t, 0.03);
    bus.music.gain.setTargetAtTime(vol.music * 0.55 * (S.inSong ? 0.3 : 1), t, 0.05);
    bus.sfx.gain.setTargetAtTime(vol.sfx * 0.6, t, 0.03);
    bus.voice.gain.setTargetAtTime(vol.voice, t, 0.03);
    bus.piano.gain.setTargetAtTime(vol.piano, t, 0.03);
    bus.no.gain.setTargetAtTime(vol.no * 1.1, t, 0.03);
  };

  /* ---------------- primitives ---------------- */
  function env(g, t, a, peak, d, sus, r, len) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + len);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + r);
  }
  function tone(o) {
    // o: {f, type, t, len, vol, a, d, sus, r, dest, detune, slide, rev}
    if (!ac) return;
    const t = o.t || ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + (o.slideT || o.len || 0.2));
    if (o.detune) osc.detune.value = o.detune;
    env(g, t, o.a || 0.005, o.vol || 0.2, o.d || 0.1, o.sus === undefined ? 0.4 : o.sus, o.r || 0.12, o.len || 0.15);
    osc.connect(g);
    let out = g;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    out.connect(o.dest || bus.sfx);
    if (o.rev) out.connect(bus.rev);
    osc.start(t); osc.stop(t + (o.len || 0.15) + (o.r || 0.12) + 0.05);
  }
  function noise(o) {
    if (!ac) return;
    const t = o.t || ac.currentTime, len = o.len || 0.2;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (len + 0.3)), ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 1;
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + len);
    const g = ac.createGain(); env(g, t, o.a || 0.003, o.vol || 0.2, o.d || 0.05, o.sus === undefined ? 0.3 : o.sus, o.r || 0.08, len);
    src.connect(f); f.connect(g); g.connect(o.dest || bus.sfx);
    if (o.rev) g.connect(bus.rev);
    src.start(t); src.stop(t + len + 0.3);
  }
  S.tone = tone; S.noise = noise;

  /* ---------------- the song ----------------
     Clicking O'Toole plays the whole piano recording. Each word the player hits is
     sung by scheduling that slice of the vocal track at its exact spot in the song,
     so the voice always lands in time with the piano. */
  const VOWELS = { ai: [750, 1200, 2600], o: [570, 840, 2410], e: [530, 1840, 2480], i: [300, 2300, 3000], a: [700, 1650, 2500], u: [320, 800, 2240] };
  S.offset = 0;                    // player's timing calibration, seconds
  S.latency = () => ac ? (ac.outputLatency || ac.baseLatency || 0) : 0;
  // the moment the player is hearing right now, on the audio clock
  S.clock = () => ac ? ac.currentTime - S.latency() - S.offset : performance.now() / 1000 - S.offset;
  let songSrc = null, songT0 = 0;
  // lead = seconds before the piano begins, so the first notes can slide in from the top of the lane
  let songRate = 1;
  S.songStart = (lead, rate) => {
    lead = lead || 0.04; songRate = rate || 1;
    if (!ac || !buffers.piano) { songT0 = S.clock() + lead; return songT0; }
    S.songStop();
    const T = ac.currentTime + lead;
    const src = ac.createBufferSource(); src.buffer = buffers.piano; src.playbackRate.value = songRate;
    const g = ac.createGain(); g.gain.value = 1;
    src.connect(g); g.connect(bus.piano); g.connect(bus.rev);
    src.start(T); songSrc = { s: src, g }; songT0 = T;
    return T;
  };
  S.songStop = () => {
    if (!songSrc || !ac) return;
    const { s, g } = songSrc, t = ac.currentTime;
    try { g.gain.setTargetAtTime(0.0001, t, 0.05); s.stop(t + 0.3); } catch (e) {}
    songSrc = null;
  };
  function synthVoice(p, t, mode, gainMul) {
    const notes = p.sing, step = 0.12;
    notes.forEach((n0, k) => {
      const n = n0 + 12, tt = t + k * step, len = k === notes.length - 1 ? Math.max(0.12, p.e - p.t - k * step) : 0.1;
      if (mode === 'box') {
        tone({ f: mtof(n + 12), type: 'sine', t: tt, len: 0.05, vol: 0.28 * gainMul, a: 0.002, d: 0.4, sus: 0.001, r: 0.3, dest: bus.voice, rev: 1 });
        tone({ f: mtof(n + 24), type: 'sine', t: tt, len: 0.03, vol: 0.06 * gainMul, a: 0.002, d: 0.2, sus: 0.001, r: 0.2, dest: bus.voice });
      } else if (mode === 'chip') {
        tone({ f: mtof(n), type: 'square', t: tt, len, vol: 0.1 * gainMul, a: 0.002, d: 0.05, sus: 0.7, r: 0.05, dest: bus.voice, lp: 5000 });
      } else {
        const osc = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(mtof(n) * (mode === 'kazoo' ? 1.01 : 1), tt);
        if (mode === 'kazoo') osc.frequency.exponentialRampToValueAtTime(mtof(n), tt + 0.06);
        lfo.frequency.value = mode === 'kazoo' ? 7 : 5.5; lg.gain.value = mode === 'kazoo' ? 6 : 3; lfo.connect(lg); lg.connect(osc.frequency);
        env(g, tt, mode === 'kazoo' ? 0.01 : 0.04, 0.5 * gainMul, 0.1, 0.8, 0.12, len);
        const fs = mode === 'kazoo' ? [[900, 3], [1800, 5], [3200, 8]] : (VOWELS[p.vowel] || VOWELS.a).map(f => [f, 9]);
        const mix = ac.createGain(); mix.gain.value = mode === 'kazoo' ? 0.35 : 0.9;
        fs.forEach(([f, q], j) => { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const gg = ac.createGain(); gg.gain.value = [1, 0.6, 0.3][j]; osc.connect(bp); bp.connect(gg); gg.connect(mix); });
        mix.connect(g); g.connect(bus.voice); g.connect(bus.rev);
        osc.start(tt); lfo.start(tt); osc.stop(tt + len + 0.2); lfo.stop(tt + len + 0.2);
      }
    });
  }
  // sing word i of a song that started at audio time T
  let lastVoc = null;
  S.vocal = (i, T, opt) => {
    if (!ac) return;
    opt = opt || {};
    const p = D.PHRASE[i], gm = opt.auto ? 0.6 : 1, now = ac.currentTime + 0.004;
    if (T === undefined) T = songT0;
    const rate = opt.rate || songRate;   // song speed: recording seconds per real second
    if (S.voice !== 'vocals' || !buffers.vocals) {
      synthVoice(p, Math.max(now, T + p.t / rate), S.voice === 'vocals' ? 'box' : S.voice, gm);
    } else {
      // Each sung word keeps going past its own end, so a missed next word never chops the line.
      // When the next word is hit, the tail hands off at exactly the spot where that word begins
      // (same recording, same timeline), so the join is seamless instead of doubled.
      const from = p.s - 0.012, at = T + from / rate, end = T + (p.e + 0.55) / rate;
      if (end > now + 0.03) {
        const skip = Math.max(0, now - at), start = at + skip;   // skip is in real seconds
        if (lastVoc && lastVoc.T === T && lastVoc.i < i && lastVoc.end > start) {
          try { lastVoc.g.gain.cancelScheduledValues(start); lastVoc.g.gain.setTargetAtTime(0.0001, start, 0.012); lastVoc.src.stop(start + 0.1); } catch (e) {}
        }
        const src = ac.createBufferSource(); src.buffer = buffers.vocals; src.playbackRate.value = rate;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(1.25 * gm, start + (skip ? 0.015 : 0.006));
        g.gain.setValueAtTime(1.25 * gm, Math.max(start + 0.02, T + (p.e + 0.2) / rate));
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        src.connect(g); g.connect(bus.voice); g.connect(bus.rev);
        src.start(start, from + skip * rate, (end - start) * rate + 0.05);
        lastVoc = { src, g, i, T, end };
      }
    }
    if (opt.crit) { const t = Math.max(now, T + p.t / rate); tone({ f: mtof(p.sing[0] + 36), type: 'sine', t, len: 0.05, vol: 0.1, a: 0.002, d: 0.3, sus: 0.001, r: 0.4, rev: 1 }); tone({ f: mtof(p.sing[0] + 43), type: 'sine', t: t + 0.06, len: 0.05, vol: 0.07, a: 0.002, d: 0.3, sus: 0.001, r: 0.4, rev: 1 }); }
    if (S.tts && !opt.auto && root.speechSynthesis) {
      try { root.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(p.w); u.rate = 1.6; u.pitch = 1.3; u.volume = vol.voice * vol.master; root.speechSynthesis.speak(u); } catch (e) {}
    }
  };
  // a single word on its own, outside a song (logo easter egg)
  S.word = (i) => { if (!ac) return; const p = D.PHRASE[i]; S.vocal(i, ac.currentTime + 0.01 - (p.s - 0.012), { rate: 1 }); };
  // the full recording with vocals (intro)
  let fullSrc = null;
  S.playFull = (when) => {
    if (!ac || !buffers.full) return null;
    const src = ac.createBufferSource(); src.buffer = buffers.full;
    const g = ac.createGain(); g.gain.value = 1.1; src.connect(g); g.connect(bus.voice); g.connect(bus.rev);
    const t = when || ac.currentTime + 0.02; src.start(t); fullSrc = src;
    return t;
  };
  S.playMelody = S.playFull;
  S.stopMelody = () => { if (fullSrc) try { fullSrc.stop(); } catch (e) {} fullSrc = null; S.songStop(); };

  // tuxedo men's voice lines (line_hey, line_said, line_letgo); one speaks at a time
  let lineUntil = 0;
  S.hasLine = (id) => !!buffers['line_' + id];
  S.lineBusy = () => ac ? Math.max(0, lineUntil - ac.currentTime) : 0;
  // rate < 1 plays the line slower and lower (bosses get a deeper voice)
  S.line = (id, force, rate) => {
    if (!ac) return 0;
    const buf = buffers['line_' + id]; if (!buf) return 0;
    const now = ac.currentTime; rate = rate || 1;
    if (!force && now < lineUntil) return 0;
    const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ac.createGain(); g.gain.value = rate < 1 ? 1.2 : 1; src.connect(g);
    if (rate < 1) {   // a little low-end weight for the big guys
      const lo = ac.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 220; lo.gain.value = 6; g.connect(lo); lo.connect(bus.no);
    } else g.connect(bus.no);
    src.start(now + 0.01); lineUntil = now + buf.duration / rate;
    return buf.duration / rate;
  };

  // computer-voice fallback for lines with no recording yet
  S.lineVoice = 'auto';   // 'auto' = recording if present, else device speech; 'speech'; 'off'
  let speechVoice = null;
  function pickVoice() {
    const vs = root.speechSynthesis ? root.speechSynthesis.getVoices() : [];
    const en = vs.filter(v => /^en/i.test(v.lang));
    return en.find(v => /male|david|daniel|fred|alex|guy|george|mark/i.test(v.name) && !/female/i.test(v.name)) || en[0] || vs[0] || null;
  }
  if (root.speechSynthesis) { try { root.speechSynthesis.onvoiceschanged = () => { speechVoice = pickVoice(); }; } catch (e) {} }
  let speakUntil = 0;
  S.say = (id, text, force, rate) => {
    if (S.lineVoice === 'off') return 0;
    if (S.lineVoice !== 'speech' && buffers['line_' + id]) return S.line(id, force, rate);
    const ss = root.speechSynthesis; if (!ss || !text) return 0;
    const now = performance.now();
    if (!force && now < speakUntil) return 0;
    try {
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      speechVoice = speechVoice || pickVoice(); if (speechVoice) u.voice = speechVoice;
      u.pitch = rate && rate < 1 ? 0.1 : 0.65; u.rate = rate && rate < 1 ? 0.85 : 1.05; u.volume = Math.min(1, vol.no * vol.master);
      ss.speak(u);
      const est = 0.35 + text.length * 0.065;
      speakUntil = now + est * 1000;
      return est;
    } catch (e) { return 0; }
  };

  let lastNo = 0;
  S.no = (force) => {
    if (!ac) return;
    const now = ac.currentTime;
    if (!force && now - lastNo < 0.3) return;
    lastNo = now;
    const buf = buffers.no;
    if (!buf) { tone({ f: 220, slide: 140, type: 'sawtooth', len: 0.3, vol: 0.2, dest: bus.no, lp: 1500 }); return; }
    const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = 0.97 + Math.random() * 0.08;
    const g = ac.createGain(); g.gain.value = 1; src.connect(g); g.connect(bus.no);
    src.start(now + 0.005);
  };

  /* ---------------- effects ---------------- */
  const fx = {};
  fx.ui = () => tone({ f: 1400, type: 'sine', len: 0.015, vol: 0.06, a: 0.001, d: 0.03, sus: 0.01, r: 0.03 });
  fx.hover = () => tone({ f: 2200, type: 'sine', len: 0.01, vol: 0.015, a: 0.001, d: 0.02, sus: 0.01, r: 0.02 });
  fx.tab = () => { tone({ f: 660, type: 'triangle', len: 0.03, vol: 0.08 }); tone({ f: 990, type: 'triangle', t: ac.currentTime + 0.04, len: 0.03, vol: 0.06 }); };
  fx.buy = (n) => { const t = ac.currentTime; tone({ f: 1318, type: 'square', t, len: 0.04, vol: 0.05, lp: 4000 }); tone({ f: 1975, type: 'square', t: t + 0.05, len: 0.08, vol: 0.05, lp: 4000 }); if (n > 1) tone({ f: 2637, type: 'square', t: t + 0.1, len: 0.08, vol: 0.04, lp: 4000 }); };
  fx.miss = () => { noise({ f: 300, ft: 'lowpass', len: 0.05, vol: 0.12 }); tone({ f: 140, slide: 100, type: 'square', len: 0.06, vol: 0.03, lp: 700 }); };
  fx.cant = () => tone({ f: 180, type: 'square', len: 0.08, vol: 0.05, lp: 900 });
  fx.upgrade = () => { const t = ac.currentTime;[0, 4, 7, 12].forEach((s, i) => tone({ f: mtof(72 + s), type: 'triangle', t: t + i * 0.05, len: 0.08, vol: 0.12, rev: 1 })); };
  fx.hit = (big) => { noise({ f: 900, q: 0.8, len: 0.06, vol: big ? 0.5 : 0.35 }); tone({ f: big ? 120 : 160, slide: 60, type: 'sine', len: 0.08, vol: 0.4, a: 0.001 }); };
  fx.crit = () => { fx.hit(true); tone({ f: 1760, slide: 2640, type: 'square', len: 0.06, vol: 0.06, lp: 6000, rev: 1 }); };
  fx.whoosh = () => { noise({ f: 700, fTo: 2600, q: 1.2, len: 0.16, vol: 0.14, a: 0.03, sus: 0.6 }); tone({ f: 520, slide: 900, type: 'sine', len: 0.08, vol: 0.05 }); };
  fx.whooshBig = () => noise({ f: 400, fTo: 3000, q: 1.5, len: 0.35, vol: 0.18, a: 0.08, sus: 0.8 });
  fx.tug = () => { tone({ f: 500, slide: 120, type: 'sawtooth', len: 0.4, vol: 0.12, lp: 1400 }); noise({ f: 300, len: 0.3, vol: 0.15, ft: 'lowpass' }); };
  fx.spawn = () => { const t = ac.currentTime; tone({ f: 330, type: 'square', t, len: 0.06, vol: 0.05, lp: 2000 }); tone({ f: 311, type: 'square', t: t + 0.09, len: 0.1, vol: 0.05, lp: 2000 }); };
  fx.boss = () => { const t = ac.currentTime;[[44, 56, 63], [43, 55, 62]].forEach((ch, k) => ch.forEach(n => tone({ f: mtof(n), type: 'sawtooth', t: t + k * 0.35, len: 0.3, vol: 0.09, a: 0.02, lp: 1400, sus: 0.8 }))); noise({ f: 120, ft: 'lowpass', len: 0.6, vol: 0.4, t: t + 0.7 }); };
  fx.goldenSpawn = () => { const t = ac.currentTime;[88, 91, 95, 100].forEach((n, i) => tone({ f: mtof(n), type: 'sine', t: t + i * 0.06, len: 0.04, vol: 0.06, d: 0.3, sus: 0.01, r: 0.3, rev: 1 })); };
  fx.golden = () => { const t = ac.currentTime;[68, 72, 75, 80, 84, 87, 92].forEach((n, i) => tone({ f: mtof(n), type: 'triangle', t: t + i * 0.045, len: 0.08, vol: 0.1, rev: 1 })); };
  fx.verse = (q) => {
    const t = ac.currentTime;
    noise({ f: 1800, q: 0.5, len: 0.5, vol: 0.06, a: 0.1, sus: 0.7, r: 0.3 });
    [56, 60, 63, 68].forEach(n => tone({ f: mtof(n + 12), type: 'triangle', t, len: 0.25, vol: 0.05, a: 0.01, sus: 0.6, r: 0.4, rev: 1 }));
    if (q === 2) [75, 80, 84, 87, 92, 96].forEach((n, i) => tone({ f: mtof(n), type: 'sine', t: t + 0.08 + i * 0.05, len: 0.05, vol: 0.07, d: 0.3, sus: 0.01, r: 0.4, rev: 1 }));
  };
  fx.ach = () => { const t = ac.currentTime;[[68, 0], [72, 0.1], [75, 0.2], [80, 0.32]].forEach(([n, d]) => { tone({ f: mtof(n), type: 'square', t: t + d, len: d > 0.3 ? 0.35 : 0.08, vol: 0.06, lp: 3500, rev: 1 }); tone({ f: mtof(n - 12), type: 'triangle', t: t + d, len: 0.1, vol: 0.08 }); }); };
  fx.boxShake = (i) => { noise({ f: 250 + i * 60, ft: 'lowpass', len: 0.07, vol: 0.35 }); tone({ f: 90 + i * 12, type: 'sine', len: 0.06, vol: 0.2 }); };
  fx.boxOpen = (r) => {
    const t = ac.currentTime;
    noise({ f: 1200, fTo: 6000, q: 0.7, len: 0.25, vol: 0.12, a: 0.01 });
    const base = [60, 62, 64, 67, 68, 72][r];
    const ch = r >= 4 ? [0, 4, 7, 11, 14, 19] : r >= 2 ? [0, 4, 7, 12] : [0, 7, 12];
    ch.forEach((s, i) => tone({ f: mtof(base + s), type: r >= 3 ? 'sawtooth' : 'triangle', t: t + 0.05 + i * (r >= 4 ? 0.07 : 0.04), len: 0.3 + r * 0.1, vol: 0.06, lp: 3000 + r * 800, sus: 0.6, r: 0.5, rev: 1 }));
    if (r >= 4) for (let i = 0; i < 10; i++) tone({ f: mtof(84 + Math.floor(Math.random() * 16)), type: 'sine', t: t + 0.4 + i * 0.05, len: 0.03, vol: 0.05, d: 0.2, sus: 0.01, r: 0.2, rev: 1 });
  };
  fx.shiny = () => { const t = ac.currentTime; for (let i = 0; i < 14; i++) tone({ f: mtof(79 + (i * 5) % 24), type: 'sine', t: t + i * 0.035, len: 0.03, vol: 0.06, d: 0.2, sus: 0.01, r: 0.3, rev: 1 }); };
  fx.tick = () => tone({ f: 1800, type: 'square', len: 0.008, vol: 0.05, a: 0.001, d: 0.01, sus: 0.01, r: 0.01, lp: 5000 });
  fx.jackpot = () => { const t = ac.currentTime; for (let k = 0; k < 3; k++)[68, 72, 75, 80].forEach((n, i) => tone({ f: mtof(n + k * 5), type: 'square', t: t + k * 0.22 + i * 0.05, len: 0.1, vol: 0.05, lp: 4000, rev: 1 })); };
  fx.cutaway = () => { noise({ f: 200, fTo: 8000, q: 1.2, len: 0.7, vol: 0.2, a: 0.3, sus: 0.9, r: 0.3 }); const t = ac.currentTime; tone({ f: 110, slide: 880, type: 'sawtooth', t, len: 0.7, vol: 0.06, lp: 2500 }); };
  fx.event = () => { const t = ac.currentTime;[76, 79, 84].forEach((n, i) => tone({ f: mtof(n), type: 'triangle', t: t + i * 0.09, len: 0.08, vol: 0.1, rev: 1 })); };
  fx.cam = () => { noise({ f: 5000, q: 0.5, len: 0.03, vol: 0.3 }); noise({ f: 3000, q: 0.5, len: 0.05, vol: 0.2, t: ac.currentTime + 0.05 }); };
  fx.star = () => { const t = ac.currentTime;[72, 79, 84].forEach((n, i) => tone({ f: mtof(n), type: 'triangle', t: t + i * 0.07, len: 0.1, vol: 0.09, rev: 1 })); };
  fx.error = () => { tone({ f: 220, type: 'square', len: 0.1, vol: 0.05, lp: 1200 }); tone({ f: 196, type: 'square', t: ac.currentTime + 0.12, len: 0.15, vol: 0.05, lp: 1200 }); };
  fx.snore = () => noise({ f: 300, q: 2, len: 0.8, vol: 0.05, a: 0.4, sus: 0.8, r: 0.3 });
  // arriving at a stop: a little brass fanfare in A-flat
  fx.arrive = () => {
    const t = ac.currentTime;
    [[68, 0, 0.12], [72, 0.12, 0.12], [75, 0.24, 0.12], [80, 0.36, 0.5]].forEach(([n, d, l]) => { tone({ f: mtof(n), type: 'sawtooth', t: t + d, len: l, vol: 0.06, lp: 2600, a: 0.02, sus: 0.7, rev: 1 }); tone({ f: mtof(n - 12), type: 'square', t: t + d, len: l, vol: 0.035, lp: 1500, rev: 1 }); });
    [56, 60, 63].forEach(n => tone({ f: mtof(n), type: 'triangle', t: t + 0.36, len: 0.6, vol: 0.06, sus: 0.7, r: 0.5, rev: 1 }));
    noise({ f: 6000, q: 0.4, len: 0.4, vol: 0.05, t: t + 0.36, a: 0.01, sus: 0.3, r: 0.4 });
  };
  fx.hypeReady = (i) => { const t = ac.currentTime;[84, 88, 91].slice(0, i + 1).forEach((n, k) => tone({ f: mtof(n), type: 'sine', t: t + k * 0.05, len: 0.05, vol: 0.07, d: 0.2, sus: 0.01, r: 0.25, rev: 1 })); };
  fx.move = (id) => {
    const t = ac.currentTime;
    if (id === 'strut') {
      // a funky bass slide and a snappy chord
      tone({ f: mtof(44), slide: mtof(56), type: 'sawtooth', t, len: 0.18, vol: 0.12, lp: 900 });
      [68, 72, 75, 79].forEach(n => tone({ f: mtof(n), type: 'square', t: t + 0.16, len: 0.07, vol: 0.04, lp: 3000, rev: 1 }));
      [68, 72, 75, 79].forEach(n => tone({ f: mtof(n + 2), type: 'square', t: t + 0.3, len: 0.12, vol: 0.04, lp: 3000, rev: 1 }));
    } else if (id === 'show') {
      noise({ f: 5000, q: 0.3, len: 0.9, vol: 0.12, a: 0.005, sus: 0.4, r: 0.8 });
      [56, 63, 68, 72, 75, 80, 84].forEach((n, i) => tone({ f: mtof(n), type: i < 3 ? 'sawtooth' : 'triangle', t: t + i * 0.025, len: 0.7, vol: 0.05, lp: 3200, sus: 0.8, r: 0.6, rev: 1 }));
      tone({ f: 70, slide: 45, type: 'sine', len: 0.4, vol: 0.4 });
    } else {
      fx.whooshBig();
      [72, 76, 79, 84, 88].forEach((n, i) => tone({ f: mtof(n), type: 'square', t: t + 0.1 + i * 0.04, len: 0.06, vol: 0.05, lp: 5000, rev: 1 }));
    }
  };
  S.fx = (name, ...a) => { if (!ac || !fx[name]) return; try { fx[name](...a); } catch (e) {} };

  /* ---------------- adaptive music ---------------- */
  // A soft pad that follows the harmony of the last sung word, plus a beat that grows with your combo.
  const BPM = 120, BEAT = 60 / BPM;
  let mOn = false, nextBeat = 0, beatN = 0, timer = null, padVoices = [], padChord = null;
  S.intensity = 0;
  S.chord = 'Ab';
  function setPad(ch) {
    if (!ac || ch === padChord) return;
    padChord = ch;
    const t = ac.currentTime;
    padVoices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0.0001, t, 0.35); v.o.forEach(o => o.stop(t + 2)); });
    padVoices = [];
    const notes = D.CHORDS[ch].slice(0, 4).map(n => n - 12 + (n < 64 ? 12 : 0));
    notes.forEach((n, i) => {
      const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 0.3;
      const o = [-6, 6].map(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt; o.connect(f); o.start(t); return o; });
      g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(0.028, t, 0.5);
      f.connect(g); g.connect(bus.music);
      padVoices.push({ g, o });
    });
  }
  function schedule() {
    if (!mOn || !ac) return;
    while (nextBeat < ac.currentTime + 0.12) {
      const t = nextBeat, i = S.inSong ? 0 : S.intensity, b = beatN % 4;
      const bass = D.CHORD_BASS[S.chord] || 44;
      // bass on 1 and 3, fifth on 2 and 4: an oom-pah echo of the reference piano
      if (i >= 1) tone({ f: mtof(b % 2 === 0 ? bass : bass + 7), type: 'triangle', t, len: 0.14, vol: 0.2, a: 0.004, d: 0.15, sus: 0.4, r: 0.1, dest: bus.music });
      if (i >= 1 && b % 2 === 0) { tone({ f: 110, slide: 45, type: 'sine', t, len: 0.1, vol: 0.35, a: 0.002, d: 0.1, sus: 0.2, r: 0.05, dest: bus.music }); }
      if (i >= 2) { noise({ f: 7000, ft: 'highpass', q: 0.5, t: t + BEAT / 2, len: 0.02, vol: 0.06, d: 0.02, sus: 0.1, r: 0.03, dest: bus.music }); noise({ f: 7000, ft: 'highpass', q: 0.5, t, len: 0.015, vol: 0.035, d: 0.02, sus: 0.1, r: 0.02, dest: bus.music }); }
      if (i >= 2 && b % 2 === 1) noise({ f: 1800, q: 0.7, t, len: 0.08, vol: 0.14, d: 0.06, sus: 0.2, r: 0.08, dest: bus.music });
      if (i >= 3) D.CHORDS[S.chord].slice(0, 3).forEach(n => tone({ f: mtof(n), type: 'square', t: t + BEAT / 2, len: 0.05, vol: 0.018, lp: 2400, dest: bus.music }));
      nextBeat += BEAT; beatN++;
      S.onBeat && S.onBeat(beatN, t);
    }
  }
  S.startMusic = () => {
    if (!ac || mOn) return;
    mOn = true; nextBeat = ac.currentTime + 0.1; beatN = 0;
    setPad(S.chord);
    timer = setInterval(schedule, 25);
  };
  S.stopMusic = () => {
    mOn = false; clearInterval(timer);
    if (ac) { const t = ac.currentTime; padVoices.forEach(v => { v.g.gain.setTargetAtTime(0.0001, t, 0.2); v.o.forEach(o => o.stop(t + 1.5)); }); }
    padVoices = []; padChord = null;
  };
  S.setChord = (ch) => { S.chord = ch; if (mOn) setPad(ch); };
  // the song is the music: duck the pad and drop the beat while it plays
  S.inSong = false;
  S.duck = (on) => {
    S.inSong = on;
    if (ac) bus.music.gain.setTargetAtTime(vol.music * 0.55 * (on ? 0.3 : 1), ac.currentTime, on ? 0.05 : 0.6);
  };
  S.beatPhase = () => ac ? ((ac.currentTime - nextBeat) / BEAT + 1) % 1 : 0;
  S.BEAT = BEAT;

  root.Sound = S;
})(window);
