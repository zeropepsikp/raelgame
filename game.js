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

// ---------- 코디(장비) 시스템 ----------
const EQUIP_OPTIONS = {
  hair: [
    { name: '금발 긴머리', style: 'long', color: '#ffd76e', shade: '#eab63f' },
    { name: '핑크 긴머리', style: 'long', color: '#ff9ec7', shade: '#e470a3' },
    { name: '갈색 포니테일', style: 'pony', color: '#8a5a2b', shade: '#6b4320' },
    { name: '흑발 단발', style: 'bob', color: '#3f3f52', shade: '#2a2a38' },
    { name: '은발 트윈테일', style: 'twin', color: '#dce0ec', shade: '#aab0c4' },
    { name: '레드 단발', style: 'bob', color: '#d85252', shade: '#a83636' }
  ],
  hat: [
    { name: '티아라', style: 'tiara' },
    { name: '없음', style: 'none' },
    { name: '마법사 모자', style: 'wizard', color: '#6a4a9a', dark: '#503678' },
    { name: '빨간 리본', style: 'ribbon', color: '#e63960' },
    { name: '밀짚모자', style: 'straw', color: '#e8c86a', dark: '#c9a94a' }
  ],
  glasses: [
    { name: '없음', style: 'none' },
    { name: '둥근 안경', style: 'round' },
    { name: '선글라스', style: 'sun' }
  ],
  top: [
    { name: '핑크 드레스', color: '#ff7fb2', dark: '#e0518e', trim: '#fff0f6' },
    { name: '하늘 드레스', color: '#7fb8ff', dark: '#4f88e0', trim: '#f0f7ff' },
    { name: '보라 드레스', color: '#b98fe8', dark: '#8f5ec4', trim: '#f5eeff' },
    { name: '민트 드레스', color: '#7fdec0', dark: '#4bbf97', trim: '#eefff8' },
    { name: '블랙 드레스', color: '#4a4a5c', dark: '#32323f', trim: '#c8c8d8' }
  ],
  bottom: [
    { name: '롱 스커트', style: 'long', color: null },
    { name: '미니 스커트', style: 'mini', color: null },
    { name: '화이트 롱스커트', style: 'long', color: '#f2f2f8', dark: '#cfcfde' },
    { name: '청바지', style: 'pants', color: '#4a6a9a', dark: '#35507a' },
    { name: '블랙 스커트', style: 'mini', color: '#3a3a48', dark: '#26262f' }
  ],
  shoes: [
    { name: '핑크 구두', style: 'shoe', color: '#c94f7c' },
    { name: '갈색 부츠', style: 'boot', color: '#8a5a34' },
    { name: '블랙 부츠', style: 'boot', color: '#33333f' },
    { name: '화이트 구두', style: 'shoe', color: '#e8e8f0' }
  ]
};
const EQUIP_LABELS = { hair: '헤어', hat: '모자', glasses: '안경', top: '상의', bottom: '하의', shoes: '신발' };
const equip = { hair: 0, hat: 0, glasses: 0, top: 0, bottom: 0, shoes: 0 };

// ---------- 무기 시스템 (몬스터 드랍으로 획득, 🎒 메뉴에서 장착) ----------
const WEAPONS = {
  sword:  { name: '장검',   icon: '🗡️', s1: { name: '소드 슬래시',   label: '슬래시', mp: 8,  cd: 1.2 }, s2: { name: '로얄 블래스트', label: '블래스트', mp: 25, cd: 8 } },
  wand:   { name: '마법봉', icon: '🪄', s1: { name: '매직 미사일',   label: '미사일', mp: 10, cd: 1.4 }, s2: { name: '스타폴',       label: '스타폴',   mp: 30, cd: 9 } },
  dagger: { name: '단검',   icon: '🔪', s1: { name: '트리플 스탭',   label: '3연격',  mp: 7,  cd: 1.0 }, s2: { name: '섀도우 러시',   label: '러시',     mp: 22, cd: 7 } },
  bow:    { name: '활',     icon: '🏹', s1: { name: '더블 샷',       label: '더블샷', mp: 8,  cd: 1.1 }, s2: { name: '애로우 레인',   label: '화살비',   mp: 26, cd: 8 } },
  hammer: { name: '워해머', icon: '🔨', s1: { name: '그라운드 슬램', label: '슬램',   mp: 9,  cd: 1.5 }, s2: { name: '어스퀘이크',   label: '지진',     mp: 28, cd: 9 } },
  gun:    { name: '총',     icon: '🔫', s1: { name: '래피드 샷',     label: '연사',   mp: 8,  cd: 1.0 }, s2: { name: '메가 버스터',   label: '레이저',   mp: 30, cd: 9 } }
};
const gear = { weapon: 'sword', owned: { sword: true } };

// 현재 장비 조합으로 렌더링용 외형 계산
function getLook() {
  const h = EQUIP_OPTIONS.hair[equip.hair];
  const t = EQUIP_OPTIONS.top[equip.top];
  const b = EQUIP_OPTIONS.bottom[equip.bottom];
  const s = EQUIP_OPTIONS.shoes[equip.shoes];
  return {
    skin: CHAR_STYLE.skin, skinShade: CHAR_STYLE.skinShade,
    hair: h.color, hairShade: h.shade, hairStyle: h.style,
    hat: EQUIP_OPTIONS.hat[equip.hat],
    glasses: EQUIP_OPTIONS.glasses[equip.glasses].style,
    dress: t.color, dressDark: t.dark, dressTrim: t.trim,
    bottom: { style: b.style, color: b.color || t.color, dark: b.dark || t.dark },
    shoes: s,
    weapon: gear.weapon,
    crown: CHAR_STYLE.crown, gem: CHAR_STYLE.gem, eye: CHAR_STYLE.eye,
    sword: CHAR_STYLE.sword, swordEdge: CHAR_STYLE.swordEdge, hilt: CHAR_STYLE.hilt
  };
}

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
  shot: () => tone(750, 0.06, 'square', 0.06, -400),
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
  mimi: {
    name: '디자이너 미미', kind: 'stylist',
    lines: ['어서 와, 공주님! 왕국 최고의 디자이너 미미야.', '헤어부터 무기까지, 원하는 스타일로 언제든 바꿔줄게. 옷 갈아입어 볼래?'],
    stylist: true
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
    name: '프린세스 마을', theme: 'town', w: 2000, entry: 300, icon: '🏰',
    platforms: [g(2000), { x: 520, y: 360, w: 180 }, { x: 1250, y: 360, w: 180 }],
    portals: [{ x: 1930, to: 1, tx: 140, label: '초원 언덕' }],
    npcs: [{ id: 'rosa', x: 660 }, { id: 'ariel', x: 1000 }, { id: 'mimi', x: 1400 }],
    spawns: []
  },
  { // 1
    name: '초원 언덕', theme: 'meadow', w: 2800, entry: 160, icon: '🌿',
    platforms: [g(2800), { x: 600, y: 370, w: 210 }, { x: 1300, y: 370, w: 230 }, { x: 1680, y: 280, w: 170 }, { x: 2150, y: 370, w: 210 }],
    portals: [{ x: 70, to: 0, tx: 1860, label: '프린세스 마을' }, { x: 2730, to: 2, tx: 150, label: '버섯 숲' }],
    npcs: [],
    spawns: [{ t: 'snail', x: 420 }, { t: 'snail', x: 760 }, { t: 'snail', x: 1520 }, { t: 'snail', x: 2480 },
             { t: 'slime', x: 1020 }, { t: 'slime', x: 1900 }, { t: 'slime', x: 2280 }]
  },
  { // 2
    name: '버섯 숲', theme: 'forest', w: 2800, entry: 160, icon: '🍄',
    platforms: [g(2800), { x: 500, y: 360, w: 220 }, { x: 1150, y: 350, w: 240 }, { x: 1850, y: 360, w: 220 }, { x: 2180, y: 270, w: 180 }],
    portals: [{ x: 70, to: 1, tx: 2650, label: '초원 언덕' }, { x: 2730, to: 3, tx: 150, label: '어둠의 동굴' }],
    npcs: [],
    spawns: [{ t: 'mush', x: 400 }, { t: 'mush', x: 900 }, { t: 'mush', x: 1600 }, { t: 'mush', x: 2500 },
             { t: 'pig', x: 1250 }, { t: 'pig', x: 2000 }, { t: 'pig', x: 2250 }]
  },
  { // 3
    name: '어둠의 동굴', theme: 'cave', w: 2800, entry: 180, icon: '🌑',
    platforms: [g(2800), { x: 620, y: 370, w: 200 }, { x: 1350, y: 360, w: 230 }, { x: 1750, y: 290, w: 190 }, { x: 2080, y: 200, w: 180 }],
    portals: [{ x: 70, to: 2, tx: 2650, label: '버섯 숲' },
              { x: 2730, to: 4, tx: 130, label: '자쿰의 제단' },
              { x: 2160, y: 200, to: 5, tx: 130, label: '발록의 둥지' }],
    npcs: [{ id: 'gaon', x: 300 }],
    spawns: [{ t: 'skel', x: 550 }, { t: 'skel', x: 1000 }, { t: 'skel', x: 1700 }, { t: 'skel', x: 2200 },
             { t: 'golem', x: 1300 }, { t: 'golem', x: 2500 }]
  },
  { // 4
    name: '자쿰의 제단', theme: 'altar', w: 1700, entry: 140, icon: '🔥',
    platforms: [g(1700), { x: 250, y: 370, w: 170 }, { x: 1280, y: 370, w: 170 }],
    portals: [{ x: 70, to: 3, tx: 2650, label: '어둠의 동굴' }],
    npcs: [],
    spawns: [{ t: 'zakum', x: 1000 }]
  },
  { // 5
    name: '발록의 둥지', theme: 'lair', w: 1900, entry: 140, icon: '😈',
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
  invul: 0, atkT: 0, atkKind: '', pendings: [], dead: false, deadT: 0, walking: false
};
const maxHp = () => 100 + (player.level - 1) * 28;
const maxMp = () => 50 + (player.level - 1) * 12;
const atkPow = () => 14 + (player.level - 1) * 4;
const needExp = () => Math.floor(50 * Math.pow(1.35, player.level - 1));

const cd = { atk: 0, s1: 0, s2: 0 };
const ATK_CD = 0.35;

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
      level: player.level, exp: player.exp, mesos: player.mesos, equip,
      weapon: gear.weapon, owned: Object.keys(gear.owned).filter(k => gear.owned[k])
    }));
  } catch (e) {}
  cloudSave();
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('princess_save'));
    if (d) {
      player.level = d.level || 1; player.exp = d.exp || 0; player.mesos = d.mesos || 0;
      player.hp = maxHp(); player.mp = maxMp();
      if (d.equip) {
        for (const k in equip) {
          const v = d.equip[k];
          if (Number.isInteger(v) && v >= 0 && v < EQUIP_OPTIONS[k].length) equip[k] = v;
        }
      }
      if (Array.isArray(d.owned)) for (const id of d.owned) if (WEAPONS[id]) gear.owned[id] = true;
      gear.owned.sword = true;
      if (d.weapon && WEAPONS[d.weapon] && gear.owned[d.weapon]) gear.weapon = d.weapon;
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
  // 무기 드랍: 보스는 확정, 일반 몹은 7%
  if (m.def.boss || Math.random() < 0.07) {
    const ids = Object.keys(WEAPONS);
    const notOwned = ids.filter(id => !gear.owned[id]);
    const pool = (m.def.boss && notOwned.length) ? notOwned : ids;
    const wid = pool[irand(0, pool.length - 1)];
    drops.push({ x: m.x - 12, y: m.y - 24, vy: -280, vx: rand(-50, 50), type: 'weapon', wid, t: 0 });
  }
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
  if (player.invul > 0 || player.dead || uiBlocked()) return;
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
  if (player.dead || uiBlocked()) return;
  if (player.onGround) { player.vy = JUMP_V; player.onGround = false; SFX.jump(); }
}
function doAttack() {
  if (player.dead || uiBlocked() || cd.atk > 0 || player.atkT > 0) return;
  cd.atk = ATK_CD;
  player.atkT = 0.3; player.atkKind = 'basic';
  player.pendings.push({ t: 0.1, kind: 'basic' });
  SFX.swing();
}
function doSkill1() {
  const W = WEAPONS[gear.weapon];
  if (player.dead || uiBlocked() || cd.s1 > 0 || player.mp < W.s1.mp) return;
  cd.s1 = W.s1.cd;
  player.mp -= W.s1.mp;
  player.atkT = 0.3; player.atkKind = 's1';
  switch (gear.weapon) {
    case 'wand': player.pendings.push({ t: 0.12, kind: 'stars' }); break;
    case 'dagger':
      for (let i = 0; i < 3; i++) player.pendings.push({ t: 0.05 + i * 0.11, kind: 'melee', mult: 0.85, range: 62 });
      break;
    case 'bow': player.pendings.push({ t: 0.12, kind: 'arrows' }); break;
    case 'hammer': player.pendings.push({ t: 0.15, kind: 'shock' }); break;
    case 'gun':
      for (let i = 0; i < 3; i++) player.pendings.push({ t: 0.05 + i * 0.09, kind: 'bullet' });
      break;
    default: player.pendings.push({ t: 0.12, kind: 'wave' }); break; // sword
  }
  SFX.skill1();
}
function doSkill2() {
  const W = WEAPONS[gear.weapon];
  if (player.dead || uiBlocked() || cd.s2 > 0 || player.mp < W.s2.mp) return;
  cd.s2 = W.s2.cd;
  player.mp -= W.s2.mp;
  player.atkT = 0.55; player.atkKind = 's2';
  switch (gear.weapon) {
    case 'wand': player.pendings.push({ t: 0.15, kind: 'starfall' }); break;
    case 'dagger': player.pendings.push({ t: 0.1, kind: 'dash' }); break;
    case 'bow': player.pendings.push({ t: 0.15, kind: 'arrowrain' }); break;
    case 'hammer': player.pendings.push({ t: 0.22, kind: 'quake' }); break;
    case 'gun': player.pendings.push({ t: 0.18, kind: 'laser' }); break;
    default: player.pendings.push({ t: 0.2, kind: 'blast' }); break; // sword
  }
}
function firePending(pd) {
  const f = player.face, px = player.x, py = player.y;
  switch (pd.kind) {
    case 'basic': {
      addFx('slash', px + f * 44, py - 40, { face: f });
      for (const m of mobs) {
        if (m.dead) continue;
        const dx = (m.x - px) * f;
        if (dx > -m.def.w / 2 && dx < 85 + m.def.w / 2 && Math.abs(m.y - py) < m.def.h * 0.8 + 45) {
          const r = playerDamageRoll(1);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      break;
    }
    case 'melee': { // 단검 3연격
      addFx('slash', px + f * 40, py - 40 + rand(-8, 8), { face: f });
      SFX.swing();
      for (const m of mobs) {
        if (m.dead) continue;
        const dx = (m.x - px) * f;
        if (dx > -m.def.w / 2 && dx < pd.range + m.def.w / 2 && Math.abs(m.y - py) < m.def.h * 0.8 + 45) {
          const r = playerDamageRoll(pd.mult);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      break;
    }
    case 'wave': // 장검: 검기 (관통)
      projs.push({ from: 'p', x: px + f * 30, y: py - 42, vx: f * 480, vy: 0, life: 1.0, kind: 'wave', mult: 1.7, pierce: true, hit: new Set() });
      break;
    case 'stars': // 마법봉: 별 3발
      for (let i = -1; i <= 1; i++)
        projs.push({ from: 'p', x: px + f * 24, y: py - 44, vx: f * 430, vy: i * 65, life: 1.1, kind: 'star', mult: 0.9, phase: rand(0, 6) });
      break;
    case 'arrows': // 활: 화살 2발
      for (let i = 0; i < 2; i++)
        projs.push({ from: 'p', x: px + f * 24, y: py - 46 - i * 10, vx: f * 680, vy: -15 - i * 20, grav: true, life: 1.2, kind: 'parrow', mult: 1.15 });
      break;
    case 'shock': // 워해머: 지면 충격파 (관통)
      shake = Math.max(shake, 0.2);
      projs.push({ from: 'p', x: px + f * 36, y: GROUND, vx: f * 420, vy: 0, life: 1.1, kind: 'shockw', mult: 1.8, pierce: true, hit: new Set() });
      break;
    case 'bullet': // 총: 연사
      SFX.shot();
      projs.push({ from: 'p', x: px + f * 28, y: py - 44, vx: f * 950, vy: 0, life: 0.7, kind: 'bullet', mult: 0.85 });
      break;
    case 'blast': { // 장검 필살기: 로얄 블래스트
      SFX.skill2();
      shake = Math.max(shake, 0.45);
      addFx('blast', px, py, {});
      for (const m of mobs) {
        if (m.dead) continue;
        if (Math.abs(m.x - px) < 250 + m.def.w / 2 && Math.abs(m.y - py) < 180 + m.def.h) {
          const r = playerDamageRoll(3);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      break;
    }
    case 'starfall': // 마법봉 필살기: 하늘에서 별똥별
      SFX.skill2();
      for (let i = 0; i < 6; i++)
        projs.push({ from: 'p', x: px + rand(-330, 330), y: rand(30, 110), vx: rand(-30, 30), vy: rand(430, 560), life: 2, kind: 'fallstar', mult: 1.5, phase: rand(0, 6) });
      break;
    case 'dash': { // 단검 필살기: 섀도우 러시
      SFX.skill2();
      shake = Math.max(shake, 0.25);
      const x1 = clamp(px + f * 270, 24, MAPS[curMap].w - 24);
      const mn = Math.min(px, x1) - 35, mx = Math.max(px, x1) + 35;
      for (const m of mobs) {
        if (m.dead) continue;
        if (m.x >= mn && m.x <= mx && Math.abs(m.y - py) < m.def.h + 60) {
          const r = playerDamageRoll(3);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      for (let i = 0; i < 5; i++) addFx('ghost', px + (x1 - px) * i / 5, py, { face: f, delay: i * 0.03 });
      player.x = x1;
      player.invul = Math.max(player.invul, 0.6);
      break;
    }
    case 'arrowrain': // 활 필살기: 애로우 레인
      SFX.skill2();
      for (let i = 0; i < 8; i++)
        projs.push({ from: 'p', x: px + f * (70 + i * 38) + rand(-14, 14), y: rand(40, 130), vx: f * 60, vy: rand(640, 780), life: 1.5, kind: 'rainarrow', mult: 1.2 });
      break;
    case 'quake': { // 워해머 필살기: 어스퀘이크
      SFX.skill2();
      shake = Math.max(shake, 0.85);
      for (const m of mobs) {
        if (m.dead) continue;
        if (Math.abs(m.x - px) < 470) {
          const r = playerDamageRoll(2.8);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      for (let i = 0; i < 9; i++) addFx('rock', px + rand(-380, 380), GROUND, { delay: i * 0.04, r: rand(5, 11) });
      break;
    }
    case 'laser': { // 총 필살기: 메가 버스터
      SFX.skill2();
      shake = Math.max(shake, 0.35);
      addFx('laser', px + f * 20, py - 44, { face: f, r: 640 });
      for (const m of mobs) {
        if (m.dead) continue;
        if ((m.x - px) * f > -20 && Math.abs(m.x - px) < 680 && Math.abs((m.y - m.def.h / 2) - (py - 44)) < m.def.h / 2 + 50) {
          const r = playerDamageRoll(3.2);
          hurtMob(m, r.dmg, r.crit);
        }
      }
      break;
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
  if (costumeOpen || teleOpen) return;
  if (costumeOpen || teleOpen) return;
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
  dlgHint.style.display = (last && (d.def.shop || d.def.stylist)) ? 'none' : 'block';
  dlgHint.textContent = last ? '탭하여 닫기 ✕' : '탭하여 계속 ▼';
  if (last && d.def.stylist) {
    const b1 = document.createElement('button');
    b1.textContent = '👗 옷 갈아입기';
    b1.onclick = (e) => { e.stopPropagation(); closeDialog(); openCostume(); };
    const b2 = document.createElement('button');
    b2.textContent = '닫기';
    b2.onclick = (e) => { e.stopPropagation(); closeDialog(); };
    dlgBtns.appendChild(b1); dlgBtns.appendChild(b2);
  }
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
    if (!dialog.def.shop && !dialog.def.stylist) closeDialog();
    // shop/stylist 는 버튼으로만 닫힘
  } else {
    dialog.i++;
    showDialogLine();
  }
}
function closeDialog() { dialog = null; dlgEl.style.display = 'none'; }
dlgEl.addEventListener('pointerdown', (e) => { e.preventDefault(); advanceDialog(); });

// ---------- 코디샵 패널 ----------
const costEl = document.getElementById('costume');
const costRows = document.getElementById('costRows');
let costumeOpen = false;

function buildCostumeRows() {
  costRows.innerHTML = '';
  for (const cat in EQUIP_OPTIONS) {
    const row = document.createElement('div');
    row.className = 'cRow';
    const label = document.createElement('span');
    label.className = 'cLabel'; label.textContent = EQUIP_LABELS[cat];
    const prev = document.createElement('button'); prev.textContent = '◀';
    const val = document.createElement('span');
    val.className = 'cVal'; val.textContent = EQUIP_OPTIONS[cat][equip[cat]].name;
    const next = document.createElement('button'); next.textContent = '▶';
    const cycle = (dir) => {
      const n = EQUIP_OPTIONS[cat].length;
      equip[cat] = (equip[cat] + dir + n) % n;
      val.textContent = EQUIP_OPTIONS[cat][equip[cat]].name;
      SFX.coin(); save();
    };
    prev.addEventListener('pointerdown', (e) => { e.preventDefault(); cycle(-1); });
    next.addEventListener('pointerdown', (e) => { e.preventDefault(); cycle(1); });
    row.appendChild(label); row.appendChild(prev); row.appendChild(val); row.appendChild(next);
    costRows.appendChild(row);
  }
}
function openCostume() {
  costumeOpen = true;
  player.vx = 0;
  buildCostumeRows();
  costEl.style.display = 'block';
}
function closeCostume() { costumeOpen = false; costEl.style.display = 'none'; }
document.getElementById('costClose').addEventListener('pointerdown', (e) => { e.preventDefault(); closeCostume(); });

// ---------- 순간이동 패널 ----------
const teleEl = document.getElementById('telePanel');
const teleList = document.getElementById('teleList');
let teleOpen = false;

function openTele() {
  if (dialog || costumeOpen || player.dead || fade) return;
  if (typeof closeGear === 'function' && gearOpen) closeGear();
  teleOpen = true;
  player.vx = 0;
  teleList.innerHTML = '';
  MAPS.forEach((m, i) => {
    const b = document.createElement('button');
    b.textContent = m.icon + ' ' + m.name;
    if (i === curMap) b.classList.add('cur');
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      closeTele();
      goMap(i, m.entry);
    });
    teleList.appendChild(b);
  });
  teleEl.style.display = 'block';
}
function closeTele() { teleOpen = false; teleEl.style.display = 'none'; }
document.getElementById('btnTele').addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio();
  if (teleOpen) closeTele(); else openTele();
});
document.getElementById('teleClose').addEventListener('pointerdown', (e) => { e.preventDefault(); closeTele(); });

// ---------- 무기 장비 패널 ----------
const gearEl = document.getElementById('gearPanel');
const gearList = document.getElementById('gearList');
let gearOpen = false;

function updateSkillBtns() {
  const W = WEAPONS[gear.weapon];
  document.getElementById('btnS1').childNodes[0].nodeValue = W.s1.label;
  document.getElementById('btnS2').childNodes[0].nodeValue = W.s2.label;
}
function buildGearList() {
  gearList.innerHTML = '';
  for (const id in WEAPONS) {
    const W = WEAPONS[id];
    const b = document.createElement('button');
    if (gear.owned[id]) {
      b.textContent = W.icon + ' ' + W.name + (gear.weapon === id ? ' ✔' : '');
      if (gear.weapon === id) b.classList.add('cur');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        gear.weapon = id;
        updateSkillBtns();
        addMsg(W.icon + ' ' + W.name + ' 장착! (' + W.s1.name + ' / ' + W.s2.name + ')', 2.5);
        SFX.coin(); save();
        buildGearList();
      });
    } else {
      b.textContent = '❓ ??? (미보유)';
      b.classList.add('lock');
    }
    gearList.appendChild(b);
  }
}
function openGear() {
  if (dialog || costumeOpen || player.dead) return;
  closeTele();
  gearOpen = true;
  player.vx = 0;
  buildGearList();
  gearEl.style.display = 'block';
}
function closeGear() { gearOpen = false; gearEl.style.display = 'none'; }
document.getElementById('btnGear').addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio();
  if (gearOpen) closeGear(); else openGear();
});
document.getElementById('gearClose').addEventListener('pointerdown', (e) => { e.preventDefault(); closeGear(); });

// 게임 조작을 막는 UI가 열려 있는지
function uiBlocked() { return !!dialog || costumeOpen || teleOpen || gearOpen; }

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
  const wantMove = !uiBlocked() && (input.left || input.right);
  if (!uiBlocked()) {
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
  if (player.pendings.length) {
    for (const pd of player.pendings) pd.t -= dt;
    const ready = player.pendings.filter(pd => pd.t <= 0);
    player.pendings = player.pendings.filter(pd => pd.t > 0);
    for (const pd of ready) firePending(pd);
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
      if (p.kind === 'star') { p.phase += dt * 9; p.y += Math.sin(p.phase) * 45 * dt; }
      for (const m of mobs) {
        if (m.dead) continue;
        if (p.pierce && p.hit.has(m)) continue;
        const vertHit = p.kind === 'shockw'
          ? m.y > GROUND - 90
          : (p.y > m.y - m.def.h - 15 && p.y < m.y + 15);
        if (Math.abs(p.x - m.x) < m.def.w / 2 + 12 && vertHit) {
          const r = playerDamageRoll(p.mult || 1.5);
          hurtMob(m, r.dmg, r.crit);
          addFx('spark', p.x, p.y, {});
          if (p.pierce) { p.hit.add(m); }
          else { p.life = 0; break; }
        }
      }
      if (p.y > GROUND + 2 && (p.kind === 'fallstar' || p.kind === 'rainarrow' || p.kind === 'parrow')) {
        if (p.kind === 'fallstar') addFx('starburst', p.x, GROUND - 6, {});
        p.life = 0;
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
      else if (d.type === 'weapon') {
        const W = WEAPONS[d.wid];
        if (!gear.owned[d.wid]) {
          gear.owned[d.wid] = true;
          addMsg(W.icon + ' 새 무기 [' + W.name + '] 획득! 🎒 무기 메뉴에서 장착하세요', 3.5);
          SFX.levelup();
        } else {
          player.mesos += 30;
          addDmg(d.x, d.y - 40, 30, {});
          SFX.coin();
        }
        save();
      }
      else { player.hp = Math.min(maxHp(), player.hp + 40); addFx('heal', player.x, player.y - 40, {}); SFX.coin(); }
      d.done = true;
    }
  }
  drops = drops.filter(d => !d.done && d.t < (d.type === 'weapon' ? 25 : 15));
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
  if (!uiBlocked() && !player.dead) {
    if (nearNpc()) ctxLabel = '💬 대화하기';
    else { const pt = nearPortal(); if (pt) ctxLabel = '🌀 ' + pt.label + ' 이동'; }
  }
  if (ctxLabel) { btnCtx.style.display = 'block'; btnCtx.textContent = ctxLabel; }
  else btnCtx.style.display = 'none';

  // 쿨다운 표시
  updateCdBtn('btnAtk', cd.atk, 0);
  updateCdBtn('btnS1', cd.s1, WEAPONS[gear.weapon].s1.mp);
  updateCdBtn('btnS2', cd.s2, WEAPONS[gear.weapon].s2.mp);
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

// ---------- 공주 캐릭터 (장비 조합 렌더링) ----------
function drawPrincess() {
  const S = getLook();
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

  // ----- 뒷머리 (헤어 스타일별) -----
  ctx.fillStyle = S.hair;
  if (S.hairStyle === 'long') {
    ctx.beginPath();
    ctx.moveTo(-4, -58);
    ctx.quadraticCurveTo(-22, -50, -18 - walkP * 2, -18);
    ctx.quadraticCurveTo(-14, -12, -8, -16);
    ctx.quadraticCurveTo(-14, -34, -8, -50);
    ctx.fill();
  } else if (S.hairStyle === 'pony') {
    ctx.beginPath();
    ctx.moveTo(-7, -58);
    ctx.quadraticCurveTo(-20, -52, -15 - walkP * 2, -28);
    ctx.quadraticCurveTo(-12, -22, -7, -26);
    ctx.quadraticCurveTo(-13, -42, -6, -54);
    ctx.fill();
    ctx.fillStyle = '#e05a7a';
    ctx.fillRect(-12, -57, 6, 4);
  } else if (S.hairStyle === 'twin') {
    for (const off of [-14, 10]) {
      ctx.beginPath();
      ctx.moveTo(off, -55);
      ctx.quadraticCurveTo(off - 6, -44, off - 3 - walkP * 1.5, -26);
      ctx.quadraticCurveTo(off, -22, off + 3, -26);
      ctx.quadraticCurveTo(off + 3, -42, off + 4, -53);
      ctx.fill();
    }
  } else { // bob (단발)
    ctx.beginPath(); ctx.ellipse(-6, -50, 8, 10, 0.15, 0, 7); ctx.fill();
  }

  const B = S.bottom;
  const legA = inAir ? 6 : walkP * 7;

  // ----- 다리 / 하의(바지) -----
  if (B.style === 'pants') {
    ctx.fillStyle = B.color;
    ctx.fillRect(-8 + legA * 0.5, -30, 7, 27);
    ctx.fillRect(2 - legA * 0.5, -30, 7, 27);
    ctx.fillStyle = B.dark;
    ctx.fillRect(-8 + legA * 0.5, -30, 7, 4);
    ctx.fillRect(2 - legA * 0.5, -30, 7, 4);
  } else {
    ctx.fillStyle = S.skin;
    ctx.fillRect(-7 + legA * 0.5, -16, 6, 16);
    ctx.fillRect(2 - legA * 0.5, -16, 6, 16);
  }

  // ----- 신발 -----
  ctx.fillStyle = S.shoes.color;
  if (S.shoes.style === 'boot') {
    ctx.fillRect(-8 + legA * 0.5, -14, 8, 14);
    ctx.fillRect(1 - legA * 0.5, -14, 8, 14);
    ctx.fillRect(-9 + legA * 0.5, -3, 10, 3);
    ctx.fillRect(0 - legA * 0.5, -3, 10, 3);
  } else {
    ctx.fillRect(-8 + legA * 0.5, -4, 9, 4);
    ctx.fillRect(1 - legA * 0.5, -4, 9, 4);
  }

  // ----- 하의(치마) -----
  if (B.style === 'long') {
    ctx.fillStyle = B.color;
    ctx.beginPath();
    ctx.moveTo(-11, -34);
    ctx.quadraticCurveTo(-17 - walkP * 2, -18, -16, -8);
    ctx.quadraticCurveTo(0, -3, 16, -8);
    ctx.quadraticCurveTo(17 + walkP * 2, -18, 11, -34);
    ctx.fill();
    ctx.fillStyle = B.dark;
    ctx.beginPath();
    ctx.moveTo(-16, -9); ctx.quadraticCurveTo(0, -4, 16, -9);
    ctx.lineTo(16, -6); ctx.quadraticCurveTo(0, -1, -16, -6); ctx.fill();
  } else if (B.style === 'mini') {
    ctx.fillStyle = B.color;
    ctx.beginPath();
    ctx.moveTo(-11, -34);
    ctx.quadraticCurveTo(-14 - walkP, -24, -14, -17);
    ctx.quadraticCurveTo(0, -13, 14, -17);
    ctx.quadraticCurveTo(15 + walkP, -24, 11, -34);
    ctx.fill();
    ctx.fillStyle = B.dark;
    ctx.beginPath();
    ctx.moveTo(-14, -18); ctx.quadraticCurveTo(0, -14, 14, -18);
    ctx.lineTo(14, -15); ctx.quadraticCurveTo(0, -11, -14, -15); ctx.fill();
  }

  // ----- 상의 (몸통) -----
  ctx.fillStyle = S.dress;
  ctx.fillRect(-8, -42, 16, B.style === 'pants' ? 13 : 10);
  ctx.fillStyle = S.dressTrim;
  ctx.fillRect(-8, -35, 16, 2);

  // ----- 뒷팔 -----
  ctx.fillStyle = S.skinShade;
  ctx.save();
  ctx.translate(-5, -40);
  ctx.rotate(0.5 + walkP * 0.25);
  ctx.fillRect(-2, 0, 5, 14);
  ctx.restore();

  // ----- 무기 + 앞팔 -----
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
  ctx.translate(0, 14);
  const W = S.weapon;
  if (W === 'wand') {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-1.5, 0, 3, 26);
    ctx.fillStyle = '#ff8fd0';
    ctx.beginPath(); ctx.arc(0, 28, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd339';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5, a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 7.5, 28 + Math.sin(a) * 7.5);
      ctx.lineTo(Math.cos(a2) * 3.2, 28 + Math.sin(a2) * 3.2);
    }
    ctx.closePath(); ctx.fill();
  } else if (W === 'dagger') {
    ctx.fillStyle = S.hilt; ctx.fillRect(-4, -2, 8, 3.5);
    ctx.fillStyle = S.sword;
    ctx.beginPath();
    ctx.moveTo(-2, 1.5); ctx.lineTo(2, 1.5); ctx.lineTo(2, 14); ctx.lineTo(0, 19); ctx.lineTo(-2, 14);
    ctx.fill();
    ctx.fillStyle = S.swordEdge; ctx.fillRect(-0.4, 1.5, 0.8, 14);
  } else if (W === 'bow') {
    ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 16, 17, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = '#eef0f8'; ctx.lineWidth = 1.2;
    const bx = Math.cos(1.25) * 17, by = Math.sin(1.25) * 17;
    ctx.beginPath(); ctx.moveTo(bx, 16 - by); ctx.lineTo(bx, 16 + by); ctx.stroke();
    ctx.fillStyle = '#c9556a';
    ctx.fillRect(14.5, 13, 5, 6);
  } else if (W === 'gun') {
    ctx.fillStyle = '#4a4f5c';
    ctx.beginPath(); ctx.roundRect(-3.5, 6, 7, 20, 2); ctx.fill();
    ctx.fillStyle = '#2e323c';
    ctx.fillRect(-2, 25, 4, 6);
    ctx.fillStyle = '#6a7080';
    ctx.beginPath(); ctx.roundRect(-9, 8, 7, 6, 2); ctx.fill();
    ctx.fillStyle = '#ffd048';
    ctx.fillRect(-1.5, 6, 3, 2.5);
  } else if (W === 'hammer') {
    ctx.fillStyle = '#8a5a34'; ctx.fillRect(-1.8, 0, 3.6, 34);
    ctx.fillStyle = '#8a94a4';
    ctx.beginPath(); ctx.roundRect(-9, 26, 18, 12, 3); ctx.fill();
    ctx.fillStyle = '#6a7484'; ctx.fillRect(-9, 30, 18, 3);
  } else { // sword
    ctx.fillStyle = S.hilt; ctx.fillRect(-5, -2, 10, 4);
    ctx.fillStyle = S.sword;
    ctx.beginPath();
    ctx.moveTo(-2.5, 2); ctx.lineTo(2.5, 2); ctx.lineTo(2.5, 30); ctx.lineTo(0, 36); ctx.lineTo(-2.5, 30);
    ctx.fill();
    ctx.fillStyle = S.swordEdge; ctx.fillRect(-0.5, 2, 1, 30);
  }
  ctx.restore();

  // ----- 머리 -----
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
  if (S.hairStyle === 'bob') {
    ctx.beginPath(); ctx.ellipse(-8, -48, 5, 9, 0.25, 0, 7); ctx.fill();
  }
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

  // ----- 안경 -----
  if (S.glasses === 'round') {
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(6, -52, 4.4, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.8, -53.5); ctx.lineTo(-8, -55); ctx.stroke();
  } else if (S.glasses === 'sun') {
    ctx.fillStyle = '#22242e';
    ctx.beginPath(); ctx.roundRect(1.5, -56.5, 9.5, 7, 2); ctx.fill();
    ctx.strokeStyle = '#22242e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(2, -54.5); ctx.lineTo(-8, -56); ctx.stroke();
  }

  // ----- 모자 -----
  const hat = S.hat;
  if (hat.style === 'tiara') {
    ctx.fillStyle = S.crown;
    ctx.beginPath();
    ctx.moveTo(-9, -64); ctx.lineTo(-8, -71); ctx.lineTo(-4.5, -65.5);
    ctx.lineTo(-1, -73); ctx.lineTo(2.5, -65.5); ctx.lineTo(6, -70); ctx.lineTo(7, -63.5);
    ctx.quadraticCurveTo(-1, -66.5, -9, -64);
    ctx.fill();
    ctx.fillStyle = S.gem;
    ctx.beginPath(); ctx.arc(-1, -66.5, 1.8, 0, 7); ctx.fill();
  } else if (hat.style === 'wizard') {
    ctx.fillStyle = hat.dark;
    ctx.beginPath(); ctx.ellipse(0, -60, 15, 4.5, -0.08, 0, 7); ctx.fill();
    ctx.fillStyle = hat.color;
    ctx.beginPath();
    ctx.moveTo(-11, -60);
    ctx.quadraticCurveTo(-2, -72, 2, -86);
    ctx.quadraticCurveTo(8, -72, 11, -59);
    ctx.quadraticCurveTo(0, -64, -11, -60);
    ctx.fill();
    ctx.fillStyle = '#ffd339';
    ctx.beginPath(); ctx.arc(1, -76, 1.8, 0, 7); ctx.fill();
  } else if (hat.style === 'ribbon') {
    ctx.fillStyle = hat.color;
    ctx.beginPath(); ctx.moveTo(-5, -63); ctx.lineTo(-13, -68); ctx.lineTo(-10, -59); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -63); ctx.lineTo(0, -70); ctx.lineTo(2, -61); ctx.fill();
    ctx.beginPath(); ctx.arc(-4.5, -63, 2.4, 0, 7); ctx.fill();
  } else if (hat.style === 'straw') {
    ctx.fillStyle = hat.color;
    ctx.beginPath(); ctx.ellipse(1, -59, 17, 4.5, -0.05, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1, -62, 9, 6.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c9556a';
    ctx.fillRect(-7, -63.5, 17, 2.5);
  }

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
  } else if (def.kind === 'stylist') {
    ctx.translate(0, bob * 0.4);
    // 다리
    ctx.fillStyle = '#3a3a48'; ctx.fillRect(-7, -12, 6, 12); ctx.fillRect(2, -12, 6, 12);
    // 원피스
    ctx.fillStyle = '#9a6ad0';
    ctx.beginPath(); ctx.moveTo(-9, -38); ctx.lineTo(9, -38); ctx.lineTo(12, -11); ctx.lineTo(-12, -11); ctx.fill();
    ctx.fillStyle = '#f5d0ff'; ctx.fillRect(-9, -30, 19, 2.5);
    // 머리
    ctx.fillStyle = '#ffe0cc'; ctx.beginPath(); ctx.arc(1, -46, 9, 0, 7); ctx.fill();
    // 보라 단발
    ctx.fillStyle = '#c48ae8';
    ctx.beginPath(); ctx.ellipse(-1, -50, 10.5, 8, -0.15, Math.PI, 0.2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-7, -42, 4.5, 8, 0.2, 0, 7); ctx.fill();
    // 베레모
    ctx.fillStyle = '#e8548a';
    ctx.beginPath(); ctx.ellipse(-2, -55, 9.5, 4.5, -0.25, Math.PI, 0.15); ctx.fill();
    // 눈/입
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(4, -46, 1.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b06a50'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(6, -42, 1.6, 0.3, Math.PI - 0.6); ctx.stroke();
    // 옷걸이 (들고 있음)
    ctx.strokeStyle = '#c0c8d8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(16, -30, 2.5, Math.PI * 0.4, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -21); ctx.lineTo(16, -27); ctx.lineTo(22, -21); ctx.closePath(); ctx.stroke();
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
  if (p.kind === 'wave') { // 장검 검기 (초승달)
    const dir = p.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);
    ctx.shadowColor = '#ff9fd0'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ffd0e8'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(-14, 0, 22, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = '#ff70b0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-14, 0, 15, -1, 1); ctx.stroke();
  } else if (p.kind === 'star' || p.kind === 'fallstar') { // 마법봉 별
    const big = p.kind === 'fallstar' ? 1.5 : 1;
    ctx.rotate(gameTime * 8);
    ctx.shadowColor = '#ffe070'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffd339';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5, a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 9 * big, Math.sin(a) * 9 * big);
      ctx.lineTo(Math.cos(a2) * 4 * big, Math.sin(a2) * 4 * big);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath(); ctx.arc(0, 0, 2.5 * big, 0, 7); ctx.fill();
  } else if (p.kind === 'parrow' || p.kind === 'rainarrow') { // 화살
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = '#d8dce8';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
    ctx.fillStyle = '#e86a8a';
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, -4); ctx.lineTo(-13, 0); ctx.lineTo(-16, 4); ctx.fill();
  } else if (p.kind === 'shockw') { // 워해머 지면 충격파
    const dir = p.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(200,160,110,.85)';
    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-8, -22, 2, -14); ctx.quadraticCurveTo(8, -26, 14, 0);
    ctx.fill();
    ctx.fillStyle = '#8a6a4a';
    ctx.beginPath(); ctx.arc(-6, -8, 4, 0, 7); ctx.arc(6, -12, 3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,.5)';
    ctx.beginPath(); ctx.ellipse(-2, -2, 20, 5, 0, 0, 7); ctx.fill();
  } else if (p.kind === 'bullet') { // 총알
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.shadowColor = '#ffe080'; ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(255,210,90,.5)';
    ctx.fillRect(-16, -1.5, 14, 3);
    ctx.fillStyle = '#ffd048';
    ctx.beginPath(); ctx.roundRect(-4, -2.5, 10, 5, 2.5); ctx.fill();
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
  } else if (d.type === 'weapon') {
    ctx.fillStyle = 'rgba(255,240,160,' + (0.35 + Math.sin(d.t * 5) * 0.15) + ')';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(WEAPONS[d.wid].icon, 0, 6);
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
  } else if (f.type === 'ghost') { // 단검 러시 잔상
    ctx.translate(f.x, f.y);
    ctx.scale(f.face, 1);
    ctx.fillStyle = 'rgba(120,80,220,' + Math.max(0, 0.55 - pr * 1.3) + ')';
    ctx.beginPath(); ctx.roundRect(-11, -58, 22, 56, 10); ctx.fill();
  } else if (f.type === 'rock') { // 지진 바위 파편
    const h = pr * 3 * (1 - pr * 1.2);
    ctx.translate(f.x, f.y - Math.max(0, h) * 110);
    ctx.rotate(pr * 6);
    ctx.globalAlpha = Math.max(0, 1 - pr * 1.6);
    ctx.fillStyle = '#7a6a58';
    const r = f.r || 8;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.5); ctx.lineTo(-r * 0.4, -r); ctx.lineTo(r * 0.7, -r * 0.6); ctx.lineTo(r, r * 0.6); ctx.lineTo(0, r);
    ctx.fill();
  } else if (f.type === 'laser') { // 총 필살기 빔
    ctx.translate(f.x, f.y);
    ctx.scale(f.face, 1);
    const a = Math.max(0, 1 - pr * 1.8);
    const th = 16 * (1 - pr) + 6;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#7fe8ff';
    ctx.fillRect(0, -th, f.r, th * 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, -th * 0.4, f.r, th * 0.8);
    ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(4, 0, th + 5, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (f.type === 'starburst') { // 별똥별 착탄
    ctx.translate(f.x, f.y);
    ctx.fillStyle = 'rgba(255,220,90,' + Math.max(0, 1 - pr * 1.8) + ')';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + pr * 3;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 30 * pr * 3, Math.sin(a) * 22 * pr * 3 - 8, 3.5 * (1 - pr), 0, 7); ctx.fill();
    }
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

// ---------- Firebase (구글 로그인 + 클라우드 저장) ----------
const fbState = { auth: null, db: null, user: null, ready: false, timer: null };
const btnLogin = document.getElementById('btnLogin');

function updateLoginBtn() {
  if (!fbState.ready) { btnLogin.textContent = '☁️ 오프라인'; btnLogin.classList.add('off'); return; }
  btnLogin.classList.remove('off');
  btnLogin.textContent = fbState.user ? '☁️ ' + (fbState.user.displayName || '유저').slice(0, 5) : 'G 로그인';
}
function initFirebase() {
  try {
    if (typeof firebase === 'undefined' || !window.FIREBASE_CONFIG) { updateLoginBtn(); return; }
    firebase.initializeApp(window.FIREBASE_CONFIG);
    fbState.auth = firebase.auth();
    fbState.db = firebase.firestore();
    fbState.ready = true;
    fbState.auth.onAuthStateChanged((u) => {
      const wasOut = !fbState.user;
      fbState.user = u;
      updateLoginBtn();
      if (u && wasOut) {
        addMsg('☁️ ' + (u.displayName || '') + ' 로그인 — 클라우드 저장 켜짐', 3);
        cloudLoad();
      }
    });
    fbState.auth.getRedirectResult().catch(() => {});
  } catch (e) {}
  updateLoginBtn();
}
function doLogin() {
  if (!fbState.ready) { addMsg('클라우드 연결이 안 돼요 (네트워크 확인)', 2); return; }
  if (fbState.user) {
    if (window.confirm('로그아웃 할까요? (이 기기에는 저장이 유지돼요)')) fbState.auth.signOut();
    return;
  }
  try {
    const pv = new firebase.auth.GoogleAuthProvider();
    fbState.auth.signInWithPopup(pv).catch(() => {
      fbState.auth.signInWithRedirect(pv).catch(() => addMsg('로그인에 실패했어요', 2));
    });
  } catch (e) {}
}
btnLogin.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); doLogin(); });

function cloudData() {
  return {
    level: player.level, exp: Math.floor(player.exp), mesos: player.mesos,
    equip: Object.assign({}, equip), weapon: gear.weapon,
    owned: Object.keys(gear.owned).filter(k => gear.owned[k]),
    updatedAt: Date.now()
  };
}
function cloudSave() { // 저장 요청을 3초 디바운스로 묶어 Firestore에 기록
  if (!fbState.user || !fbState.db) return;
  clearTimeout(fbState.timer);
  fbState.timer = setTimeout(() => {
    try { fbState.db.collection('users').doc(fbState.user.uid).set(cloudData()).catch(() => {}); } catch (e) {}
  }, 3000);
}
async function cloudLoad() {
  try {
    const snap = await fbState.db.collection('users').doc(fbState.user.uid).get();
    if (snap.exists) {
      const c = snap.data();
      const better = (c.level || 1) > player.level ||
        ((c.level || 1) === player.level && (c.exp || 0) >= player.exp);
      if (better) {
        player.level = c.level || 1; player.exp = c.exp || 0; player.mesos = c.mesos || 0;
        if (c.equip) {
          for (const k in equip) {
            const v = c.equip[k];
            if (Number.isInteger(v) && v >= 0 && v < EQUIP_OPTIONS[k].length) equip[k] = v;
          }
        }
        if (Array.isArray(c.owned)) for (const id of c.owned) if (WEAPONS[id]) gear.owned[id] = true;
        gear.owned.sword = true;
        if (c.weapon && WEAPONS[c.weapon] && gear.owned[c.weapon]) gear.weapon = c.weapon;
        player.hp = maxHp(); player.mp = maxMp();
        updateSkillBtns();
        addMsg('☁️ 클라우드 세이브 불러옴 (Lv.' + player.level + ')', 3);
      }
    }
    save();
  } catch (e) {}
}
initFirebase();
updateSkillBtns();

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
