// ═══════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════
const ACHIEVEMENTS = [
  {id:'wm_first',    em:'🧠', nk:'ach_wm_first',    dk:'ach_wm_first_d'},
  {id:'wm_perfect',  em:'✨', nk:'ach_wm_perfect',  dk:'ach_wm_perfect_d'},
  {id:'wm_sharp',    em:'⚡', nk:'ach_wm_sharp',    dk:'ach_wm_sharp_d'},
  {id:'wm_back',     em:'🔄', nk:'ach_wm_back',     dk:'ach_wm_back_d'},
  {id:'wm_audio',    em:'🎧', nk:'ach_wm_audio',    dk:'ach_wm_audio_d'},
  {id:'sp_first',    em:'👁️', nk:'ach_sp_first',   dk:'ach_sp_first_d'},
  {id:'sp_boss',     em:'👑', nk:'ach_sp_boss',     dk:'ach_sp_boss_d'},
  {id:'sp_streak5',  em:'🔥', nk:'ach_sp_streak5',  dk:'ach_sp_streak5_d'},
  {id:'sp_appeared', em:'🕵️', nk:'ach_sp_appeared', dk:'ach_sp_appeared_d'},
  {id:'mt_first',    em:'➕', nk:'ach_mt_first',    dk:'ach_mt_first_d'},
  {id:'mt_perfect',  em:'💯', nk:'ach_mt_perfect',  dk:'ach_mt_perfect_d'},
  {id:'mt_trick',    em:'🪄', nk:'ach_mt_trick',    dk:'ach_mt_trick_d'},
  {id:'mt_pct',      em:'%',  nk:'ach_mt_pct',      dk:'ach_mt_pct_d'},
  {id:'all_games',       em:'🌟', nk:'ach_all_games',       dk:'ach_all_games_d'},
  {id:'streak3',         em:'🏆', nk:'ach_streak3',         dk:'ach_streak3_d'},
  {id:'pb_first',        em:'🤖', nk:'ach_pb_first',        dk:'ach_pb_first_d'},
  {id:'pb_win',          em:'🏅', nk:'ach_pb_win',          dk:'ach_pb_win_d'},
  {id:'pb_hard',         em:'💪', nk:'ach_pb_hard',         dk:'ach_pb_hard_d'},
  {id:'pb_elo1400',      em:'⭐', nk:'ach_pb_elo1400',      dk:'ach_pb_elo1400_d'},
  {id:'mt_trick_master', em:'🥇', nk:'ach_mt_trick_master', dk:'ach_mt_trick_master_d'},
  {id:'mt_daily',        em:'📅', nk:'ach_mt_daily',        dk:'ach_mt_daily_d'},
  {id:'mt_daily_week',   em:'📆', nk:'ach_mt_daily_week',   dk:'ach_mt_daily_week_d'},
  {id:'wo_complete',     em:'🏋️', nk:'ach_wo_complete',     dk:'ach_wo_complete_d'},
  {id:'dmd_first',  em:'💎', nk:'ach_dmd_first',  dk:'ach_dmd_first_d'},
  {id:'dmd_streak5',em:'🔮', nk:'ach_dmd_streak5',dk:'ach_dmd_streak5_d'},
  {id:'dmd_level10',em:'🧿', nk:'ach_dmd_level10',dk:'ach_dmd_level10_d'},
  {id:'lm_first',   em:'🕰️', nk:'ach_lm_first',   dk:'ach_lm_first_d'},
  {id:'lm_recall5', em:'📚', nk:'ach_lm_recall5',  dk:'ach_lm_recall5_d'},
  {id:'lm_perfect', em:'🌟', nk:'ach_lm_perfect',  dk:'ach_lm_perfect_d'},
];

function achLoad(){ try{ return JSON.parse(localStorage.getItem('membrain_ach')||'[]'); }catch{ return []; } }
function achSave(arr){ try{ localStorage.setItem('membrain_ach', JSON.stringify(arr)); }catch{} }

function checkAchievements(ids){
  const earned = achLoad();
  const newOnes = [];
  for(const id of (Array.isArray(ids)?ids:[ids])){
    if(!earned.includes(id)){ earned.push(id); newOnes.push(id); }
  }
  if(newOnes.length){ achSave(earned); newOnes.forEach(showAchievementToast); updateAchBadge(); }
}

let achToastTimer = null;
function showAchievementToast(id){
  const ach = ACHIEVEMENTS.find(a=>a.id===id); if(!ach) return;
  const toast = document.getElementById('ach-toast');
  document.getElementById('ach-toast-em').textContent  = ach.em;
  document.getElementById('ach-toast-text').textContent = t(ach.nk);
  document.getElementById('ach-toast-sub').textContent  = t(ach.dk);
  toast.classList.add('show');
  clearTimeout(achToastTimer);
  achToastTimer = setTimeout(()=>toast.classList.remove('show'), 3500);
}

function updateAchBadge(){
  const badge = document.getElementById('ach-count-badge');
  if(badge) badge.textContent = achLoad().length + '/' + ACHIEVEMENTS.length;
}

function showAchievements(){
  document.getElementById('ach-panel-title').textContent = t('ach_panel_title');
  const grid = document.getElementById('ach-grid');
  const earned = achLoad();
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a=>{
    const el = document.createElement('div');
    el.className = 'ach-item' + (earned.includes(a.id)?' earned':' locked');
    el.innerHTML = `<div class="ach-em">${a.em}</div><div class="ach-name">${t(a.nk)}</div><div class="ach-desc">${t(a.dk)}</div>`;
    grid.appendChild(el);
  });
  document.getElementById('ach-panel').classList.add('show');
}

function metaTrackGame(game){
  try{
    const played = JSON.parse(localStorage.getItem('membrain_played')||'[]');
    if(!played.includes(game)){ played.push(game); localStorage.setItem('membrain_played',JSON.stringify(played)); }
    return played;
  }catch{ return []; }
}

// ═══════════════════════════════════════════════════
// XP + LEVEL SYSTEM
// ═══════════════════════════════════════════════════
function xpForLevel(n){ return n <= 0 ? 0 : n * 150 + n * (n - 1) * 25; }
function levelFromXp(xp){ let l = 0; while (xpForLevel(l + 1) <= xp) l++; return l; }
function loadXp(){ return parseInt(localStorage.getItem('membrain_xp') || '0'); }
function saveXp(v){ localStorage.setItem('membrain_xp', String(Math.max(0, v))); }

function addXp(amount, source) {
  const old = loadXp();
  const oldLv = levelFromXp(old);
  saveXp(old + amount);
  const newLv = levelFromXp(old + amount);
  updateXpDisplay();
  if (newLv > oldLv) showAchievementToast('_xp_levelup_' + newLv);
  flashXpBadge('+' + amount + ' XP');
}

let xpFlashTimer = null;
function flashXpBadge(text) {
  const badge = document.getElementById('xp-level-badge');
  if (!badge) return;
  const orig = badge.textContent;
  badge.textContent = text;
  badge.style.background = 'linear-gradient(135deg,var(--gold),var(--goldL))';
  clearTimeout(xpFlashTimer);
  xpFlashTimer = setTimeout(() => {
    badge.style.background = '';
    updateXpDisplay();
  }, 1400);
}

function updateXpDisplay() {
  const xp = loadXp();
  const lv = levelFromXp(xp);
  const thisXp = xpForLevel(lv);
  const nextXp = xpForLevel(lv + 1);
  const pct = Math.round((xp - thisXp) / (nextXp - thisXp) * 100);
  const badge = document.getElementById('xp-level-badge');
  const fill  = document.getElementById('xp-bar-fill');
  const lbl   = document.getElementById('xp-label');
  if (badge) badge.textContent = `Lv.${lv}`;
  if (fill)  fill.style.width = pct + '%';
  if (lbl)   lbl.textContent  = `${xp - thisXp}/${nextXp - thisXp} XP`;
}

// ═══════════════════════════════════════════════════
// BRAIN RADAR CHART
// ═══════════════════════════════════════════════════
function brainScores() {
  const wmS = wmLoadStats();
  const wmWords = Object.values(wmS.days || {}).reduce((a, x) => a + (x.words || 0), 0);
  const wmRec   = Object.values(wmS.days || {}).reduce((a, x) => a + (x.recalled || 0), 0);
  const wmScore = wmWords > 0 ? Math.round(wmRec / wmWords * 100) : 0;

  const spotBest = parseInt(localStorage.getItem('membrain_spot_best') || '0');
  const spotScore = Math.min(100, Math.round(spotBest / (SPOT_LEVELS.length - 1) * 100));

  const mS = mathLoadStats();
  const mTotal   = Object.values(mS.days || {}).reduce((a, x) => a + x.tasks, 0);
  const mCorrect = Object.values(mS.days || {}).reduce((a, x) => a + x.correct, 0);
  const mathScore = mTotal > 0 ? Math.round(mCorrect / mTotal * 100) : 0;

  const pairsScore = Math.min(100, Math.max(0, Math.round((loadElo() - 600) / 12)));

  const dStreak = dailyStreak();
  const dailyScore = Math.min(100, Math.round(dStreak / 14 * 100));

  const cphData    = JSON.parse(localStorage.getItem('membrain_cipher_v1') || '{}');
  const cphHistory = cphData.history || [];
  const cphRecent  = cphHistory.slice(-20);
  const cipherScore = cphRecent.length > 0
    ? Math.round(cphRecent.reduce((a, h) => a + h.pct, 0) / cphRecent.length)
    : 0;

  const colData   = JSON.parse(localStorage.getItem('membrain_colombo_v1') || '{}');
  const colDays   = Object.values(colData.days || {}).slice(-20);
  const colScore  = colDays.length > 0
    ? Math.round(colDays.reduce((a, d) => a + (d.score || 0), 0) / colDays.length)
    : 0;

  const wtrData    = JSON.parse(localStorage.getItem('membrain_waiter_v1') || '{}');
  const wtrHist    = (wtrData.history || []).slice(-20);
  const wtrScore   = wtrHist.length > 0
    ? Math.round(wtrHist.reduce((a, h) => a + h.pct, 0) / wtrHist.length) : 0;

  const mtgData  = JSON.parse(localStorage.getItem('membrain_meeting_v1') || '{}');
  const mtgHist  = (mtgData.history || []).slice(-20);
  const mtgScore = mtgHist.length > 0
    ? Math.round(mtgHist.reduce((a, h) => a + h.pct, 0) / mtgHist.length) : 0;

  return [
    { label: t('radar_wm'),      score: wmScore,     color: 'rgba(168,85,247,.85)' },
    { label: t('radar_spot'),   score: spotScore,   color: 'rgba(96,165,250,.85)' },
    { label: t('radar_math'),   score: mathScore,   color: 'rgba(52,211,153,.85)' },
    { label: t('radar_pairs'),  score: pairsScore,  color: 'rgba(251,191,36,.85)' },
    { label: t('radar_daily'),  score: dailyScore,  color: 'rgba(248,113,113,.85)' },
    { label: t('radar_cipher'), score: cipherScore, color: 'rgba(129,140,248,.85)' },
    { label: t('radar_col'),    score: colScore,    color: 'rgba(251,191,36,.6)'  },
    { label: t('radar_waiter'),  score: wtrScore,    color: 'rgba(255,112,67,.8)'  },
    { label: t('radar_meeting'), score: mtgScore,    color: 'rgba(96,165,250,.85)' },
  ];
}

function renderRadarChart() {
  const svg = document.getElementById('radar-svg');
  const statsEl = document.getElementById('radar-stats');
  const titleEl = document.getElementById('radar-title');
  if (titleEl) titleEl.textContent = t('radar_title');
  if (!svg) return;

  const scores = brainScores();
  const n = scores.length;
  const cx = 175, cy = 155, R = 100;
  const off = -Math.PI / 2;
  const pt = (i, f) => {
    const a = off + 2 * Math.PI * i / n;
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)];
  };

  let html = '';
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const pts = Array.from({ length: n }, (_, i) => pt(i, f).join(',')).join(' ');
    html += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,${f === 1 ? '.14' : '.06'})" stroke-width="1"/>`;
  });
  Array.from({ length: n }, (_, i) => {
    const [x, y] = pt(i, 1);
    html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`;
  });
  const skillPts = Array.from({ length: n }, (_, i) => pt(i, scores[i].score / 100).join(',')).join(' ');
  html += `<polygon points="${skillPts}" fill="rgba(124,58,237,.18)" stroke="rgba(167,139,250,.65)" stroke-width="2"/>`;
  Array.from({ length: n }, (_, i) => {
    const [x, y] = pt(i, scores[i].score / 100);
    html += `<circle cx="${x}" cy="${y}" r="5" fill="${scores[i].color}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
    const [lx, ly] = pt(i, 1.28);
    const anchor = lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle';
    html += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="rgba(255,255,255,.75)" font-size="11" font-weight="700" font-family="system-ui,sans-serif">${scores[i].label}</text>`;
    html += `<text x="${lx}" y="${ly + 13}" text-anchor="${anchor}" fill="${scores[i].color}" font-size="10" font-family="system-ui,sans-serif">${scores[i].score}%</text>`;
  });
  svg.innerHTML = html;

  if (statsEl) {
    statsEl.innerHTML = scores.map(s => `
      <div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:8px 10px;display:flex;align-items:center;gap:8px;">
        <div style="width:6px;height:28px;border-radius:3px;background:${s.color};flex-shrink:0;"></div>
        <div><div style="font-size:.7rem;font-weight:800;">${s.label}</div>
             <div style="font-size:1.05rem;font-weight:900;color:${s.color};">${s.score}%</div></div>
      </div>`).join('');
  }
}

function showRadarPanel() {
  renderRadarChart();
  document.getElementById('radar-panel').classList.add('show');
}

// ═══════════════════════════════════════════════════
// DAILY BRAIN WORKOUT
// ═══════════════════════════════════════════════════
const WORKOUT_STEPS_DEF = [
  { em: '🧠', go: () => { showWordMenu(); setTimeout(() => { const lvs = document.querySelectorAll('#wm-level-grid .level-btn'); if (lvs[2]) lvs[2].click(); }, 350); } },
  { em: '👁️', go: () => { showSpotMenu(); setTimeout(() => spotStart(4), 350); } },
  { em: '➕', go: () => { showMathMenu(); setTimeout(() => { selectMathOps('+-'); mathStartLevel(2); }, 350); } },
];

let workoutState = { active: false, step: 0, stepDone: false, results: [], xpEarned: 0 };

function workoutDoneToday() {
  try { return !!JSON.parse(localStorage.getItem('membrain_workout') || '{}')[mathTodayKey()]; } catch { return false; }
}
function saveWorkoutDone(xp) {
  try { const d = JSON.parse(localStorage.getItem('membrain_workout') || '{}'); d[mathTodayKey()] = { xp, done: true }; localStorage.setItem('membrain_workout', JSON.stringify(d)); } catch {}
}

function startWorkout() {
  workoutState = { active: true, step: 0, stepDone: false, results: [], xpEarned: 0 };
  renderWorkoutBanner();
  WORKOUT_STEPS_DEF[0].go();
}

function renderWorkoutBanner() {
  const banner = document.getElementById('workout-banner');
  const stepsEl = document.getElementById('wo-steps');
  const nextBtn = document.getElementById('wo-next-btn');
  const lbl = document.getElementById('workout-lbl');
  if (!banner) return;
  if (lbl) lbl.textContent = t('workout_lbl');
  if (!workoutState.active) { banner.classList.remove('visible'); return; }
  banner.classList.add('visible');
  stepsEl.innerHTML = '';
  WORKOUT_STEPS_DEF.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'wo-step' + (i < workoutState.step ? ' done' : i === workoutState.step ? ' active' : '');
    div.textContent = i < workoutState.step ? '✓' : s.em;
    stepsEl.appendChild(div);
    if (i < WORKOUT_STEPS_DEF.length - 1) {
      const sep = document.createElement('div');
      sep.style.cssText = 'width:14px;height:2px;background:var(--border);border-radius:1px;';
      stepsEl.appendChild(sep);
    }
  });
  if (nextBtn) {
    nextBtn.style.display = workoutState.stepDone ? '' : 'none';
    nextBtn.textContent = workoutState.step < WORKOUT_STEPS_DEF.length - 1 ? t('workout_next') : t('workout_finish');
  }
}

function workoutStepDone(xpGained) {
  if (!workoutState.active || workoutState.stepDone) return;
  workoutState.xpEarned += xpGained;
  workoutState.results.push(xpGained);
  workoutState.stepDone = true;
  renderWorkoutBanner();
}

function workoutNext() {
  if (!workoutState.active) return;
  workoutState.step++;
  workoutState.stepDone = false;
  if (workoutState.step >= WORKOUT_STEPS_DEF.length) { workoutFinish(); return; }
  WORKOUT_STEPS_DEF[workoutState.step].go();
  renderWorkoutBanner();
}

function workoutFinish() {
  workoutState.active = false;
  renderWorkoutBanner();
  const bonus = 75;
  addXp(bonus, t('workout_bonus_src'));
  saveWorkoutDone(workoutState.xpEarned + bonus);
  renderWorkoutBtn();
  const overlay = document.getElementById('workout-result');
  const titleEl = document.getElementById('workout-result-title');
  const subEl   = document.getElementById('workout-result-sub');
  const statsEl = document.getElementById('workout-result-stats');
  const dismissEl = document.getElementById('workout-dismiss-btn');
  if (titleEl) titleEl.textContent = t('workout_complete');
  if (subEl)   subEl.textContent   = t('workout_sub');
  if (dismissEl) dismissEl.textContent = t('workout_awesome');
  const total = workoutState.xpEarned + bonus;
  if (statsEl) statsEl.innerHTML = `
    <div class="stat-box"><div class="sv">${WORKOUT_STEPS_DEF.length}</div><div class="sl">${t('workout_steps')}</div></div>
    <div class="stat-box"><div class="sv">${total}</div><div class="sl">${t('workout_earned')}</div></div>`;
  if (overlay) overlay.classList.add('show');
  checkAchievements(['wo_complete']);
}

function workoutDismiss() {
  const overlay = document.getElementById('workout-result');
  if (overlay) overlay.classList.remove('show');
  goMenu();
}

function renderWorkoutBtn() {
  const btn = document.getElementById('workout-btn');
  if (!btn) return;
  const done = workoutDoneToday();
  btn.textContent = done ? '✓🏋️' : '🏋️';
  btn.title = done ? t('workout_complete') : t('workout_lbl');
}

