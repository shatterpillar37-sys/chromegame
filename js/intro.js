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
  I.play = (replay) => {
    running = true;
    const intro = $('#intro'); intro.hidden = false; intro.classList.remove('gone');
    $('#inGate').hidden = true;
    const show = $('#inShow'); show.hidden = false; show.classList.remove('lit', 'final');
    $('#inSkip').hidden = false;
    const words = Array.from(document.querySelectorAll('#inWords span:not(.br)'));
    words.forEach(w => w.classList.remove('in')); $('#inWords').classList.remove('out');
    $('#inTitle').classList.remove('on');
    const walker = $('#inWalker'), stander = $('#inStander');
    walker.getAnimations().forEach(a => a.cancel()); stander.getAnimations().forEach(a => a.cancel());
    walker.style.opacity = 0; stander.style.opacity = 0;
    const ctx = Snd.ctx();
    const lead = 0.45;
    let t0 = null;
    if (ctx && Snd.ready()) t0 = Snd.playMelody(ctx.currentTime + lead);
    const offset = t0 !== null ? (t0 - ctx.currentTime) * 1000 : lead * 1000;
    later(80, () => show.classList.add('lit'));
    // O'Toole walks in, bobbing on each eighth note
    const bob = [];
    for (let k = 0; k <= 16; k++) bob.push({ transform: `translateX(calc(-50% + ${(-60 + 60 * k / 16).toFixed(1)}vw)) translateY(${k % 2 ? -10 : 0}px) rotate(${k % 2 ? -2 : 1}deg)`, offset: k / 16 });
    walker.style.opacity = 1;
    walker.animate(bob, { duration: offset + 2200, easing: 'linear', fill: 'forwards' });
    D.PHRASE.forEach((p, i) => later(offset + p.s * 1000, () => {
      words[i].classList.add('in');
      if (i === 10) {
        walker.style.opacity = 0; stander.style.opacity = 1;
        stander.animate([{ transform: 'translateX(-50%) scale(1.08,.92)' }, { transform: 'translateX(-50%) translateY(-24px) scale(.96,1.05)' }, { transform: 'translateX(-50%)' }], { duration: 420, easing: 'ease-out' });
        confetti();
      }
    }));
    // after "off", O'Toole has arrived: switch to standing pose between the lines
    later(offset + 4700, () => { $('#inWords').classList.add('out'); });
    later(offset + 4900, () => { $('#inShow').classList.add('final'); $('#inTitle').classList.add('on'); Snd.fx('ach'); $('#inSkip').hidden = true; });
  };
  function toTitle() {
    timers.forEach(clearTimeout); timers = [];
    const words = Array.from(document.querySelectorAll('#inWords span:not(.br)'));
    words.forEach(w => w.classList.add('in'));
    $('#inShow').classList.add('lit');
    $('#inWalker').getAnimations().forEach(a => a.cancel());
    $('#inWalker').style.opacity = 0; $('#inStander').style.opacity = 1;
    $('#inWords').classList.add('out');
    $('#inShow').classList.add('final'); $('#inTitle').classList.add('on'); $('#inSkip').hidden = true;
  }
  function confetti() {
    const show = $('#inShow');
    const cols = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc97', '#b86bff', '#ff9f1c'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.cssText = `position:absolute;left:50%;top:62%;width:${8 + Math.random() * 8}px;height:${5 + Math.random() * 5}px;background:${cols[i % 6]};border-radius:2px;pointer-events:none`;
      show.appendChild(c);
      const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 420;
      c.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d * 0.6 + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }], { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.1,.6,.4,1)', fill: 'forwards' }).onfinish = () => c.remove();
    }
  }
  function finish() {
    timers.forEach(clearTimeout); timers = [];
    const intro = $('#intro');
    intro.classList.add('gone');
    setTimeout(() => { intro.hidden = true; intro.classList.remove('gone'); }, 700);
    if (done) { const d = done; d(running); }
    running = false;
  }
  I.skipAll = () => { $('#intro').hidden = true; };
  root.Intro = I;
})(window);
