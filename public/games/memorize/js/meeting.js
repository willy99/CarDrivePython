// ── The Meeting subgame ─────────────────────────────────────────────────────

const MTG_NAMES   = ['Alex','Sam','Jordan','Casey','Morgan','Taylor','Riley','Dana'];
const MTG_ROLES   = ['Project Manager','Designer','Developer','Sales Lead',
                     'CFO','CTO','HR Manager','Marketing Lead'];
const MTG_TOPICS  = ['Q3','Q4','annual','marketing','R&D','travel','operations'];
const MTG_ACTIONS = ['vendor contracts','onboarding','safety review',
                     'code audit','client follow-up','data migration','training'];
const MTG_DOCS    = ['report','proposal','contract','analysis','summary','presentation'];
const MTG_PROJECTS= ['Apollo','Nova','Titan','Spark','Echo','Prism','Vega','Atlas'];
const MTG_CLIENTS = ['Nexus Corp','BlueWave','Orion Ltd','Stellar Inc','Pinnacle','Apex Group'];
const MTG_DAY_KEYS= ['Mon','Tue','Wed','Thu','Fri'];
const MTG_AMOUNTS = ['$8,500','$12,000','$50,000','$85,000','$120,000','$250,000','$340,000'];
const MTG_COUNTS  = ['3','5','7','9','12','15','20','24'];
const MTG_CLR     = ['#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa','#facc15'];

const MTG_LEVELS  = [
  {nFacts:2, nFillers:2, studyMs:20000},
  {nFacts:2, nFillers:3, studyMs:26000},
  {nFacts:3, nFillers:2, studyMs:30000},
  {nFacts:3, nFillers:4, studyMs:38000},
  {nFacts:4, nFillers:3, studyMs:46000},
  {nFacts:4, nFillers:5, studyMs:56000},
  {nFacts:5, nFillers:4, studyMs:64000},
  {nFacts:5, nFillers:6, studyMs:78000},
];

// ── State ───────────────────────────────────────────────────────────────────
let mtgCurrent = null;
let mtgTimers  = [];
let mtgAnswers = {};

// ── RNG ─────────────────────────────────────────────────────────────────────
function mtgRng(seed) {
  seed = seed | 0;
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mtgDailySeed() { return Math.floor(Date.now() / 86400000); }

// ── Build ────────────────────────────────────────────────────────────────────
function mtgBuild(lvIdx, seed) {
  const cfg  = MTG_LEVELS[Math.min(lvIdx, MTG_LEVELS.length - 1)];
  const rng  = mtgRng(seed >>> 0);
  const pick  = a => a[Math.floor(rng() * a.length)];
  const pickN = (arr, n) => {
    const p = [...arr], o = [];
    while (o.length < n && p.length) o.push(p.splice(Math.floor(rng() * p.length), 1)[0]);
    return o;
  };
  const shuffle = a => {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  };
  const wrong2 = (pool, correct) => pickN(pool.filter(x => x !== correct), 2);

  // Speakers (3 or 4)
  const nSp    = cfg.nFacts >= 4 ? 4 : 3;
  const names  = pickN(MTG_NAMES, nSp);
  const roles  = pickN(MTG_ROLES, nSp);
  const sp     = names.map((name, i) => ({ name, role: roles[i], clr: MTG_CLR[i] }));
  const [a, b, c] = sp;

  // Shared values
  const topic    = pick(MTG_TOPICS);
  const amount   = pick(MTG_AMOUNTS);
  const action   = pick(MTG_ACTIONS);
  const doc      = pick(MTG_DOCS);
  const project  = pick(MTG_PROJECTS);
  const client   = pick(MTG_CLIENTS);
  const dayKeys  = pickN(MTG_DAY_KEYS, 3);
  const count    = pick(MTG_COUNTS);
  const hireRole = pick(MTG_ROLES.filter(r => !roles.includes(r)).length
    ? MTG_ROLES.filter(r => !roles.includes(r)) : MTG_ROLES);

  // Translated day displays
  const dd = k => t('mtg_day_' + k);
  const day0 = dd(dayKeys[0]), day1 = dd(dayKeys[1]), day2 = dd(dayKeys[2]);
  const allDays = MTG_DAY_KEYS.map(dd);

  // All potential fact types — only cfg.nFacts are used
  const factPool = [
    {
      type: 'budget',
      lines: [{ s: a, txt: t('mtg_f_budget', a.name, topic, amount) }],
      q:    t('mtg_q_budget', topic),
      a:    amount,
      ch:   () => shuffle([amount, ...wrong2(MTG_AMOUNTS, amount)]),
    },
    {
      type: 'deadline',
      lines: [{ s: b, txt: t('mtg_f_deadline', b.name, action, day0) }],
      q:    t('mtg_q_deadline', action),
      a:    day0,
      ch:   () => shuffle([day0, ...pickN(allDays.filter(d => d !== day0), 2)]),
    },
    {
      type: 'promise',
      lines: [
        { s: c, txt: t('mtg_f_ask',   c.name, doc, b.name) },
        { s: b, txt: t('mtg_f_agree', b.name, doc) },
      ],
      q:    t('mtg_q_promise', doc),
      a:    b.name,
      ch:   () => shuffle([b.name, ...wrong2(names, b.name)]),
    },
    {
      type: 'birthday',
      lines: [{ s: a, txt: t('mtg_f_birthday', a.name, c.name, day1) }],
      q:    t('mtg_q_birthday', day1),
      a:    c.name,
      ch:   () => shuffle([c.name, ...wrong2(names, c.name)]),
    },
    {
      type: 'lead',
      lines: [{ s: a, txt: t('mtg_f_lead', a.name, b.name, project) }],
      q:    t('mtg_q_lead', project),
      a:    b.name,
      ch:   () => shuffle([b.name, ...wrong2(names, b.name)]),
    },
    {
      type: 'client',
      lines: [{ s: a, txt: t('mtg_f_client', a.name, c.name, client, day2) }],
      q:    t('mtg_q_client', client),
      a:    c.name,
      ch:   () => shuffle([c.name, ...wrong2(names, c.name)]),
    },
    {
      type: 'count',
      lines: [{ s: b, txt: t('mtg_f_count', b.name, count, topic) }],
      q:    t('mtg_q_count', topic),
      a:    count,
      ch:   () => shuffle([count, ...wrong2(MTG_COUNTS, count)]),
    },
    {
      type: 'hire',
      lines: [{ s: a, txt: t('mtg_f_hire', a.name, c.name, hireRole) }],
      q:    t('mtg_q_hire', c.name),
      a:    hireRole,
      ch:   () => shuffle([hireRole, ...wrong2(MTG_ROLES, hireRole)]),
    },
  ];

  // Select facts & resolve choices (must happen in rng sequence)
  const selectedFacts = pickN(factPool, cfg.nFacts);
  const questions = selectedFacts.map(f => ({ q: f.q, a: f.a, choices: f.ch() }));

  // Fillers (natural-sounding non-quizzable lines)
  const fillerPool = [
    { s: a, txt: t('mtg_fill_open',  a.name) },
    { s: b, txt: t('mtg_fill_check', b.name) },
    { s: c, txt: t('mtg_fill_mid',   c.name) },
    { s: a, txt: t('mtg_fill_next',  a.name) },
    { s: b, txt: t('mtg_fill_align', b.name, c.name) },
    { s: c, txt: t('mtg_fill_ok',    c.name) },
    { s: a, txt: t('mtg_fill_close', a.name) },
    { s: b, txt: t('mtg_fill_thanks',b.name) },
  ];
  const fillers = pickN(fillerPool, cfg.nFillers);

  // Build dialogue: opener → (fact block → optional filler) → closer
  const lines = [];
  lines.push(fillers.shift() || fillerPool[0]);
  selectedFacts.forEach((fact, fi) => {
    fact.lines.forEach(l => lines.push(l));
    if (fi < selectedFacts.length - 1 && fillers.length > 1) lines.push(fillers.shift());
  });
  if (fillers.length) lines.push(fillers[fillers.length - 1]);

  return { sp, lines, questions, cfg, lvIdx, seed };
}

// ── Persistence ──────────────────────────────────────────────────────────────
function mtgLoadData() {
  try { return JSON.parse(localStorage.getItem('membrain_meeting_v1') || '{}'); } catch { return {}; }
}
function mtgSaveData(d) {
  try { localStorage.setItem('membrain_meeting_v1', JSON.stringify(d)); } catch {}
}
function mtgUnlocked(i) {
  if (i === 0) return true;
  const hist = mtgLoadData().history || [];
  return hist.some(h => h.lvl === i - 1 && h.pct >= 60);
}

// ── Menu ─────────────────────────────────────────────────────────────────────
function showMeetingMenu() {
  showScreen('screen-meeting');
  ['mtg-select','mtg-study','mtg-quiz','mtg-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === 'mtg-select' ? '' : 'none';
  });
  mtgRenderMenu();
}

function showMeetingMenuLang() {
  const setT = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  setT('mtg-mode-title',    'mtg_mode_title');
  setT('mtg-mode-desc',     'mtg_mode_desc');
  setT('mtg-section-title', 'mtg_section_title');
  setT('mtg-section-sub',   'mtg_section_sub');
  setT('mtg-training-head', 'mtg_training_head');
  if (document.getElementById('screen-meeting').classList.contains('active')) mtgRenderMenu();
}

function mtgRenderMenu() {
  const data = mtgLoadData();
  const hist = data.history || [];
  const grid = document.getElementById('mtg-level-grid');
  if (!grid) return;

  grid.innerHTML = MTG_LEVELS.map((cfg, i) => {
    const locked = !mtgUnlocked(i);
    const best   = Math.max(...hist.filter(h => h.lvl === i).map(h => h.pct), -1);
    const nLines = cfg.nFacts + cfg.nFillers + 1;
    return `<button class="mtg-lv-btn${locked ? ' locked' : ''}"
              ${locked ? 'disabled' : `onclick="mtgStart(${i})"`}>
      <div class="mtg-lv-num">Lv ${i + 1}</div>
      <div class="mtg-lv-lines">${nLines} <span style="font-size:.55rem">${t('mtg_lines')}</span></div>
      <div class="mtg-lv-qs">${cfg.nFacts} Q</div>
      ${best >= 0 ? `<div class="mtg-lv-score">${best}%</div>` : locked ? '<div class="mtg-lv-lock">🔒</div>' : ''}
    </button>`;
  }).join('');

  // Stats bar
  const all  = hist.slice(-20);
  const avg  = all.length ? Math.round(all.reduce((s, h) => s + h.pct, 0) / all.length) : 0;
  const best = all.length ? Math.max(...all.map(h => h.pct)) : 0;
  const statsEl = document.getElementById('mtg-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="stat-box"><div class="sv">${hist.length}</div><div class="sl">${t('mtg_stat_total')}</div></div>
    <div class="stat-box"><div class="sv">${avg}%</div><div class="sl">${t('mtg_stat_avg')}</div></div>
    <div class="stat-box"><div class="sv">${best}%</div><div class="sl">${t('mtg_stat_best')}</div></div>`;

  // Daily
  const seed  = mtgDailySeed();
  const done  = hist.some(h => h.seed === seed && h.lvl === -1);
  const badge = document.getElementById('mtg-daily-badge');
  const lbl   = document.getElementById('mtg-daily-lbl');
  const btn   = document.getElementById('mtg-daily-btn');
  if (badge) badge.textContent = done ? '✓' : t('mtg_open');
  if (lbl)   lbl.textContent   = t('mtg_daily_lbl');
  if (btn)   { btn.onclick = done ? null : () => mtgStart(-1, seed); btn.style.opacity = done ? '.55' : '1'; }
}

// ── Start ─────────────────────────────────────────────────────────────────────
function mtgStart(lvIdx, fixedSeed) {
  const isDaily  = lvIdx === -1;
  const actualLv = isDaily ? 3 : lvIdx;
  const seed     = fixedSeed !== undefined ? fixedSeed
    : (mtgDailySeed() * 97 + lvIdx * 1013 + (Date.now() & 0xfff)) >>> 0;

  mtgAnswers = {};
  mtgTimers.forEach(clearTimeout); mtgTimers = [];
  mtgCurrent = Object.assign(mtgBuild(actualLv, seed), { lvIdx, isDaily, seed });

  showScreen('screen-meeting');
  ['mtg-select','mtg-study','mtg-quiz','mtg-result'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('mtg-study').style.display = '';
  mtgRenderStudy();
}

// ── Study ─────────────────────────────────────────────────────────────────────
function mtgRenderStudy() {
  const cur    = mtgCurrent;
  const clrMap = {};
  cur.sp.forEach(s => { clrMap[s.name] = s.clr; });

  const capEl = document.getElementById('mtg-study-cap');
  if (capEl) capEl.textContent = t('mtg_study_cap');
  const rdyBtn = document.getElementById('mtg-ready-btn');
  if (rdyBtn) rdyBtn.textContent = t('mtg_ready_btn');

  // Render transcript
  const transcript = document.getElementById('mtg-transcript');
  transcript.innerHTML = cur.lines.map((line, i) =>
    `<div class="mtg-line" style="animation-delay:${(i * 0.38).toFixed(2)}s">
      <div class="mtg-line-speaker" style="color:${clrMap[line.s.name] || '#94a3b8'}">
        ${line.s.name.toUpperCase()} <span class="mtg-line-role">(${line.s.role})</span>
      </div>
      <div class="mtg-line-text">${line.txt}</div>
    </div>`
  ).join('');

  // Timer bar
  const bar = document.getElementById('mtg-timebar');
  if (bar) {
    bar.style.transition = 'none';
    bar.style.width = '100%';
    void bar.offsetWidth;
    bar.style.transition = `width ${cur.cfg.studyMs}ms linear`;
    bar.style.width = '0%';
  }

  mtgTimers.push(setTimeout(() => mtgStartQuiz(), cur.cfg.studyMs));
}

function mtgSkipStudy() {
  mtgTimers.forEach(clearTimeout); mtgTimers = [];
  mtgStartQuiz();
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
function mtgStartQuiz() {
  document.getElementById('mtg-study').style.display = 'none';
  document.getElementById('mtg-quiz').style.display  = '';
  mtgRenderQuiz();
}

function mtgRenderQuiz() {
  const cur = mtgCurrent;
  const titleEl = document.getElementById('mtg-quiz-title');
  if (titleEl) titleEl.textContent = t('mtg_quiz_title');

  document.getElementById('mtg-questions').innerHTML = cur.questions.map((q, qi) =>
    `<div class="mtg-q-card" id="mtg-q-${qi}">
      <div class="mtg-q-text">${qi + 1}. ${q.q}</div>
      <div class="mtg-q-choices">
        ${q.choices.map(c =>
          `<button class="mtg-choice-btn" data-qi="${qi}" data-val="${c.replace(/"/g,'&quot;')}"
            onclick="mtgPick(${qi},this)">${c}</button>`
        ).join('')}
      </div>
    </div>`
  ).join('');

  const sub = document.getElementById('mtg-submit-btn');
  if (sub) { sub.textContent = t('mtg_submit_btn'); sub.disabled = true; }
}

function mtgPick(qi, btn) {
  const card = document.getElementById('mtg-q-' + qi);
  card.querySelectorAll('.mtg-choice-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  mtgAnswers[qi] = btn.dataset.val;
  const allDone = mtgCurrent.questions.every((_, i) => mtgAnswers[i] !== undefined);
  const sub = document.getElementById('mtg-submit-btn');
  if (sub) sub.disabled = !allDone;
}

// ── Submit ────────────────────────────────────────────────────────────────────
function mtgSubmit() {
  const cur = mtgCurrent;
  const correct = cur.questions.reduce((n, q, i) => n + (mtgAnswers[i] === q.a ? 1 : 0), 0);
  const pct     = Math.round(correct / cur.questions.length * 100);

  const data = mtgLoadData();
  if (!data.history) data.history = [];
  data.history.push({ lvl: cur.lvIdx, seed: cur.seed, pct, correct, total: cur.questions.length, ts: Date.now() });
  if (data.history.length > 100) data.history = data.history.slice(-100);
  mtgSaveData(data);

  addXp(Math.round(pct / 10) * 2 + 5, 'meeting');

  document.getElementById('mtg-quiz').style.display   = 'none';
  document.getElementById('mtg-result').style.display = '';
  mtgRenderResult(correct, pct);
}

// ── Result ────────────────────────────────────────────────────────────────────
function mtgRenderResult(correct, pct) {
  const cur     = mtgCurrent;
  const total   = cur.questions.length;
  const verdict = pct === 100 ? t('mtg_perfect') : pct >= 75 ? t('mtg_good') : pct >= 50 ? t('mtg_ok') : t('mtg_poor');
  const clr     = pct === 100 ? '#4ade80' : pct >= 75 ? '#60a5fa' : '#f472b6';

  document.getElementById('mtg-result-score').innerHTML = `
    <div style="font-size:2.8rem;font-weight:900;color:${clr};margin-bottom:2px">${pct}%</div>
    <div style="font-size:1.05rem;font-weight:800;margin-bottom:2px">${verdict}</div>
    <div style="font-size:.85rem;color:var(--text2);margin-bottom:22px">${correct} / ${total} ${t('mtg_items_correct')}</div>`;

  document.getElementById('mtg-result-review').innerHTML = cur.questions.map((q, i) => {
    const chosen = mtgAnswers[i];
    const hit    = chosen === q.a;
    return `<div class="mtg-rev-row ${hit ? 'hit' : 'miss'}">
      <div class="mtg-rev-icon">${hit ? '✓' : '✗'}</div>
      <div class="mtg-rev-body">
        <div class="mtg-rev-q">${q.q}</div>
        <div class="mtg-rev-ans ${hit ? 'correct' : 'wrong'}">${chosen || '—'}</div>
        ${!hit ? `<div class="mtg-rev-correct">${t('mtg_correct_was')} <b>${q.a}</b></div>` : ''}
      </div>
    </div>`;
  }).join('');

  const lvArg = cur.lvIdx + (cur.isDaily ? `, ${cur.seed}` : '');
  document.getElementById('mtg-result-btns').innerHTML = `
    <button class="btn" onclick="showMeetingMenu()">${t('mtg_to_menu')}</button>
    <button class="btn btn-primary" onclick="mtgStart(${lvArg})">${t('mtg_retry')}</button>`;
}
