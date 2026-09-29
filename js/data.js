/* Sneakers O'Toole — game content. Pure data, no DOM. */
(function (root) {
  'use strict';
  const D = {};

  /* ---------------- The song ----------------
     All times are seconds on the piano recording's timeline (A-flat major, ~122 BPM).
     t     = the beat where the word lands (click then for a hit)
     s/e   = the slice of O'Toole's vocal track that sings the word
     sing  = melody notes (MIDI) for the synth voices, chord = harmony under the word */
  const AB = [60, 63, 68, 72, 75], DB = [61, 65, 68, 73, 77], EB = [58, 63, 67, 70, 75];
  D.PHRASE = [
    { w: "I'm",      t: 0.465, s: 0.435, e: 0.680, sing: [58],     chord: 'Ab', vowel: 'ai' },
    { w: 'not',      t: 0.705, s: 0.680, e: 0.865, sing: [60],     chord: 'Ab', vowel: 'o' },
    { w: 'taking',   t: 0.940, s: 0.905, e: 1.140, sing: [56, 59], chord: 'Ab', vowel: 'e' },
    { w: 'my',       t: 1.155, s: 1.140, e: 1.310, sing: [58],     chord: 'Ab', vowel: 'ai' },
    { w: 'sneakers', t: 1.465, s: 1.310, e: 1.820, sing: [55, 56], chord: 'Ab', vowel: 'i' },
    { w: 'off',      t: 1.825, s: 1.820, e: 2.175, sing: [51],     chord: 'Ab', vowel: 'o' },
    { w: 'I',        t: 2.445, s: 2.425, e: 2.560, sing: [56],     chord: 'Db', vowel: 'ai' },
    { w: 'am',       t: 2.565, s: 2.560, e: 2.820, sing: [56],     chord: 'Db', vowel: 'a' },
    { w: 'Sneakers', t: 2.935, s: 2.820, e: 3.170, sing: [58, 61], chord: 'Eb', vowel: 'i' },
    { w: "O'",       t: 3.185, s: 3.170, e: 3.390, sing: [58],     chord: 'Ab', vowel: 'o' },
    { w: 'Toole',    t: 3.435, s: 3.390, e: 3.935, sing: [56],     chord: 'Ab', vowel: 'u' },
  ];
  // the tuxedo men's lines, in the order they happen in a chase
  D.LINES = {
    hey: 'Hey, take those sneakers off!',
    said: 'Take them off, I said!',
    letgo: 'Ah, let him go. We\'ll never catch him, not in these shoes.',
  };
  D.SONG_END = 4.3;
  D.LEAD_IN = 0.9;           // silence before each song so notes can travel down the lane          // the piano has finished ringing by here
  D.WIN_PERFECT = 0.075;     // seconds either side of the beat
  D.WIN_GOOD = 0.15;
  D.RUIN_AHEAD = 0.4;       // a stray press this close before a note ruins it
  D.CHORDS = { Ab: AB, Db: DB, Eb: EB };
  D.CHORD_BASS = { Ab: 44, Db: 37, Eb: 39 };

  /* ---------------- Buildings ---------------- */
  D.BUILDINGS = [
    { id: 'kid',     name: 'Lace-Up Kid',        cost: 15,     sps: 0.1,   desc: 'A neighborhood kid who hops around in brand-new sneakers.' },
    { id: 'fan',     name: 'Hopping Fan Club',   cost: 100,    sps: 1,     desc: 'Devoted fans who hop in unison. They made T-shirts.' },
    { id: 'choir',   name: 'Street Choir',       cost: 1100,   sps: 8,     desc: 'Four-part harmony about keeping your sneakers on.' },
    { id: 'cobbler', name: 'Sneaker Cobbler',    cost: 12e3,   sps: 47,    desc: 'Resoles, restitches, never removes.' },
    { id: 'factory', name: 'Sneaker Factory',    cost: 130e3,  sps: 260,   desc: 'Sneakers, sneakers, sneakers, on a conveyor belt.' },
    { id: 'viral',   name: 'Viral Edit Farm',    cost: 1.4e6,  sps: 1400,  desc: 'Remixes of the song, uploaded every four seconds.' },
    { id: 'studio',  name: 'Cutaway Studio',     cost: 20e6,   sps: 7800,  desc: 'Produces an endless supply of cutaway gags.' },
    { id: 'mall',    name: 'Sneaker Megamall',   cost: 330e6,  sps: 44e3,  desc: 'Forty floors. Every store sells one thing.' },
    { id: 'roto',    name: 'Rotoscope Lab',      cost: 5.1e9,  sps: 260e3, desc: 'Turns any video into more O\'Toole.' },
    { id: 'temple',  name: 'Temple of Laces',    cost: 75e9,   sps: 1.6e6, desc: 'Monks tie and untie a single sacred lace.' },
    { id: 'sat',     name: 'Sneaker Satellite',  cost: 1e12,   sps: 10e6,  desc: 'Broadcasts the song to every radio on Earth.' },
    { id: 'mirror',  name: 'Multiverse Mirror',  cost: 14e12,  sps: 65e6,  desc: 'Every universe has an O\'Toole. None took them off.' },
    { id: 'verse',   name: 'The Infinite Verse', cost: 170e12, sps: 430e6, desc: 'A song with no final bar.' },
    { id: 'cosmos',  name: 'Sole of the Cosmos', cost: 2.1e15, sps: 2.9e9, desc: 'The universe itself wears sneakers now.' },
  ];
  D.BGROWTH = 1.15;

  /* ---------------- Shop upgrades (bought with Steps, reset on Cutaway) ---------------- */
  const TIERS = [
    { at: 1,   k: 10,    n: 'Double Knots' },
    { at: 5,   k: 50,    n: 'Gel Insoles' },
    { at: 25,  k: 500,   n: 'Air Pockets' },
    { at: 50,  k: 5e4,   n: 'Carbon Plates' },
    { at: 100, k: 5e6,   n: 'Quantum Laces' },
    { at: 150, k: 5e8,   n: 'Hyper Treads' },
    { at: 200, k: 5e10,  n: 'Mythic Stitching' },
    { at: 250, k: 5e13,  n: 'Celestial Rubber' },
    { at: 300, k: 5e16,  n: 'Infinite Grip' },
    { at: 400, k: 5e20,  n: 'Sole Singularity' },
  ];
  D.TIERS = TIERS;
  D.UPGRADES = [];
  D.BUILDINGS.forEach((b, bi) => TIERS.forEach((t, ti) => D.UPGRADES.push({
    id: b.id + '_' + ti, name: t.n + ' (' + b.name + ')', icon: 'b:' + b.id, tier: ti,
    cost: b.cost * t.k, req: { b: b.id, n: t.at },
    desc: b.name + ' production x2.',
    fx: { ['b_' + b.id]: 2 },
  })));
  const U = (id, name, cost, icon, desc, fx, req) => D.UPGRADES.push({ id, name, cost, icon, desc, fx, req: req || { steps: cost * 0.4 }, tier: 0 });
  U('laces1', 'Tighter Laces', 100, 'i:click', 'Each note earns x2.', { click: 2 }, { clicks: 15 });
  U('laces2', 'Squeaky Soles', 600, 'i:click', 'Each note earns x2.', { click: 2 }, { clicks: 60 });
  U('laces3', 'Vocal Warm-up', 12e3, 'i:click', 'Each note earns x2.', { click: 2 }, { clicks: 200 });
  [5e4, 5e6, 5e8, 5e10, 5e12, 5e14, 5e16, 5e18].forEach((c, i) =>
    U('sing' + i, ['Belt It Out', 'Falsetto', 'Vibrato', 'Stadium Voice', 'Sonic Boom', 'Glass Shatter', 'Cosmic Choir', 'The Final Note'][i], c, 'i:note',
      'Each note also earns 1% of your Steps per second.', { clickSps: 0.01 }, { steps: c * 0.3 }));
  U('verse1', 'Second Verse', 5e3, 'i:verse', 'Verse bonus x2.', { verse: 2 }, { verses: 3 });
  U('verse2', 'Backup Dancers', 5e6, 'i:verse', 'Verse bonus x2.', { verse: 2 }, { verses: 25 });
  U('verse3', 'Key Change', 5e9, 'i:verse', 'Verse bonus x2.', { verse: 2 }, { verses: 100 });
  U('verse4', 'Standing Ovation', 5e13, 'i:verse', 'Verse bonus x2.', { verse: 2 }, { verses: 300 });
  U('combo1', 'Rhythm Section', 2e4, 'i:combo', 'Combo cap +25.', { comboCap: 25 }, { combo: 30 });
  U('combo2', 'Metronome', 2e7, 'i:combo', 'Your combo survives 50% longer between songs.', { comboWin: 1.5 }, { combo: 50 });
  U('combo3', 'Drum Solo', 2e11, 'i:combo', 'Combo cap +50.', { comboCap: 50 }, { combo: 70 });
  U('crit1', 'Lucky Aglets', 8e4, 'i:crit', 'Critical note chance +3%.', { crit: 0.03 }, { crits: 5 });
  U('crit2', 'Sweet Spot', 8e8, 'i:crit', 'Critical notes x2 stronger.', { critMult: 2 }, { crits: 50 });
  U('kick1', 'Springy Soles', 2e3, 'i:kick', 'Stride +1: every note leaves chasers further behind and makes bosses dizzier.', { kick: 1 }, { enemies: 1 });
  U('kick2', 'Long Strides', 2e6, 'i:kick', 'Stride x2.', { kickMult: 2 }, { enemies: 15 });
  U('kick3', 'Sneaker Sprint', 2e10, 'i:kick', 'Stride x2.', { kickMult: 2 }, { enemies: 60 });
  U('kick4', 'Greased Lightning', 2e15, 'i:kick', 'Stride x3.', { kickMult: 3 }, { enemies: 200 });
  U('heat1', 'Low Profile', 5e3, 'i:heat', 'Chasers show up 15% less often.', { heat: 0.85 }, { enemies: 3 });
  U('heat2', 'Fake Mustache', 5e7, 'i:heat', 'Chasers show up 15% less often.', { heat: 0.85 }, { enemies: 30 });
  U('loot1', 'Pickpocket', 3e5, 'i:tux', 'Tuxedo men who give up drop x1.5 Steps.', { enemyReward: 1.5 }, { enemies: 10 });
  U('loot2', 'Tux Rental Scam', 3e9, 'i:tux', 'Tuxedo men drop x2 Steps.', { enemyReward: 2 }, { enemies: 50 });
  U('luck1', 'Four-Leaf Aglets', 1e6, 'i:luck', 'Luck +10%.', { luck: 0.1 }, { golden: 1 });
  U('luck2', 'Horseshoe Insoles', 1e10, 'i:luck', 'Luck +15%.', { luck: 0.15 }, { golden: 7 });
  U('gold1', 'Shiny Polish', 1e5, 'i:gold', 'Golden Sneakers appear 10% more often.', { gold: 1.1 }, { golden: 1 });
  U('gold2', 'Gold Leaf', 1e8, 'i:gold', 'Golden Sneaker effects last 20% longer.', { goldDur: 1.2 }, { golden: 5 });
  U('gold3', 'Midas Laces', 1e12, 'i:gold', 'Golden Sneakers appear 15% more often.', { gold: 1.15 }, { golden: 20 });
  U('box1', 'Bigger Pockets', 5e5, 'i:box', 'Shoebox drop chance x1.5.', { box: 1.5 }, { boxes: 1 });
  U('box2', 'Sneaker Radar', 5e9, 'i:box', 'Shoebox drop chance x1.5.', { box: 1.5 }, { boxes: 20 });
  U('coll1', 'Display Case', 1e7, 'i:coll', 'Collection bonus x1.5.', { collect: 1.5 }, { unique: 5 });
  U('coll2', 'Sneakerhead Museum', 1e12, 'i:coll', 'Collection bonus x2.', { collect: 2 }, { unique: 15 });
  U('fame1', 'Fan Mail', 1e6, 'i:fame', 'Each achievement gives +1% more production.', { fame: 2 }, { ach: 10 });
  U('fame2', 'Autograph Tour', 1e11, 'i:fame', 'Each achievement gives +1% more production.', { fame: 1.5 }, { ach: 30 });
  U('fame3', 'Walk of Fame', 1e16, 'i:fame', 'Each achievement gives +1% more production.', { fame: 1.34 }, { ach: 55 });
  // Hype, moves and the Long Walk
  U('hype1', 'Hype Man', 3e3, 'i:hype', 'Hype builds 25% faster.', { hypeGain: 1.25 }, { hits: 60 });
  U('hype2', 'Megaphone', 3e7, 'i:hype', 'Hype builds 25% faster.', { hypeGain: 1.25 }, { hypeSpent: 400 });
  U('hype3', 'Hype Train', 3e12, 'i:hype', 'Hype builds 30% faster.', { hypeGain: 1.3 }, { hypeSpent: 3000 });
  U('strut1', 'Swagger', 2e4, 'shades', 'Strut lasts 50% longer.', { strutDur: 1.5 }, { struts: 3 });
  U('strut2', 'Peacock Walk', 2e8, 'shades', 'Strut multiplier +1.', { strutAdd: 1 }, { struts: 20 });
  U('strut3', 'Runway Model', 2e14, 'shades', 'Strut multiplier +1, and it lasts 30% longer.', { strutAdd: 1, strutDur: 1.3 }, { struts: 80 });
  U('show1', 'Jazz Hands', 6e4, 'mic', 'Showstoppers pay x1.5.', { showMult: 1.5 }, { shows: 2 });
  U('show2', 'Standing O', 6e9, 'mic', 'Showstoppers pay x2.', { showMult: 2 }, { shows: 20 });
  U('show3', 'Curtain Call', 6e15, 'mic', 'Showstoppers pay x2 and recharge 30% faster.', { showMult: 2, moveCd: 0.7 }, { shows: 80 });
  U('road1', 'Road Map', 1.5e5, 'map', 'Rewards for reaching a stop x2.', { arrive: 2 }, { stops: 4 });
  U('road2', 'Scenic Route', 1.5e9, 'map', 'Every stop gives +1% more production (10% → 11%).', { journeyAdd: 0.01 }, { stops: 8 });
  U('road3', 'Frequent Walker Card', 1.5e14, 'map', 'Every stop gives +1% more production.', { journeyAdd: 0.01 }, { stops: 14 });
  U('prod1', 'Hop in Place', 5e4, 'i:prod', 'All production x1.1.', { prod: 1.1 });
  U('prod2', 'Morning Jog', 5e7, 'i:prod', 'All production x1.15.', { prod: 1.15 });
  U('prod3', 'Marathon Training', 5e10, 'i:prod', 'All production x1.2.', { prod: 1.2 });
  U('prod4', 'Olympic Hurdles', 5e13, 'i:prod', 'All production x1.25.', { prod: 1.25 });
  U('prod5', 'Speed of Sound', 5e16, 'i:prod', 'All production x1.3.', { prod: 1.3 });
  U('prod6', 'Speed of Light', 5e19, 'i:prod', 'All production x1.5.', { prod: 1.5 });

  /* ---------------- Tuxedo men ---------------- */
  // hp = persistence: how many dodges before he gives up, spd = fraction of the walk per second, sec = seconds of production dropped
  D.ENEMIES = {
    tux:     { name: 'Tuxedo Guy',      hp: 3,  spd: 0.075, sec: 12, clk: 10, box: 0.04, w: 10, look: { suit: '#1d1b26', tie: '#e0303c', hair: '#2b2118', skin: '#f1c7a1' } },
    waiter:  { name: 'Waiter',          hp: 4,  spd: 0.11,  sec: 25, clk: 12, box: 0.05, w: 6, min: 3, look: { suit: '#232030', tie: '#1d1b26', hair: '#5a3a22', skin: '#e9b98f', towel: 1 } },
    tophat:  { name: 'Top Hat Gent',    hp: 6,  spd: 0.06,  sec: 40, clk: 20, box: 0.08, w: 5, min: 8, look: { suit: '#2a2440', tie: '#6d4bd8', hair: '#8b8b8b', skin: '#f3cfb0', hat: 1 } },
    maitre:  { name: "Maître d'",       hp: 8,  spd: 0.07,  sec: 60, clk: 30, box: 0.1,  w: 4, min: 15, look: { suit: '#141222', tie: '#d4a017', hair: '#191919', skin: '#e6b48a', stache: 1, monocle: 1 } },
    bouncer: { name: 'Bouncer',         hp: 14, spd: 0.05,  sec: 90, clk: 45, box: 0.18, w: 3, min: 30, big: 1, look: { suit: '#0f0e16', tie: '#0f0e16', hair: '#0f0e16', skin: '#c68d62', shades: 1, bald: 1 } },
    golden:  { name: 'Golden Tuxedo',   hp: 5,  spd: 0.16,  sec: 300, clk: 100, box: 1, boxes: 3, w: 0.35, min: 5, flee: 1, look: { suit: '#e2a712', tie: '#fff1a8', hair: '#8a5a12', skin: '#f5cda8', shine: 1 } },
  };
  D.BOSSES = [
    { id: 'reggie',  name: 'Sir Reginald Cummerbund', look: { suit: '#1b1830', tie: '#c21f3a', hair: '#d9d9d9', skin: '#f0c29a', hat: 1, stache: 1, monocle: 1 } },
    { id: 'twins',   name: 'The Tuxedo Twins',        look: { suit: '#101010', tie: '#35c3ff', hair: '#3a2415', skin: '#f2c8a2', shades: 1 } },
    { id: 'duke',    name: 'The Duke of Dress Code',  look: { suit: '#3a1440', tie: '#ffd23f', hair: '#1e1e1e', skin: '#e8b88f', hat: 1, cape: 1 } },
    { id: 'titan',   name: 'The Black Tie Titan',     look: { suit: '#07060b', tie: '#ff4d6d', hair: '#07060b', skin: '#b87a50', shades: 1, bald: 1 } },
    { id: 'count',   name: 'Count Cufflinks',         look: { suit: '#1a1a2e', tie: '#9b5de5', hair: '#101010', skin: '#e0d0f0', cape: 1, stache: 1 } },
  ];

  /* ---------------- Sneakers (collection) ---------------- */
  D.RARITY = [
    { id: 'common',    name: 'Common',    w: 55,  shard: 1,   star: 5,   color: '#b9c2dd' },
    { id: 'uncommon',  name: 'Uncommon',  w: 27,  shard: 2,   star: 8,   color: '#3ddc97' },
    { id: 'rare',      name: 'Rare',      w: 12,  shard: 5,   star: 15,  color: '#4cc9f0' },
    { id: 'epic',      name: 'Epic',      w: 4.5, shard: 15,  star: 30,  color: '#b86bff' },
    { id: 'legendary', name: 'Legendary', w: 1.3, shard: 50,  star: 60,  color: '#ffb627' },
    { id: 'mythic',    name: 'Mythic',    w: 0.2, shard: 200, star: 120, color: '#ff4d6d' },
  ];
  D.STAR_MULT = [0, 1, 1.5, 2, 3, 4];
  D.STAR_COST = [0, 1, 2.5, 6, 15]; // x rarity.star shards to go from star n to n+1
  const SN = (id, name, r, style, c, k, v, desc) => ({ id, name, r, style, c, fx: { k, v }, desc });
  D.SNEAKERS = [
    SN('plain', 'Plain Whites', 0, 'low', ['#f4f4f4', '#cfd6e6', '#ffffff', '#e9e9e9'], 'prod', 0.03, 'The classics. Blinding when new.'),
    SN('velcro', 'Velcro Classics', 0, 'low', ['#5b8def', '#2a4fa8', '#f0f0f0', '#2a4fa8'], 'click', 0.06, 'Rrrrip. Rrrrip.'),
    SN('discount', 'Discount Dashers', 0, 'runner', ['#9aa0a6', '#e0303c', '#dddddd', '#ffffff'], 'kick', 1, 'The stripes are painted on.'),
    SN('handme', 'Hand-Me-Downs', 0, 'low', ['#a67c52', '#6b4a2b', '#e8dcc8', '#f2e8d8'], 'luck', 0.03, 'Previously owned by three cousins.'),
    SN('mall', 'Mall Walkers', 0, 'runner', ['#ffffff', '#8fd3ff', '#e0e0e0', '#ffffff'], 'offline', 0.05, 'Built for laps around the food court.'),
    SN('canvas', 'Canvas Kickers', 0, 'high', ['#e0303c', '#ffffff', '#f5f0e6', '#ffffff'], 'verse', 0.08, 'Doodled on in math class.'),
    SN('quahog', 'Quahog Runners', 0, 'runner', ['#2e7d6f', '#ffd23f', '#f4f4f4', '#ffffff'], 'heat', -0.05, 'Local favorite. Smells like clams.'),
    SN('knotted', 'Double-Knotted', 1, 'low', ['#ff9f1c', '#1b1330', '#ffffff', '#1b1330'], 'prod', 0.05, 'They are never coming off. Obviously.'),
    SN('neon', 'Neon Nights', 1, 'runner', ['#1b1330', '#39ff88', '#39ff88', '#ff4df0'], 'crit', 0.01, 'Glow under blacklights and your judgment.'),
    SN('hightop', 'High-Top Hoppers', 1, 'high', ['#4361ee', '#ffffff', '#f4f4f4', '#ffffff'], 'click', 0.1, 'Extra ankle for extra hops.'),
    SN('checker', 'Checkerboard Slips', 1, 'slip', ['#f4f4f4', '#1b1330', '#f4f4f4', '#f4f4f4'], 'combo', 5, 'No laces. Still not coming off.'),
    SN('retro', 'Retro Trainers', 1, 'runner', ['#f7e9d0', '#e76f51', '#e9c46a', '#ffffff'], 'box', 0.08, 'Straight out of a 1985 catalog.'),
    SN('puddle', 'Puddle Jumpers', 1, 'boot', ['#ffd23f', '#1b1330', '#2a2a2a', '#1b1330'], 'heat', -0.08, 'Waterproof. Tux-proof.'),
    SN('air1', "Air O'Toole I", 2, 'high', ['#ffffff', '#e0303c', '#1b1330', '#ffffff'], 'prod', 0.08, 'The first signature model.'),
    SN('glow', 'Glow Soles', 2, 'runner', ['#2b2d42', '#8ecae6', '#bdf4ff', '#8ecae6'], 'gold', 0.1, 'Leaves glowing footprints.'),
    SN('rocket', 'Rocket Treads', 2, 'runner', ['#e63946', '#f1faee', '#ffb703', '#f1faee'], 'kick', 3, 'Not legal in most states.'),
    SN('velvet', 'Velvet Hops', 2, 'low', ['#7b2cbf', '#c77dff', '#f4f4f4', '#e0aaff'], 'verse', 0.15, 'Too fancy for the tuxedo men to handle.'),
    SN('crimson', 'Crimson Laces', 2, 'high', ['#1b1330', '#e0303c', '#f4f4f4', '#e0303c'], 'crit', 0.02, 'The laces are the point.'),
    SN('cloud', 'Cloud Walkers', 2, 'runner', ['#e9f5ff', '#a2d2ff', '#ffffff', '#bde0fe'], 'luck', 0.08, 'Like walking on a nap.'),
    SN('retroair', "Air O'Toole Retro", 3, 'high', ['#1b1330', '#ff9f1c', '#ffffff', '#ff9f1c'], 'prod', 0.12, 'Resold for 40 times retail.'),
    SN('thunder', 'Thunder Stompers', 3, 'boot', ['#3a0ca3', '#ffd23f', '#1b1330', '#ffd23f'], 'kick', 6, 'Every step is a drum hit.'),
    SN('diamond', 'Diamond Laces', 3, 'low', ['#f8f9fa', '#90e0ef', '#caf0f8', '#48cae4'], 'box', 0.18, 'Each aglet is a real diamond, allegedly.'),
    SN('holo', 'Holo High-Tops', 3, 'high', ['#ff99c8', '#a9def9', '#e4c1f9', '#fcf6bd'], 'gold', 0.18, 'A different color from every angle.'),
    SN('jet', 'Jet Setters', 3, 'runner', ['#212529', '#f8f9fa', '#e63946', '#f8f9fa'], 'auto', 0.5, 'They hop by themselves. A little.'),
    SN('golden', 'Golden Sneakers', 4, 'high', ['#ffd23f', '#e2a712', '#fff1a8', '#fff8d6'], 'prod', 0.2, 'Solid gold. Surprisingly comfortable.'),
    SN('unremovable', 'The Unremovables', 4, 'low', ['#ffffff', '#ff4d6d', '#1b1330', '#ff4d6d'], 'heat', -0.2, 'Laced with a legally binding contract.'),
    SN('moon', 'Moon Boots', 4, 'boot', ['#dee2e6', '#6c757d', '#adb5bd', '#f8f9fa'], 'luck', 0.18, 'Low gravity, high hops.'),
    SN('phoenix', 'Phoenix Kicks', 4, 'runner', ['#ff4800', '#ffd000', '#ff9e00', '#fff3b0'], 'crit', 0.04, 'Burn out, get back up, keep hopping.'),
    SN('original', 'The Original Pair', 5, 'low', ['#f7f7f7', '#c9ced8', '#ffffff', '#eeeeee'], 'prod', 0.35, 'The exact pair. Still warm.'),
    SN('infinity', 'Infinity Laces', 5, 'high', ['#10002b', '#e0aaff', '#c77dff', '#ffffff'], 'verse', 0.6, 'The laces never end. Nobody knows where they go.'),
    SN('quantum', 'Quantum Sneaks', 5, 'runner', ['#00f5d4', '#9b5de5', '#f15bb5', '#fee440'], 'luck', 0.35, 'Both on and on at the same time.'),
    SN('emptybox', 'The Empty Box', 2, 'box', ['#c9a27e', '#8a6a4a', '#e8d2b4', '#ffffff'], 'luck', 0.07, 'The box was empty. He\'s still wearing his.', ),
  ];
  D.SNEAKERS.find(s => s.id === 'emptybox').secret = true;

  /* ---------------- Golden Sneaker effects ---------------- */
  D.GOLDEN = [
    { id: 'frenzy',  name: 'Sneaker Frenzy',  w: 40, desc: 'Production x7 for 77 seconds!' },
    { id: 'lucky',   name: 'Lucky Steps',     w: 34, desc: 'A pile of Steps!' },
    { id: 'clickf',  name: 'Note Frenzy',     w: 8,  desc: 'Every note earns x77 for 13 seconds!' },
    { id: 'rain',    name: 'Shoebox Rain',    w: 10, desc: 'Shoeboxes fall from the sky!' },
    { id: 'repel',   name: 'Tux Repellent',   w: 4,  desc: 'No tuxedo men for 2 minutes.' },
    { id: 'encore',  name: 'Encore',          w: 4,  desc: 'Your next 5 verses are x10!' },
  ];

  /* ---------------- Random events ---------------- */
  D.EVENTS = [
    { id: 'viral',  name: 'Going Viral!',        dur: 60, desc: 'Production x2 for 60 seconds.' },
    { id: 'conv',   name: 'Tuxedo Convention',   dur: 45, desc: 'Tuxedo men everywhere! They drop x3 loot.' },
    { id: 'sale',   name: 'Sneaker Sale',        dur: 45, desc: 'Buildings cost 25% less for 45 seconds.' },
    { id: 'rain',   name: 'Rain Delay',          dur: 60, desc: 'Heat is frozen for 60 seconds.' },
    { id: 'paps',   name: 'Paparazzi!',          dur: 12, desc: 'Click the cameras before they vanish!' },
    { id: 'mail',   name: 'Fan Mail',            dur: 0,  desc: 'A fan sent you a shoebox.' },
    { id: 'scout',  name: 'Talent Scout',        dur: 0,  desc: 'Your next verse is worth x10.' },
  ];

  /* ---------------- Wheel of Laces ---------------- */
  D.WHEEL = [
    { id: 'prod10',  name: '10 min of Steps', w: 22, color: '#4cc9f0' },
    { id: 'box1',    name: '1 Shoebox',       w: 20, color: '#ff9f1c' },
    { id: 'frenzy',  name: 'Frenzy x7',       w: 14, color: '#ffd23f' },
    { id: 'shards',  name: '40 Lace Shards',  w: 14, color: '#b86bff' },
    { id: 'box3',    name: '3 Shoeboxes',     w: 10, color: '#3ddc97' },
    { id: 'prod60',  name: '1 hour of Steps', w: 10, color: '#5b8def' },
    { id: 'gl',      name: '1 Golden Lace',   w: 7,  color: '#e2a712' },
    { id: 'jackpot', name: 'JACKPOT',         w: 3,  color: '#ff4d6d' },
  ];

  /* ---------------- The Lace Tree (permanent, costs Sole Power) ---------------- */
  // x/y are grid coordinates for the tree map. req = parent id.
  const T = (id, br, x, y, req, name, cost, desc, fx, max) => ({ id, br, x, y, req, name, cost, desc, fx, max: max || 1 });
  D.BRANCHES = {
    root: { name: 'Origin', color: '#ffffff' },
    rhythm: { name: 'Rhythm', color: '#ffd23f', icon: 'i:note' },
    hustle: { name: 'Hustle', color: '#3ddc97', icon: 'i:prod' },
    defy: { name: 'Defiance', color: '#ff4d6d', icon: 'i:kick' },
    luck: { name: 'Fortune', color: '#b86bff', icon: 'i:luck' },
  };
  D.TREE = [
    T('root', 'root', 0, 0, null, 'The Original Pair', 1, 'Production x1.25. Unlocks the Lace Tree.', { prod: 1.25 }),
    // Rhythm: up
    T('r1', 'rhythm', 0, -1, 'root', 'Warm Up', 1, 'Each note earns x3.', { click: 3 }),
    T('r2', 'rhythm', -1, -2, 'r1', 'Karaoke Night', 2, 'Verse bonus x3.', { verse: 3 }),
    T('r3', 'rhythm', 1, -2, 'r1', 'Crowd Surfing', 3, 'Combo cap +25.', { comboCap: 25 }),
    T('r4', 'rhythm', 0, -3, 'r1', 'Auto-Singer', 5, 'O\'Toole starts the song himself and sings 25% of the words you miss.', { auto: 1 }),
    T('r5', 'rhythm', -1, -4, 'r4', 'Perfect Pitch', 10, 'Critical note chance +4%.', { crit: 0.04 }),
    T('r6', 'rhythm', 1, -4, 'r4', 'Chorus Line', 20, 'Each note also earns 3% of Steps per second.', { clickSps: 0.03 }),
    T('r7', 'rhythm', 0, -5, 'r4', 'Duet', 40, 'Auto-Singer catches 50% more of your missed words.', { auto: 2 }),
    T('r8', 'rhythm', -1, -6, 'r7', 'Stage Presence', 90, 'Critical notes x3 stronger.', { critMult: 3 }),
    T('r9', 'rhythm', 1, -6, 'r7', 'Metronome Heart', 150, 'Your combo survives twice as long between songs.', { comboWin: 2 }),
    T('r10', 'rhythm', 0, -7, 'r7', 'Unplugged', 400, 'Notes x10. Verse bonus x5.', { click: 10, verse: 5 }),
    T('r12', 'rhythm', 2, -3, 'r3', 'Hype Machine', 3, 'Hype builds 50% faster.', { hypeGain: 1.5 }),
    T('r13', 'rhythm', -2, -3, 'r2', 'Catwalk', 3, 'Strut lasts twice as long.', { strutDur: 2 }),
    T('r11', 'rhythm', 0, -8, 'r10', 'Encore Forever', 1500, 'Notes x1.25 and verses x1.1 per level.', { click: 1.25, verse: 1.1 }, 50),
    // Hustle: right
    T('h1', 'hustle', 1, 0, 'root', 'Hustle', 1, 'Production x1.5.', { prod: 1.5 }),
    T('h2', 'hustle', 2, -1, 'h1', 'Block Party', 2, 'Lace-Up Kids and Fan Clubs x4.', { b_kid: 4, b_fan: 4 }),
    T('h3', 'hustle', 2, 1, 'h1', 'Night Shift', 3, 'Offline progress 50% → 75%.', { offline: 0.25 }),
    T('h4', 'hustle', 3, 0, 'h1', 'Head Start', 6, 'Start every Cutaway with 10 Lace-Up Kids, 10 Fan Clubs and 5 Choirs.', { headStart: 1 }),
    T('h5', 'hustle', 4, -1, 'h4', 'Bulk Discount', 12, 'Buildings cost 8% less.', { cost: 0.92 }),
    T('h6', 'hustle', 4, 1, 'h4', 'Franchise', 25, 'Production x2.', { prod: 2 }),
    T('h7', 'hustle', 5, 0, 'h4', 'Sole Economics', 50, 'Each Sole Power gives +1% more production (2% → 3%).', { spEff: 0.01 }),
    T('h8', 'hustle', 6, -1, 'h7', 'Sleepwalking', 100, 'Offline progress → 100%, cap 24h.', { offline: 0.25, offlineCap: 12 }),
    T('h9', 'hustle', 6, 1, 'h7', 'Monopoly', 200, 'Buildings cost 10% less. Production x2.', { cost: 0.9, prod: 2 }),
    T('h10', 'hustle', 7, 0, 'h7', 'Sneaker Empire', 500, 'Production x3.', { prod: 3 }),
    T('h12', 'hustle', 5, -2, 'h5', 'Tour Bus', 10, 'Every stop gives +2% more production.', { journeyAdd: 0.02 }),
    T('h11', 'hustle', 8, 0, 'h10', 'Endless Hustle', 1500, 'Production x1.25 per level.', { prod: 1.25 }, 50),
    // Defiance: down
    T('d1', 'defy', 0, 1, 'root', 'Long Legs', 1, 'Stride +2.', { kick: 2 }),
    T('d2', 'defy', -1, 2, 'd1', 'Stay Hidden', 2, 'Chasers show up 20% less often.', { heat: 0.8 }),
    T('d3', 'defy', 1, 2, 'd1', 'Decoy Sneakers', 4, 'Decoys slow chasers down and make bosses a little dizzy on their own.', { guard: 1 }),
    T('d4', 'defy', 0, 3, 'd1', 'Shakedown', 8, 'Tuxedo men drop x2 Steps.', { enemyReward: 2 }),
    T('d5', 'defy', -1, 4, 'd4', 'Home Turf', 15, 'Bosses wait 15 seconds longer before grabbing the laces.', { bossTime: 15 }),
    T('d6', 'defy', 1, 4, 'd4', 'Decoy Warehouse', 30, 'Decoys work 4x as well.', { guard: 3 }),
    T('d7', 'defy', 0, 5, 'd4', 'Death Grip', 60, 'Tugs steal 75% less. Stride x3.', { tug: 0.25, kickMult: 3 }),
    T('d8', 'defy', -1, 6, 'd7', 'Trophy Hunter', 120, 'Bosses drop +2 Golden Laces.', { bossGl: 2 }),
    T('d12', 'defy', 2, 3, 'd3', 'Warm-Up Lap', 8, '+0.3 Hype every second, even when you are not singing.', { hypeRegen: 0.3 }),
    T('d9', 'defy', 1, 6, 'd7', 'Big Finish', 200, 'Finishing a verse leaves chasers far behind and spins bosses around.', { verseShock: 1 }),
    T('d10', 'defy', 0, 7, 'd7', 'The Two Men Give Up', 500, 'Chasers show up 40% less often. Tuxedo loot x3.', { heat: 0.6, enemyReward: 3 }),
    T('d11', 'defy', 0, 8, 'd10', 'Uncatchable', 1500, 'Stride x1.5 and loot x1.1 per level.', { kickMult: 1.5, enemyReward: 1.1 }, 50),
    // Fortune: left
    T('f1', 'luck', -1, 0, 'root', 'Beginner\'s Luck', 1, 'Luck +15%.', { luck: 0.15 }),
    T('f2', 'luck', -2, -1, 'f1', 'Gold Rush', 2, 'Golden Sneakers appear 20% more often.', { gold: 1.2 }),
    T('f3', 'luck', -2, 1, 'f1', 'Box Hunter', 3, 'Shoebox drop chance x2.', { box: 2 }),
    T('f4', 'luck', -3, 0, 'f1', 'Lucky Spin', 6, 'Wheel of Laces recharges 30% faster.', { wheel: 0.7 }),
    T('f5', 'luck', -4, -1, 'f4', 'Shiny Hunter', 12, 'Shiny sneakers are 2x as common.', { shiny: 2 }),
    T('f6', 'luck', -4, 1, 'f4', 'Lingering Glow', 25, 'Golden Sneaker effects last 30% longer.', { goldDur: 1.3 }),
    T('f7', 'luck', -5, 0, 'f4', 'Pity Timer', 50, 'Guaranteed Epic every 21 boxes (was 30), Legendary every 70 (was 100).', { pity: 0.7 }),
    T('f8', 'luck', -6, -1, 'f7', 'Shard Alchemy', 100, 'Duplicate sneakers give x2 Lace Shards.', { shards: 2 }),
    T('f9', 'luck', -6, 1, 'f7', 'Midas Touch', 200, 'Golden Sneakers appear 30% more often.', { gold: 1.3 }),
    T('f10', 'luck', -7, 0, 'f7', 'Four-Leaf Laces', 500, 'Luck +50%. Mythic chance x2.', { luck: 0.5, mythic: 2 }),
    T('f12', 'luck', -3, 2, 'f3', 'Souvenir Hunter', 6, 'Rewards for reaching a stop x2.', { arrive: 2 }),
    T('f11', 'luck', -8, 0, 'f10', 'Fortune Favors', 1500, 'Luck +5% and collection bonus x1.05 per level.', { luck: 0.05, collect: 1.05 }, 50),
  ];

  /* ---------------- Golden Lace locker ---------------- */
  D.LOCKER = [
    { id: 'slot4',  name: 'Fourth Sneaker Slot',  cost: [5],   desc: 'Equip 4 sneakers at once.' },
    { id: 'slot5',  name: 'Fifth Sneaker Slot',   cost: [25],  desc: 'Equip 5 sneakers at once.', req: 'slot4' },
    { id: 'autobox', name: 'Auto-Opener',         cost: [3],   desc: 'Shoeboxes can open themselves (toggle in the Closet).' },
    { id: 'autobuy', name: 'Building Manager',    cost: [10],  desc: 'Automatically buys the best-value building (toggle in Shop).' },
    { id: 'autoup', name: 'Upgrade Intern',       cost: [8],   desc: 'Automatically buys affordable upgrades (toggle in Shop).' },
    { id: 'wheelcap', name: 'Wheel Battery',      cost: [4],   desc: 'The Wheel stores 3 more charges.' },
    { id: 'magnet', name: 'Golden Magnet',        cost: [6],   desc: 'Golden Sneakers stay on screen twice as long.' },
    { id: 'radar',  name: 'Boss Radar',           cost: [6],   desc: 'Bosses show up 30% sooner.' },
    { id: 'stitch', name: 'Golden Stitch',        cost: [2, 1.5], desc: 'Production x1.1 per level. Repeatable.', max: 99 },
  ];

  /* ---------------- Challenges ("Special Episodes") ---------------- */
  D.CHALLENGES = [
    { id: 'silent', name: 'Silent Film',      goal: 1e10, desc: 'Singing earns nothing. Only buildings produce.', reward: 'Auto-Singer catches 50% more missed words, forever.', fx: { auto: 2 } },
    { id: 'invasion', name: 'Tux Invasion',   goal: 1e10, desc: 'Chasers show up 4x as often and are twice as persistent.', reward: 'Stride x3, forever.', fx: { kickMult: 3 } },
    { id: 'budget', name: 'Budget Episode',   goal: 1e10, desc: 'Buildings get 30% more expensive each (instead of 15%).', reward: 'Buildings cost 10% less, forever.', fx: { cost: 0.9 } },
    { id: 'monotone', name: 'Monotone',       goal: 1e11, desc: 'No verse bonus, no combo, no crits.', reward: 'Verse bonus x5, forever.', fx: { verse: 5 } },
    { id: 'jinx', name: 'Jinxed',             goal: 1e11, desc: 'Luck is zero, and no Golden Sneakers appear.', reward: 'Luck +30%, forever.', fx: { luck: 0.3 } },
    { id: 'minimal', name: 'Minimalist',      goal: 1e11, desc: 'You can own at most 10 of each building.', reward: 'All buildings x2, forever.', fx: { prod: 2 } },
    { id: 'speed', name: 'Speedrun',          goal: 1e12, desc: 'Reach the goal within 12 minutes.', reward: 'Production x3, forever.', fx: { prod: 3 }, timer: 720 },
  ];

  /* ---------------- Scenes & the Long Walk ----------------
     O'Toole walks up the street forever. Every x10 Steps this run he reaches the next stop on the
     route: new scenery, a reward, and a permanent (for this run) production bonus. */
  D.SCENES = ['Quahog', 'Texas Highway', 'Moon Base', 'Under the Sea', 'Broadway', 'Snowy Peaks', 'Neon City', 'The Sneaker Mall'];
  D.STOPS = [
    { name: 'Spooner Street',      scene: 0, blurb: 'Home sweet home. The walk begins.' },
    { name: 'The Drunken Clam',    scene: 0, blurb: 'The regulars raise a glass as he struts past.' },
    { name: 'Route 66 Diner',      scene: 1, blurb: 'Out on the open highway. The waitress asks about the sneakers. He says no.' },
    { name: 'Tumbleweed Junction', scene: 1, blurb: 'Even the tumbleweeds are rolling alongside.' },
    { name: 'Base Camp',           scene: 5, blurb: 'Hikers in heavy boots stare in disbelief.' },
    { name: 'The Summit',          scene: 5, blurb: 'Top of the mountain. Still in sneakers. Still singing.' },
    { name: 'Times Square',        scene: 4, blurb: 'The billboards are all him now.' },
    { name: 'Opening Night',       scene: 4, blurb: 'A Broadway musical about the sneakers. Standing ovation.' },
    { name: 'Arcade Alley',        scene: 6, blurb: 'High score on every machine, set without taking them off.' },
    { name: 'Midnight Boulevard',  scene: 6, blurb: 'The whole city glows the color of his laces.' },
    { name: 'The Food Court',      scene: 7, blurb: 'The Sneaker Mall. Forty-one floors of one thing.' },
    { name: 'Floor 41',            scene: 7, blurb: 'The top floor sells one pair: the ones he is wearing. Not for sale.' },
    { name: 'Coral Crossing',      scene: 3, blurb: 'He walked straight into the sea. The fish have questions.' },
    { name: 'The Trench',          scene: 3, blurb: 'Seven miles down. The sneakers are somehow still dry.' },
    { name: 'Tranquility Base',    scene: 2, blurb: 'One small step for a man. One giant hop in sneakers.' },
    { name: 'The Dark Side',       scene: 2, blurb: 'The far side of the moon. The tuxedo men followed him here.' },
  ];
  D.STOP_BASE = 1e3;      // Steps this run to reach stop 1; every next stop is x10 further
  D.STOP_BONUS = 1.1;     // production multiplier per stop reached this run

  /* ---------------- Hype and moves ----------------
     Singing on the beat pumps up the Hype meter. Spend it on moves that power up everything else. */
  D.HYPE_MAX = 100;
  D.MOVES = [
    { id: 'strut',  name: 'Strut',       cost: 30,  cd: 0,  color: '#ffd23f', icon: 'shades', desc: 'Production x2 for 15 seconds.' },
    { id: 'show',   name: 'Showstopper', cost: 60,  cd: 30, color: '#ff4d6d', icon: 'mic', desc: 'Instantly earn 15 seconds of production. Chasers fall way behind. Recharges in 30s.' },
    { id: 'sprint', name: 'Sprint',      cost: 100, cd: 60, color: '#4cc9f0', icon: 'dash', desc: 'Every chaser gives up on the spot, bosses get half dizzy, and you grab a Shoebox. Recharges in 60s.' },
  ];

  /* ---------------- News ticker ---------------- */
  D.NEWS = [
    [0, 'Local man refuses to remove sneakers. Neighbors "not surprised."'],
    [0, 'Two men in tuxedos seen lurking near sidewalk. Police: "It\'s a free country."'],
    [0, 'Shoe store reports one customer, who did not try anything on.'],
    [0, 'Quahog weather: sunny, with a 100% chance of hopping.'],
    [1e3, 'Kids across town refusing to take off their sneakers. Parents blame "that song."'],
    [1e3, 'Tuxedo rental shop reports record demand. Owner: "Don\'t ask what for."'],
    [1e4, 'Street choir performs sneaker anthem for the 400th time. Crowd still clapping.'],
    [1e5, 'Cobblers\' union declares O\'Toole "Customer of the Century."'],
    [1e6, 'Sneaker factory smoke now smells faintly of new rubber. Residents approve.'],
    [1e7, 'Song remix hits 10 million views. The comments are all just "NO!"'],
    [1e8, 'Scientists confirm the sneakers have not been removed in recorded history.'],
    [1e9, 'Cutaway studio produces its 50,000th cutaway. Nobody remembers the plot.'],
    [1e10, 'Megamall adds 41st floor. It also sells sneakers.'],
    [1e11, 'Rotoscope lab accidentally turns a pigeon into O\'Toole. Pigeon still hopping.'],
    [1e12, 'Monks at the Temple of Laces achieve enlightenment. Laces remain tied.'],
    [1e13, 'Satellite broadcast of "the song" reaches Mars. Rover begins hopping.'],
    [1e14, 'Multiverse survey: 0 of infinity O\'Tooles have taken their sneakers off.'],
    [1e15, 'The song has no final bar, and experts say that is fine.'],
    [1e17, 'The universe is now officially wearing sneakers. Tuxedo men file an appeal.'],
    [0, 'Etiquette experts insist sneakers are "not black tie." Nobody listens.'],
    [0, 'Local dog seen barking at a tuxedo. Then at a second tuxedo. Then at a third.'],
    [0, 'Study finds hopping is 40% more fun in sneakers than in dress shoes.'],
    [0, 'Man in bow tie reportedly still chasing a pair of sneakers "for years now."'],
    [0, 'Poll: 9 out of 10 people would also not take them off.'],
    [0, 'Gym teacher proposes "sneakers-on" policy for all of life. Motion passes.'],
    [0, 'Tip: every 10x more Steps this run, O\'Toole reaches a new stop and production goes up for the rest of the run.'],
    [0, 'Tip: singing builds Hype. Strut doubles production, so keep it running while you sing.'],
    [0, 'Tip: Sprint makes every chaser give up at once, and they still drop their loot.'],
    [0, 'Tip: hover (or long-press) almost anything to see what it does.'],
    [1e3, 'Regulars at the Drunken Clam report "a man in sneakers, singing, walking, not stopping."'],
    [1e5, 'Truckers on Route 66 slow down to hear the song. Traffic backed up for miles.'],
    [1e7, 'Mountain rescue team finds hiker in sneakers at the summit. He declined rescue. And to remove his sneakers.'],
    [1e9, 'Broadway critics: "The sneakers steal the show. The man inside them also refuses to leave."'],
    [1e11, 'Sneaker Mall security confirms: the man on Floor 41 is not a mannequin.'],
    [1e13, 'Marine biologists baffled by dry sneakers seven miles under the sea.'],
    [1e15, 'NASA confirms first footprints on the Dark Side of the Moon are sneaker-shaped.'],
    [0, 'Tip: press each word\'s key as it lands on its keycap. Hit all eleven for a Perfect Verse.'],
    [0, 'Tip: keep singing and the next song starts by itself.'],
    [0, 'Tip: if hits feel early or late, adjust the timing offset in Settings.'],
    [0, 'Tip: the Golden Sneaker only flies by for a few seconds. Keep your eyes open.'],
    [0, 'Tip: run circles around a boss until he is too dizzy to stand, before his timer runs out.'],
    [0, 'Tip: tuxedo men chase you from behind. Keep singing to stay ahead.'],
  ];

  if (typeof module !== 'undefined') module.exports = D; else root.DATA = D;
})(typeof window !== 'undefined' ? window : globalThis);
