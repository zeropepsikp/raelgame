'use strict';
/* ============================================================
   프린세스 스토리 - 메이플스토리풍 횡스크롤 액션 RPG
   모바일 가로화면 최적화 / HTML5 Canvas
   ============================================================ */

// ---------- 캔버스 ----------
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const VW = 960, VH = 540;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  cvs.style.width = (VW * s) + 'px';
  cvs.style.height = (VH * s) + 'px';
  cvs.width = VW * dpr;
  cvs.height = VH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// roundRect 폴리필 (구형 WebView 대응)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    else if (Array.isArray(r)) { while (r.length < 4) r.push(r[r.length - 1] || 0); }
    else r = [0, 0, 0, 0];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y); this.arcTo(x + w, y, x + w, y + r[1], r[1]);
    this.lineTo(x + w, y + h - r[2]); this.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
    this.lineTo(x + r[3], y + h); this.arcTo(x, y + h, x, y + h - r[3], r[3]);
    this.lineTo(x, y + r[0]); this.arcTo(x, y, x + r[0], y, r[0]);
    return this;
  };
}

// ---------- 상수 ----------
const GRAV = 1600, MOVE = 260, JUMP_V = -640, GROUND = 470;

// 캐릭터 외형 (추후 커스터마이징용 - 이 값만 바꾸면 외형이 바뀜)
const CHAR_STYLE = {
  skin: '#ffdfc7', skinShade: '#f3c9a8',
  hair: '#ffd76e', hairShade: '#eab63f',
  dress: '#ff7fb2', dressDark: '#e0518e', dressTrim: '#fff0f6',
  crown: '#ffd339', gem: '#ff5c8a',
  eye: '#4a3020', shoe: '#c94f7c', sword: '#dbe4f0', swordEdge: '#aab8cc', hilt: '#e8b64c'
};

// ---------- 유틸 ----------
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 사운드 (WebAudio 간단 효과음) ----------
let AC = null;
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(freq, dur, type, vol, slide) {
  if (!AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), AC.currentTime + dur);
    g.gain.value = vol || 0.08;
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (e) {}
}
const SFX = {
  swing: () => tone(300, 0.08, 'sawtooth', 0.05, -150),
  hit: () => tone(160, 0.1, 'square', 0.07, -60),
  hurt: () => tone(110, 0.25, 'sawtooth', 0.09, -60),
  jump: () => tone(240, 0.12, 'sine', 0.07, 180),
  coin: () => { tone(880, 0.06, 'sine', 0.06); setTimeout(() => tone(1320, 0.1, 'sine', 0.06), 60); },
  skill1: () => tone(520, 0.15, 'triangle', 0.08, 300),
  skill2: () => { tone(90, 0.4, 'sawtooth', 0.1, -40); tone(600, 0.3, 'triangle', 0.06, -400); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.08), i * 100)); },
  portal: () => tone(400, 0.3, 'sine', 0.07, 500),
  die: () => { [400, 300, 200, 120].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.07), i * 130)); },
  bossdie: () => { [200, 300, 400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'square', 0.07), i * 110)); }
};

// ---------- 몬스터 정의 ----------
const MOBS = {
  snail:  { name: '초록달팽이', hp: 25,  atk: 6,  exp: 8,   meso: [2, 6],   speed: 14, w: 46, h: 32 },
  slime:  { name: '슬라임',     hp: 40,  atk: 9,  exp: 13,  meso: [3, 8],   speed: 26, w: 44, h: 34, hop: true },
  mush:   { name: '주황버섯',   hp: 70,  atk: 13, exp: 22,  meso: [5, 12],  speed: 38, w: 46, h: 46 },
  pig:    { name: '리본돼지',   hp: 110, atk: 17, exp: 32,  meso: [8, 16],  speed: 56, w: 58, h: 42 },
  skel:   { name: '스켈레톤',   hp: 170, atk: 24, exp: 50,  meso: [12, 25], speed: 48, w: 44, h: 60 },
  golem:  { name: '다크골렘',   hp: 300, atk: 32, exp: 90,  meso: [20, 40], speed: 26, w: 66, h: 74 },
  zakum:  { name: '자쿰',       hp: 3500, atk: 42, exp: 1800, meso: [300, 600], speed: 0,  w: 190, h: 240, boss: true },
  balrog: { name: '발록',       hp: 5000, atk: 55, exp: 3000, meso: [500, 900], speed: 60, w: 150, h: 120, boss: true, fly: true }
};

// ---------- NPC 정의 ----------
const NPCS = {
  rosa: {
    name: '상인 로사', kind: 'merchant',
    lines: ['어서 오세요, 공주님! 프린세스 마을의 만물상 로사예요.', '사냥하다 지치면 언제든 들러주세요. 메소만 있다면 체력과 마나를 회복해 드릴게요!'],
    shop: true
  },
  ariel: {
    name: '요정 아리엘', kind: 'fairy',
    lines: ['안녕! 나는 수호요정 아리엘이야.', '왼쪽 버튼으로 이동하고, 오른쪽 버튼으로 점프와 공격을 할 수 있어.', '"애로우"는 마법 화살을 쏘고, "블래스트"는 주변의 적을 한 번에 쓸어버리는 필살기야! 마나(파란 게이지)를 소모하니 조심해.', '오른쪽 포탈을 지나면 사냥터가 나와. 몬스터를 잡아 레벨을 올려봐!'],
  },
  gaon: {
    name: '기사단장 가온', kind: 'knight',
    lines: ['멈추십시오, 공주님! 이 동굴 깊은 곳에는 무시무시한 보스들이 잠들어 있습니다.', '오른쪽 끝 포탈은 화염의 마신 "자쿰"의 제단으로, 위쪽 포탈은 어둠의 마수 "발록"의 둥지로 이어집니다.', '충분히 강해진 뒤에 도전하시길... 무운을 빕니다!'],
  }
};

// ---------- 맵 정의 ----------
function g(w) { return { x: 0, y: GROUND, w: w, ground: true }; }
const MAPS = [
  { // 0
    name: '프린세스 마을', theme: 'town', w: 2000,
    platforms: [g(2000), { x: 520, y: 360, w: 180 }, { x: 1250, y: 360, w: 180 }],
    portals: [{ x: 1930, to: 1, tx: 140, label: '초원 언덕' }],
    npcs: [{ id: 'rosa', x: 660 }, { id: 'ariel', x: 1000 }],
    spawns: []
  },
  { // 1
    name: '초원 언덕', theme: 'meadow', w: 2800,
    platforms: [g(2800), { x: 600, y: 370, w: 210 }, { x: 1300, y: 370, w: 230 }, { x: 1680, y: 280, w: 170 }, { x: 2150, y: 370, w: 210 }],
    portals: [{ x: 70, to: 0, tx: 1860, label: '프린세스 마을' }, { x: 2730, to: 2, tx: 150, label: '버섯 숲' }],
    npcs: [],
    spawns: [{ t: 'snail', x: 420 }, { t: 'snail', x: 760 }, { t: 'snail', x: 1520 }, { t: 'snail', x: 2480 },
             { t: 'slime', x: 1020 }, { t: 'slime', x: 1900 }, { t: 'slime', x: 2280 }]
  },
  { // 2
    name: '버섯 숲', theme: 'forest', w: 2800,
    platforms: [g(2800), { x: 500, y: 360, w: 220 }, { x: 1150, y: 350, w: 240 }, { x: 1850, y: 360, w: 220 }, { x: 2180, y: 270, w: 180 }],
    portals: [{ x: 70, to: 1, tx: 2650, label: '초원 언덕' }, { x: 2730, to: 3, tx: 150, label: '어둠의 동굴' }],
    npcs: [],
    spawns: [{ t: 'mush', x: 400 }, { t: 'mush', x: 900 }, { t: 'mush', x: 1600 }, { t: 'mush', x: 2500 },
             { t: 'pig', x: 1250 }, { t: 'pig', x: 2000 }, { t: 'pig', x: 2250 }]
  },
  { // 3
    name: '어둠의 동굴', theme: 'cave', w: 2800,
    platforms: [g(2800), { x: 620, y: 370, w: 200 }, { x: 1350, y: 360, w: 230 }, { x: 1750, y: 290, w: 190 }, { x: 2080, y: 200, w: 180 }],
    portals: [{ x: 70, to: 2, tx: 2650, label: '버섯 숲' },
              { x: 2730, to: 4, tx: 130, label: '자쿰의 제단' },
              { x: 2160, y: 200, to: 5, tx: 130, label: '발록의 둥지' }],
    npcs: [{ id: 'gaon', x: 300 }],
    spawns: [{ t: 'skel', x: 550 }, { t: 'skel', x: 1000 }, { t: 'skel', x: 1700 }, { t: 'skel', x: 2200 },
             { t: 'golem', x: 1300 }, { t: 'golem', x: 2500 }]
  },
  { // 4
    name: '자쿰의 제단', theme: 'altar', w: 1700,
    platforms: [g(1700), { x: 250, y: 370, w: 170 }, { x: 1280, y: 370, w: 170 }],
    portals: [{ x: 70, to: 3, tx: 2650, label: '어둠의 동굴' }],
    npcs: [],
    spawns: [{ t: 'zakum', x: 1000 }]
  },
  { // 5
    name: '발록의 둥지', theme: 'lair', w: 1900,
    platforms: [g(1900), { x: 400, y: 360, w: 180 }, { x: 1350, y: 360, w: 180 }],
    portals: [{ x: 70, to: 3, tx: 2360, label: '어둠의 동굴' }],
    npcs: [],
    spawns: [{ t: 'balrog', x: 1200 }]
  }
];

// ---------- 게임 상태 ----------
const player = {
  x: 300, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true,
  level: 1, exp: 0, mesos: 0, hp: 100, mp: 50,
  invul: 0, atkT: 0, atkKind: '', pending: null, dead: false, deadT: 0, walking: false
};
const maxHp = () => 100 + (player.level - 1) * 28;
const maxMp = () => 50 + (player.level - 1) * 12;
const atkPow = () => 14 + (player.level - 1) * 4;
const needExp = () => Math.floor(50 * Math.pow(1.35, player.level - 1));

const cd = { atk: 0, s1: 0, s2: 0 };
const CD_MAX = { atk: 0.35, s1: 1.2, s2: 8 };
const SKILL_MP = { s1: 8, s2: 25 };

let curMap = 0;
let mobs = [], projs = [], drops = [], effects = [], dmgNums = [], messages = [];
let camX = 0, shake = 0, gameTime = 0;
let fade = null; // {t, dir(1 out /-1 in), cb}
let mapNameT = 0;
let dialog = null; // {npc, i}

// ---------- 저장 ----------
function save() {
  try {
    localStorage.setItem('princess_save', JSON.stringify({
      level: player.level, exp: player.exp, mesos: player.mesos
    }));
  } catch (e) {}
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('princess_save'));
    if (d) {
      player.level = d.level || 1; player.exp = d.exp || 0; player.mesos = d.mesos || 0;
      player.hp = maxHp(); player.mp = maxMp();
    }
  } catch (e) {}
}
load();
player.hp = maxHp(); player.mp = maxMp();

// ---------- 맵 이동 ----------
function spawnMobs() {
  mobs = MAPS[curMap].spawns.map(s => {
    const d = MOBS[s.t];
    return {
      type: s.t, def: d, x: s.x, y: GROUND, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1,
      hp: d.hp, homeX: s.x, patrol: d.boss ? 400 : 160, hitT: 0, dead: false, deadT: 0, respawn: 0,
      atkTimer: rand(1.5, 3), dashT: 0, hopT: rand(0.5, 1.5), phase: Math.random() * 10
    };
  });
}
function goMap(idx, tx) {
  fade = { t: 0, dir: 1, cb: () => {
    curMap = idx;
    player.x = tx; player.y = GROUND; player.vy = 0; player.vx = 0;
    projs = []; drops = []; effects = [];
    spawnMobs();
    mapNameT = 2.5;
    const boss = mobs.find(m => m.def.boss);
    if (boss) addMsg('⚠️ ' + boss.def.name + ' 이(가) 나타났다!', 3);
  }};
  SFX.portal();
}
spawnMobs();
mapNameT = 2.5;

// ---------- 메시지/이펙트 ----------
function addMsg(text, dur) { messages.push({ text, t: dur || 2 }); }
function addDmg(x, y, val, opts) {
  dmgNums.push({ x: x + rand(-8, 8), y, val: Math.round(val), t: 0, crit: opts && opts.crit, purple: opts && opts.purple, miss: opts && opts.miss });
}
function addFx(type, x, y, o) { effects.push(Object.assign({ type, x, y, t: 0, face: 1, r: 0 }, o)); }

// ---------- 전투 ----------
function playerDamageRoll(mult) {
  const crit = Math.random() < 0.15;
  return { dmg: atkPow() * mult * rand(0.85, 1.15) * (crit ? 1.6 : 1), crit };
}
function hurtMob(m, dmg, crit) {
  if (m.dead) return;
  m.hp -= dmg;
  m.hitT = 0.18;
  addDmg(m.x, m.y - m.def.h - 8, dmg, { crit });
  addFx('spark', m.x + rand(-10, 10), m.y - m.def.h / 2, {});
  SFX.hit();
  if (!m.def.boss) m.vx = (m.x < player.x ? -1 : 1) * 60;
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  m.dead = true; m.deadT = 0;
  m.respawn = m.def.boss ? 30 : 8;
  gainExp(m.def.exp);
  const amt = irand(m.def.meso[0], m.def.meso[1]);
  drops.push({ x: m.x, y: m.y - 20, vy: -220, vx: rand(-40, 40), type: 'meso', amt, t: 0 });
  if (Math.random() < 0.18) drops.push({ x: m.x + 14, y: m.y - 20, vy: -260, vx: rand(-40, 40), type: 'heart', amt: 0, t: 0 });
  if (m.def.boss) {
    addMsg('🎉 ' + m.def.name + ' 을(를) 물리쳤다!', 4);
    shake = Math.max(shake, 0.7);
    SFX.bossdie();
    for (let i = 0; i < 10; i++) addFx('boom', m.x + rand(-80, 80), m.y - rand(20, m.def.h), { delay: i * 0.08 });
  }
}
function gainExp(e) {
  player.exp += e;
  while (player.exp >= needExp()) {
    player.exp -= needExp();
    player.level++;
    player.hp = maxHp(); player.mp = maxMp();
    addMsg('✨ LEVEL UP! Lv.' + player.level, 3);
    addFx('levelup', 0, 0, {});
    SFX.levelup();
  }
  save();
}
function hurtPlayer(dmg, fromX) {
  if (player.invul > 0 || player.dead || dialog) return;
  const d = Math.round(dmg * rand(0.9, 1.1));
  player.hp -= d;
  player.invul = 1.2;
  player.vx = (player.x < fromX ? -1 : 1) * 220;
  player.vy = -260;
  player.onGround = false;
  addDmg(player.x, player.y - 70, d, { purple: true });
  SFX.hurt();
  shake = Math.max(shake, 0.25);
  if (player.hp <= 0) {
    player.hp = 0; player.dead = true; player.deadT = 0;
    addMsg('💀 쓰러졌다... 마을로 돌아갑니다', 3);
    SFX.die();
  }
}

// ---------- 플레이어 행동 ----------
function doJump() {
  if (player.dead || dialog) return;
  if (player.onGround) { player.vy = JUMP_V; player.onGround = false; SFX.jump(); }
}
function doAttack() {
  if (player.dead || dialog || cd.atk > 0 || player.atkT > 0) return;
  cd.atk = CD_MAX.atk;
  player.atkT = 0.3; player.atkKind = 'basic';
  player.pending = { t: 0.1, type: 'basic' };
  SFX.swing();
}
function doSkill1() {
  if (player.dead || dialog || cd.s1 > 0 || player.mp < SKILL_MP.s1) return;
  cd.s1 = CD_MAX.s1;
  player.mp -= SKILL_MP.s1;
  player.atkT = 0.28; player.atkKind = 's1';
  player.pending = { t: 0.12, type: 's1' };
  SFX.skill1();
}
function doSkill2() {
  if (player.dead || dialog || cd.s2 > 0 || player.mp < SKILL_MP.s2) return;
  cd.s2 = CD_MAX.s2;
  player.mp -= SKILL_MP.s2;
  player.atkT = 0.55; player.atkKind = 's2';
  player.pending = { t: 0.2, type: 's2' };
}
function firePending() {
  const type = player.pending.type;
  player.pending = null;
  if (type === 'basic') {
    addFx('slash', player.x + player.face * 44, player.y - 40, { face: player.face });
    for (const m of mobs) {
      if (m.dead) continue;
      const dx = (m.x - player.x) * player.face;
      if (dx > -m.def.w / 2 && dx < 85 + m.def.w / 2 && Math.abs(m.y - player.y) < m.def.h * 0.8 + 45) {
        const r = playerDamageRoll(1);
        hurtMob(m, r.dmg, r.crit);
      }
    }
  } else if (type === 's1') {
    projs.push({ from: 'p', x: player.x + player.face * 26, y: player.y - 42, vx: player.face * 620, vy: 0, life: 1.0, kind: 'arrow' });
  } else if (type === 's2') {
    SFX.skill2();
    shake = Math.max(shake, 0.45);
    addFx('blast', player.x, player.y, {});
    for (const m of mobs) {
      if (m.dead) continue;
      if (Math.abs(m.x - player.x) < 250 + m.def.w / 2 && Math.abs(m.y - player.y) < 180 + m.def.h) {
        const r = playerDamageRoll(3);
        hurtMob(m, r.dmg, r.crit);
      }
    }
  }
}

// ---------- 컨텍스트 (포탈/NPC) ----------
function nearPortal() {
  for (const pt of MAPS[curMap].portals) {
    const py = pt.y !== undefined ? pt.y : GROUND;
    if (Math.abs(player.x - pt.x) < 55 && Math.abs(player.y - py) < 60) return pt;
  }
  return null;
}
function nearNpc() {
  for (const n of MAPS[curMap].npcs) {
    if (Math.abs(player.x - n.x) < 70) return n;
  }
  return null;
}
function doContext() {
  if (player.dead) return;
  if (dialog) { advanceDialog(); return; }
  const n = nearNpc();
  if (n) { startDialog(n); return; }
  const pt = nearPortal();
  if (pt) goMap(pt.to, pt.tx);
}

// ---------- 대화 ----------
const dlgEl = document.getElementById('dialog');
const dlgName = document.getElementById('dlgName');
const dlgText = document.getElementById('dlgText');
const dlgBtns = document.getElementById('dlgBtns');
const dlgHint = document.getElementById('dlgHint');

function startDialog(mapNpc) {
  const def = NPCS[mapNpc.id];
  dialog = { id: mapNpc.id, def, i: 0 };
  player.vx = 0;
  showDialogLine();
  dlgEl.style.display = 'block';
}
function showDialogLine() {
  const d = dialog;
  dlgName.textContent = d.def.name;
  dlgText.textContent = d.def.lines[d.i];
  dlgBtns.innerHTML = '';
  const last = d.i >= d.def.lines.length - 1;
  dlgHint.style.display = (last && d.def.shop) ? 'none' : 'block';
  dlgHint.textContent = last ? '탭하여 닫기 ✕' : '탭하여 계속 ▼';
  if (last && d.def.shop) {
    const b1 = document.createElement('button');
    b1.textContent = '💖 HP/MP 회복 (50메소)';
    b1.onclick = (e) => {
      e.stopPropagation();
      if (player.mesos >= 50) {
        player.mesos -= 50;
        player.hp = maxHp(); player.mp = maxMp();
        addMsg('체력과 마나가 모두 회복되었다!', 2);
        SFX.coin(); save();
      } else {
        addMsg('메소가 부족하다... (50메소 필요)', 2);
      }
      closeDialog();
    };
    const b2 = document.createElement('button');
    b2.textContent = '닫기';
    b2.onclick = (e) => { e.stopPropagation(); closeDialog(); };
    dlgBtns.appendChild(b1); dlgBtns.appendChild(b2);
  }
}
function advanceDialog() {
  if (!dialog) return;
  const last = dialog.i >= dialog.def.lines.length - 1;
  if (last) {
    if (!dialog.def.shop) closeDialog();
    // shop 은 버튼으로만 닫힘
  } else {
    dialog.i++;
    showDialogLine();
  }
}
function closeDialog() { dialog = null; dlgEl.style.display = 'none'; }
dlgEl.addEventListener('pointerdown', (e) => { e.preventDefault(); advanceDialog(); });

// ---------- 입력 ----------
const input = { left: false, right: false };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  initAudio();
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': input.left = true; break;
    case 'ArrowRight': case 'KeyD': input.right = true; break;
    case 'Space': case 'AltLeft': case 'KeyW': doJump(); e.preventDefault(); break;
    case 'ControlLeft': case 'KeyZ': doAttack(); break;
    case 'KeyX': doSkill1(); break;
    case 'KeyC': doSkill2(); break;
    case 'ArrowUp': case 'Enter': doContext(); e.preventDefault(); break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': input.left = false; break;
    case 'ArrowRight': case 'KeyD': input.right = false; break;
  }
});

function bindHold(id, on, off) {
  const el = document.getElementById(id);
  const down = (e) => { e.preventDefault(); initAudio(); el.classList.add('pressed'); on(); };
  const up = (e) => { e.preventDefault(); el.classList.remove('pressed'); if (off) off(); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}
bindHold('btnL', () => input.left = true, () => input.left = false);
bindHold('btnR', () => input.right = true, () => input.right = false);
bindHold('btnJump', doJump);
bindHold('btnAtk', doAttack);
bindHold('btnS1', doSkill1);
bindHold('btnS2', doSkill2);
const btnCtx = document.getElementById('btnCtx');
btnCtx.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); doContext(); });

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// 첫 터치 시 전체화면 + 가로 고정 시도 (안드로이드)
let fsTried = false;
document.addEventListener('pointerdown', () => {
  initAudio();
  if (fsTried) return;
  fsTried = true;
  const el = document.documentElement;
  if (el.requestFullscreen) {
    el.requestFullscreen().then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  }
}, { once: false });

// ---------- 업데이트 ----------
function landOnPlatforms(ent, prevY) {
  if (ent.vy < 0) return false;
  for (const p of MAPS[curMap].platforms) {
    if (ent.x < p.x - 4 || ent.x > p.x + p.w + 4) continue;
    if (prevY <= p.y + 1 && ent.y >= p.y) {
      ent.y = p.y; ent.vy = 0;
      return true;
    }
  }
  return false;
}

function updatePlayer(dt) {
  if (player.dead) {
    player.deadT += dt;
    if (player.deadT > 2) {
      player.dead = false;
      player.hp = maxHp(); player.mp = maxMp();
      goMap(0, 300);
    }
    return;
  }
  // 이동
  const wantMove = !dialog && (input.left || input.right);
  if (!dialog) {
    if (input.left && !input.right) { player.vx = -MOVE; player.face = -1; }
    else if (input.right && !input.left) { player.vx = MOVE; player.face = 1; }
    else player.vx *= Math.pow(0.0001, dt); // 감속 (넉백 포함)
  } else player.vx = 0;
  player.walking = wantMove && player.onGround;

  const prevY = player.y;
  player.vy += GRAV * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = clamp(player.x, 24, MAPS[curMap].w - 24);
  player.onGround = landOnPlatforms(player, prevY);
  if (player.y > GROUND) { player.y = GROUND; player.vy = 0; player.onGround = true; }

  // 타이머
  if (player.atkT > 0) player.atkT -= dt;
  if (player.pending) {
    player.pending.t -= dt;
    if (player.pending.t <= 0) firePending();
  }
  if (player.invul > 0) player.invul -= dt;
  cd.atk = Math.max(0, cd.atk - dt);
  cd.s1 = Math.max(0, cd.s1 - dt);
  cd.s2 = Math.max(0, cd.s2 - dt);

  // 자연 회복
  player.hp = Math.min(maxHp(), player.hp + 1.5 * dt);
  player.mp = Math.min(maxMp(), player.mp + 2.5 * dt);

  // 몬스터 접촉 데미지
  for (const m of mobs) {
    if (m.dead) continue;
    if (Math.abs(player.x - m.x) < m.def.w / 2 + 14 && player.y > m.y - m.def.h - 40 && player.y < m.y + 20) {
      hurtPlayer(m.def.atk, m.x);
    }
  }
}

function updateMobs(dt) {
  for (const m of mobs) {
    m.phase += dt;
    if (m.dead) {
      m.deadT += dt;
      m.respawn -= dt;
      if (m.respawn <= 0) {
        m.dead = false; m.hp = m.def.hp; m.x = m.homeX; m.y = GROUND; m.vx = 0;
        if (m.def.boss) addMsg('⚠️ ' + m.def.name + ' 이(가) 다시 나타났다!', 3);
      }
      continue;
    }
    if (m.hitT > 0) m.hitT -= dt;

    if (m.def.fly) {
      // 발록: 부유하며 플레이어 추적
      m.y = GROUND - 50 + Math.sin(m.phase * 2) * 22;
      m.dashT -= dt;
      const dir = player.x > m.x ? 1 : -1;
      m.face = dir;
      const sp = m.dashT > 0 && m.dashT < 0.8 ? 320 : m.def.speed;
      m.x += dir * sp * dt;
      if (m.dashT <= -3) m.dashT = 1.2; // 다음 대시 예열
      m.x = clamp(m.x, 100, MAPS[curMap].w - 100);
      // 어둠 구체 발사
      m.atkTimer -= dt;
      if (m.atkTimer <= 0) {
        m.atkTimer = 2.2;
        const ang = Math.atan2((player.y - 40) - (m.y - 60), player.x - m.x);
        projs.push({ from: 'm', x: m.x, y: m.y - 60, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 3, kind: 'orb', dmg: m.def.atk });
      }
    } else if (m.def.boss) {
      // 자쿰: 고정, 화염구 발사
      m.atkTimer -= dt;
      if (m.atkTimer <= 0) {
        m.atkTimer = rand(2, 3);
        for (let i = 0; i < 2; i++) {
          const dir = player.x > m.x ? 1 : -1;
          projs.push({
            from: 'm', x: m.x + dir * 60, y: m.y - m.def.h + 60,
            vx: dir * rand(180, 300) * (i === 0 ? 1 : 0.7), vy: rand(-350, -200),
            grav: true, life: 4, kind: 'fire', dmg: m.def.atk
          });
        }
      }
    } else {
      // 일반 몹: 순찰
      if (m.hitT <= 0) {
        if (m.def.hop) {
          m.hopT -= dt;
          if (m.hopT <= 0 && m.y >= GROUND) { m.vy = -350; m.vx = m.face * m.def.speed * 3; m.hopT = rand(1, 2.2); }
        } else {
          m.vx = m.face * m.def.speed;
        }
      }
      m.vy += GRAV * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y >= GROUND) { m.y = GROUND; m.vy = 0; if (m.def.hop) m.vx = 0; }
      if (m.x < m.homeX - m.patrol) { m.x = m.homeX - m.patrol; m.face = 1; }
      if (m.x > m.homeX + m.patrol) { m.x = m.homeX + m.patrol; m.face = -1; }
      if (!m.def.hop && Math.random() < dt * 0.3) m.face *= -1;
    }
  }
}

function updateProjs(dt) {
  for (const p of projs) {
    if (p.grav) p.vy += 800 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.from === 'p') {
      for (const m of mobs) {
        if (m.dead) continue;
        if (Math.abs(p.x - m.x) < m.def.w / 2 + 10 && p.y > m.y - m.def.h - 15 && p.y < m.y + 15) {
          const r = playerDamageRoll(1.7);
          hurtMob(m, r.dmg, r.crit);
          addFx('spark', p.x, p.y, {});
          p.life = 0;
          break;
        }
      }
    } else {
      if (!player.dead && Math.abs(p.x - player.x) < 26 && Math.abs(p.y - (player.y - 35)) < 45) {
        hurtPlayer(p.dmg, p.x);
        p.life = 0;
      }
      if (p.y > GROUND + 5) p.life = 0;
    }
  }
  projs = projs.filter(p => p.life > 0);
}

function updateDrops(dt) {
  for (const d of drops) {
    d.t += dt;
    d.vy += 900 * dt;
    d.x += (d.vx || 0) * dt;
    d.y += d.vy * dt;
    if (d.y > GROUND) { d.y = GROUND; d.vy = 0; d.vx = 0; }
    if (!player.dead && d.t > 0.4 && Math.abs(d.x - player.x) < 42 && Math.abs(d.y - player.y) < 60) {
      if (d.type === 'meso') { player.mesos += d.amt; addDmg(d.x, d.y - 40, d.amt, {}); SFX.coin(); save(); }
      else { player.hp = Math.min(maxHp(), player.hp + 40); addFx('heal', player.x, player.y - 40, {}); SFX.coin(); }
      d.done = true;
    }
  }
  drops = drops.filter(d => !d.done && d.t < 15);
}

function update(dt) {
  gameTime += dt;
  updatePlayer(dt);
  updateMobs(dt);
  updateProjs(dt);
  updateDrops(dt);

  for (const f of effects) { if (f.delay > 0) f.delay -= dt; else f.t += dt; }
  effects = effects.filter(f => f.t < 0.6);
  for (const n of dmgNums) n.t += dt;
  dmgNums = dmgNums.filter(n => n.t < 0.9);
  for (const msg of messages) msg.t -= dt;
  messages = messages.filter(msg => msg.t > 0);
  if (mapNameT > 0) mapNameT -= dt;
  if (shake > 0) shake -= dt;

  if (fade) {
    if (fade.dir === 1) {
      fade.t += dt * 2.5;
      if (fade.t >= 1) { fade.cb(); fade = { t: 1, dir: -1 }; }
    } else {
      fade.t -= dt * 2.5;
      if (fade.t <= 0) fade = null;
    }
  }

  camX = clamp(player.x - VW / 2, 0, MAPS[curMap].w - VW);

  // 컨텍스트 버튼
  let ctxLabel = '';
  if (!dialog && !player.dead) {
    if (nearNpc()) ctxLabel = '💬 대화하기';
    else { const pt = nearPortal(); if (pt) ctxLabel = '🌀 ' + pt.label + ' 이동'; }
  }
  if (ctxLabel) { btnCtx.style.display = 'block'; btnCtx.textContent = ctxLabel; }
  else btnCtx.style.display = 'none';

  // 쿨다운 표시
  updateCdBtn('btnAtk', cd.atk, 0);
  updateCdBtn('btnS1', cd.s1, SKILL_MP.s1);
  updateCdBtn('btnS2', cd.s2, SKILL_MP.s2);
}
function updateCdBtn(id, t, mpCost) {
  const el = document.getElementById(id);
  const span = el.querySelector('.cd');
  const noMp = mpCost > 0 && player.mp < mpCost;
  if (t > 0.05) { span.textContent = t.toFixed(1); el.classList.add('disabled'); }
  else if (noMp) { span.textContent = 'MP부족'; el.classList.add('disabled'); }
  else { span.textContent = ''; el.classList.remove('disabled'); }
}

/* ============================================================
   렌더링
   ============================================================ */
function draw() {
  const map = MAPS[curMap];
  ctx.clearRect(0, 0, VW, VH);
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);

  drawBG(map.theme);

  ctx.save();
  ctx.translate(-camX, 0);

  drawPortals(map);
  drawPlatforms(map);
  for (const d of drops) drawDrop(d);
  for (const n of map.npcs) drawNpc(n);
  for (const m of mobs) if (!m.dead || m.deadT < 0.5) drawMob(m);
  if (!player.dead || Math.floor(player.deadT * 8) % 2 === 0) drawPrincess();
  for (const p of projs) drawProj(p);
  for (const f of effects) drawFx(f);
  for (const n of dmgNums) drawDmgNum(n);

  ctx.restore();
  drawUI(map);
  ctx.restore();

  if (fade) {
    ctx.fillStyle = 'rgba(0,0,0,' + clamp(fade.t, 0, 1) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
}

// ---------- 배경 ----------
function drawBG(theme) {
  const grd = ctx.createLinearGradient(0, 0, 0, VH);
  const px = camX * 0.35; // 패럴랙스
  if (theme === 'town' || theme === 'meadow') {
    grd.addColorStop(0, '#7ec8f2'); grd.addColorStop(0.7, '#bfe8fb'); grd.addColorStop(1, '#dff4ff');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // 구름
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 340 - px * 0.5) % (VW + 300) + VW + 300) % (VW + 300) - 150;
      const cy = 60 + (i % 3) * 45;
      cloud(cx, cy, 1 + (i % 2) * 0.4);
    }
    // 언덕
    ctx.fillStyle = theme === 'town' ? '#9ed98a' : '#8bcf74';
    for (let i = -1; i < 5; i++) {
      const hx = ((i * 420 - px) % (VW + 420) + VW + 420) % (VW + 420) - 210;
      ctx.beginPath(); ctx.ellipse(hx, 480, 260, 130, 0, Math.PI, 0); ctx.fill();
    }
    if (theme === 'town') {
      // 집들
      for (let i = 0; i < 4; i++) {
        const hx = ((i * 520 + 100 - px * 1.2) % (VW + 500) + VW + 500) % (VW + 500) - 250;
        house(hx, 470, i);
      }
    } else {
      // 나무
      for (let i = 0; i < 5; i++) {
        const tx = ((i * 380 + 60 - px * 1.2) % (VW + 400) + VW + 400) % (VW + 400) - 200;
        tree(tx, 470, 1 + (i % 3) * 0.25);
      }
    }
  } else if (theme === 'forest') {
    grd.addColorStop(0, '#3f7a4f'); grd.addColorStop(1, '#8fce8a');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(30,70,40,.55)';
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 300 - px) % (VW + 320) + VW + 320) % (VW + 320) - 160;
      tree(tx, 480, 1.6, true);
    }
    // 거대 버섯
    for (let i = 0; i < 4; i++) {
      const mx = ((i * 460 + 200 - px * 1.3) % (VW + 460) + VW + 460) % (VW + 460) - 230;
      bigMush(mx, 470, i);
    }
  } else if (theme === 'cave') {
    grd.addColorStop(0, '#191926'); grd.addColorStop(1, '#33334d');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // 종유석
    ctx.fillStyle = '#232338';
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 240 - px) % (VW + 240) + VW + 240) % (VW + 240) - 120;
      ctx.beginPath(); ctx.moveTo(sx - 40, 0); ctx.lineTo(sx, 90 + (i % 3) * 40); ctx.lineTo(sx + 40, 0); ctx.fill();
    }
    // 수정
    for (let i = 0; i < 5; i++) {
      const cx2 = ((i * 400 + 150 - px * 1.2) % (VW + 400) + VW + 400) % (VW + 400) - 200;
      crystal(cx2, 470, i);
    }
  } else if (theme === 'altar') {
    grd.addColorStop(0, '#2a0e0e'); grd.addColorStop(1, '#5c1f10');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // 용암 빛
    ctx.fillStyle = 'rgba(255,110,30,' + (0.16 + Math.sin(gameTime * 2) * 0.06) + ')';
    ctx.fillRect(0, VH - 130, VW, 130);
    // 기둥
    ctx.fillStyle = '#3a1410';
    for (let i = 0; i < 5; i++) {
      const kx = ((i * 340 - px) % (VW + 340) + VW + 340) % (VW + 340) - 170;
      ctx.fillRect(kx - 22, 90, 44, 380);
      ctx.fillRect(kx - 34, 70, 68, 26);
    }
  } else { // lair
    grd.addColorStop(0, '#12081f'); grd.addColorStop(1, '#3a1b52');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(160,80,255,' + (0.1 + Math.sin(gameTime * 1.5) * 0.05) + ')';
    ctx.fillRect(0, VH - 150, VW, 150);
    ctx.fillStyle = '#241238';
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 250 - px) % (VW + 240) + VW + 240) % (VW + 240) - 120;
      ctx.beginPath(); ctx.moveTo(sx - 46, 0); ctx.lineTo(sx, 110 + (i % 3) * 50); ctx.lineTo(sx + 46, 0); ctx.fill();
    }
  }
}
function cloud(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, 7); ctx.arc(x + 24 * s, y - 8 * s, 18 * s, 0, 7); ctx.arc(x + 46 * s, y, 20 * s, 0, 7);
  ctx.fill();
}
function tree(x, y, s, dark) {
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(40,25,15,.8)' : '#8a5a2b';
  ctx.fillRect(x - 9 * s, y - 90 * s, 18 * s, 90 * s);
  ctx.fillStyle = dark ? 'rgba(25,60,35,.9)' : '#4e9e3d';
  ctx.beginPath(); ctx.arc(x, y - 110 * s, 46 * s, 0, 7); ctx.arc(x - 32 * s, y - 85 * s, 32 * s, 0, 7); ctx.arc(x + 32 * s, y - 85 * s, 32 * s, 0, 7); ctx.fill();
  ctx.restore();
}
function house(x, y, i) {
  const cols = ['#f4a259', '#e76f51', '#8ecae6', '#cdb4db'];
  ctx.fillStyle = '#fff3dd'; ctx.fillRect(x - 55, y - 90, 110, 90);
  ctx.fillStyle = cols[i % 4];
  ctx.beginPath(); ctx.moveTo(x - 70, y - 90); ctx.lineTo(x, y - 150); ctx.lineTo(x + 70, y - 90); ctx.fill();
  ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 15, y - 48, 30, 48);
  ctx.fillStyle = '#bde0fe'; ctx.fillRect(x - 45, y - 75, 24, 24); ctx.fillRect(x + 21, y - 75, 24, 24);
}
function bigMush(x, y, i) {
  const caps = ['#e63946', '#f4a261', '#e9c46a', '#e76f51'];
  ctx.fillStyle = '#f1e4c8'; ctx.fillRect(x - 16, y - 110, 32, 110);
  ctx.fillStyle = caps[i % 4];
  ctx.beginPath(); ctx.ellipse(x, y - 108, 75, 42, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.arc(x - 28, y - 122, 9, 0, 7); ctx.arc(x + 20, y - 130, 7, 0, 7); ctx.fill();
}
function crystal(x, y, i) {
  const c = ['#7de3ff', '#c07dff', '#7dffc8'][i % 3];
  ctx.save();
  ctx.fillStyle = c; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y - 90 - (i % 2) * 30); ctx.lineTo(x + 22, y); ctx.lineTo(x - 22, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 26, y - 50); ctx.lineTo(x + 42, y); ctx.lineTo(x + 10, y); ctx.fill();
  ctx.restore();
}

// ---------- 지형 ----------
function drawPlatforms(map) {
  const th = map.theme;
  let top = '#7ac74f', soil = '#8a5a34', edge = '#5da03b';
  if (th === 'forest') { top = '#5aa843'; soil = '#6b4326'; edge = '#3f7d2c'; }
  if (th === 'cave') { top = '#5c5c7a'; soil = '#2e2e44'; edge = '#44445e'; }
  if (th === 'altar') { top = '#8a4a2a'; soil = '#3a1410'; edge = '#6b3018'; }
  if (th === 'lair') { top = '#6a4a8a'; soil = '#241238'; edge = '#4a3060'; }
  for (const p of map.platforms) {
    if (p.ground) {
      ctx.fillStyle = soil; ctx.fillRect(p.x, p.y, p.w, VH - p.y);
      ctx.fillStyle = top; ctx.fillRect(p.x, p.y, p.w, 16);
      ctx.fillStyle = edge; ctx.fillRect(p.x, p.y + 16, p.w, 5);
    } else {
      ctx.fillStyle = soil; ctx.fillRect(p.x, p.y, p.w, 14);
      ctx.fillStyle = top; ctx.fillRect(p.x - 4, p.y, p.w + 8, 8);
    }
  }
}
function drawPortals(map) {
  for (const pt of map.portals) {
    const py = (pt.y !== undefined ? pt.y : GROUND);
    const t = gameTime * 3;
    ctx.save();
    ctx.translate(pt.x, py - 46);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(90,160,255,' + (0.5 - i * 0.13) + ')';
      ctx.lineWidth = 5 - i;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26 + i * 7 + Math.sin(t + i) * 3, 44 + i * 8 + Math.cos(t + i) * 3, 0, 0, 7);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(140,200,255,.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 42, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#dff0ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pt.label, 0, -62);
    ctx.restore();
  }
}

// ---------- 공주 캐릭터 ----------
function drawPrincess() {
  const S = CHAR_STYLE;
  const p = player;
  const t = gameTime;
  const walkP = p.walking ? Math.sin(t * 12) : 0;
  const bob = p.walking ? Math.abs(Math.sin(t * 12)) * 3 : Math.sin(t * 2) * 1.5;
  const inAir = !p.onGround;

  ctx.save();
  ctx.translate(p.x, p.y);
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, 7); ctx.fill();
  ctx.scale(p.face, 1);
  if (p.invul > 0 && Math.floor(p.invul * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(0, -bob);

  // 뒷머리 (긴 머리)
  ctx.fillStyle = S.hair;
  ctx.beginPath();
  ctx.moveTo(-4, -58);
  ctx.quadraticCurveTo(-22, -50, -18 - walkP * 2, -18);
  ctx.quadraticCurveTo(-14, -12, -8, -16);
  ctx.quadraticCurveTo(-14, -34, -8, -50);
  ctx.fill();

  // 다리
  const legA = inAir ? 6 : walkP * 7;
  ctx.fillStyle = S.skin;
  ctx.fillRect(-7 + legA * 0.5, -12, 6, 12);
  ctx.fillRect(2 - legA * 0.5, -12, 6, 12);
  ctx.fillStyle = S.shoe;
  ctx.fillRect(-8 + legA * 0.5, -4, 9, 4);
  ctx.fillRect(1 - legA * 0.5, -4, 9, 4);

  // 치마 (드레스)
  ctx.fillStyle = S.dress;
  ctx.beginPath();
  ctx.moveTo(-11, -34);
  ctx.quadraticCurveTo(-17 - walkP * 2, -18, -16, -8);
  ctx.quadraticCurveTo(0, -3, 16, -8);
  ctx.quadraticCurveTo(17 + walkP * 2, -18, 11, -34);
  ctx.fill();
  ctx.fillStyle = S.dressDark;
  ctx.beginPath();
  ctx.moveTo(-16, -9); ctx.quadraticCurveTo(0, -4, 16, -9);
  ctx.lineTo(16, -6); ctx.quadraticCurveTo(0, -1, -16, -6); ctx.fill();

  // 몸통
  ctx.fillStyle = S.dress;
  ctx.fillRect(-8, -42, 16, 10);
  ctx.fillStyle = S.dressTrim;
  ctx.fillRect(-8, -35, 16, 2);

  // 뒷팔
  ctx.fillStyle = S.skinShade;
  ctx.save();
  ctx.translate(-5, -40);
  ctx.rotate(0.5 + walkP * 0.25);
  ctx.fillRect(-2, 0, 5, 14);
  ctx.restore();

  // 검 + 앞팔
  const atk = p.atkT > 0;
  let armAng = 0.45 - walkP * 0.25;
  if (atk) {
    const prog = 1 - p.atkT / (p.atkKind === 's2' ? 0.55 : 0.3);
    if (p.atkKind === 's2') armAng = -1.9 + prog * 0.4;
    else armAng = -1.5 + prog * 2.4;
  }
  ctx.save();
  ctx.translate(5, -40);
  ctx.rotate(armAng);
  ctx.fillStyle = S.skin;
  ctx.fillRect(-2.5, 0, 5, 14);
  // 검
  ctx.translate(0, 14);
  ctx.fillStyle = S.hilt; ctx.fillRect(-5, -2, 10, 4);
  ctx.fillStyle = S.sword;
  ctx.beginPath();
  ctx.moveTo(-2.5, 2); ctx.lineTo(2.5, 2); ctx.lineTo(2.5, 30); ctx.lineTo(0, 36); ctx.lineTo(-2.5, 30);
  ctx.fill();
  ctx.fillStyle = S.swordEdge; ctx.fillRect(-0.5, 2, 1, 30);
  ctx.restore();

  // 머리
  ctx.fillStyle = S.skin;
  ctx.beginPath(); ctx.arc(1, -52, 11.5, 0, 7); ctx.fill();
  // 앞머리
  ctx.fillStyle = S.hair;
  ctx.beginPath();
  ctx.arc(1, -55, 11.5, Math.PI * 0.95, Math.PI * 2.02);
  ctx.quadraticCurveTo(9, -50, 5, -46);
  ctx.quadraticCurveTo(10, -52, 1, -55);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(-3, -60, 12, 8, -0.2, Math.PI, 0); ctx.fill();
  // 눈
  ctx.fillStyle = S.eye;
  ctx.beginPath(); ctx.ellipse(6, -52, 2, 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(6.6, -53, 0.9, 0, 7); ctx.fill();
  // 볼터치 & 입
  ctx.fillStyle = 'rgba(255,120,150,.5)';
  ctx.beginPath(); ctx.arc(3, -47.5, 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c9586e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(9.5, -48.5, 1.6, 0.2, Math.PI - 0.5); ctx.stroke();
  // 왕관
  ctx.fillStyle = S.crown;
  ctx.beginPath();
  ctx.moveTo(-9, -64); ctx.lineTo(-8, -71); ctx.lineTo(-4.5, -65.5);
  ctx.lineTo(-1, -73); ctx.lineTo(2.5, -65.5); ctx.lineTo(6, -70); ctx.lineTo(7, -63.5);
  ctx.quadraticCurveTo(-1, -66.5, -9, -64);
  ctx.fill();
  ctx.fillStyle = S.gem;
  ctx.beginPath(); ctx.arc(-1, -66.5, 1.8, 0, 7); ctx.fill();

  ctx.restore();
}

// ---------- 몬스터 ----------
function drawMob(m) {
  const t = m.phase;
  ctx.save();
  ctx.translate(m.x, m.y);
  if (m.dead) { ctx.globalAlpha = 1 - m.deadT * 2; ctx.translate(0, m.deadT * 20); }
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, m.def.w * 0.45, 6, 0, 0, 7); ctx.fill();

  ctx.save();
  ctx.scale(m.face, 1);
  const flash = m.hitT > 0;
  drawMobBody(m, t, flash);
  ctx.restore();

  // HP바 (보스 제외 - 보스는 상단 바)
  if (!m.def.boss && !m.dead && m.hp < m.def.hp) {
    const w = 44;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-w / 2, -m.def.h - 14, w, 5);
    ctx.fillStyle = '#66dd44'; ctx.fillRect(-w / 2, -m.def.h - 14, w * clamp(m.hp / m.def.hp, 0, 1), 5);
  }
  ctx.restore();
}

function drawMobBody(m, t, flash) {
  const bob = Math.sin(t * 3) * 2;
  switch (m.type) {
    case 'snail': {
      ctx.fillStyle = flash ? '#fff' : '#cfe8b8';
      ctx.beginPath(); ctx.ellipse(-2, -8, 21, 9, 0, 0, 7); ctx.fill(); // 몸
      ctx.fillStyle = flash ? '#fff' : '#7db85c';
      ctx.beginPath(); ctx.arc(-4, -18, 13, 0, 7); ctx.fill(); // 껍질
      ctx.strokeStyle = flash ? '#eee' : '#568a3a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-4, -18, 7, 0, 5); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : '#cfe8b8'; // 머리
      ctx.beginPath(); ctx.arc(14, -13, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7a9a60'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(16, -19); ctx.lineTo(19, -26); ctx.moveTo(11, -20); ctx.lineTo(12, -27); ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(16, -14, 1.6, 0, 7); ctx.fill();
      break;
    }
    case 'slime': {
      const sq = 1 + Math.sin(t * 6) * 0.08;
      ctx.fillStyle = flash ? '#fff' : '#59b8f0';
      ctx.beginPath(); ctx.ellipse(0, -15 * sq, 22 / sq, 16 * sq, 0, 0, 7); ctx.fill();
      ctx.fillStyle = flash ? '#eee' : '#8ed4ff';
      ctx.beginPath(); ctx.ellipse(-6, -21 * sq, 7, 5, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#234';
      ctx.beginPath(); ctx.arc(6, -18, 2.4, 0, 7); ctx.arc(14, -18, 2.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#234'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(10, -13, 3.5, 0.3, Math.PI - 0.3); ctx.stroke();
      break;
    }
    case 'mush': {
      ctx.fillStyle = flash ? '#fff' : '#f5e6c8'; // 몸
      ctx.fillRect(-11, -26, 22, 26);
      ctx.fillStyle = flash ? '#fff' : '#f08c1e'; // 갓
      ctx.beginPath(); ctx.ellipse(0, -27 + bob * 0.4, 24, 15, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(-9, -33 + bob * 0.4, 4, 0, 7); ctx.arc(8, -37 + bob * 0.4, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#432'; // 성난 눈
      ctx.beginPath(); ctx.arc(3, -18, 2.2, 0, 7); ctx.arc(-8, -18, 2.2, 0, 7); ctx.fill();
      ctx.strokeStyle = '#432'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, -22); ctx.lineTo(-5, -20); ctx.moveTo(6, -20); ctx.lineTo(11, -22); ctx.stroke();
      ctx.fillStyle = '#e0c9a0'; // 발
      ctx.fillRect(-13, -3, 10, 3); ctx.fillRect(3, -3, 10, 3);
      break;
    }
    case 'pig': {
      ctx.fillStyle = flash ? '#fff' : '#ffb0c8';
      ctx.beginPath(); ctx.ellipse(-3, -19, 24, 17, 0, 0, 7); ctx.fill(); // 몸
      ctx.beginPath(); ctx.arc(17, -22, 12, 0, 7); ctx.fill(); // 머리
      ctx.fillStyle = flash ? '#eee' : '#ff8fb0'; // 귀
      ctx.beginPath(); ctx.moveTo(10, -32); ctx.lineTo(13, -40); ctx.lineTo(18, -32); ctx.fill();
      ctx.beginPath(); ctx.moveTo(20, -32); ctx.lineTo(24, -39); ctx.lineTo(27, -30); ctx.fill();
      ctx.fillStyle = '#ff7ba3'; // 코
      ctx.beginPath(); ctx.ellipse(27, -20, 5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#a34d68';
      ctx.beginPath(); ctx.arc(25.5, -20, 1.1, 0, 7); ctx.arc(28.5, -20, 1.1, 0, 7); ctx.fill();
      ctx.fillStyle = '#5a2a3a';
      ctx.beginPath(); ctx.arc(19, -25, 1.8, 0, 7); ctx.fill();
      // 리본
      ctx.fillStyle = '#e63960';
      ctx.beginPath(); ctx.moveTo(13, -38); ctx.lineTo(6, -43); ctx.lineTo(9, -35); ctx.fill();
      ctx.beginPath(); ctx.moveTo(13, -38); ctx.lineTo(17, -45); ctx.lineTo(19, -37); ctx.fill();
      // 다리
      const lp = Math.sin(t * 8) * 3;
      ctx.fillStyle = flash ? '#eee' : '#ff9dbd';
      ctx.fillRect(-16 + lp, -6, 7, 6); ctx.fillRect(-4 - lp, -6, 7, 6); ctx.fillRect(8 + lp, -6, 7, 6);
      break;
    }
    case 'skel': {
      ctx.strokeStyle = flash ? '#fff' : '#e8e4d8'; ctx.fillStyle = flash ? '#fff' : '#e8e4d8';
      ctx.lineWidth = 4;
      // 다리
      const lp = Math.sin(t * 7) * 4;
      ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-6 + lp, 0); ctx.moveTo(4, -28); ctx.lineTo(6 - lp, 0); ctx.stroke();
      // 몸통 & 갈비
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -26); ctx.stroke();
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-9, -42 + i * 5); ctx.lineTo(9, -42 + i * 5); ctx.stroke();
      }
      // 팔 (한쪽에 뼈다귀 무기)
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(-11, -30); ctx.stroke();
      ctx.save();
      ctx.translate(0, -42); ctx.rotate(Math.sin(t * 4) * 0.3 + 0.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, 8); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(24, 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(25, 1, 3, 0, 7); ctx.fill();
      ctx.restore();
      // 해골
      ctx.beginPath(); ctx.arc(1, -53, 9.5, 0, 7); ctx.fill();
      ctx.fillRect(-4, -48, 10, 6);
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(4, -54, 2.4, 0, 7); ctx.arc(-3, -54, 2.4, 0, 7); ctx.fill();
      ctx.fillRect(-2, -46, 1.5, 3); ctx.fillRect(1, -46, 1.5, 3); ctx.fillRect(4, -46, 1.5, 3);
      break;
    }
    case 'golem': {
      const c1 = flash ? '#fff' : '#4a4a68', c2 = flash ? '#eee' : '#5f5f82';
      // 다리
      ctx.fillStyle = c1;
      ctx.fillRect(-26, -18, 18, 18); ctx.fillRect(8, -18, 18, 18);
      // 몸
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.roundRect(-28, -58, 56, 42, 8); ctx.fill();
      // 팔
      const sw = Math.sin(t * 2.5) * 4;
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.roundRect(-40, -54 + sw, 13, 36, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(27, -54 - sw, 13, 36, 6); ctx.fill();
      // 머리
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.roundRect(-14, -74, 28, 18, 5); ctx.fill();
      // 빛나는 눈
      ctx.fillStyle = '#7df';
      ctx.shadowColor = '#7df'; ctx.shadowBlur = 8;
      ctx.fillRect(-8, -69, 6, 4); ctx.fillRect(3, -69, 6, 4);
      ctx.shadowBlur = 0;
      // 균열
      ctx.strokeStyle = '#33334d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(-2, -42); ctx.lineTo(-8, -33); ctx.stroke();
      break;
    }
    case 'zakum': {
      drawZakum(m, t, flash);
      break;
    }
    case 'balrog': {
      drawBalrog(m, t, flash);
      break;
    }
  }
}

function drawZakum(m, t, flash) {
  // 팔들 (좌우 3개씩, 흔들림)
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const sw = Math.sin(t * 1.5 + i * 1.3 + side) * 20;
      const baseY = -60 - i * 55;
      ctx.strokeStyle = flash ? '#ddd' : '#3a2418';
      ctx.lineWidth = 16 - i * 2;
      ctx.beginPath();
      ctx.moveTo(side * 55, baseY);
      ctx.quadraticCurveTo(side * (115 + sw * 0.4), baseY - 25, side * (150 + sw), baseY - 55 - sw * 0.5);
      ctx.stroke();
      // 손
      ctx.fillStyle = flash ? '#fff' : '#5c3a22';
      ctx.beginPath(); ctx.arc(side * (150 + sw), baseY - 55 - sw * 0.5, 13, 0, 7); ctx.fill();
    }
  }
  // 본체 (거대 나무 기둥)
  const grd2 = ctx.createLinearGradient(0, -240, 0, 0);
  grd2.addColorStop(0, flash ? '#eee' : '#4a2c1a');
  grd2.addColorStop(1, flash ? '#ccc' : '#2c1810');
  ctx.fillStyle = grd2;
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.quadraticCurveTo(-85, -120, -55, -235);
  ctx.lineTo(55, -235);
  ctx.quadraticCurveTo(85, -120, 70, 0);
  ctx.fill();
  // 얼굴 (가면)
  ctx.fillStyle = flash ? '#fff' : '#c8a832';
  ctx.beginPath(); ctx.ellipse(0, -150, 48, 62, 0, 0, 7); ctx.fill();
  ctx.fillStyle = flash ? '#eee' : '#8a6a14';
  ctx.beginPath(); ctx.ellipse(0, -150, 48, 62, 0, 0, 7); ctx.stroke();
  // 눈 3개 (빨강, 빛남)
  ctx.fillStyle = '#ff3c1e';
  ctx.shadowColor = '#ff5c2e'; ctx.shadowBlur = 12;
  const blink = Math.sin(t * 4) > -0.9 ? 1 : 0.2;
  ctx.beginPath(); ctx.ellipse(-20, -168, 9, 11 * blink, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, -168, 9, 11 * blink, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -186, 7, 9 * blink, 0, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  // 입 (톱니)
  ctx.fillStyle = '#2c1408';
  ctx.beginPath(); ctx.ellipse(0, -118, 26, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd9a0';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 10 - 4, -130); ctx.lineTo(i * 10, -120); ctx.lineTo(i * 10 + 4, -130); ctx.fill();
  }
  // 몸 균열 (용암빛)
  ctx.strokeStyle = 'rgba(255,120,30,' + (0.5 + Math.sin(t * 3) * 0.3) + ')';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-40, -60); ctx.lineTo(-25, -40); ctx.lineTo(-35, -18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(38, -80); ctx.lineTo(28, -55); ctx.lineTo(40, -30); ctx.stroke();
}

function drawBalrog(m, t, flash) {
  const wing = Math.sin(t * 5) * 0.5;
  // 날개
  ctx.fillStyle = flash ? '#ddd' : 'rgba(60,20,90,.9)';
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.translate(-30, -85);
    ctx.rotate(-0.3 + wing * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-55, -45, -95, -25);
    ctx.quadraticCurveTo(-70, -8, -85, 8);
    ctx.quadraticCurveTo(-55, 12, -60, 30);
    ctx.quadraticCurveTo(-25, 22, 0, 18);
    ctx.fill();
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = flash ? '#fff' : '#5a2878';
  ctx.beginPath(); ctx.ellipse(0, -55, 38, 44, 0, 0, 7); ctx.fill();
  // 팔/발톱
  ctx.strokeStyle = flash ? '#eee' : '#4a2060'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(20, -60); ctx.lineTo(44, -30 + Math.sin(t * 5) * 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-40, -28); ctx.stroke();
  ctx.fillStyle = '#ddd';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const cx3 = 44, cy3 = -28 + Math.sin(t * 5) * 6;
    ctx.moveTo(cx3 + i * 4 - 4, cy3); ctx.lineTo(cx3 + i * 4, cy3 + 10); ctx.lineTo(cx3 + i * 4 + 3, cy3); ctx.fill();
  }
  // 머리
  ctx.fillStyle = flash ? '#fff' : '#6a3288';
  ctx.beginPath(); ctx.arc(8, -100, 22, 0, 7); ctx.fill();
  // 뿔
  ctx.fillStyle = flash ? '#eee' : '#e8dcc8';
  ctx.beginPath(); ctx.moveTo(-4, -115); ctx.quadraticCurveTo(-14, -135, -2, -142); ctx.quadraticCurveTo(-6, -128, 3, -117); ctx.fill();
  ctx.beginPath(); ctx.moveTo(18, -115); ctx.quadraticCurveTo(30, -135, 20, -144); ctx.quadraticCurveTo(22, -128, 12, -118); ctx.fill();
  // 눈
  ctx.fillStyle = '#ff4020';
  ctx.shadowColor = '#ff6040'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.ellipse(14, -102, 5, 3.5, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -102, 4, 3, -0.2, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  // 입/송곳니
  ctx.fillStyle = '#2c0a3a';
  ctx.beginPath(); ctx.ellipse(10, -88, 10, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(4, -90); ctx.lineTo(6, -84); ctx.lineTo(8, -90); ctx.fill();
  ctx.beginPath(); ctx.moveTo(13, -90); ctx.lineTo(15, -84); ctx.lineTo(17, -90); ctx.fill();
}

// ---------- NPC ----------
function drawNpc(n) {
  const def = NPCS[n.id];
  const t = gameTime + n.x;
  const bob = Math.sin(t * 2) * 2;
  ctx.save();
  ctx.translate(n.x, GROUND);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 5, 0, 0, 7); ctx.fill();
  const face = player.x < n.x ? -1 : 1;
  ctx.scale(face, 1);

  if (def.kind === 'fairy') {
    ctx.translate(0, -26 + bob * 2);
    // 날개
    const wf = Math.sin(gameTime * 14) * 0.4;
    ctx.fillStyle = 'rgba(180,240,255,.7)';
    ctx.save(); ctx.rotate(wf); ctx.beginPath(); ctx.ellipse(-10, -18, 14, 7, -0.9, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(-wf); ctx.beginPath(); ctx.ellipse(-8, -8, 11, 5, -1.2, 0, 7); ctx.fill(); ctx.restore();
    // 몸/드레스
    ctx.fillStyle = '#8fe0b0';
    ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(6, -18); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.fill();
    // 머리
    ctx.fillStyle = '#ffe0cc'; ctx.beginPath(); ctx.arc(1, -25, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#7cd48a';
    ctx.beginPath(); ctx.ellipse(-2, -30, 9, 6, -0.3, Math.PI, 0.3); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(4, -25, 1.4, 0, 7); ctx.fill();
    // 반짝이
    ctx.fillStyle = 'rgba(255,255,160,' + (0.5 + Math.sin(gameTime * 6) * 0.4) + ')';
    ctx.beginPath(); ctx.arc(12, -34, 2, 0, 7); ctx.arc(-14, -4, 1.5, 0, 7); ctx.fill();
  } else if (def.kind === 'knight') {
    ctx.translate(0, bob * 0.4);
    // 다리
    ctx.fillStyle = '#556'; ctx.fillRect(-8, -14, 7, 14); ctx.fillRect(2, -14, 7, 14);
    // 갑옷 몸통
    ctx.fillStyle = '#99a3b3';
    ctx.beginPath(); ctx.roundRect(-11, -40, 22, 27, 4); ctx.fill();
    ctx.fillStyle = '#7a8494'; ctx.fillRect(-11, -30, 22, 3);
    // 망토
    ctx.fillStyle = '#8a2432';
    ctx.beginPath(); ctx.moveTo(-9, -40); ctx.quadraticCurveTo(-20, -20, -14, -2); ctx.lineTo(-8, -14); ctx.fill();
    // 머리(투구)
    ctx.fillStyle = '#aab4c4'; ctx.beginPath(); ctx.arc(1, -48, 9.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(2, -51, 8, 4);
    ctx.fillStyle = '#c33'; // 투구 깃
    ctx.beginPath(); ctx.moveTo(-3, -56); ctx.quadraticCurveTo(-1, -66, 6, -63); ctx.quadraticCurveTo(1, -60, 2, -55); ctx.fill();
    // 창
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(13, -62); ctx.stroke();
    ctx.fillStyle = '#ccd4e0';
    ctx.beginPath(); ctx.moveTo(9, -60); ctx.lineTo(13, -74); ctx.lineTo(17, -60); ctx.fill();
  } else { // merchant
    ctx.translate(0, bob * 0.4);
    // 다리
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-7, -12, 6, 12); ctx.fillRect(2, -12, 6, 12);
    // 원피스+앞치마
    ctx.fillStyle = '#c46a9a';
    ctx.beginPath(); ctx.moveTo(-9, -38); ctx.lineTo(9, -38); ctx.lineTo(13, -10); ctx.lineTo(-13, -10); ctx.fill();
    ctx.fillStyle = '#fff2dd';
    ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(6, -30); ctx.lineTo(8, -11); ctx.lineTo(-8, -11); ctx.fill();
    // 머리
    ctx.fillStyle = '#ffe0cc'; ctx.beginPath(); ctx.arc(1, -46, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(-2, -51, 10, 7, -0.2, Math.PI, 0.25); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, -40, 4, 9, 0.3, 0, 7); ctx.fill(); // 옆머리
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(4, -46, 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b06a50'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(6, -42, 1.6, 0.3, Math.PI - 0.6); ctx.stroke();
    // 보따리
    ctx.fillStyle = '#d9a066';
    ctx.beginPath(); ctx.arc(-16 * face, -8, 8, 0, 7); ctx.fill();
  }
  ctx.restore();

  // 이름표 & 말풍선
  ctx.save();
  ctx.translate(n.x, GROUND);
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  const nw = ctx.measureText(def.name).width + 12;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(-nw / 2, 8, nw, 17, 4); ctx.fill();
  ctx.fillStyle = '#ffe98a';
  ctx.fillText(def.name, 0, 20.5);
  if (Math.abs(player.x - n.x) < 70) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('💬', 0, -78 + Math.sin(gameTime * 4) * 3);
  }
  ctx.restore();
}

// ---------- 투사체 / 드롭 / 이펙트 ----------
function drawProj(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === 'arrow') {
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.shadowColor = '#ffb0d8'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff8fc0';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -5); ctx.lineTo(-3, 0); ctx.lineTo(-8, 5); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(4, 0, 3, 0, 7); ctx.fill();
  } else if (p.kind === 'fire') {
    ctx.shadowColor = '#ff7020'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ff5c1e';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffc040';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
  } else { // orb
    ctx.shadowColor = '#a050ff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#8030d0';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#d0a0ff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawDrop(d) {
  ctx.save();
  ctx.translate(d.x, d.y - 8 - Math.abs(Math.sin(d.t * 3)) * 4);
  if (d.type === 'meso') {
    ctx.fillStyle = '#ffd339';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c89a10'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.stroke();
  } else {
    ctx.fillStyle = '#ff5c7a';
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, 7); ctx.arc(3, -2, 4, 0, 7);
    ctx.moveTo(-6.5, 0); ctx.lineTo(0, 8); ctx.lineTo(6.5, 0);
    ctx.fill();
  }
  ctx.restore();
}
function drawFx(f) {
  if (f.delay > 0) return;
  const pr = f.t / 0.6;
  ctx.save();
  if (f.type === 'slash') {
    ctx.translate(f.x, f.y);
    ctx.scale(f.face, 1);
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - pr * 2) + ')';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-20, 0, 46, -1.1 + pr * 2, -0.4 + pr * 2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,220,' + (1 - pr * 2) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-20, 0, 38, -1 + pr * 2, -0.3 + pr * 2.5); ctx.stroke();
  } else if (f.type === 'spark') {
    ctx.translate(f.x, f.y);
    ctx.fillStyle = 'rgba(255,240,140,' + (1 - pr * 1.8) + ')';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + pr * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 18 * pr * 3, Math.sin(a) * 18 * pr * 3, 3 * (1 - pr), 0, 7); ctx.fill();
    }
  } else if (f.type === 'blast') {
    ctx.translate(f.x, f.y - 30);
    const r = pr * 3 * 250;
    ctx.strokeStyle = 'rgba(255,120,200,' + Math.max(0, 1 - pr * 2) + ')';
    ctx.lineWidth = 14 * (1 - pr);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,120,' + Math.max(0, 0.8 - pr * 1.6) + ')';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,240,' + Math.max(0, 0.35 - pr) + ')';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
  } else if (f.type === 'boom') {
    ctx.translate(f.x, f.y);
    ctx.fillStyle = 'rgba(255,140,40,' + Math.max(0, 1 - pr * 1.8) + ')';
    ctx.beginPath(); ctx.arc(0, 0, 12 + pr * 60, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,120,' + Math.max(0, 1 - pr * 2.2) + ')';
    ctx.beginPath(); ctx.arc(0, 0, 6 + pr * 35, 0, 7); ctx.fill();
  } else if (f.type === 'heal') {
    ctx.translate(f.x, f.y - pr * 40);
    ctx.fillStyle = 'rgba(120,255,150,' + (1 - pr * 1.6) + ')';
    ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+HP', 0, 0);
  } else if (f.type === 'levelup') {
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = 'rgba(255,230,80,' + Math.max(0, 1 - pr * 1.7) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, -30, 30 + pr * 80, 50 + pr * 60, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function drawDmgNum(n) {
  const pr = n.t / 0.9;
  ctx.save();
  ctx.translate(n.x, n.y - pr * 46);
  ctx.globalAlpha = Math.max(0, 1 - pr * 1.4);
  ctx.textAlign = 'center';
  if (n.purple) {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#c060ff'; ctx.strokeStyle = '#3a1060'; ctx.lineWidth = 3;
    ctx.strokeText('-' + n.val, 0, 0); ctx.fillText('-' + n.val, 0, 0);
  } else {
    const size = n.crit ? 26 : 20;
    ctx.font = 'bold ' + size + 'px sans-serif';
    ctx.fillStyle = n.crit ? '#ffdd30' : '#ff9838';
    ctx.strokeStyle = '#5a2800'; ctx.lineWidth = 3;
    ctx.strokeText(n.val, 0, 0); ctx.fillText(n.val, 0, 0);
    if (n.crit) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffee80';
      ctx.fillText('CRITICAL!', 0, -20);
    }
  }
  ctx.restore();
}

// ---------- UI ----------
function drawUI(map) {
  // 좌상단 스탯창
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,25,.62)';
  ctx.beginPath(); ctx.roundRect(10, 10, 235, 86, 10); ctx.fill();
  // 레벨 배지
  ctx.fillStyle = '#ffd339';
  ctx.beginPath(); ctx.roundRect(18, 18, 52, 24, 6); ctx.fill();
  ctx.fillStyle = '#5a3800'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Lv.' + player.level, 44, 35);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText('프린세스', 78, 35);
  // HP
  bar(18, 48, 210, 11, player.hp / maxHp(), '#e83a5a', '#7a1425', 'HP ' + Math.ceil(player.hp) + '/' + maxHp());
  // MP
  bar(18, 63, 210, 11, player.mp / maxMp(), '#3a7ae8', '#14357a', 'MP ' + Math.floor(player.mp) + '/' + maxMp());
  // EXP
  bar(18, 78, 210, 8, player.exp / needExp(), '#ffd339', '#7a5a00', '');
  // 메소
  ctx.fillStyle = 'rgba(10,10,25,.62)';
  ctx.beginPath(); ctx.roundRect(10, 102, 120, 26, 8); ctx.fill();
  ctx.fillStyle = '#ffd339';
  ctx.beginPath(); ctx.arc(26, 115, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a87c10'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(26, 115, 4.5, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(player.mesos.toLocaleString(), 40, 120);

  // 우상단 맵 이름
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = 'rgba(10,10,25,.62)';
  const mw = ctx.measureText(map.name).width + 26;
  ctx.beginPath(); ctx.roundRect(VW - 12 - mw, 12, mw, 28, 8); ctx.fill();
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText(map.name, VW - 25, 31);

  // 보스 HP바
  const boss = mobs.find(m => m.def.boss && !m.dead);
  if (boss) {
    const bw = 420;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,10,25,.7)';
    ctx.beginPath(); ctx.roundRect(VW / 2 - bw / 2 - 10, 48, bw + 20, 40, 10); ctx.fill();
    ctx.fillStyle = '#ffb0a0'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText('👑 ' + boss.def.name, VW / 2, 63);
    bar(VW / 2 - bw / 2, 70, bw, 12, clamp(boss.hp / boss.def.hp, 0, 1), '#e83a2a', '#5a0e08',
        Math.max(0, Math.ceil(boss.hp)) + ' / ' + boss.def.hp);
  }

  // 맵 이름 대형 표시
  if (mapNameT > 0) {
    ctx.globalAlpha = clamp(mapNameT, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6;
    ctx.strokeText(map.name, VW / 2, 180);
    ctx.fillText(map.name, VW / 2, 180);
    ctx.globalAlpha = 1;
  }

  // 중앙 메시지
  let my = 230;
  ctx.textAlign = 'center';
  for (const msg of messages) {
    ctx.globalAlpha = clamp(msg.t * 1.5, 0, 1);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffe98a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 5;
    ctx.strokeText(msg.text, VW / 2, my);
    ctx.fillText(msg.text, VW / 2, my);
    my += 32;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function bar(x, y, w, h, ratio, fg, bg, label) {
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  if (ratio > 0.01) {
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * clamp(ratio, 0, 1)), h, h / 2); ctx.fill();
  }
  if (label) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h - 2.5);
    ctx.textAlign = 'left';
  }
}

// ---------- 메인 루프 ----------
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
