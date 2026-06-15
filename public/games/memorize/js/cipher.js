// ═══════════════════════════════════════════════════════
// CIPHER — Number Shape Mnemonic Subgame
// Each digit 0–9 maps to a vivid shape. Build stories.
// ═══════════════════════════════════════════════════════

const CPH_BG  = ['#1e1b4b','#1c0f00','#042f47','#3b0a1f','#022c22','#1a0a00','#1f0707','#1a1400','#1e0a3c','#021412'];
const CPH_CLR = ['#a5b4fc','#fcd34d','#7dd3fc','#fb7185','#6ee7b7','#fbbf24','#fca5a5','#fde047','#c4b5fd','#5eead4'];

// SVG body (viewBox 0 0 100 100) for each digit
const CPH_SVG = [
  // 0 – Ring
  `<circle cx="50" cy="50" r="28" fill="none" stroke="#a5b4fc" stroke-width="14"/>
   <circle cx="38" cy="38" r="7" fill="#818cf8" opacity=".35"/>`,
  // 1 – Candle
  `<rect x="42" y="40" width="16" height="36" rx="3" fill="#fef9c3"/>
   <path d="M50,11 C46,20 42,27 50,33 C58,27 54,20 50,11Z" fill="#f97316"/>
   <line x1="50" y1="33" x2="50" y2="41" stroke="#94a3b8" stroke-width="2"/>
   <ellipse cx="50" cy="76" rx="9" ry="3" fill="#9ca3af" opacity=".4"/>`,
  // 2 – Swan
  `<ellipse cx="50" cy="84" rx="38" ry="10" fill="#38bdf8" opacity=".35"/>
   <path d="M24 84 Q37 80 50 84 Q63 88 76 84" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity=".5"/>
   <ellipse cx="58" cy="70" rx="27" ry="19" fill="#f8fafc"/>
   <path d="M82 65 q10 -2 12 8 q-6 -2 -12 5 z" fill="#f0f9ff"/>
   <path d="M44 56 Q32 40 38 22 Q44 10 52 9" fill="none" stroke="#f8fafc" stroke-width="13" stroke-linecap="round"/>
   <circle cx="52" cy="11" r="12" fill="#f8fafc"/>
   <path d="M60 11 Q75 8 73 16 Q69 21 60 17 z" fill="#f59e0b"/>
   <circle cx="56" cy="8" r="3" fill="#1c1c24"/>
   <circle cx="55" cy="7" r="1.2" fill="white"/>
   <path d="M36 56 Q54 48 74 63" fill="none" stroke="#dbeafe" stroke-width="2.5" opacity=".8"/>`,
  // 3 – Heart
  `<path d="M50,68 L17,40 A18,18,0,0,1,50,31 A18,18,0,0,1,83,40 Z" fill="#f43f5e"/>
   <ellipse cx="35" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>
   <ellipse cx="65" cy="36" rx="11" ry="7" fill="#fb7185" opacity=".55"/>`,
  // 4 – Flag
  `<rect x="32" y="16" width="5" height="60" rx="2.5" fill="#94a3b8"/>
   <path d="M37,16 L76,26 L70,42 L37,32Z" fill="#34d399"/>
   <path d="M37,32 L70,42 L64,58 L37,48Z" fill="#10b981"/>
   <circle cx="32" cy="78" r="4" fill="#475569"/>`,
  // 5 – Hand (open palm)
  `<rect x="24" y="18" width="10" height="34" rx="5" fill="#fde68a"/>
   <rect x="36" y="12" width="10" height="40" rx="5" fill="#fed7aa"/>
   <rect x="48" y="10" width="10" height="42" rx="5" fill="#fde68a"/>
   <rect x="60" y="14" width="10" height="38" rx="5" fill="#fed7aa"/>
   <rect x="22" y="50" width="56" height="26" rx="12" fill="#fbbf24"/>`,
  // 6 – Cherry
  `<path d="M35,49 Q50,20 65,51" fill="none" stroke="#22c55e" stroke-width="4.5" stroke-linecap="round"/>
   <path d="M50,29 Q61,16 67,21" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round"/>
   <circle cx="31" cy="62" r="15" fill="#ef4444"/>
   <circle cx="63" cy="66" r="15" fill="#dc2626"/>
   <circle cx="26" cy="57" r="5" fill="#fca5a5" opacity=".55"/>`,
  // 7 – Lightning
  `<path d="M60,10 L30,52 L49,52 L40,86 L70,44 L51,44 Z" fill="#fde047" stroke="#a16207" stroke-width="1.5" stroke-linejoin="round"/>
   <path d="M35,52 L48,52" stroke="#fef08a" stroke-width="2" opacity=".6"/>`,
  // 8 – Snowman
  `<circle cx="50" cy="65" r="19" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
   <circle cx="50" cy="37" r="15" fill="white" stroke="#ddd6fe" stroke-width="1.5"/>
   <circle cx="44" cy="34" r="3" fill="#4b5563"/>
   <circle cx="56" cy="34" r="3" fill="#4b5563"/>
   <path d="M43,41 Q50,46 57,41" fill="none" stroke="#4b5563" stroke-width="2" stroke-linecap="round"/>
   <rect x="35" y="21" width="30" height="9" rx="4.5" fill="#7c3aed"/>
   <rect x="30" y="18" width="40" height="6" rx="3" fill="#6d28d9"/>
   <rect x="43" y="58" width="5" height="14" rx="2.5" fill="#f97316"/>
   <rect x="52" y="61" width="5" height="11" rx="2.5" fill="#f97316"/>`,
  // 9 – Balloon
  `<ellipse cx="50" cy="36" rx="23" ry="28" fill="#2dd4bf"/>
   <ellipse cx="43" cy="28" rx="10" ry="13" fill="#67e8f9" opacity=".5"/>
   <path d="M50,64 Q48,72 50,76 Q52,80 50,86" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
   <path d="M43,62 L57,62 L50,70Z" fill="#0f766e"/>`,
];

const CPH_LEVELS = [
  {len:3, study:9000,  showLabel:true,  introKey:'cph_intro_learn'},
  {len:3, study:7000,  showLabel:true},
  {len:4, study:10000, showLabel:true},
  {len:4, study:7000,  showLabel:false, introKey:'cph_intro_hidden'},
  {len:5, study:10000, showLabel:false},
  {len:5, study:7000,  showLabel:false},
  {len:6, study:11000, showLabel:false},
  {len:6, study:8000,  showLabel:false},
  {len:7, study:12000, showLabel:false},
  {len:9, study:15000, showLabel:false},
];

const CPH_DAILY_LEN = 6;
const CPH_LS_KEY = 'membrain_cipher_v1';

let cphState = {
  level:0, digits:[], answer:[], timer:null, daily:false, showLabel:true
};
let cphTimers = [];

// ── Seeded RNG (same as Colombo's mulberry32) ──
function cphRng(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 4294967296;
  };
}

function cphDailySeed() { return Math.floor(Date.now() / 86400000); }

function cphGenDigits(len, seed) {
  const rng = cphRng(seed);
  const arr = [];
  for (let i = 0; i < len; i++) arr.push(Math.floor(rng() * 10));
  return arr;
}

function cphSavedData() {
  try { return JSON.parse(localStorage.getItem(CPH_LS_KEY) || '{}'); } catch(e) { return {}; }
}

// ── SVG helper ──
function cphIconSvg(digit, size, borderColor) {
  const bc = borderColor || (CPH_CLR[digit] + '44');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="border-radius:50%;background:${CPH_BG[digit]};border:2px solid ${bc};display:block;flex-shrink:0">${CPH_SVG[digit]}</svg>`;
}

// ── Story generator ──
function cphMakeStory(digits) {
  if (digits.length === 0) return '';
  const names = digits.map(d => t('cph_shape_' + d));
  if (digits.length === 1) return names[0];
  if (digits.length === 2) {
    const idx = (digits[0] + digits[1]) % 5;
    const tpls = [
      (a,b) => t('cph_story_tpl_2a', a, b),
      (a,b) => t('cph_story_tpl_2b', a, b),
      (a,b) => t('cph_story_tpl_2c', a, b),
      (a,b) => t('cph_story_tpl_2d', a, b),
      (a,b) => t('cph_story_tpl_2e', a, b),
    ];
    return tpls[idx](names[0], names[1]);
  }
  if (digits.length === 3) {
    const idx = (digits[0] + digits[2]) % 4;
    const tpls = [
      (a,b,c) => t('cph_story_tpl_3a', a, b, c),
      (a,b,c) => t('cph_story_tpl_3b', a, b, c),
      (a,b,c) => t('cph_story_tpl_3c', a, b, c),
      (a,b,c) => t('cph_story_tpl_3d', a, b, c),
    ];
    return tpls[idx](names[0], names[1], names[2]);
  }
  // 4+ → split into chunks of 2-3
  const half = Math.floor(digits.length / 2);
  return cphMakeStory(digits.slice(0, half)) + ' · ' + cphMakeStory(digits.slice(half));
}

// ── Menu ──
function showCipherMenu() {
  showScreen('screen-cipher');
  const menu    = document.getElementById('cipher-menu');
  const study   = document.getElementById('cipher-study');
  const recall  = document.getElementById('cipher-recall');
  const result  = document.getElementById('cipher-result');
  if (menu)   menu.style.display   = '';
  if (study)  study.style.display  = 'none';
  if (recall) recall.style.display = 'none';
  if (result) result.style.display = 'none';

  cphTimers.forEach(clearTimeout); cphTimers = [];

  cphBuildRefStrip();
  cphBuildLevelGrid();
  cphBuildDailyCard();
  cphBuildStats();
  cphSetTxt('cipher-section-title', 'cph_section_title');
  cphSetTxt('cipher-section-sub',   'cph_section_sub');
  cphSetTxt('cipher-training-head', 'cph_training_head');
  cphSetTxt('cipher-opts-label',    'opts_label');
  restoreOpts('cipher-opts');
}

function cphBuildRefStrip() {
  const row = document.getElementById('cipher-ref-strip');
  if (!row) return;
  row.innerHTML = Array.from({length:10}, (_,d) =>
    `<div class="cph-ref-item">
      ${cphIconSvg(d, 42)}
      <span class="cph-ref-digit" style="color:${CPH_CLR[d]}">${d}</span>
      <span class="cph-ref-name" id="cph-ref-name-${d}">${t('cph_shape_'+d)}</span>
    </div>`
  ).join('');
}

function cphBuildLevelGrid() {
  const grid = document.getElementById('cipher-level-grid');
  if (!grid) return;
  const saved = cphSavedData();
  grid.innerHTML = CPH_LEVELS.map((lv, i) => {
    const done   = saved.levels && saved.levels[i];
    const best   = saved.best   && saved.best[i] !== undefined ? saved.best[i] : null;
    const locked = i > 0 && !(saved.levels && saved.levels[i - 1]);
    const cls    = locked ? 'locked' : (done ? 'done' : '');
    return `<button class="lv-btn ${cls}" onclick="cphStart(${i})" ${locked ? 'disabled' : ''}>
      <span class="lv-num">${i+1}</span>
      <span class="lv-tag">${lv.len}🔢</span>
      ${best !== null ? `<span class="lv-best">${best}%</span>` : ''}
    </button>`;
  }).join('');
}

function cphBuildDailyCard() {
  const wrap = document.getElementById('cipher-daily-wrap');
  if (!wrap) return;
  const saved   = cphSavedData();
  const seed    = cphDailySeed();
  const done    = saved.dailyDate === seed;
  const digits  = cphGenDigits(CPH_DAILY_LEN, seed);
  const preview = done
    ? digits.map(d => cphIconSvg(d, 26, CPH_CLR[d])).join('')
    : ''.padEnd(CPH_DAILY_LEN, '?').split('').map(() => `<span class="cph-daily-dot">?</span>`).join('');

  wrap.innerHTML = `<div class="cph-daily-card ${done?'done':''}" onclick="${done?'':' cphDaily()'}">
    <div class="cph-daily-header">
      <span class="tag tag-gold" id="cph-daily-tag">${t('cph_daily_lbl')}</span>
      <span class="cph-daily-status">${done ? t('cph_daily_done') : t('cph_daily_open')}</span>
    </div>
    <div class="cph-daily-icons">${preview}</div>
    <div class="cph-daily-sub">${CPH_DAILY_LEN} ${t('cph_digits')} · ${t('cph_daily_sub')}</div>
  </div>`;
}

function cphBuildStats() {
  const saved   = cphSavedData();
  const history = saved.history || [];
  const today   = cphDailySeed();

  // 7-day bars
  const bars = document.getElementById('cipher-bars');
  if (bars) {
    bars.innerHTML = Array.from({length:7}, (_,i) => {
      const day    = today - (6 - i);
      const dayH   = history.filter(h => h.date === day);
      const best   = dayH.length ? Math.max(...dayH.map(h => h.pct)) : 0;
      return `<div class="bar7-col">
        <div class="bar7-fill" style="height:${best}%;background:var(--cyanL)"></div>
        <div class="bar7-label">${t('dow')[new Date(day*86400000).getDay()]}</div>
      </div>`;
    }).join('');
  }

  // Stat cells
  const statsDiv = document.getElementById('cipher-daily-stats');
  if (statsDiv) {
    const todayH   = history.filter(h => h.date === today);
    const totalR   = history.length;
    const avgPct   = totalR ? Math.round(history.reduce((s,h) => s + h.pct, 0) / totalR) : 0;
    const bestPct  = totalR ? Math.max(...history.map(h => h.pct)) : 0;
    statsDiv.innerHTML = `
      <div class="math-stat"><div class="stat-val">${todayH.length}</div><div class="stat-lbl">${t('cph_stat_today')}</div></div>
      <div class="math-stat"><div class="stat-val">${totalR}</div><div class="stat-lbl">${t('cph_stat_total')}</div></div>
      <div class="math-stat"><div class="stat-val">${avgPct}%</div><div class="stat-lbl">${t('cph_stat_avg')}</div></div>
      <div class="math-stat"><div class="stat-val">${bestPct}%</div><div class="stat-lbl">${t('cph_stat_best')}</div></div>`;
  }
}

// ── Start game ──
function cphStart(levelIdx, daily=false, dailySeed=null) {
  cphTimers.forEach(clearTimeout); cphTimers = [];

  const lv  = CPH_LEVELS[levelIdx] || CPH_LEVELS[0];
  const len = daily ? CPH_DAILY_LEN : lv.len;
  const seed = dailySeed !== null ? dailySeed : ((Date.now() + levelIdx * 31337) % 999983);

  cphState = {
    level:     levelIdx,
    digits:    cphGenDigits(len, seed),
    answer:    [],
    timer:     null,
    daily:     daily,
    showLabel: daily ? true : lv.showLabel,
    studyMs:   daily ? 12000 : lv.study,
  };

  showScreen('screen-cipher');
  document.getElementById('cipher-menu').style.display   = 'none';
  document.getElementById('cipher-study').style.display  = '';
  document.getElementById('cipher-recall').style.display = 'none';
  document.getElementById('cipher-result').style.display = 'none';

  cphRenderStudy();

  // Check for intro on first encounter of this level
  if (lv.introKey) {
    const seen = cphSavedData().seenIntros || {};
    if (!seen[levelIdx]) {
      const saved = cphSavedData();
      if (!saved.seenIntros) saved.seenIntros = {};
      saved.seenIntros[levelIdx] = true;
      localStorage.setItem(CPH_LS_KEY, JSON.stringify(saved));
    }
  }
}

function cphDaily() {
  cphStart(5, true, cphDailySeed());
}

// ── Study phase ──
function cphRenderStudy() {
  const {digits, showLabel, studyMs} = cphState;

  cphSetTxt('cipher-study-title', 'cph_study_title');
  cphSetTxt('cipher-ready-btn',   'cph_ready_btn');

  // Build icon cards
  const row = document.getElementById('cipher-icons-row');
  if (row) {
    row.innerHTML = digits.map((d, i) =>
      `<div class="cph-icon-card" id="cph-icon-${i}">
        ${cphIconSvg(d, 74, CPH_CLR[d])}
        ${showLabel ? `<div class="cph-icon-label" style="color:${CPH_CLR[d]}">${d}</div>
        <div class="cph-icon-name" style="color:${CPH_CLR[d]}99">${t('cph_shape_'+d)}</div>` : ''}
      </div>`
    ).join('');
    // Staggered entrance animation
    digits.forEach((_, i) => {
      const el = document.getElementById(`cph-icon-${i}`);
      if (el) { el.style.opacity='0'; el.style.transform='scale(.6) translateY(10px)'; }
      const tid = setTimeout(() => {
        if (el) { el.style.transition='opacity .3s, transform .3s'; el.style.opacity='1'; el.style.transform='scale(1) translateY(0)'; }
      }, i * 160 + 80);
      cphTimers.push(tid);
    });
  }

  // Story appears after all icons loaded
  const storyDelay = digits.length * 160 + 480;
  const storyTid = setTimeout(() => cphShowStory(), storyDelay);
  cphTimers.push(storyTid);

  // Countdown timer
  let remaining = studyMs;
  const fill    = document.getElementById('cipher-study-fill');
  const counter = document.getElementById('cipher-countdown');
  const tick    = () => {
    remaining -= 100;
    const pct = Math.max(0, remaining / studyMs * 100);
    if (fill)    fill.style.width = pct + '%';
    if (counter) counter.textContent = Math.ceil(remaining / 1000);
    if (remaining <= 0) { cphStartRecall(); }
    else { const tid = setTimeout(tick, 100); cphTimers.push(tid); }
  };
  const tid = setTimeout(tick, 100);
  cphTimers.push(tid);
}

function cphShowStory() {
  const box = document.getElementById('cipher-story-box');
  if (!box) return;
  const story = cphMakeStory(cphState.digits);
  box.textContent = story;
  box.style.opacity = '0';
  box.style.transition = 'opacity .6s';
  requestAnimationFrame(() => { box.style.opacity = '1'; });
}

function cphSkipStudy() {
  cphTimers.forEach(clearTimeout); cphTimers = [];
  cphStartRecall();
}

// ── Recall phase ──
function cphStartRecall() {
  cphTimers.forEach(clearTimeout); cphTimers = [];
  cphState.answer = [];

  document.getElementById('cipher-study').style.display  = 'none';
  document.getElementById('cipher-recall').style.display = '';

  cphSetTxt('cipher-recall-title', 'cph_recall_title');
  cphSetTxt('cipher-submit-btn',   'cph_submit_btn');

  cphRenderAnswerRow();
  cphRenderDigitPad();
}

function cphRenderAnswerRow() {
  const {digits, answer} = cphState;
  const row = document.getElementById('cipher-answer-row');
  if (!row) return;
  row.innerHTML = digits.map((_, i) => {
    if (i < answer.length) {
      const d = answer[i];
      return `<div class="cph-ans-box filled" style="border-color:${CPH_CLR[d]}">${cphIconSvg(d, 38)}</div>`;
    }
    return `<div class="cph-ans-box" id="cph-ans-${i}">?</div>`;
  }).join('');
}

function cphRenderDigitPad() {
  const pad = document.getElementById('cipher-digit-pad');
  if (!pad) return;
  // Phone-style layout: 1-2-3 / 4-5-6 / 7-8-9 / ⌫-0-✓
  const keys = [1,2,3,4,5,6,7,8,9,'⌫',0,'✓'];
  pad.innerHTML = keys.map(k => {
    if (k === '✓') return `<button class="cph-key cph-key-ok" onclick="cphSubmit()">✓</button>`;
    if (k === '⌫') return `<button class="cph-key cph-key-del" onclick="cphDeleteDigit()">⌫</button>`;
    return `<button class="cph-key" onclick="cphPressDigit(${k})" style="--cph-c:${CPH_CLR[k]}">
      ${cphIconSvg(k, 34)}
      <span class="cph-key-d">${k}</span>
    </button>`;
  }).join('');
}

function cphPressDigit(d) {
  if (cphState.answer.length >= cphState.digits.length) return;
  cphState.answer.push(d);
  cphRenderAnswerRow();
  // Haptic-style flash on answer box
  const box = document.getElementById(`cph-ans-${cphState.answer.length - 1}`);
  if (box) { box.classList.add('pop'); setTimeout(() => box.classList.remove('pop'), 200); }
}

function cphDeleteDigit() {
  cphState.answer.pop();
  cphRenderAnswerRow();
}

// ── Submit ──
function cphSubmit() {
  const {digits, answer, level, daily} = cphState;
  if (answer.length < digits.length) return;

  let correct = 0;
  digits.forEach((d, i) => { if (answer[i] === d) correct++; });
  const pct = Math.round(correct / digits.length * 100);

  // Persist
  const saved = cphSavedData();
  if (!saved.levels) saved.levels = {};
  if (!saved.best)   saved.best   = {};
  saved.levels[level] = true;
  if (saved.best[level] === undefined || pct > saved.best[level]) saved.best[level] = pct;
  if (!saved.history) saved.history = [];
  saved.history.push({date: cphDailySeed(), pct, level, daily: !!daily});
  if (saved.history.length > 90) saved.history = saved.history.slice(-90);
  if (daily) saved.dailyDate = cphDailySeed();
  localStorage.setItem(CPH_LS_KEY, JSON.stringify(saved));

  // XP
  if (typeof addXp === 'function') addXp(Math.round(pct / 10) * (level + 2), 'Cipher');

  // Achievement: first solve
  if (typeof unlockAch === 'function') {
    unlockAch('ach_cph_first');
    if (pct === 100) unlockAch('ach_cph_perfect');
    if (daily)       unlockAch('ach_cph_daily');
  }

  cphShowResult(pct, correct, digits.length);
}

// ── Result phase ──
function cphShowResult(pct, correct, total) {
  document.getElementById('cipher-recall').style.display = 'none';
  document.getElementById('cipher-result').style.display = '';

  cphSetTxt('cipher-result-label', 'cph_result_label');

  const {digits, answer} = cphState;

  // Icon row with correct/wrong markers
  const iconsDiv = document.getElementById('cipher-result-icons');
  if (iconsDiv) {
    iconsDiv.innerHTML = digits.map((d, i) => {
      const ok      = answer[i] === d;
      const guessed = answer[i] !== undefined ? answer[i] : -1;
      const clr     = ok ? '#34d399' : '#f87171';
      const guessHtml = (!ok && guessed >= 0)
        ? `<div class="cph-result-guess" style="color:#f87171">${cphIconSvg(guessed, 26)}</div>`
        : '';
      return `<div class="cph-result-item">
        ${cphIconSvg(d, 52, clr)}
        <div class="cph-result-mark" style="color:${clr}">${ok ? '✓' : '✗'}</div>
        ${guessHtml}
        <div class="cph-result-digit" style="color:${CPH_CLR[d]}">${d}</div>
      </div>`;
    }).join('');
  }

  // Score / verdict
  const scoreDiv = document.getElementById('cipher-score-display');
  if (scoreDiv) {
    const verdictKey = pct===100 ? 'cph_verdict_perfect' : pct>=80 ? 'cph_verdict_great' : pct>=50 ? 'cph_verdict_ok' : 'cph_verdict_try';
    scoreDiv.innerHTML = `<div class="cph-verdict">${t(verdictKey)}</div>
      <div class="cph-score-line">${correct}/${total} · ${pct}%</div>`;
  }

  // Story replay
  const storyDiv = document.getElementById('cipher-result-story');
  if (storyDiv) storyDiv.textContent = cphMakeStory(digits);

  const nextBtn = document.getElementById('cipher-next-btn');
  if (nextBtn) {
    const hasNext = cphState.level < CPH_LEVELS.length - 1;
    nextBtn.style.display = hasNext && !cphState.daily ? '' : 'none';
  }
  const menuBtn = document.getElementById('cipher-menu-btn');
  if (menuBtn) menuBtn.textContent = t('cph_menu_btn');
  if (nextBtn) nextBtn.textContent = t('cph_next_btn');
}

function cphNext() {
  cphStart(Math.min(cphState.level + 1, CPH_LEVELS.length - 1));
}

// ── applyLang update hook ──
function showCipherMenuLang() {
  const menu = document.getElementById('cipher-menu');
  if (menu && menu.style.display !== 'none') {
    cphBuildRefStrip();
    cphBuildLevelGrid();
    cphBuildDailyCard();
    cphBuildStats();
  }
  cphSetTxt('cph-mode-title', 'cph_mode_title');
  cphSetTxt('cph-mode-desc',  'cph_mode_desc');
}

// ── small DOM helpers local to cipher (reuse applyLang pattern) ──
function cphSetTxt(id, key) {
  const el = document.getElementById(id); if (el) el.textContent = t(key);
}
