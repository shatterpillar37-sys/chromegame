/* Sneakers O'Toole — hand-built SVG art: tuxedo men, sneakers, icons, badges. */
(function (root) {
  'use strict';
  const O = '#1b1330';           // outline ink
  const A = {};
  const sv = (vb, body, cls) => `<svg viewBox="${vb}" class="${cls || ''}" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
  const shade = (hex, amt) => {
    let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  };
  A.shade = shade;

  /* ---------------- Tuxedo men ---------------- */
  A.tux = (look, opt) => {
    opt = opt || {};
    const L = Object.assign({ suit: '#1d1b26', tie: '#e0303c', hair: '#2b2118', skin: '#f1c7a1' }, look);
    const suit = L.suit, lapel = shade(suit, 0.18), skin = L.skin, sw = 'stroke="' + O + '" stroke-width="2.6"';
    const shoe = L.shine ? '#8a5a12' : '#0c0b10';
    let s = '';
    if (L.cape) s += `<path d="M30 70 Q60 58 90 70 L104 196 Q60 184 16 196 Z" fill="${shade(L.tie, -0.35)}" ${sw}/>`;
    // legs + shoes (animated groups)
    s += `<g class="legL"><rect x="41" y="126" width="18" height="80" rx="6" fill="${suit}" ${sw}/><path d="M34 206 Q34 197 46 197 L58 199 Q70 202 70 210 L36 211 Z" fill="${shoe}" ${sw}/></g>`;
    s += `<g class="legR"><rect x="61" y="126" width="18" height="80" rx="6" fill="${shade(suit, -0.15)}" ${sw}/><path d="M56 206 Q56 197 68 197 L80 199 Q92 202 92 210 L58 211 Z" fill="${shoe}" ${sw}/></g>`;
    // back arm
    s += `<g class="armL"><path d="M36 74 Q24 96 26 120" fill="none" stroke="${O}" stroke-width="17"/><path d="M36 74 Q24 96 26 120" fill="none" stroke="${shade(suit, -0.1)}" stroke-width="12"/>`
      + `<rect x="19" y="116" width="14" height="7" rx="2" fill="#fff" ${sw}/><circle cx="26" cy="128" r="7" fill="${skin}" ${sw}/>`
      + (L.towel ? `<path d="M16 108 L36 106 L38 138 Q27 142 18 136 Z" fill="#ffffff" ${sw}/><path d="M20 118 L35 117 M20 126 L35 125" stroke="#cfd6e6" stroke-width="2"/>` : '') + '</g>';
    // torso
    s += `<path d="M32 72 Q60 58 88 72 L92 140 Q60 150 28 140 Z" fill="${suit}" ${sw}/>`;
    s += `<path d="M50 66 L70 66 L60 110 Z" fill="#ffffff" ${sw}/>`;
    s += `<path d="M49 67 L60 110 L42 90 Z M71 67 L60 110 L78 90 Z" fill="${lapel}" stroke="${O}" stroke-width="2"/>`;
    s += `<circle cx="60" cy="118" r="2.3" fill="${shade(suit, 0.4)}"/><circle cx="60" cy="129" r="2.3" fill="${shade(suit, 0.4)}"/>`;
    s += `<path d="M44 136 Q60 142 76 136" stroke="${shade(suit, 0.3)}" stroke-width="2" fill="none"/>`;
    s += `<path d="M60 71 L47 64 L47 78 Z M60 71 L73 64 L73 78 Z" fill="${L.tie}" ${sw}/><circle cx="60" cy="71" r="3.4" fill="${shade(L.tie, -0.2)}" ${sw}/>`;
    if (L.shine) s += `<path d="M38 84 L42 96 M40 84 L44 90" stroke="#fff8c4" stroke-width="3" opacity=".8"/>`;
    // front arm (points when demanding)
    s += `<g class="armR"><path d="M84 74 Q96 96 94 120" fill="none" stroke="${O}" stroke-width="17"/><path d="M84 74 Q96 96 94 120" fill="none" stroke="${suit}" stroke-width="12"/>`
      + `<rect x="87" y="116" width="14" height="7" rx="2" fill="#fff" ${sw}/><circle cx="94" cy="128" r="7" fill="${skin}" ${sw}/><path d="M97 124 L106 121" stroke="${O}" stroke-width="7"/><path d="M97 124 L106 121" stroke="${skin}" stroke-width="3.5"/></g>`;
    // neck + head
    s += `<rect x="52" y="52" width="16" height="14" fill="${skin}" ${sw}/>`;
    s += `<ellipse cx="44" cy="38" rx="5" ry="7" fill="${skin}" ${sw}/>`;
    s += `<path d="M42 30 Q42 8 63 8 Q86 8 86 30 Q88 50 76 58 Q60 66 48 56 Q41 47 42 30 Z" fill="${skin}" ${sw}/>`;
    if (!L.bald) s += `<path d="M40 34 Q36 4 63 4 Q90 4 87 26 Q82 15 66 15 Q52 15 46 26 Q44 30 40 34 Z" fill="${L.hair}" ${sw}/>`;
    else s += `<ellipse cx="58" cy="14" rx="9" ry="4" fill="#ffffff" opacity=".45"/>`;
    // face
    if (L.shades) s += `<path d="M52 26 L90 26 L88 36 Q82 40 74 36 L71 31 L68 36 Q60 40 54 35 Z" fill="#0b0a12" ${sw}/><path d="M57 29 L63 29" stroke="#ffffff" stroke-width="2" opacity=".6"/>`;
    else s += `<ellipse cx="62" cy="31" rx="6.5" ry="7.5" fill="#fff" ${sw}/><ellipse cx="77" cy="31" rx="6.5" ry="7.5" fill="#fff" ${sw}/>`
      + `<circle class="pupil" cx="65" cy="32" r="2.6" fill="${O}"/><circle class="pupil" cx="80" cy="32" r="2.6" fill="${O}"/>`;
    s += `<path d="M53 20 L67 25 M71 25 L85 20" stroke="${O}" stroke-width="4"/>`;
    s += `<path d="M84 34 Q93 40 84 45" fill="${skin}" stroke="${O}" stroke-width="2.4"/>`;
    s += `<ellipse class="mouth" cx="72" cy="52" rx="7" ry="4.5" fill="#6b1020" ${sw}/><path d="M67 50 L77 50" stroke="#fff" stroke-width="2"/>`;
    if (L.stache) s += `<path d="M64 47 Q72 42 80 46 Q88 44 90 49 Q82 51 76 49 Q70 52 64 47 Z" fill="${L.hair === '#d9d9d9' ? '#e8e8e8' : shade(L.hair, 0.1)}" ${sw}/>`;
    if (L.monocle) s += `<circle cx="77" cy="31" r="9" fill="none" stroke="#d4a017" stroke-width="2.5"/><path d="M85 35 Q90 50 84 64" fill="none" stroke="#d4a017" stroke-width="1.5"/>`;
    if (L.hat) s += `<rect x="46" y="-22" width="36" height="28" rx="3" fill="#121018" ${sw}/><rect x="46" y="-2" width="36" height="6" fill="${L.tie}" stroke="none"/><ellipse cx="64" cy="6" rx="26" ry="5" fill="#121018" ${sw}/>`;
    if (L.shine) s += `<path d="M100 10 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#fff8c4" class="twinkle"/>`;
    return sv('0 -26 120 240', s, 'tux' + (opt.cls ? ' ' + opt.cls : ''));
  };

  /* ---------------- Sneakers ---------------- */
  A.sneaker = (sn, opt) => {
    opt = opt || {};
    const [up, acc, sole, lace] = sn.c;
    const sw = `stroke="${O}" stroke-width="2.8"`;
    let s = '';
    if (sn.style === 'box') {
      s += `<path d="M18 30 L82 30 L78 56 L22 56 Z" fill="${up}" ${sw}/><path d="M14 22 L86 22 L82 30 L18 30 Z" fill="${shade(up, 0.2)}" ${sw}/>`;
      s += `<path d="M18 30 L4 16 L16 12 L30 22" fill="${shade(up, 0.25)}" ${sw}/><path d="M82 30 L96 16 L84 12 L70 22" fill="${shade(up, 0.25)}" ${sw}/>`;
      s += `<text x="50" y="49" text-anchor="middle" font-size="12" font-family="Lilita One, Impact, sans-serif" fill="${acc}">?</text>`;
      return sv('0 0 100 62', s, 'snk');
    }
    const soleY = sn.style === 'boot' ? 44 : sn.style === 'runner' ? 45 : 46;
    const soleH = sn.style === 'boot' ? 12 : sn.style === 'runner' ? 10 : 8;
    let upper;
    if (sn.style === 'high') upper = 'M8 47 C6 28 8 8 18 5 L36 4 C40 12 42 18 50 20 C56 22 62 25 68 28 C82 31 92 37 94 47 Z';
    else if (sn.style === 'boot') upper = 'M8 45 C6 26 8 6 20 4 L42 4 C44 14 46 20 54 22 C66 24 90 30 94 45 Z';
    else if (sn.style === 'runner') upper = 'M8 46 C8 34 14 24 26 22 L44 19 C52 14 60 18 68 24 C82 28 94 36 96 46 Z';
    else upper = 'M8 47 C8 32 16 24 28 22 L46 20 C52 13 62 14 66 22 L70 28 C82 31 92 38 94 47 Z';
    // shadow
    if (!opt.noShadow) s += `<ellipse cx="52" cy="${soleY + soleH + 3}" rx="44" ry="3" fill="#000" opacity=".25"/>`;
    s += `<path d="${upper}" fill="${up}" ${sw}/>`;
    if (sn.style === 'slip') s += `<g clip-path="url(#ck${sn.id})"><defs><clipPath id="ck${sn.id}"><path d="${upper}"/></clipPath></defs>` +
      Array.from({ length: 24 }, (_, i) => `<rect x="${(i % 12) * 8 + ((Math.floor(i / 12)) % 2) * 4}" y="${30 + Math.floor(i / 12) * 8}" width="4" height="8" fill="${acc}"/>`).join('') + '</g>';
    // toe cap
    s += `<path d="M70 ${soleY + 1} C72 38 84 35 ${sn.style === 'runner' ? 96 : 94} ${soleY + 1} Z" fill="${shade(up, sn.style === 'slip' ? 0 : -0.08)}" stroke="${O}" stroke-width="2"/>`;
    // accent stripe
    if (sn.style !== 'slip') s += `<path d="M24 40 C44 42 60 36 78 26 C66 40 48 46 26 46 Z" fill="${acc}" stroke="${O}" stroke-width="2"/>`;
    if (sn.style === 'high' || sn.style === 'boot') s += `<circle cx="22" cy="18" r="5" fill="${acc}" stroke="${O}" stroke-width="2"/>`;
    // collar + laces
    if (sn.style !== 'slip') {
      const lx = sn.style === 'high' || sn.style === 'boot' ? 38 : 48;
      s += `<path d="M${lx} ${sn.style === 'high' || sn.style === 'boot' ? 8 : 20} L68 27" stroke="${shade(up, -0.25)}" stroke-width="7"/>`;
      for (let i = 0; i < 4; i++) {
        const t = i / 3, x = lx + (68 - lx) * t, y = (sn.style === 'high' || sn.style === 'boot' ? 8 : 20) + (27 - (sn.style === 'high' || sn.style === 'boot' ? 8 : 20)) * t;
        s += `<path d="M${x - 4} ${y - 3} L${x + 4} ${y + 3} M${x - 4} ${y + 3} L${x + 4} ${y - 3}" stroke="${lace}" stroke-width="2.6"/>`;
      }
      s += `<path d="M${lx + 2} ${sn.style === 'high' || sn.style === 'boot' ? 8 : 20} q-8 -10 -14 -4 q4 6 14 4 q4 -10 10 -8 q-2 8 -10 8" fill="none" stroke="${lace}" stroke-width="2.4"/>`;
    } else s += `<path d="M40 22 Q54 18 66 24" stroke="${O}" stroke-width="2" fill="none"/>`;
    // sole
    s += `<rect x="5" y="${soleY}" width="${sn.style === 'runner' ? 93 : 91}" height="${soleH}" rx="${soleH / 2}" fill="${sole}" ${sw}/>`;
    if (sn.style === 'runner') s += `<path d="M12 ${soleY + 5} q8 -4 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="${acc}" stroke-width="2"/>`;
    else s += `<path d="M10 ${soleY + soleH - 3} L94 ${soleY + soleH - 3}" stroke="${shade(sole, -0.25)}" stroke-width="2"/>`;
    // shine
    s += `<path d="M18 30 C22 26 28 25 34 25" stroke="#ffffff" stroke-width="3" opacity=".55" fill="none"/>`;
    return sv('0 0 100 62', s, 'snk');
  };

  /* ---------------- Shoebox ---------------- */
  A.shoebox = (tint) => {
    const c = '#e0a15c', d = shade(c, -0.2), e = shade(c, 0.15), sw = `stroke="${O}" stroke-width="3"`;
    const t = tint || '#ff4d6d';
    return sv('0 0 120 100',
      `<ellipse cx="60" cy="94" rx="50" ry="5" fill="#000" opacity=".25"/>` +
      `<path d="M14 40 L106 40 L102 90 L18 90 Z" fill="${c}" ${sw}/>` +
      `<path d="M14 40 L106 40 L102 90 L18 90 Z" fill="${d}" opacity=".35"/>` +
      `<rect x="40" y="52" width="40" height="24" rx="4" fill="#fff" ${sw}/>` +
      `<path d="M46 68 C52 70 60 66 70 58 C64 68 56 72 48 72 Z" fill="${t}"/>` +
      `<text x="60" y="64" text-anchor="middle" font-size="9" font-family="Lilita One, Impact, sans-serif" fill="${O}">O'T</text>` +
      `<g class="lid"><path d="M8 26 L112 26 L110 42 L10 42 Z" fill="${e}" ${sw}/><path d="M8 26 L112 26 L110 30 L10 30 Z" fill="#fff" opacity=".3"/>` +
      `<rect x="54" y="26" width="12" height="16" fill="${t}" stroke="${O}" stroke-width="2"/></g>`, 'box');
  };

  /* ---------------- Icons (64x64) ---------------- */
  const sw = `stroke="${O}" stroke-width="3"`;
  const I = {};
  I.kid = `<circle cx="32" cy="30" r="15" fill="#f4c9a0" ${sw}/><path d="M16 26 Q18 10 32 10 Q46 10 48 24 L56 26 L48 28 Z" fill="#e0303c" ${sw}/><circle cx="27" cy="31" r="2" fill="${O}"/><circle cx="38" cy="31" r="2" fill="${O}"/><path d="M26 38 Q32 43 39 38" fill="none" ${sw}/><path d="M12 58 Q14 48 24 48 L30 48 L30 58 Z M34 58 L34 48 L42 48 Q52 48 52 58 Z" fill="#fff" ${sw}/>`;
  I.fan = `<path d="M18 10 L18 56" ${sw}/><path d="M18 10 L54 20 L18 34 Z" fill="#ff9f1c" ${sw}/><path d="M28 18 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" fill="#fff" stroke="none"/><circle cx="18" cy="56" r="4" fill="#fff" ${sw}/>`;
  I.choir = `<rect x="22" y="6" width="20" height="28" rx="10" fill="#9aa6c8" ${sw}/><path d="M22 18 H42 M22 24 H42" stroke="${O}" stroke-width="2"/><path d="M16 26 Q16 42 32 42 Q48 42 48 26" fill="none" ${sw}/><path d="M32 42 V54 M22 56 H42" ${sw}/>`;
  I.cobbler = `<path d="M12 50 Q10 36 22 34 L34 32 Q40 24 46 30 L48 36 Q58 38 58 50 Z" fill="#fff" ${sw}/><rect x="8" y="50" width="52" height="7" rx="3" fill="#d9d9d9" ${sw}/><path d="M40 6 L54 20" stroke="${O}" stroke-width="9"/><path d="M40 6 L54 20" stroke="#8a5a2b" stroke-width="5"/><rect x="30" y="8" width="20" height="10" rx="2" transform="rotate(45 40 13)" fill="#9aa6c8" ${sw}/>`;
  I.factory = `<path d="M6 56 V30 L20 38 V30 L34 38 V30 L48 38 V56 Z" fill="#6c7ab0" ${sw}/><rect x="48" y="16" width="10" height="40" fill="#8a94c0" ${sw}/><path d="M53 12 q-6 -4 0 -8 q6 -4 2 -6" fill="none" stroke="#cfd6e6" stroke-width="3"/><rect x="12" y="44" width="8" height="8" fill="#ffd23f" stroke="${O}" stroke-width="2"/><rect x="26" y="44" width="8" height="8" fill="#ffd23f" stroke="${O}" stroke-width="2"/><rect x="40" y="44" width="6" height="12" fill="${O}"/>`;
  I.viral = `<rect x="16" y="4" width="32" height="56" rx="6" fill="#2b2d42" ${sw}/><rect x="20" y="10" width="24" height="40" rx="2" fill="#4cc9f0"/><path d="M32 40 C22 32 24 22 32 27 C40 22 42 32 32 40 Z" fill="#ff4d6d" stroke="#fff" stroke-width="2"/><circle cx="32" cy="55" r="2.5" fill="#fff"/>`;
  I.studio = `<rect x="8" y="26" width="48" height="30" rx="3" fill="#2b2d42" ${sw}/><path d="M8 18 L54 8 L56 18 L10 28 Z" fill="#fff" ${sw}/><path d="M18 16 L22 24 M30 13 L34 21 M42 11 L46 19" stroke="${O}" stroke-width="4"/><path d="M16 38 H48 M16 46 H38" stroke="#fff" stroke-width="3"/>`;
  I.mall = `<path d="M12 22 H52 L48 58 H16 Z" fill="#ff4d6d" ${sw}/><path d="M22 22 Q22 6 32 6 Q42 6 42 22" fill="none" ${sw}/><path d="M20 44 C28 46 36 42 44 34 C38 44 30 48 22 48 Z" fill="#fff"/>`;
  I.roto = `<circle cx="32" cy="32" r="24" fill="#9b5de5" ${sw}/><circle cx="32" cy="32" r="6" fill="#1b1330"/><circle cx="32" cy="17" r="6" fill="#e0aaff" stroke="${O}" stroke-width="2"/><circle cx="46" cy="36" r="6" fill="#e0aaff" stroke="${O}" stroke-width="2"/><circle cx="18" cy="36" r="6" fill="#e0aaff" stroke="${O}" stroke-width="2"/><circle cx="32" cy="48" r="4" fill="#e0aaff" stroke="${O}" stroke-width="2"/>`;
  I.temple = `<path d="M6 22 L32 6 L58 22 Z" fill="#ffd23f" ${sw}/><rect x="8" y="22" width="48" height="6" fill="#f4e3b5" ${sw}/><rect x="12" y="28" width="7" height="22" fill="#f4e3b5" ${sw}/><rect x="28.5" y="28" width="7" height="22" fill="#f4e3b5" ${sw}/><rect x="45" y="28" width="7" height="22" fill="#f4e3b5" ${sw}/><rect x="6" y="50" width="52" height="8" fill="#e0c98a" ${sw}/><path d="M26 16 q6 -8 12 0 q-6 6 -12 0" fill="none" stroke="#ff4d6d" stroke-width="2.5"/>`;
  I.sat = `<rect x="4" y="22" width="18" height="12" fill="#4361ee" ${sw}/><rect x="42" y="22" width="18" height="12" fill="#4361ee" ${sw}/><rect x="24" y="18" width="16" height="20" rx="3" fill="#cfd6e6" ${sw}/><path d="M22 28 H24 M40 28 H42" ${sw}/><path d="M32 38 V46" ${sw}/><path d="M22 50 Q32 42 42 50" fill="#fff" ${sw}/><path d="M48 10 q6 4 6 10 M52 6 q10 6 10 16" fill="none" stroke="#4cc9f0" stroke-width="3"/>`;
  I.mirror = `<ellipse cx="32" cy="30" rx="20" ry="26" fill="#ffd23f" ${sw}/><ellipse cx="32" cy="30" rx="14" ry="20" fill="#4cc9f0" stroke="${O}" stroke-width="2"/><path d="M32 30 m-8 0 a8 8 0 1 1 8 8 a5 5 0 1 1 -5 -5" fill="none" stroke="#fff" stroke-width="3"/><path d="M26 56 H38" ${sw}/>`;
  I.verse = `<path d="M10 32 C10 14 30 14 32 32 C34 50 54 50 54 32 C54 14 34 14 32 32 C30 50 10 50 10 32 Z" fill="none" stroke="${O}" stroke-width="9"/><path d="M10 32 C10 14 30 14 32 32 C34 50 54 50 54 32 C54 14 34 14 32 32 C30 50 10 50 10 32 Z" fill="none" stroke="#ff4d6d" stroke-width="5"/>`;
  I.cosmos = `<circle cx="32" cy="32" r="16" fill="#7209b7" ${sw}/><ellipse cx="32" cy="34" rx="28" ry="8" fill="none" stroke="${O}" stroke-width="6" transform="rotate(-15 32 34)"/><ellipse cx="32" cy="34" rx="28" ry="8" fill="none" stroke="#ffd23f" stroke-width="3" transform="rotate(-15 32 34)"/><circle cx="26" cy="26" r="4" fill="#fff" opacity=".4"/><path d="M50 8 l2 4 4 1 -4 2 -2 4 -1 -4 -4 -2 4 -1z" fill="#fff"/>`;
  I.click = `<path d="M20 8 L20 46 L30 38 L38 56 L46 52 L38 34 L50 34 Z" fill="#fff" ${sw}/>`;
  I.note = `<path d="M26 46 V12 L50 6 V40" fill="none" ${sw}/><ellipse cx="20" cy="47" rx="8" ry="6" fill="#ffd23f" ${sw}/><ellipse cx="44" cy="41" rx="8" ry="6" fill="#ffd23f" ${sw}/><path d="M26 18 L50 12" ${sw}/>`;
  I.verse_ = I.note;
  I.lyric = `<path d="M14 6 H44 L52 14 V58 H14 Z" fill="#fff" ${sw}/><path d="M20 20 H44 M20 28 H40 M20 36 H44" stroke="#9aa6c8" stroke-width="3"/><path d="M34 52 V40 L46 38 V50" fill="none" stroke="${O}" stroke-width="2.5"/><circle cx="31" cy="52" r="3.5" fill="#ff4d6d"/><circle cx="43" cy="50" r="3.5" fill="#ff4d6d"/>`;
  I.combo = `<path d="M32 58 C16 58 10 46 14 34 C16 28 20 26 20 18 C28 22 30 28 30 32 C34 26 36 16 32 6 C46 12 54 26 54 38 C54 50 46 58 32 58 Z" fill="#ff9f1c" ${sw}/><path d="M32 56 C24 56 22 50 24 44 C26 40 30 40 30 34 C36 38 40 44 40 48 C40 53 37 56 32 56 Z" fill="#ffd23f"/>`;
  I.crit = `<path d="M32 4 L38 22 L58 18 L44 32 L58 46 L38 42 L32 60 L26 42 L6 46 L20 32 L6 18 L26 22 Z" fill="#ffd23f" ${sw}/><circle cx="32" cy="32" r="6" fill="#fff"/>`;
  I.kick = `<path d="M8 44 Q8 28 22 26 L30 25 L30 12 L42 12 L42 30 Q54 32 56 44 Z" fill="#fff" ${sw}/><rect x="6" y="44" width="52" height="8" rx="4" fill="#e0303c" ${sw}/><path d="M56 16 L62 10 M58 26 L64 24 M52 8 L54 2" stroke="#ffd23f" stroke-width="3"/>`;
  I.heat = `<rect x="26" y="6" width="12" height="36" rx="6" fill="#fff" ${sw}/><circle cx="32" cy="48" r="10" fill="#ff4d6d" ${sw}/><rect x="30" y="20" width="4" height="26" fill="#ff4d6d"/><path d="M42 14 H48 M42 22 H48 M42 30 H48" ${sw}/>`;
  I.tux = `<path d="M32 32 L8 18 L8 46 Z M32 32 L56 18 L56 46 Z" fill="#1b1330" stroke="#fff" stroke-width="2.5"/><rect x="26" y="26" width="12" height="12" rx="3" fill="#e0303c" stroke="#fff" stroke-width="2.5"/>`;
  I.luck = `<g fill="#3ddc97" ${sw}><circle cx="24" cy="22" r="10"/><circle cx="40" cy="22" r="10"/><circle cx="24" cy="38" r="10"/><circle cx="40" cy="38" r="10"/></g><path d="M32 30 Q34 48 44 58" fill="none" ${sw}/><circle cx="32" cy="30" r="4" fill="#2bb47a"/>`;
  I.gold = `<path d="M8 44 C8 30 16 24 28 22 L44 20 C50 13 60 14 64 22" fill="none" stroke="none"/>` + `<path d="M6 46 C6 32 14 24 26 22 L42 20 C48 13 56 14 58 22 L60 26 C68 28 60 34 60 46 Z" fill="#ffd23f" ${sw}/><rect x="4" y="46" width="58" height="8" rx="4" fill="#e2a712" ${sw}/><path d="M50 6 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff"/>`;
  I.box = `<path d="M8 26 L56 26 L53 56 L11 56 Z" fill="#e0a15c" ${sw}/><path d="M4 16 L60 16 L58 28 L6 28 Z" fill="#f1b877" ${sw}/><rect x="27" y="16" width="10" height="12" fill="#ff4d6d" stroke="${O}" stroke-width="2"/><rect x="22" y="36" width="20" height="12" rx="2" fill="#fff" stroke="${O}" stroke-width="2"/>`;
  I.coll = `<rect x="8" y="8" width="48" height="48" rx="4" fill="#4cc9f0" fill-opacity=".35" ${sw}/><path d="M8 32 H56" ${sw}/><path d="M12 28 Q12 20 20 20 L26 20 Q28 16 30 20 L34 22 Q40 24 40 28 Z M24 52 Q24 44 32 44 L38 44 Q40 40 42 44 L46 46 Q52 48 52 52 Z" fill="#fff" stroke="${O}" stroke-width="2"/>`;
  I.fame = `<path d="M32 4 L40 22 L60 24 L45 37 L50 57 L32 46 L14 57 L19 37 L4 24 L24 22 Z" fill="#ffd23f" ${sw}/><path d="M26 30 L30 36 L40 26" fill="none" stroke="${O}" stroke-width="3"/>`;
  I.prod = `<path d="M18 30 C12 30 10 22 12 14 C14 6 22 4 24 12 C26 20 24 30 18 30 Z" fill="#fff" ${sw}/><ellipse cx="18" cy="37" rx="6" ry="5" fill="#fff" ${sw}/><path d="M44 52 C38 52 36 44 38 36 C40 28 48 26 50 34 C52 42 50 52 44 52 Z" fill="#fff" ${sw}/><ellipse cx="44" cy="59" rx="6" ry="4" fill="#fff" ${sw}/>`;
  I.steps = I.prod;
  I.shard = `<path d="M32 4 L50 22 L42 58 L22 58 L14 22 Z" fill="#b86bff" ${sw}/><path d="M32 4 L32 58 M14 22 L50 22" stroke="#e0aaff" stroke-width="2"/><path d="M24 14 L28 30" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  I.sp = `<circle cx="32" cy="32" r="28" fill="#ff9f1c" opacity=".25"/><path d="M26 5 C37 3 46 10 46 22 C46 30 42 34 42 41 C42 51 38 59 29 59 C21 59 18 51 18 43 C18 35 14 29 14 21 C14 12 19 6 26 5 Z" fill="#fff" ${sw}/><path d="M18 16 H43 M16 23 H45 M17 30 H43 M21 44 H40 M21 51 H38" stroke="#ff9f1c" stroke-width="3"/>`;
  I.gl = `<path d="M32 30 C18 14 6 22 12 32 C18 42 28 36 32 30 C36 24 46 18 52 28 C58 38 46 46 32 30 Z" fill="none" stroke="${O}" stroke-width="9"/><path d="M32 30 C18 14 6 22 12 32 C18 42 28 36 32 30 C36 24 46 18 52 28 C58 38 46 46 32 30 Z" fill="none" stroke="#ffd23f" stroke-width="5"/><path d="M30 32 L22 58 M34 32 L42 58" stroke="${O}" stroke-width="8"/><path d="M30 32 L22 58 M34 32 L42 58" stroke="#ffd23f" stroke-width="4"/><rect x="18" y="54" width="8" height="6" rx="1" fill="#e2a712" stroke="${O}" stroke-width="2"/><rect x="38" y="54" width="8" height="6" rx="1" fill="#e2a712" stroke="${O}" stroke-width="2"/>`;
  I.shop = `<path d="M8 26 L12 8 H52 L56 26 Z" fill="#ff4d6d" ${sw}/><path d="M18 8 L16 26 M28 8 L27 26 M36 8 L37 26 M46 8 L48 26" stroke="#fff" stroke-width="3"/><rect x="12" y="26" width="40" height="30" fill="#fff" ${sw}/><rect x="20" y="36" width="12" height="20" fill="#4cc9f0" stroke="${O}" stroke-width="2.5"/><rect x="36" y="34" width="12" height="10" fill="#4cc9f0" stroke="${O}" stroke-width="2.5"/>`;
  I.tree = `<path d="M32 58 V30 M32 40 L20 28 M32 34 L44 22" stroke="${O}" stroke-width="7"/><path d="M32 58 V30 M32 40 L20 28 M32 34 L44 22" stroke="#8a5a2b" stroke-width="3"/><circle cx="32" cy="20" r="12" fill="#3ddc97" ${sw}/><circle cx="18" cy="26" r="9" fill="#ffd23f" ${sw}/><circle cx="46" cy="20" r="9" fill="#b86bff" ${sw}/><circle cx="32" cy="20" r="4" fill="#fff"/>`;
  I.trophy = `<path d="M18 8 H46 V22 Q46 40 32 40 Q18 40 18 22 Z" fill="#ffd23f" ${sw}/><path d="M18 14 H8 Q8 28 20 30 M46 14 H56 Q56 28 44 30" fill="none" ${sw}/><rect x="28" y="40" width="8" height="8" fill="#e2a712" ${sw}/><rect x="18" y="48" width="28" height="9" rx="2" fill="#8a5a2b" ${sw}/><path d="M26 14 L28 26" stroke="#fff" stroke-width="3"/>`;
  I.cut = `<circle cx="18" cy="46" r="9" fill="none" ${sw}/><circle cx="46" cy="46" r="9" fill="none" ${sw}/><path d="M24 40 L48 6 M40 40 L16 6" stroke="${O}" stroke-width="7"/><path d="M24 40 L48 6 M40 40 L16 6" stroke="#cfd6e6" stroke-width="3"/><circle cx="32" cy="28" r="3" fill="#ff4d6d" stroke="${O}" stroke-width="2"/>`;
  I.stats = `<rect x="8" y="34" width="10" height="22" fill="#4cc9f0" ${sw}/><rect x="27" y="20" width="10" height="36" fill="#ffd23f" ${sw}/><rect x="46" y="8" width="10" height="48" fill="#ff4d6d" ${sw}/>`;
  I.gear = `<path d="M28 4 H36 L38 12 L44 15 L51 11 L57 17 L53 24 L56 30 L60 32 V40 L52 42 L50 48 L54 55 L48 61 L41 57 L36 59 L34 64 H28 L26 57 L20 55 L13 59 L7 53 L11 46 L8 40 L4 38 V30 L11 28 L13 22 L9 15 L15 9 L22 13 L26 11 Z" fill="#cfd6e6" ${sw} transform="translate(0 -2)"/><circle cx="32" cy="32" r="9" fill="#1b1330"/>`;
  I.wheel = `<circle cx="32" cy="32" r="26" fill="#fff" ${sw}/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    const a0 = i * Math.PI / 4, a1 = a0 + Math.PI / 4, c = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#3ddc97'][i % 4];
    return `<path d="M32 32 L${32 + 24 * Math.cos(a0)} ${32 + 24 * Math.sin(a0)} A24 24 0 0 1 ${32 + 24 * Math.cos(a1)} ${32 + 24 * Math.sin(a1)} Z" fill="${c}"/>`;
  }).join('') + `<circle cx="32" cy="32" r="6" fill="#1b1330"/><path d="M32 2 L27 12 H37 Z" fill="#1b1330"/>`;
  I.sound = `<path d="M8 24 H18 L32 12 V52 L18 40 H8 Z" fill="#fff" ${sw}/><path d="M40 22 Q46 32 40 42 M46 16 Q56 32 46 48" fill="none" ${sw}/>`;
  I.mute = `<path d="M8 24 H18 L32 12 V52 L18 40 H8 Z" fill="#fff" ${sw}/><path d="M40 24 L54 40 M54 24 L40 40" ${sw}/>`;
  I.lock = `<rect x="14" y="28" width="36" height="28" rx="5" fill="#9aa6c8" ${sw}/><path d="M20 28 V20 Q20 8 32 8 Q44 8 44 20 V28" fill="none" ${sw}/><circle cx="32" cy="42" r="4" fill="${O}"/>`;
  I.camera = `<rect x="6" y="18" width="52" height="36" rx="6" fill="#2b2d42" ${sw}/><rect x="20" y="10" width="16" height="10" rx="2" fill="#2b2d42" ${sw}/><circle cx="32" cy="36" r="12" fill="#4cc9f0" ${sw}/><circle cx="32" cy="36" r="5" fill="${O}"/><rect x="46" y="22" width="8" height="5" fill="#ffd23f"/>`;
  I.boss = `<path d="M8 50 L12 18 L24 32 L32 10 L40 32 L52 18 L56 50 Z" fill="#ffd23f" ${sw}/><rect x="8" y="48" width="48" height="8" fill="#e2a712" ${sw}/><circle cx="32" cy="36" r="4" fill="#ff4d6d"/>`;
  I.egg = `<path d="M32 6 C44 6 52 26 52 38 C52 50 44 58 32 58 C20 58 12 50 12 38 C12 26 20 6 32 6 Z" fill="#fff" ${sw}/><path d="M16 34 L22 30 L28 36 L34 30 L40 36 L46 30 L50 34" fill="none" stroke="#ff4d6d" stroke-width="3"/><circle cx="24" cy="46" r="3" fill="#4cc9f0"/><circle cx="38" cy="48" r="3" fill="#ffd23f"/>`;
  I.star = `<path d="M32 4 L40 22 L60 24 L45 37 L50 57 L32 46 L14 57 L19 37 L4 24 L24 22 Z" fill="#ffd23f" ${sw}/>`;
  I.clock = `<circle cx="32" cy="32" r="24" fill="#fff" ${sw}/><path d="M32 16 V32 L42 38" fill="none" ${sw}/>`;
  I.play = `<path d="M18 10 L52 32 L18 54 Z" fill="#3ddc97" ${sw}/>`;
  A.I = I;
  A.icon = (key) => {
    let k = key;
    if (k.startsWith('b:') || k.startsWith('i:')) k = k.slice(2);
    if (k === 'verse') k = 'lyric';
    const body = I[k] || I.star;
    return sv('0 0 64 64', body, 'ico');
  };

  /* ---------------- Achievement badge ---------------- */
  A.badge = (glyph, color, locked) => {
    const c = locked ? '#3a3360' : color;
    return sv('0 0 64 64', `<path d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z" fill="${c}" stroke="${O}" stroke-width="3"/>` +
      `<path d="M32 9 L52 20 V44 L32 55 L12 44 V20 Z" fill="${locked ? '#2a2450' : shade(color, -0.25)}"/>` +
      (locked ? `<text x="32" y="41" text-anchor="middle" font-size="22" font-family="Lilita One, Impact, sans-serif" fill="#6c63a6">?</text>`
        : `<g transform="translate(16 16) scale(.5)">${I[glyph] || I.star}</g>`), 'badge');
  };

  /* ---------------- Logo sneaker (for header + intro) ---------------- */
  A.logoSneaker = () => A.sneaker({ id: 'logo', style: 'high', c: ['#ffffff', '#ff4d6d', '#ffffff', '#ff9f1c'] }, { noShadow: true });

  root.Art = A;
})(window);
