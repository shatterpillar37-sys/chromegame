/* Sneakers O'Toole — boot, game loop, input, event wiring and easter eggs. */
(function (root) {
  'use strict';
  const D = root.DATA, C = root.Core, A = root.Art, Snd = root.Sound, St = root.Stage, U = root.UI, In = root.Intro;
  const $ = (s) => document.querySelector(s);
  const f = (n, d) => C.fmt(n, d);
  const S = () => C.get();
  const SAVE_KEY = 'sneakersOToole.v2';
  const G = {};
  let running = false, started = false, offlineInfo = null;

  /* ---------------- saving ---------------- */
  G.save = () => { try { localStorage.setItem(SAVE_KEY, C.serialize()); } catch (e) {} };
  G.load = (hotSave) => {
    let raw = hotSave || null;
    if (!raw) try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (raw) { try { C.load(JSON.parse(raw)); return true; } catch (e) {} }
    C.load({}); return false;
  };
  G.exportSave = () => btoa(unescape(encodeURIComponent(C.serialize())));
  G.importSave = (txt) => {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(txt))));
      if (!o || typeof o.steps !== 'number') return false;
      C.load(o); G.save(); afterLoad(); return true;
    } catch (e) { return false; }
  };
  G.hardReset = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} C.load({}); St.clearEnemies(); afterLoad(); G.save(); St.walkIn(); };
  function afterLoad() { C.stopSong(); Snd.stopMelody(); Snd.duck(false); St.setScene(S().scene); U.songStart(); U.render(true); Snd.setChord('Ab'); }
  G.onCutaway = (gain, ch) => {
    afterLoad(); G.save();
    if (gain) setTimeout(() => U.toast({ icon: A.icon('sp'), title: '+' + f(gain) + ' Sole Power', sub: S().cuts === 1 ? 'Spend it in the Lace Tree tab!' : 'Total earned: ' + f(S().spTotal) }), 1600);
    if (ch) setTimeout(() => U.banner('EPISODE', C.CH[ch].name, ' ' + C.CH[ch].desc + ' Goal: ' + f(C.CH[ch].goal) + ' Steps.', 6000), 1700);
    if (S().cuts === 1) setTimeout(() => U.tab('tree'), 1800);
  };

  /* ---------------- helpers ---------------- */
  const otPos = () => St.otCenter();
  const enemyPos = (e) => ({ x: St.enemyX(e), y: St.size().groundY - St.charH() * 0.9 });
  function unlockEgg(id, msg) {
    if (C.unlock('egg_' + id) && msg) U.banner('SECRET', msg[0], ' ' + msg[1], 5000);
  }

  /* ---------------- core events → audio, stage, UI ---------------- */
  let lastWordFloat = 0;
  // the song: one click plays the piano, every on-beat click after that is a sung word
  function startSong(auto) {
    if (C.song()) return;
    const T = Snd.songStart();
    C.startSong(T, auto);
    Snd.duck(true);
    U.songStart();
    if (!auto) St.sing(false);
  }
  C.on('wantSong', () => { if (running) startSong(true); });
  C.on('autoVocal', (k, song) => { if (U.set.autoSound) Snd.vocal(k, song.t0, { auto: true }); });
  C.on('word', (i, val, crit, grade, voiced) => {
    const auto = grade === 'auto', song = C.song();
    if (!voiced && song) Snd.vocal(i, song.t0, { crit, auto });
    else if (crit) Snd.fx('star');
    Snd.setChord(D.PHRASE[i].chord);
    U.word(i, crit, grade);
    St.sing(crit);
    const p = otPos(), now = performance.now();
    if (val > 0 && (!auto || now - lastWordFloat > 250)) {
      lastWordFloat = now;
      St.float((crit ? 'CRIT! +' : '+') + f(val, val < 10 ? 1 : undefined), p.x + (Math.random() - 0.5) * 90, p.top + 30, { size: crit ? 34 : auto ? 18 : grade === 'perfect' ? 27 : 23, color: crit ? '#ffd23f' : auto ? '#9bf0ff' : '#ffffff', wobble: crit });
    }
    if (grade === 'perfect') St.burst('spark', p.x + 20, p.top + 20, 5, { speed: 180, size: 8, color: '#ffd23f', gravity: 100, life: 0.5 });
    if (crit) { St.shake(5); St.burst('spark', p.x, p.top + 60, 14, { speed: 320, size: 11, colors: ['#ffd23f', '#fff', '#ff9f1c'], gravity: 300 }); }
    const c = S().combo;
    if (!auto && [25, 50, 100, 150].includes(c)) { St.float('x' + c + ' COMBO!', p.x, p.top - 10, { size: 36, color: '#ff9f1c', vy: 60, life: 1.4 }); Snd.fx('star'); }
  });
  C.on('miss', (lane, wrong) => { U.miss(wrong); Snd.fx('miss'); St.flinch(); });
  C.on('wordMiss', (k) => U.wordMiss(k));
  C.on('songEnd', (val, q, mine) => {
    Snd.duck(false);
    if (q < 0 && mine === 0 && S().songs <= 3 && !S().stats.hits) U.banner('HOW TO SING', 'Press the keys on the beat!', ' When a word reaches its keycap on the left, press that key (' + [0, 1, 2, 3].map(U.laneKey).join(' ') + ').', 7000);
  });
  C.on('verse', (val, q, mine) => {
    U.verse(q); Snd.fx('verse', q);
    const p = otPos();
    const label = q === 2 ? 'PERFECT VERSE!' : q === 1 ? 'GREAT VERSE!' : 'VERSE ' + mine + '/11';
    St.float(label, p.x, p.top - 20, { size: q === 2 ? 42 : 34, color: q === 2 ? '#ff4d6d' : q === 1 ? '#4cc9f0' : '#3ddc97', vy: 50, life: 1.6, wobble: q === 2, force: true });
    if (val > 0) St.float('+' + f(val), p.x, p.top + 20, { size: 28, color: '#ffd23f', vy: 70, life: 1.4 });
    St.burst('confetti', p.x, p.top, q === 2 ? 60 : 24, { speed: 380, gravity: 600, size: 10, colors: ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc97', '#b86bff'], life: 1.4, angle: -Math.PI / 2, spread: 2.2 });
    if (q === 2) St.shake(6);
    U.bumpBank();
  });
  // the chase, as in the cartoon: "Take those sneakers off!" "No!" and he hops away until they give up
  function tuxLine(e, id, ms, retry) {
    // if someone is already talking, wait for them to finish (once) instead of talking over them
    const busy = Snd.lineBusy();
    if (busy > 0 && id !== 'letgo' && !retry && Snd.hasLine(id) && U.set.lineVoice !== 'speech') {
      setTimeout(() => { if (S().enemies.includes(e) && !e.dead) tuxLine(e, id, ms, true); }, busy * 1000 + 150);
      return;
    }
    const len = Snd.say(id, D.LINES[id], id === 'letgo' || retry);
    St.enemySay(e, D.LINES[id], ms || Math.max(2400, (len + 0.9) * 1000));
  }
  C.on('spawn', (e) => {
    Snd.fx('spawn');
    if (e.type === 'golden') { U.banner('RARE', 'A Golden Tuxedo!', ' Click him to make him give up before he runs off. He drops 3 Shoeboxes!', 4000); St.enemySay(e, 'Catch me if you can!'); return; }
    setTimeout(() => { if (S().enemies.includes(e)) tuxLine(e, 'hey'); }, 450);
    if (S().stats.enemies === 0 && !S().enemies.some(x => x !== e)) U.banner('LOOK OUT', 'A tuxedo man wants the sneakers!', ' Click him and O\'Toole hops out of reach. Keep dodging until he gives up.', 6500);
  });
  St.onNear = (e) => { if (!e.dead) tuxLine(e, 'said'); };
  C.on('bossSpawn', (e) => { Snd.fx('boss'); St.shake(12); U.banner('BOSS', e.name, ' is after the sneakers! Wear him out before his timer runs out.', 5000); });
  C.on('hit', (e, dmg, src) => {
    St.enemyHit(e, dmg, src === 'crit');
    Snd.fx('whoosh');
    if (!e._saidNo && src !== 'guard' && src !== 'shock') { e._saidNo = 1; Snd.no(); St.sayNo(); U.noBurst('NO!'); }
  });
  C.on('defeat', (e, r) => {
    St.enemyGiveUp(e);
    const giveUpLine = e.type !== 'golden' && (e.boss || Math.random() < 0.45);
    if (giveUpLine) setTimeout(() => tuxLine(e, 'letgo', 4200), 250);
    else if (!e._saidNo) { Snd.no(e.boss); St.sayNo(); U.noBurst('NO!'); }
    St.shake(e.boss ? 8 : 3);
    const p = enemyPos(e);
    St.float('+' + f(r.steps), p.x, p.y, { size: e.boss ? 36 : 26, color: '#3ddc97', vy: 80, life: 1.3 });
    if (r.boxes) St.float(r.boxes > 1 ? '+' + r.boxes + ' Shoeboxes!' : '+1 Shoebox!', p.x, p.y - 36, { size: 22, color: '#ff9f1c', vy: 60, life: 1.6, force: true });
    if (r.gl) St.float('+' + r.gl + ' Golden Lace' + (r.gl > 1 ? 's' : ''), p.x, p.y - 70, { size: 24, color: '#ffd23f', vy: 50, life: 1.8, force: true });
    if (e.boss) { U.confetti(120); U.banner('ESCAPED', e.name + ' gave up the chase!', ' +' + r.gl + ' Golden Laces and 2 Shoeboxes.', 5000); }
    U.bumpBank();
  });
  C.on('tug', (e, loss) => {
    St.tugged(e.side < 0 ? -1 : 1); Snd.fx('tug'); U.noBurst('HEY!'); St.shake(9);
    const p = otPos();
    St.float('-' + f(loss), p.x, p.top + 40, { size: 28, color: '#ff4d6d', vy: 60, life: 1.4, force: true });
    St.enemyLeave(e);
    if (S().stats.tugs === 1) U.banner('TUGGED', 'He pulled on the laces!', ' The sneakers stayed on, but you lost some Steps and production is halved for a few seconds.', 6000);
  });
  C.on('bossFail', (e) => U.banner('BOSS', e.name + ' got a good tug in.', ' The sneakers stayed on. He\'ll be back.', 5000));
  C.on('leave', (e) => St.enemyLeave(e));
  C.on('goldenSpawn', () => Snd.fx('goldenSpawn'));
  C.on('golden', (eff, info) => {
    Snd.fx('golden');
    const p = St.goldPos || otPos();
    St.burst('spark', p.x, p.y, 30, { speed: 420, size: 12, colors: ['#ffd23f', '#fff1a8', '#ffffff'], gravity: 200 });
    St.burst('ring', p.x, p.y, 1, { speed: 0, size: 120, color: '#ffd23f', gravity: 0, life: 0.5 });
    let sub = eff.desc;
    if (info.steps) sub = '+' + f(info.steps) + ' Steps!';
    if (info.boxes) sub = '+' + info.boxes + ' Shoeboxes!';
    U.banner('GOLDEN', eff.name, ' ' + sub, 4500);
    St.float(eff.name + '!', p.x, p.y, { size: 30, color: '#ffd23f', vy: 60, life: 1.6, force: true });
  });
  C.on('boxDrop', (n, src) => {
    if (S().stats.boxesOpened === 0 && S().boxes === n) setTimeout(() => U.banner('NEW', 'You found a Shoebox!', ' Open it in the Sneakers tab to find sneakers with bonuses.', 6000), 400);
  });
  C.on('ach', (a) => {
    Snd.fx('ach');
    U.toast({ cls: 'tach', icon: A.badge(a.id.startsWith('egg') ? 'egg' : 'star', a.id.startsWith('egg') ? '#ff4df0' : '#ffd23f'), title: a.name, sub: 'Award unlocked · +1% production' });
  });
  C.on('event', (ev) => { Snd.fx('event'); U.banner('BREAKING', ev.name, ' ' + ev.desc, 5000); });
  C.on('cam', (c, steps, box) => {
    Snd.fx('cam'); St.camFlash(c.id);
    St.float('+' + f(steps) + (box ? ' +Shoebox!' : ''), c.x * St.size().W, c.y * St.size().H, { size: 24, color: '#ffffff', vy: 70 });
  });
  C.on('shinyOToole', () => { Snd.fx('shiny'); U.confetti(150); U.banner('WOW', 'Shiny O\'Toole!', ' A 1-in-4,096 glow-up. Production x7 for 60 seconds!', 6000); });
  C.on('challengeEnd', (id, ok) => {
    const ch = C.CH[id];
    if (ok) { Snd.fx('jackpot'); U.confetti(150); U.banner('COMPLETE', ch.name + ' done!', ' Reward: ' + ch.reward, 7000); }
    else U.banner('EPISODE', ch.name + ' ended.', ' No reward this time. Try again from the Cutaway tab.', 5000);
    U.render(true);
  });
  C.on('buffEnd', (b) => { if (b.id === 'frenzy' || b.id === 'dazzle') U.toast({ title: b.name + ' ended' }); });
  C.on('comboEnd', (n) => { const p = otPos(); St.float('combo x' + n + ' ended', p.x, p.top, { size: 16, color: '#b9addf', vy: 40 }); });

  /* ---------------- input ---------------- */
  let clickTimes = [], sunClicks = 0, sunT = 0, logoClicks = 0, logoT = 0, feetDrag = null;
  function sing(e) {
    if (!running) return;
    Snd.init();
    St.idleReset();
    if (C.song()) { U.judge('Use ' + [0, 1, 2, 3].map(U.laneKey).join(' '), 'miss'); return; }
    S().stats.manualClicks++;
    startSong(false);
    const now = performance.now();
    clickTimes.push(now); while (clickTimes.length && now - clickTimes[0] > 10000) clickTimes.shift();
    if (clickTimes.length >= 100) unlockEgg('carpal', ['Carpal Tunnel', 'A hundred clicks in ten seconds. Please stretch.']);
  }
  // a lane key (or its on-screen keycap) judges the nearest note; between songs it only flashes the keycap
  G.lane = (i) => {
    if (!running) return;
    Snd.init(); St.idleReset(); U.pressLane(i);
    if (!C.song()) return;
    C.tap(i);
    const now = performance.now();
    clickTimes.push(now); while (clickTimes.length && now - clickTimes[0] > 10000) clickTimes.shift();
    if (clickTimes.length >= 100) unlockEgg('carpal', ['Carpal Tunnel', 'A hundred key presses in ten seconds. Please stretch.']);
  };
  function bindInput() {
    const ot = $('#otoole');
    ot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = ot.getBoundingClientRect();
      if (e.clientY > r.bottom - r.height * 0.16) feetDrag = { y: e.clientY, id: e.pointerId };
      sing(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (feetDrag && e.pointerId === feetDrag.id && e.clientY - feetDrag.y > 50) {
        feetDrag = null;
        Snd.no(true); St.sayNo(); U.noBurst('NO!');
        unlockEgg('feet', ['Hands Off', 'You tried to pull the sneakers off. He said no.']);
      }
    });
    window.addEventListener('pointerup', () => { feetDrag = null; });
    $('#sprites').addEventListener('pointerdown', (e) => {
      if (!running) return;
      const en = e.target.closest('.enemy');
      if (en && !en.classList.contains('dead')) { e.preventDefault(); C.kick(+en.dataset.id); return; }
      if (e.target.closest('.golden-sneaker')) { e.preventDefault(); C.clickGolden(); return; }
      const cam = e.target.closest('.cam'); if (cam) { e.preventDefault(); C.clickCam(+cam.dataset.id); return; }
    });
    // talking back to a tuxedo man
    $('#hud').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.tsay'); if (!b || !running) return;
      const ee = S().enemies.find(x => x.id === +b.dataset.id);
      if (ee) { St.enemySay(ee, '...please?'); unlockEgg('bubble', ['Polite Society', 'You talked back. He asked nicely this time.']); }
    });
    // poke the sky
    $('#stage').addEventListener('pointerdown', (e) => {
      if (!running || e.target.closest('button, .lyrics, .buff, .meter, .bossbar, .ch-tag')) return;
      const sun = St.sun; if (!sun) return;
      const r = $('#stage').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - sun.x, y - sun.y) < sun.r) {
        const now = performance.now(); if (now - sunT > 3000) sunClicks = 0; sunT = now;
        St.burst('spark', x, y, 8, { speed: 160, size: 8, color: '#ffd23f', gravity: 0 });
        Snd.fx('tick');
        if (++sunClicks >= 7) { sunClicks = 0; unlockEgg('solar', ['Solar Flare', 'The sky coughed up a Golden Sneaker.']); if (!S().golden) C.spawnGolden(); }
      }
    });
    $('#logo').addEventListener('click', () => {
      const now = performance.now(); if (now - logoT > 2500) logoClicks = 0; logoT = now;
      Snd.init();
      const i = logoClicks % D.PHRASE.length; Snd.word(i);
      $('#logoSnk').animate([{ transform: 'rotate(-12deg)' }, { transform: 'rotate(-4deg) translateY(-6px) scale(1.15)' }, { transform: 'rotate(-12deg)' }], { duration: 250 });
      if (++logoClicks >= D.PHRASE.length) { logoClicks = 0; unlockEgg('logo', ['Encore!', 'You sang the whole song on the logo.']); U.confetti(100); }
    });
    // keyboard
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kseq = [], typed = '';
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (!running) return;
      kseq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); kseq = kseq.slice(-10);
      if (kseq.join() === KONAMI.join()) {
        U.set.rainbow = true; U.set.rainbowOn = !U.set.rainbowOn; U.applySet();
        unlockEgg('konami', ['Up Up Down Down', 'Rainbow O\'Toole unlocked! Toggle it in Settings.']); Snd.fx('shiny');
      }
      if (/^[a-z]$/i.test(e.key)) {
        typed = (typed + e.key.toLowerCase()).slice(-16);
        if (typed.endsWith('takethemoff')) { typed = ''; Snd.no(true); St.sayNo(); U.noBurst('NEVER!'); St.shake(10); unlockEgg('takeoff', ['Nice Try', 'He is not taking them off.']); }
        if (typed.endsWith('kazoo')) { typed = ''; U.set.kazoo = true; U.set.voiceMode = 'kazoo'; U.applySet(); unlockEgg('kazoo', ['Kazoo Solo', 'Kazoo voice unlocked. Change it back in Settings.']); U.toast({ title: 'Singing voice: Kazoo' }); }
        if (typed.endsWith('quahog')) { typed = ''; unlockEgg('quahog', ['Local Legend', 'Greetings from Quahog, Rhode Island.']); St.setScene(0); setTimeout(() => St.setScene(S().scene), 8000); }
      }
      if (U.capturing()) return;
      if (U.modalOpen()) { if (e.key === 'Escape') U.close(); return; }
      const k = U.normKey(e.key), K = U.set.keys;
      for (let i = 0; i < 4; i++) if (k === K['lane' + i]) { e.preventDefault(); if (!e.repeat) G.lane(i); return; }
      if (k === K.start) { e.preventDefault(); if (!e.repeat) sing(e); return; }
      if (k === K.dodge) { const t = S().enemies.filter(x => !x.flee && !x.dead).sort((a, b) => b.p - a.p)[0]; if (t) C.kick(t.id); }
      if (k === K.golden) C.clickGolden();
      if (k === K.mute) { U.set.muted = !U.set.muted; U.applySet(); }
      if (k === K.buy) { const b = D.BUILDINGS.filter((x, i) => C.bldUnlocked(i)).sort((a, c) => C.cost(a, 1) - C.cost(c, 1))[0]; if (b && C.buy(b.id, 1)) U.render(true); }
      if (k === K.wheel) U.wheel();
      if (/^[1-6]$/.test(k)) U.tab(['shop', 'tree', 'sneakers', 'awards', 'cut', 'stats'][+k - 1]);
    });
    root.addEventListener('egg', (e) => { if (e.detail === 'silence') unlockEgg('silence', ['Sound of Silence', 'Every slider at zero. Peaceful.']); });
    root.addEventListener('otoole-wake', () => { unlockEgg('nap', ['Power Nap', 'O\'Toole dozed off and you woke him up.']); });
  }

  /* ---------------- loop ---------------- */
  let last = performance.now(), saveT = 0, beatT = 0;
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 1.5) { if (running) C.idleTick(dt); dt = 0.016; }
    dt = Math.min(dt, 0.1);
    if (running) C.tick(dt);
    St.frame(dt);
    U.frame(dt, now);
    // music follows the action
    const s = S();
    const idle = s.time - s.lastClick > 6;
    const frenzy = s.buffs.some(b => b.fx && b.fx.prod >= 7);
    Snd.intensity = idle && !frenzy ? (s.enemies.length ? 1 : 0) : s.combo >= 50 || frenzy ? 3 : s.combo >= 15 ? 2 : 1;
    saveT += dt; if (saveT > 10 && running) { saveT = 0; G.save(); }
    beatT += dt; if (beatT > 60) { beatT = 0; const hr = new Date().getHours(); if (hr === 3) unlockEgg('night', ['Night Owl', 'Hopping at 3 AM. Respect.']); }
    requestAnimationFrame(frame);
  }
  // keep earning while the tab is hidden (browsers pause animation frames)
  setInterval(() => {
    if (!document.hidden || !running) return;
    const now = performance.now(), dt = (now - last) / 1000;
    if (dt > 0.5) { C.idleTick(dt); last = now; }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  root.addEventListener('beforeunload', G.save);
  root.addEventListener('pagehide', G.save);

  /* ---------------- boot ---------------- */
  function startGame() {
    if (started) { running = true; return; }
    started = true; running = true;
    Snd.init().then(() => Snd.startMusic());
    St.walkIn();
    if (offlineInfo) setTimeout(() => U.welcome(offlineInfo), 900);
    else if (S().stats.manualClicks === 0) setTimeout(() => U.banner('HOW TO PLAY', 'Click O\'Toole to start his song!', ' Then press ' + [0, 1, 2, 3].map(U.laneKey).join(' ') + ' as each word reaches its key. On-beat words earn Steps.', 8000), 1200);
    if (new Date().getHours() === 3) unlockEgg('night', ['Night Owl', 'Hopping at 3 AM. Respect.']);
  }
  function boot(hotData) {
    C.clock = Snd.clock;
    const had = G.load(hotData && hotData.save);
    St.init(); St.initSprites(); U.init(); In.init(startGame);
    St.setScene(S().scene);
    if (had) {
      const away = (Date.now() - (S().savedAt || Date.now())) / 1000;
      if (away > 60) offlineInfo = C.offline(away);
    }
    $('#app').classList.remove('booting');
    requestAnimationFrame((t) => { last = t; frame(t); });
    bindInput();
    const hot = root.claude && root.claude.hot;
    if (hot && hot.snapshot) try { hot.snapshot(() => ({ save: C.serialize() })); } catch (e) {}
    if (hotData && hotData.save) { In.skipAll(); startGame(); return; }
    if (U.set.intro) In.gate();
    else {
      In.skipAll(); startGame();
      const unlockAudio = () => { Snd.init().then(() => Snd.startMusic()); root.removeEventListener('pointerdown', unlockAudio, true); root.removeEventListener('keydown', unlockAudio, true); };
      root.addEventListener('pointerdown', unlockAudio, true); root.addEventListener('keydown', unlockAudio, true);
    }
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/claude|artifact/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  root.Game = G;
  const hot = root.claude && root.claude.hot;
  const go = () => (hot && hot.ready ? hot.ready(boot) : boot((hot && hot.data) || {}));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})(window);
