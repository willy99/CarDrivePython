// ── Wire-cutting defusal mini-game ────────────────────────────────────────
import { lang } from './i18n.js?v=11';

// Wire colour definitions
const WIRE_DEF = {
  red:    { uk: 'Червоний',     en: 'Red',    hex: '#dc2626', glow: '#ff4444' },
  blue:   { uk: 'Синій',       en: 'Blue',   hex: '#2563eb', glow: '#60a5fa' },
  green:  { uk: 'Зелений',     en: 'Green',  hex: '#16a34a', glow: '#4ade80' },
  yellow: { uk: 'Жовтий',      en: 'Yellow', hex: '#ca8a04', glow: '#fde047' },
  black:  { uk: 'Чорний',      en: 'Black',  hex: '#475569', glow: '#94a3b8' },
  white:  { uk: 'Білий',       en: 'White',  hex: '#e2e8f0', glow: '#ffffff' },
  orange: { uk: 'Помаранчевий', en: 'Orange', hex: '#ea580c', glow: '#fb923c' },
};

// SVG bezier wire paths for 3-wire and 4-wire devices
// mid = approximate point at t=0.5 (de Casteljau)
const PATHS_3 = [
  { d: 'M 90,78 C 175,28 345,28 425,85',     midX: 259, midY: 41  },
  { d: 'M 90,116 C 175,116 345,114 425,114',  midX: 259, midY: 115 },
  { d: 'M 90,154 C 175,212 345,212 425,152',  midX: 259, midY: 197 },
];
const PATHS_4 = [
  { d: 'M 90,72 C 175,22 345,22 425,80',      midX: 259, midY: 36  },
  { d: 'M 90,100 C 175,98 345,100 425,100',   midX: 259, midY: 99  },
  { d: 'M 90,130 C 175,132 345,130 425,130',  midX: 259, midY: 131 },
  { d: 'M 90,158 C 175,216 345,213 425,155',  midX: 259, midY: 200 },
];

// ── Device type catalogue ─────────────────────────────────────────────────
export const DEVICES = {
  svp_simple: {
    name:     { en: 'Improvised IED', uk: 'Саморобна міна' },
    timerSec: null,
    hasTimer: false,
    hasRadio: false,
    wirePaths: PATHS_3,
    variants: [
      { colors: ['red', 'blue', 'black'],   solution: ['blue']  },
      { colors: ['red', 'red',  'black'],   solution: ['black'] },
      { colors: ['green', 'red', 'black'],  solution: ['green'] },
    ],
    ruleEn: [
      '🔴 Red wires connect to the detonator. Do NOT cut red first.',
      '🔵 If there is exactly one blue wire — cut it. That\'s the arming circuit.',
      '⚫ If there is no blue — cut the first non-red wire.',
      '✂ One cut required.',
    ],
    ruleUk: [
      '🔴 Червоні дроти йдуть до детонатора. НЕ ріж червоний першим.',
      '🔵 Якщо є рівно один синій — відріж його. Це збройовий контур.',
      '⚫ Немає синього — відріж перший не-червоний дріт.',
      '✂ Потрібен один розріз.',
    ],
  },

  timer_bomb: {
    name:     { en: 'Timer IED', uk: 'Тайм-бомба' },
    timerSec: 90,
    hasTimer: true,
    hasRadio: false,
    wirePaths: PATHS_4,
    variants: [
      { colors: ['red', 'blue',   'yellow', 'black'], solution: ['blue',   'red'], forbidden: ['yellow'] },
      { colors: ['red', 'green',  'yellow', 'black'], solution: ['green'],          forbidden: ['yellow'] },
      { colors: ['red', 'orange', 'yellow', 'black'], solution: ['orange', 'red'],  forbidden: ['yellow'] },
    ],
    ruleEn: [
      '🟡 YELLOW = anti-tamper sensor. NEVER cut yellow — instant detonation.',
      '🟢 If there is a GREEN wire — cut ONLY green (overrides all rules).',
      '🔵 Otherwise cut the timer wire first (blue, or orange if no blue).',
      '🔴 Then cut the detonator wire (red). Two cuts in sequence.',
    ],
    ruleUk: [
      '🟡 ЖОВТИЙ = датчик руху. НІКОЛИ не ріж жовтий — миттєва детонація.',
      '🟢 Якщо є ЗЕЛЕНИЙ — ріж ТІЛЬКИ зелений (пріоритет над усіма).',
      '🔵 Інакше — спочатку ланцюг таймера (синій, або помаранчевий якщо нема синього).',
      '🔴 Потім детонатор (червоний). Два розрізи по черзі.',
    ],
  },

  radio_ied: {
    name:     { en: 'Radio-triggered IED', uk: 'РК-пастка' },
    timerSec: null,
    hasTimer: false,
    hasRadio: true,
    wirePaths: PATHS_4,
    variants: [
      { colors: ['white', 'red', 'blue',   'black'], solution: ['white', 'blue']   },
      { colors: ['white', 'red', 'orange', 'black'], solution: ['white', 'orange'] },
    ],
    ruleEn: [
      '⬜ WHITE = antenna wire. CUT WHITE FIRST — always, no exceptions.',
      '💥 Cutting any other wire before white triggers the remote detonator.',
      '🔵 After white: cut the secondary wire (blue or orange).',
      '✂ Two cuts required, in order.',
    ],
    ruleUk: [
      '⬜ БІЛИЙ = антена. СПОЧАТКУ ВІДРІЖ БІЛИЙ — завжди, без винятків.',
      '💥 Будь-який інший дріт до білого активує радіодетонатор.',
      '🔵 Після білого: відріж вторинний провід (синій або помаранчевий).',
      '✂ Два розрізи по черзі.',
    ],
  },
};

// ── SVG builder ──────────────────────────────────────────────────────────
function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function buildSVG(defType, variant, timeLeft) {
  const paths = defType.wirePaths;
  const colors = variant.colors;

  const wires = colors.map((color, i) => {
    const wd = WIRE_DEF[color];
    const p = paths[i];
    return `
<path class="wire-vis" data-idx="${i}"
  d="${p.d}" stroke="${wd.hex}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
<path class="wire-hit" data-idx="${i}" data-color="${color}"
  d="${p.d}" stroke="transparent" stroke-width="24" fill="none" stroke-linecap="round"
  style="cursor:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ctext y='22' font-size='22'%3E%E2%9C%82%3C/text%3E%3C/svg%3E&quot;) 8 8,crosshair"/>`;
  }).join('');

  const timerSVG = defType.hasTimer ? `
<g transform="translate(190,42)">
  <rect x="0" y="0" width="120" height="72" rx="5" fill="#0d2e0d" stroke="#1a5a1a" stroke-width="1.5"/>
  <rect x="5" y="9" width="40" height="2.5" rx="1" fill="#1a5a1a"/>
  <rect x="52" y="9" width="60" height="2.5" rx="1" fill="#1a5a1a"/>
  <rect x="5" y="59" width="110" height="2.5" rx="1" fill="#1a5a1a"/>
  <rect x="100" y="16" width="13" height="24" rx="3" fill="#1a3a0a" stroke="#2a6a1a" stroke-width="1"/>
  <rect x="8" y="20" width="13" height="20" rx="3" fill="#1a3a0a" stroke="#2a6a1a" stroke-width="1"/>
  <rect x="18" y="27" width="78" height="30" rx="4" fill="#050a02" stroke="#0a2a0a" stroke-width="1.5"/>
  <text id="df-led" x="57" y="48" text-anchor="middle"
    fill="#ff2200" font-size="19" font-weight="900" font-family="monospace">${fmtTime(timeLeft != null ? timeLeft : (defType.timerSec || 90))}</text>
  <circle cx="100" cy="11" r="3.5" fill="#ff0000" opacity="0.85"/>
  <circle cx="110" cy="11" r="3.5" fill="#22c55e" opacity="0.85"/>
</g>` : '';

  const radioSVG = defType.hasRadio ? `
<g transform="translate(190,45)">
  <rect x="0" y="0" width="120" height="68" rx="5" fill="#0d1a2e" stroke="#1a3a5a" stroke-width="1.5"/>
  <path d="M 38,38 C 38,22 48,22 48,38 C 48,22 58,22 58,38 C 58,22 68,22 68,38 C 68,22 78,22 78,38"
    stroke="#4a8ac0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <line x1="58" y1="22" x2="58" y2="12" stroke="#4a8ac0" stroke-width="2.5"/>
  <line x1="48" y1="12" x2="68" y2="12" stroke="#4a8ac0" stroke-width="2.5"/>
  <circle cx="58" cy="38" r="1" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="6;22;6" dur="1.8s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite"/>
  </circle>
  <circle cx="10" cy="12" r="5" fill="#22c55e" opacity="0.9"/>
  <circle cx="10" cy="12" r="3" fill="#86efac"/>
  <text x="22" y="16" fill="#4a8ac0" font-size="8" font-family="monospace" font-weight="700">ARMED</text>
  <text x="60" y="58" text-anchor="middle" fill="#4a8ac0" font-size="8" font-family="monospace">RC RECEIVER</text>
</g>` : '';

  return `<svg viewBox="0 0 520 280" xmlns="http://www.w3.org/2000/svg" id="df-svg">
<defs>
  <filter id="df-wshadow">
    <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#000" flood-opacity="0.55"/>
  </filter>
</defs>

<!-- Case body -->
<rect x="8" y="8" width="504" height="264" rx="12" fill="#1a2d1a" stroke="#3a5a3a" stroke-width="2.5"/>
<rect x="14" y="14" width="492" height="252" rx="9" fill="none" stroke="#0a180a" stroke-width="1.5" opacity="0.6"/>
<circle cx="26" cy="26" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="494" cy="26" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="26" cy="254" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<circle cx="494" cy="254" r="5" fill="#2d4a2d" stroke="#1a2a1a" stroke-width="1.5"/>
<rect x="8" y="118" width="9" height="44" rx="3" fill="#2a4a2a" stroke="#3a6a3a" stroke-width="1"/>
<rect x="503" y="118" width="9" height="44" rx="3" fill="#2a4a2a" stroke="#3a6a3a" stroke-width="1"/>

<!-- Battery -->
<rect x="28" y="64" width="54" height="88" rx="7" fill="#c4a020" stroke="#a08010" stroke-width="2"/>
<rect x="34" y="56" width="42" height="12" rx="3" fill="#888" stroke="#666" stroke-width="1"/>
<rect x="38" y="49" width="13" height="10" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
<rect x="55" y="51" width="10" height="8" rx="2" fill="#888" stroke="#666" stroke-width="1"/>
<text x="55" y="108" text-anchor="middle" fill="#2d1a00" font-size="13" font-weight="900" font-family="monospace">9V</text>
<text x="55" y="123" text-anchor="middle" fill="#2d1a00" font-size="7.5" font-family="monospace">BATTERY</text>
<rect x="34" y="133" width="42" height="3" rx="1" fill="#a08010" opacity="0.5"/>
<rect x="34" y="140" width="42" height="3" rx="1" fill="#a08010" opacity="0.5"/>
<rect x="34" y="147" width="42" height="3" rx="1" fill="#a08010" opacity="0.5"/>

<!-- Left wire connector block -->
<rect x="83" y="74" width="13" height="106" rx="3" fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5"/>
<circle cx="89" cy="90" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="89" cy="106" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="89" cy="122" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="89" cy="138" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="89" cy="154" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>

<!-- Ground PCB -->
<rect x="108" y="175" width="130" height="55" rx="5" fill="#0d1f0d" stroke="#1a3a1a" stroke-width="1.5"/>
<line x1="118" y1="187" x2="228" y2="187" stroke="#1a4a1a" stroke-width="1.5"/>
<line x1="118" y1="200" x2="222" y2="200" stroke="#1a4a1a" stroke-width="1.5"/>
<circle cx="128" cy="194" r="3" fill="#2a5a2a" stroke="#3a8a3a" stroke-width="1"/>
<circle cx="148" cy="194" r="3" fill="#2a5a2a" stroke="#3a8a3a" stroke-width="1"/>
<circle cx="168" cy="194" r="3" fill="#2a5a2a" stroke="#3a8a3a" stroke-width="1"/>
<circle cx="188" cy="194" r="3" fill="#2a5a2a" stroke="#3a8a3a" stroke-width="1"/>
<circle cx="208" cy="194" r="3" fill="#2a5a2a" stroke="#3a8a3a" stroke-width="1"/>

${timerSVG}${radioSVG}

<!-- Right wire connector block -->
<rect x="424" y="82" width="13" height="96" rx="3" fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5"/>
<circle cx="430" cy="98" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="430" cy="114" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="430" cy="130" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>
<circle cx="430" cy="146" r="3.5" fill="#2a2a2a" stroke="#484848" stroke-width="1"/>

<!-- Detonator cylinder -->
<ellipse cx="471" cy="62" rx="23" ry="11" fill="#9aaa9a" stroke="#6a8a6a" stroke-width="1.5"/>
<rect x="448" y="62" width="46" height="120" fill="#b0c0b0" stroke="#8aaa8a" stroke-width="1.5"/>
<ellipse cx="471" cy="182" rx="23" ry="11" fill="#8a9a8a" stroke="#6a8a6a" stroke-width="1.5"/>
<rect x="457" y="80" width="28" height="5" rx="2" fill="#7a8a7a"/>
<rect x="457" y="92" width="28" height="5" rx="2" fill="#7a8a7a"/>
<text x="471" y="120" text-anchor="middle" fill="#2a4a2a" font-size="11" font-weight="900" font-family="monospace">DET</text>
<text x="471" y="138" text-anchor="middle" font-size="16">⚡</text>
<circle cx="459" cy="188" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>
<circle cx="483" cy="188" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>

<!-- Wires (drawn last = on top) -->
<g filter="url(#df-wshadow)">${wires}
</g>
</svg>`;
}

// ── Main exported function ────────────────────────────────────────────────
export function showDefusal(cell, onSuccess, onFail) {
  const isUk = lang === 'uk';
  const defType = DEVICES[cell.device.type];
  const variant = defType.variants[cell.device.variantIdx];

  let modal = document.getElementById('defusal-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'defusal-modal';
    document.body.appendChild(modal);
  }

  let timeLeft = defType.timerSec || 0;
  let timerInterval = null;
  let resolved = false;

  const deviceName = isUk ? defType.name.uk : defType.name.en;
  const rules = (isUk ? defType.ruleUk : defType.ruleEn)
    .map(r => `<li>${r}</li>`).join('');
  const timerBar = defType.timerSec
    ? `<span id="df-timer">${fmtTime(timeLeft)}</span>` : '';
  const hintLabel = isUk ? '📋 Інструкція' : '📋 Manual';
  const statusInit = isUk ? '✂ Оберіть дріт для розрізання' : '✂ Select a wire to cut';

  modal.innerHTML = `
<div id="df-box">
  <div id="df-header">
    <span id="df-devname">${deviceName}</span>
    ${timerBar}
    <button id="df-hint-btn" class="btn">${hintLabel}</button>
  </div>
  <div id="df-device">${buildSVG(defType, variant, timeLeft || defType.timerSec)}</div>
  <div id="df-status">${statusInit}</div>
  <div id="df-hint-panel">
    <ul>${rules}</ul>
  </div>
</div>`;

  modal.style.display = 'flex';

  document.getElementById('df-hint-btn').onclick = () => {
    const p = document.getElementById('df-hint-panel');
    p.classList.toggle('df-hint-open');
  };

  const svg = document.getElementById('df-svg');
  const solution = variant.solution;
  const forbidden = variant.forbidden || [];
  let nextStep = 0;
  const cutSet = new Set();

  // Attach hover + click handlers to each wire hit area
  svg.querySelectorAll('.wire-hit').forEach(hit => {
    const visEl = svg.querySelector(`.wire-vis[data-idx="${hit.dataset.idx}"]`);
    hit.addEventListener('mouseenter', () => { if (!cutSet.has(+hit.dataset.idx)) visEl.classList.add('wire-hover'); });
    hit.addEventListener('mouseleave', () => visEl.classList.remove('wire-hover'));
    hit.addEventListener('click', () => onWireClick(hit, visEl));
    hit.addEventListener('touchend', e => { e.preventDefault(); onWireClick(hit, visEl); });
  });

  function onWireClick(hit, visEl) {
    if (resolved) return;
    const idx = +hit.dataset.idx;
    const color = hit.dataset.color;
    if (cutSet.has(idx)) return;

    visEl.classList.remove('wire-hover');

    if (forbidden.includes(color)) {
      visEl.classList.add('wcut-wrong');
      spawnSpark(defType.wirePaths[idx], '#ff3333');
      setStatus(isUk ? '💥 АНТИОБРОБНИЙ ДАТЧИК! Детонація!' : '💥 ANTI-TAMPER! Detonation!', 'error');
      setTimeout(() => resolve(false), 800);
      return;
    }

    const expected = solution[nextStep];
    if (color !== expected) {
      visEl.classList.add('wcut-wrong');
      spawnSpark(defType.wirePaths[idx], '#ff6600');
      setStatus(isUk ? '❌ Невірний провід!' : '❌ Wrong wire!', 'error');
      setTimeout(() => resolve(false), 800);
      return;
    }

    // Correct cut
    cutSet.add(idx);
    hit.style.pointerEvents = 'none';
    visEl.classList.add('wcut');
    spawnSpark(defType.wirePaths[idx], '#22c55e');
    nextStep++;

    if (nextStep >= solution.length) {
      setStatus(isUk ? '✅ Пристрій знешкоджено!' : '✅ Device neutralized!', 'success');
      setTimeout(() => resolve(true), 750);
    } else {
      const nextColor = solution[nextStep];
      const wd = WIRE_DEF[nextColor];
      const nextName = isUk ? wd.uk : wd.en;
      setStatus(isUk ? `✅ Є! Далі: ${nextName}` : `✅ Good! Next: ${nextName}`, 'ok');
    }
  }

  function spawnSpark(pathDef, color) {
    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    spark.setAttribute('cx', pathDef.midX);
    spark.setAttribute('cy', pathDef.midY);
    spark.setAttribute('r', '6');
    spark.setAttribute('fill', color);
    spark.classList.add('df-spark');
    svg.appendChild(spark);
    setTimeout(() => spark.remove(), 700);
  }

  function setStatus(text, cls) {
    const el = document.getElementById('df-status');
    if (!el) return;
    el.textContent = text;
    el.className = cls ? `df-s-${cls}` : '';
  }

  function updateTimer() {
    const timerEl = document.getElementById('df-timer');
    const ledEl = document.getElementById('df-led');
    const fmt = fmtTime(timeLeft);
    if (timerEl) { timerEl.textContent = fmt; if (timeLeft <= 10) timerEl.classList.add('df-critical'); }
    if (ledEl) ledEl.textContent = fmt;
  }

  if (defType.timerSec) {
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) { clearInterval(timerInterval); resolve(false); }
    }, 1000);
  }

  function resolve(success) {
    if (resolved) return;
    resolved = true;
    if (timerInterval) clearInterval(timerInterval);
    setTimeout(() => {
      modal.style.display = 'none';
      modal.innerHTML = '';
      if (success) onSuccess({ hasTimer: defType.hasTimer, secsLeft: timeLeft });
      else onFail();
    }, success ? 400 : 600);
  }
}
