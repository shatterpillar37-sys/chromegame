/* Sneakers O'Toole — intro: the phrase slams in word by word, synced to the piano. */
(function (root) {
  'use strict';
  const D = root.DATA, Snd = root.Sound, A = root.Art;
  const $ = (s) => document.querySelector(s);
  const I = {};
  let timers = [], done = null, running = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  I.init = (onDone) => {
    done = onDone;
    $('#gateSnk').innerHTML = A.logoSneaker();
    $('#titleSnk').innerHTML = A.logoSneaker();
    $('#inWords').innerHTML = D.PHRASE.map((p, i) => `<span style="--rot:${(i % 2 ? 2 : -3)}deg">${p.w === "O'" ? "O'" : p.w.toUpperCase()}</span>${i === 5 ? '<span class="br"></span>' : ''}`).join('');
    $('#inStart').onclick = start;
    $('#inSkip').onclick = toTitle;
    $('#inPlay').onclick = finish;
  };
  I.gate = () => { $('#intro').hidden = false; $('#inGate').hidden = false; $('#inShow').hidden = true; };
  function start() {
    Snd.init().then(() => { if (root.UI.set.intro) I.play(); else finish(); });
  }
  // the intro runs on its own little clock so the street and the walk-in stay smooth
  let bg = null, raf = 0, camSpeed = 0, lastT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    if (bg) bg.frame(dt, camSpeed);
    raf = requestAnimationFrame(loop);
  }
  function flash(a) { const f = $('#inFlash'); f.getAnimations().forEach(x => x.cancel()); f.animate([{ opacity: a }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }); }
  function jolt(px) { $('#inShow').animate([{ transform: `translate(${px}px, ${-px / 2}px)` }, { transform: `translate(${-px}px, ${px / 2}px)` }, { transform: 'none' }], { duration: 160 }); }
  I.play = (replay) => {
    running = true;
    const intro = $('#intro'); intro.hidden = false; intro.classList.remove('gone');
    $('#inGate').hidden = true;
    const show = $('#inShow'); show.hidden = false; show.classList.remove('lit', 'final');
    $('#inSkip').hidden = false;
    const words = Array.from(document.querySelectorAll('#inWords span:not(.br)'));
    words.forEach(w => w.classList.remove('in')); $('#inWords').classList.remove('out');
    $('#inTitle').classList.remove('on');
    const walker = $('#inWalker'), stander = $('#inStander'), t1 = $('#inTux1'), t2 = $('#inTux2');
    [walker, stander, t1, t2].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    walker.style.opacity = 0; stander.style.opacity = 0; stander.classList.remove('turned');
    t1.innerHTML = A.tux(D.ENEMIES.tux.look); t2.innerHTML = A.tux(D.ENEMIES.tophat.look);
    // the scrolling Quahog street behind everything
    bg = root.Stage.backdrop($('#inBg'), 0); bg.resize();
    cancelAnimationFrame(raf); lastT = 0; raf = requestAnimationFrame(loop);
    const ctx = Snd.ctx();
    const lead = 0.6;
    let t0 = null;
    if (ctx && Snd.ready()) t0 = Snd.playFull(ctx.currentTime + lead);
    const offset = t0 !== null ? (t0 - ctx.currentTime) * 1000 : lead * 1000;
    // open on the street through a widening iris
    $('#inIris').animate([{ width: '0px', height: '0px' }, { width: '260vmax', height: '260vmax' }], { duration: 900, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    // O'Toole walks in from the right, facing left, stepping on every eighth note; the street scrolls past
    const arrive = offset + 2100, steps = 16, bob = [];
    for (let k = 0; k <= steps; k++) bob.push({ transform: `translateX(calc(-50% + ${(60 - 60 * k / steps).toFixed(1)}vw)) translateY(${k % 2 ? -12 : 0}px) rotate(${k % 2 ? 2 : -1}deg) scaleX(-1)`, offset: k / steps });
    walker.style.opacity = 1; camSpeed = -170;
    walker.animate(bob, { duration: arrive, easing: 'linear', fill: 'forwards' });
    later(arrive, () => {
      camSpeed = 0; walker.style.opacity = 0; stander.style.opacity = 1;
      stander.animate([{ transform: 'translateX(-50%) scale(1.06,.94)' }, { transform: 'translateX(-50%)' }], { duration: 250 });
    });
    // two tuxedo men sneak in from the left during "I am Sneakers"
    later(offset + D.PHRASE[6].t * 1000 - 150, () => {
      [[t1, 4], [t2, 17]].forEach(([el, vw], k) => {
        el.classList.add('walk');
        el.animate([{ left: '-30vw' }, { left: vw + 'vw' }], { duration: 700 + k * 180, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }).onfinish = () => el.classList.remove('walk');
      });
    });
    const COLORS = ['#ffd23f', '#4cc9f0', '#ff4d6d'];
    D.PHRASE.forEach((p, i) => later(offset + p.t * 1000, () => {
      words[i].classList.add('in');
      flash(i === 10 ? 0.7 : 0.1); jolt(i === 10 ? 10 : 3);
      const ring = $('#inRing'); ring.style.borderColor = COLORS[i % 3]; ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
      if (i === 10) {
        // "Toole!": he spins round to face up the street and the shockwave blows the tuxedo men away
        stander.animate([
          { transform: 'translateX(-50%)' }, { transform: 'translateX(-50%) translateY(-40px) scaleX(0) rotate(6deg)', offset: 0.4 },
          { transform: 'translateX(-50%) translateY(-24px) scaleX(-1)', offset: 0.7 }, { transform: 'translateX(-50%) scaleX(-1)' },
        ], { duration: 460, easing: 'ease-out' });
        stander.classList.add('turned');
        [t1, t2].forEach((el, k) => el.animate([{ transform: 'none' }, { transform: `translate(${-50 - k * 20}vw, -60vh) rotate(${-540 - k * 180}deg)` }], { duration: 1100, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }));
        Snd.no(true);
        confetti();
      }
    }));
    later(offset + 4600, () => { $('#inWords').classList.add('out'); });
    later(offset + 4800, () => { $('#inShow').classList.add('final'); $('#inTitle').classList.add('on'); Snd.fx('ach'); flash(0.35); $('#inSkip').hidden = true; });
  };
  function toTitle() {
    timers.forEach(clearTimeout); timers = [];
    const words = Array.from(document.querySelectorAll('#inWords span:not(.br)'));
    words.forEach(w => w.classList.add('in'));
    camSpeed = 0;
    $('#inIris').animate([{ width: '260vmax', height: '260vmax' }], { duration: 1, fill: 'forwards' });
    $('#inWalker').getAnimations().forEach(a => a.cancel());
    $('#inWalker').style.opacity = 0; $('#inStander').style.opacity = 1; $('#inStander').classList.add('turned');
    ['#inTux1', '#inTux2'].forEach(s => { const el = $(s); el.getAnimations().forEach(a => a.cancel()); el.style.left = '-30vw'; });
    $('#inWords').classList.add('out');
    $('#inShow').classList.add('final'); $('#inTitle').classList.add('on'); $('#inSkip').hidden = true;
  }
  function confetti() {
    const show = $('#inShow');
    const cols = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc97', '#b86bff', '#ff9f1c'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.cssText = `position:absolute;z-index:7;left:50%;top:62%;width:${8 + Math.random() * 8}px;height:${5 + Math.random() * 5}px;background:${cols[i % 6]};border-radius:2px;pointer-events:none`;
      show.appendChild(c);
      const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 420;
      c.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.6 + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }], { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.1,.6,.4,1)', fill: 'forwards' }).onfinish = () => c.remove();
    }
  }
  function finish() {
    timers.forEach(clearTimeout); timers = [];
    setTimeout(() => { cancelAnimationFrame(raf); bg = null; }, 750);
    const intro = $('#intro');
    intro.classList.add('gone');
    setTimeout(() => { intro.hidden = true; intro.classList.remove('gone'); }, 700);
    if (done) { const d = done; d(running); }
    running = false;
  }
  I.skipAll = () => { $('#intro').hidden = true; };
  root.Intro = I;
})(window);
