// ═══════════════════════════════════════════════════
// WORD MEMORY MODE
// ═══════════════════════════════════════════════════
let wmLevel = 0, wmSelectedLevel = 0, wmSequence = [], wmPool = [], wmSelected = [], wmTimers = [], wmMode = 'pool';
let wordDiff = localStorage.getItem('membrain_wm_diff') || 'all';
let wmRecallMode = localStorage.getItem('membrain_wm_recall') || 'normal';
let wmAudioMode  = localStorage.getItem('membrain_wm_audio')  === 'on';
let wmSpeedMult  = parseFloat(localStorage.getItem('membrain_wm_speed') || '1.0');

// Center the screen vertically only for the brief flash phase; for the tall
// level-select / recall / results lists, anchor to top so nothing clips on mobile.
function setWordAlign(center) {
  document.getElementById('screen-word').style.justifyContent = center ? 'center' : 'flex-start';
}

function showWordMenu() {
  showScreen('screen-word');
  setWordAlign(false);
  document.getElementById('wm-select').style.display = 'block';
  document.getElementById('wm-memorize').style.display = 'none';
  document.getElementById('wm-recall').style.display = 'none';
  document.getElementById('wm-results').style.display = 'none';
  const stats = wmLoadStats();

  // Difficulty selector
  const diffLbl = document.getElementById('wm-diff-lbl');
  const diffRow = document.getElementById('wm-diff-row');
  if (diffLbl) diffLbl.textContent = t('wm_diff_lbl');
  if (diffRow) {
    diffRow.innerHTML = '';
    const recDiff = wmGetRecommendedDiff();
    WM_DIFF_DEFS.forEach(d => {
      const b = document.createElement('div');
      b.className = 'wm-diff-opt' + (d.id === wordDiff ? ' active' : '');
      b.innerHTML = t('wm_diff_' + d.id) + (d.id === recDiff ? ' <span class="wm-diff-rec">★</span>' : '');
      b.onclick = () => { wordDiff = d.id; localStorage.setItem('membrain_wm_diff', d.id); showWordMenu(); };
      diffRow.appendChild(b);
    });
  }

  // Recall mode toggle
  const modeLbl = document.getElementById('wm-mode-lbl');
  const modeRow = document.getElementById('wm-recall-row');
  if (modeLbl) modeLbl.textContent = t('wm_mode_lbl');
  if (modeRow) {
    modeRow.innerHTML = '';
    [['normal', 'wm_mode_normal'], ['backwards', 'wm_mode_backwards']].forEach(([id, key]) => {
      const b = document.createElement('div');
      b.className = 'wm-mode-btn' + (wmRecallMode === id ? ' active' : '');
      b.textContent = t(key);
      b.onclick = () => { wmRecallMode = id; localStorage.setItem('membrain_wm_recall', id); showWordMenu(); };
      modeRow.appendChild(b);
    });
  }

  // Speed selector
  const speedLbl = document.getElementById('wm-speed-lbl');
  const speedRow = document.getElementById('wm-speed-row');
  if (speedLbl) speedLbl.textContent = t('wm_speed_lbl');
  if (speedRow) {
    speedRow.innerHTML = '';
    [[0.5,'wm_speed_fast'],[1.0,'wm_speed_normal'],[1.5,'wm_speed_slow']].forEach(([mult,key]) => {
      const b = document.createElement('div');
      b.className = 'spot-ctrl-btn' + (wmSpeedMult === mult ? ' active' : '');
      b.textContent = t(key);
      b.onclick = () => { wmSpeedMult = mult; localStorage.setItem('membrain_wm_speed', String(mult)); showWordMenu(); };
      speedRow.appendChild(b);
    });
  }

  // Audio mode toggle
  const audioLbl = document.getElementById('wm-audio-lbl');
  const audioRow = document.getElementById('wm-audio-row');
  if (audioLbl) audioLbl.textContent = t('wm_audio_lbl');
  if (audioRow) {
    audioRow.innerHTML = '';
    [[false, 'wm_audio_off'], [true, 'wm_audio_on']].forEach(([val, key]) => {
      const b = document.createElement('div');
      b.className = 'wm-mode-btn' + (wmAudioMode === val ? ' active' : '');
      b.textContent = t(key);
      b.onclick = () => { wmAudioMode = val; localStorage.setItem('membrain_wm_audio', val ? 'on' : 'off'); showWordMenu(); };
      audioRow.appendChild(b);
    });
  }

  // Restore options panel open/close state
  restoreOpts('wm-opts');

  wmUpdateStepper(stats);
  renderWmStats();
}

function wmUpdateStepper(stats) {
  if (!stats) stats = wmLoadStats();
  const i = wmSelectedLevel;
  const lv = WM_LEVELS[i];
  const stars = stats.stars?.[i] || 0;
  const numEl = document.getElementById('wm-level-num');
  const badgeEl = document.getElementById('wm-level-type-badge');
  const starsEl = document.getElementById('wm-level-stars-row');
  const downBtn = document.getElementById('wm-level-down');
  const upBtn = document.getElementById('wm-level-up');
  const startLbl = document.getElementById('wm-start-lbl');
  if (numEl) numEl.textContent = i + 1;
  if (badgeEl) badgeEl.textContent = lv.mode === 'type' ? '⌨️ ' + t('wm_type_badge') : '';
  if (starsEl) {
    let s = '';
    for (let k = 0; k < 3; k++) s += `<span style="opacity:${k<stars?1:.2};color:var(--goldL);">★</span>`;
    starsEl.innerHTML = s;
  }
  if (downBtn) downBtn.disabled = i === 0;
  if (upBtn) upBtn.disabled = i === WM_LEVELS.length - 1;
  if (startLbl) startLbl.textContent = t('wm_start_btn');
}

function wmStepLevel(dir) {
  wmSelectedLevel = Math.max(0, Math.min(WM_LEVELS.length - 1, wmSelectedLevel + dir));
  wmUpdateStepper();
}

function wmStartSelected() { wmStart(wmSelectedLevel); }

function wmStop() {
  wmTimers.forEach(clearTimeout); wmTimers = [];
  speechSynthesis && speechSynthesis.cancel();
  wmSelectedLevel = wmLevel;
  showWordMenu();
}

function wmShowBackwardsBanner(show) {
  const b1 = document.getElementById('wm-backwards-banner');
  const b2 = document.getElementById('wm-backwards-banner-recall');
  const lbl = t('wm_backwards_reminder');
  if (b1) { b1.style.display = show ? '' : 'none'; const s = b1.querySelector('#wm-backwards-lbl'); if (s) s.textContent = lbl; }
  if (b2) { b2.style.display = show ? '' : 'none'; const s = b2.querySelector('#wm-backwards-lbl-recall'); if (s) s.textContent = lbl; }
}

function wmStart(lvIdx) {
  wmLevel = lvIdx;
  wmTimers.forEach(clearTimeout); wmTimers = [];
  const lv = WM_LEVELS[lvIdx];
  wmMode = lv.mode;
  // distinct words across the chosen categories (avoids duplicate sequence entries)
  const banks = lang === 'uk' ? WORD_BANKS_UK : WORD_BANKS;
  const allWords = [...new Set(lv.cats.flatMap(c => (banks[c] || WORD_BANKS[c])))].sort(() => Math.random()-0.5);
  const diff = WM_DIFF_DEFS.find(d => d.id === wordDiff) || WM_DIFF_DEFS[WM_DIFF_DEFS.length - 1];
  const filtered = allWords.filter(diff.filter);
  const wordPool = filtered.length >= lv.words ? filtered : allWords;
  wmSequence = wordPool.slice(0, lv.words);
  const distractors = wordPool.slice(lv.words, lv.words + Math.max(8, lv.words));
  wmPool = [...wmSequence, ...distractors].sort(() => Math.random()-0.5);
  wmSelected = [];

  setWordAlign(true);
  document.getElementById('wm-select').style.display = 'none';
  document.getElementById('wm-memorize').style.display = 'block';
  document.getElementById('wm-recall').style.display = 'none';
  document.getElementById('wm-results').style.display = 'none';
  wmShowBackwardsBanner(wmRecallMode === 'backwards');

  wmCountdown(() => wmRunMemorize(0, lv));
}

// Tension-building 3·2·1·GO! before the words flash
function wmCountdown(done) {
  const display = document.getElementById('wm-word-display');
  const title = document.getElementById('wm-title');
  document.getElementById('wm-progress-bar').style.width = '0%';
  document.getElementById('wm-counter').textContent = wmMode === 'type' ? t('wm_type_ready') : '';
  title.textContent = t('wm_get_ready');
  display.classList.add('count');
  const seq = ['3','2','1','GO!'];
  let i = 0;
  const step = () => {
    display.style.opacity = 1;
    display.textContent = seq[i];
    display.classList.remove('anim-wordpop'); void display.offsetWidth; display.classList.add('anim-wordpop');
    playTone(i < 3 ? 400 : 720, 'sine', 0.18, 0.13);
    i++;
    if (i < seq.length) wmTimers.push(setTimeout(step, 620));
    else wmTimers.push(setTimeout(() => { display.classList.remove('count'); done(); }, 520));
  };
  step();
}

function wmRunMemorize(idx, lv) {
  const display = document.getElementById('wm-word-display');
  const bar = document.getElementById('wm-progress-bar');
  const counter = document.getElementById('wm-counter');
  const title = document.getElementById('wm-title');

  if (idx >= wmSequence.length) {
    title.textContent = t('wm_now_recall');
    display.style.opacity = 0;
    bar.style.width = '100%';
    wmTimers.push(setTimeout(wmShowRecall, 700));
    return;
  }
  title.textContent = t('wm_word_n_of', idx+1, wmSequence.length);
  const curWord = wmSequence[idx];
  display.textContent = wmAudioMode ? '🎧' : curWord.toUpperCase();
  display.style.opacity = 1;
  if (wmAudioMode && 'speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(curWord);
    utt.lang = lang === 'uk' ? 'uk-UA' : 'en-US';
    utt.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  }
  display.classList.remove('anim-wordpop'); void display.offsetWidth; display.classList.add('anim-wordpop');
  bar.style.width = ((idx+1)/wmSequence.length*100)+'%';
  counter.textContent = t('wm_more_to_go', wmSequence.length - idx - 1);
  playTone(500 + idx*12, 'sine', 0.13, 0.07);

  const flashTime = Math.round(lv.time * wmSpeedMult);
  const halfTime = flashTime * 0.7;
  wmTimers.push(setTimeout(() => { display.style.opacity = 0; }, halfTime));
  wmTimers.push(setTimeout(() => wmRunMemorize(idx+1, lv), flashTime));
}

function wmShowRecall() {
  setWordAlign(false);
  document.getElementById('wm-memorize').style.display = 'none';
  document.getElementById('wm-recall').style.display = 'block';
  wmShowBackwardsBanner(wmRecallMode === 'backwards');
  const poolArea = document.getElementById('wm-pool-area');
  const typeArea = document.getElementById('wm-type-area');
  const clearBtn = document.getElementById('wm-clear-btn');
  if (wmMode === 'pool') {
    poolArea.style.display = ''; typeArea.style.display = 'none'; clearBtn.style.display = '';
    document.getElementById('wm-recall-title').textContent = t('wm_what_did_you_see');
    document.getElementById('wm-recall-sub').textContent = t('wm_recall_sub_pool');
    wmSelected = [];
    renderWmSlots(); renderWmPool();
  } else {
    poolArea.style.display = 'none'; typeArea.style.display = ''; clearBtn.style.display = 'none';
    document.getElementById('wm-recall-title').textContent = t('wm_type_recall_title');
    document.getElementById('wm-recall-sub').textContent = t('wm_type_recall_sub');
    renderWmTypeRows();
  }
}

// ── pool (click) recall ──
function renderWmSlots() {
  const el = document.getElementById('wm-slots');
  el.innerHTML = '';
  wmSelected.forEach((w, i) => {
    const s = document.createElement('div');
    s.className = 'wm-slot';
    s.innerHTML = `<span class="slot-num">#${i+1}</span><span>${w}</span>`;
    s.onclick = () => { wmRemoveSlot(i); };
    el.appendChild(s);
  });
  if (wmSelected.length === 0) {
    el.innerHTML = '<div style="color:var(--text3);font-size:.8rem;padding:8px 0;">Click words below in the order you remember them</div>';
  }
}
function renderWmPool() {
  const el = document.getElementById('wm-pool');
  el.innerHTML = '';
  wmPool.forEach(w => {
    const c = document.createElement('div');
    c.className = 'wm-chip' + (wmSelected.includes(w) ? ' selected' : '');
    c.textContent = w;
    c.onclick = () => wmToggleWord(w);
    el.appendChild(c);
  });
}
function wmToggleWord(w) {
  if (wmSelected.includes(w)) wmSelected = wmSelected.filter(x => x !== w);
  else { wmSelected.push(w); playTone(560, 'sine', 0.1, 0.05); }
  renderWmSlots(); renderWmPool();
}
function wmRemoveSlot(i) { wmSelected.splice(i, 1); renderWmSlots(); renderWmPool(); }
function wmClearSlots() { wmSelected = []; renderWmSlots(); renderWmPool(); }

// ── type (keyboard) recall ──
function renderWmTypeRows() {
  const el = document.getElementById('wm-type-rows');
  el.innerHTML = '';
  for (let i = 0; i < wmSequence.length; i++) {
    const row = document.createElement('div');
    row.className = 'wm-type-row';
    row.innerHTML = `<span class="tn">#${i+1}</span>`;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.autocapitalize = 'none'; inp.spellcheck = false;
    inp.dataset.i = i;
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = el.querySelector(`input[data-i="${i+1}"]`);
        if (next) next.focus(); else wmSubmit();
      }
    });
    row.appendChild(inp);
    el.appendChild(row);
  }
  const first = el.querySelector('input');
  if (first) setTimeout(() => first.focus(), 60);
}

function wmSubmit() {
  // gather the player's answer for either mode
  let answer;
  if (wmMode === 'pool') answer = wmSelected.map(w => w.toLowerCase());
  else answer = [...document.querySelectorAll('#wm-type-rows input')].map(x => x.value.trim().toLowerCase()).filter(x => x);

  setWordAlign(false);
  document.getElementById('wm-recall').style.display = 'none';
  document.getElementById('wm-results').style.display = 'block';

  const seq = wmSequence.map(w => w.toLowerCase());
  // backwards mode: order is scored against reversed sequence
  const seqForOrder = wmRecallMode === 'backwards' ? [...seq].reverse() : seq;
  const seqSet = new Set(seq), ansSet = new Set(answer);
  const hits = answer.filter(w => seqSet.has(w));
  const falsePos = answer.filter(w => !seqSet.has(w));
  let orderCorrect = 0, streak = 0, bestStreak = 0;
  for (let i = 0; i < seqForOrder.length; i++) {
    if (answer[i] === seqForOrder[i]) { orderCorrect++; streak++; bestStreak = Math.max(bestStreak, streak); }
    else streak = 0;
  }
  const recall = hits.length / seq.length;
  const precision = answer.length > 0 ? hits.length / answer.length : 0;
  const order = orderCorrect / seq.length;
  let score = Math.round((recall * 0.5 + precision * 0.2 + order * 0.3) * 100);
  if (wmMode === 'type') score = Math.min(100, Math.round(score * 1.05)); // typing is harder
  const perfect = hits.length === seq.length && orderCorrect === seq.length && falsePos.length === 0;
  if (perfect) score = 100;
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;

  // persist stats + best + stars
  const stats = wmLoadStats();
  stats.days = stats.days || {}; stats.best = stats.best || {}; stats.stars = stats.stars || {};
  const prevBest = stats.best[wmLevel] ?? -1;
  const isNewBest = score > prevBest && prevBest >= 0;
  const k = mathTodayKey();
  const day = stats.days[k] || { sessions: 0, words: 0, recalled: 0, bestScore: 0 };
  day.sessions++; day.words += seq.length; day.recalled += hits.length; day.bestScore = Math.max(day.bestScore, score);
  stats.days[k] = day;
  stats.best[wmLevel] = Math.max(stats.best[wmLevel] ?? 0, score);
  stats.stars[wmLevel] = Math.max(stats.stars[wmLevel] || 0, stars);
  wmSaveStats(stats);
  wmSaveDiffScore(score);

  // ── render results ──
  const starsEl = document.getElementById('wm-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.style.color = i < stars ? 'var(--goldL)' : 'var(--text3)';
    s.style.animationDelay = (0.15 + i * 0.18) + 's';
    starsEl.appendChild(s);
  }
  const pf = document.getElementById('wm-perfect');
  pf.classList.remove('show'); void pf.offsetWidth;
  pf.textContent = perfect ? t('wm_perfect') : score >= 70 ? t('wm_sharp') : score >= 40 ? t('wm_keep') : t('wm_try');
  pf.classList.add('show');

  document.getElementById('wm-score-pct').textContent = score + '%';
  document.getElementById('wm-result-label').innerHTML = t('wm_score_label') + (isNewBest ? ` &nbsp;<span class="wm-newbest">${t('wm_new_best')}</span>` : '');
  document.getElementById('wm-stat-row').innerHTML = `
    <div class="stat-box"><div class="sv">${hits.length}/${seq.length}</div><div class="sl">${t('wm_recalled')}</div></div>
    <div class="stat-box"><div class="sv">${orderCorrect}</div><div class="sl">${t('wm_in_order')}</div></div>
    <div class="stat-box"><div class="sv">${falsePos.length}</div><div class="sl">${wmMode==='type'?t('wm_wrong'):t('wm_false_picks')}</div></div>
  `;
  const compare = document.getElementById('wm-compare');
  compare.innerHTML = `
    <div>
      <h4>${t('wm_shown')}</h4>
      ${seq.map((w,i)=>`<div class="compare-word ${ansSet.has(w)?'hit':'miss'} ${answer[i]===w?'order-ok':'order-bad'}">#${i+1} ${w}</div>`).join('')}
    </div>
    <div>
      <h4>${t('wm_your_ans')}</h4>
      ${answer.length ? answer.map((w,i)=>`<div class="compare-word ${seqSet.has(w)?'hit':'extra'} ${seq[i]===w?'order-ok':'order-bad'}">#${i+1} ${w}</div>`).join('')
        : `<div style="color:var(--text3);font-size:.82rem;">${t('wm_nothing')}</div>`}
    </div>
  `;
  const nextBtn = document.getElementById('wm-next-btn');
  nextBtn.style.display = wmLevel < WM_LEVELS.length-1 ? '' : 'none';

  if (perfect) soundWin(); else if (score >= 50) soundPairFound(); else soundNoMatch();

  // achievements
  const toEarn = ['wm_first'];
  if (score >= 100) toEarn.push('wm_perfect');
  if (score >= 80)  toEarn.push('wm_sharp');
  if (wmRecallMode === 'backwards') toEarn.push('wm_back');
  if (wmAudioMode) toEarn.push('wm_audio');
  const played = metaTrackGame('wm');
  if (played.length >= 3) toEarn.push('all_games');
  checkAchievements(toEarn);
  const wmXp = Math.max(5, Math.round(score * 0.5));
  addXp(wmXp, t('wm_mode_title'));
  if (workoutState.active && workoutState.step === 0) workoutStepDone(wmXp);
}

function wmReplay() { wmStart(wmLevel); }
function wmNextLevel() { if (wmLevel < WM_LEVELS.length-1) { wmSelectedLevel = wmLevel+1; wmStart(wmLevel+1); } }

// ── word-mode local stats ──
function wmLoadStats() { try { return JSON.parse(localStorage.getItem('membrain_word_v1')) || {}; } catch { return {}; } }
function wmSaveStats(s) { try { localStorage.setItem('membrain_word_v1', JSON.stringify(s)); } catch {} }
function wmSaveDiffScore(score) {
  try {
    const d = JSON.parse(localStorage.getItem('membrain_wm_diff_hist') || '{}');
    if (!d[wordDiff]) d[wordDiff] = [];
    d[wordDiff].push(score);
    if (d[wordDiff].length > 5) d[wordDiff].shift();
    localStorage.setItem('membrain_wm_diff_hist', JSON.stringify(d));
  } catch {}
}
function wmGetRecommendedDiff() {
  try {
    const d = JSON.parse(localStorage.getItem('membrain_wm_diff_hist') || '{}');
    const order = ['short', 'medium', 'long'];
    if (!Object.values(d).flat().length) return 'short';
    for (let i = 0; i < order.length; i++) {
      const hist = d[order[i]] || [];
      if (hist.length >= 3) {
        const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
        if (avg >= 75 && i + 1 < order.length) return order[i + 1];
      }
    }
  } catch {}
  return null;
}
function wmStreak(stats) {
  let n = 0; const d = new Date();
  const has = () => { const day = stats.days?.[mathDayKey(d)]; return day && day.words > 0; };
  if (!has()) d.setDate(d.getDate()-1);
  while (has()) { n++; d.setDate(d.getDate()-1); }
  return n;
}
function renderWmStats() {
  const s = wmLoadStats(); s.days = s.days || {};
  document.getElementById('wm-streak').textContent = t('wm_day_streak', wmStreak(s));
  const bars = document.getElementById('wm-bars'); bars.innerHTML = '';
  const days = []; const base = new Date();
  for (let i = 6; i >= 0; i--) { const dd = new Date(base); dd.setDate(base.getDate()-i); days.push(dd); }
  const counts = days.map(dd => s.days[mathDayKey(dd)]?.words || 0);
  const maxT = Math.max(20, ...counts);
  const tk = mathTodayKey(); const dow = t('dow');
  days.forEach((dd, i) => {
    const t = counts[i];
    const el = document.createElement('div');
    el.className = 'bar7' + (mathDayKey(dd)===tk ? ' today' : '');
    el.innerHTML = `<div class="bval">${t||''}</div><div class="bcol" style="height:${Math.round(t/maxT*100)}%"></div><div class="bday">${dow[dd.getDay()]}</div>`;
    bars.appendChild(el);
  });
  const allWords = Object.values(s.days).reduce((a,x)=>a+(x.words||0),0);
  const allRecalled = Object.values(s.days).reduce((a,x)=>a+(x.recalled||0),0);
  const acc = allWords ? Math.round(allRecalled/allWords*100) : 0;
  const totalStars = Object.values(s.stars||{}).reduce((a,x)=>a+x,0);
  document.getElementById('wm-daily-stats').innerHTML = `
    <div class="stat-box"><div class="sv">${s.days[tk]?.words||0}</div><div class="sl">${t('wm_today')}</div></div>
    <div class="stat-box"><div class="sv">${allRecalled}</div><div class="sl">${t('wm_recalled')}</div></div>
    <div class="stat-box"><div class="sv">${acc}%</div><div class="sl">${t('math_accuracy')}</div></div>
    <div class="stat-box"><div class="sv">${totalStars}/36</div><div class="sl">⭐ Stars</div></div>`;
}

