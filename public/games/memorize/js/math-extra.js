// ═══════════════════════════════════════════════════
// MATH ESTIMATION MODE
// ═══════════════════════════════════════════════════
function renderMathEstRow() {
  const row = document.getElementById('math-est-row');
  const lbl = document.getElementById('math-est-lbl');
  if (!row) return;
  if (lbl) lbl.textContent = t('math_est_lbl');
  row.innerHTML = '';
  [['off', 'math_est_off'], ['on', 'math_est_on']].forEach(([id, key]) => {
    const b = document.createElement('div');
    b.className = 'wm-mode-btn' + ((!mathEstMode && id === 'off') || (mathEstMode && id === 'on') ? ' active' : '');
    b.textContent = t(key);
    b.onclick = () => {
      mathEstMode = id === 'on';
      localStorage.setItem('membrain_math_est', mathEstMode ? 'on' : 'off');
      renderMathEstRow();
    };
    row.appendChild(b);
  });
}

// ═══════════════════════════════════════════════════
// TRICK MASTERY
// ═══════════════════════════════════════════════════
function trickMasteryLoad() { try { return JSON.parse(localStorage.getItem('membrain_trick_mastery') || '{}'); } catch { return {}; } }
function trickMasterySave(m) { try { localStorage.setItem('membrain_trick_mastery', JSON.stringify(m)); } catch {} }
function trickMasteryGet(id) { return trickMasteryLoad()[id] || 0; }
function trickMasteryIncrement(id) {
  const m = trickMasteryLoad();
  m[id] = (m[id] || 0) + 1;
  trickMasterySave(m);
  return m[id];
}

// ═══════════════════════════════════════════════════
// DAILY LADDER
// ═══════════════════════════════════════════════════
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s ^= s >>> 16; return (s >>> 0) / 0xFFFFFFFF; };
}

function dailySeed() {
  return mathTodayKey().split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
}

function genDailyTasks() {
  const rand = seededRand(dailySeed());
  const ops = ['+', '-', '*', '%'];
  return Array.from({ length: 5 }, () => {
    const op = ops[Math.floor(rand() * ops.length)];
    if (op === '+') {
      const a = Math.floor(rand() * 90) + 10, b = Math.floor(rand() * 90) + 10;
      return { q: `${a} + ${b} = ?`, target: a + b, op };
    } else if (op === '-') {
      const a = Math.floor(rand() * 90) + 30, b = Math.floor(rand() * (a - 10)) + 5;
      return { q: `${a} − ${b} = ?`, target: a - b, op };
    } else if (op === '*') {
      const a = Math.floor(rand() * 11) + 2, b = Math.floor(rand() * 11) + 2;
      return { q: `${a} × ${b} = ?`, target: a * b, op };
    } else {
      const pcts = [10, 20, 25, 50];
      const pct = pcts[Math.floor(rand() * pcts.length)];
      const whole = (Math.floor(rand() * 9) + 2) * 10;
      return { q: `${pct}% of ${whole} = ?`, target: Math.round(pct * whole / 100), op };
    }
  });
}

function dailyDoneToday() {
  try { const d = JSON.parse(localStorage.getItem('membrain_math_daily') || '{}'); return d[mathTodayKey()] || null; } catch { return null; }
}

function saveDailyResult(score, correct) {
  try {
    const d = JSON.parse(localStorage.getItem('membrain_math_daily') || '{}');
    if (!d[mathTodayKey()]) d[mathTodayKey()] = { score, correct, done: true };
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const dd = new Date(now); dd.setDate(now.getDate() - i);
      if (d[mathDayKey(dd)]?.done) streak++; else break;
    }
    d._streak = streak;
    localStorage.setItem('membrain_math_daily', JSON.stringify(d));
    return streak;
  } catch { return 0; }
}

function dailyStreak() { try { return JSON.parse(localStorage.getItem('membrain_math_daily') || '{}')._streak || 0; } catch { return 0; } }

function renderDailyChallenge() {
  const lbl = document.getElementById('math-daily-btn-lbl');
  const badge = document.getElementById('math-daily-badge');
  if (lbl) lbl.textContent = t('math_daily_challenge');
  const done = dailyDoneToday();
  if (done) {
    if (badge) { badge.textContent = `✓ ${done.correct}/5`; badge.style.color = 'var(--greenL)'; }
  } else {
    const streak = dailyStreak();
    if (badge) { badge.textContent = streak > 0 ? `🔥${streak}` : t('math_daily_go'); badge.style.color = ''; }
  }
}

function startDailyChallenge() {
  mathState.trickDef = null;
  mathState.dailyMode = true;
  mathState.dailyTasks = genDailyTasks();
  mathState.level = 5;
  mathState.taskIdx = 0; mathState.score = 0; mathState.correct = 0;
  document.getElementById('math-setup').style.display = 'none';
  document.getElementById('math-result').style.display = 'none';
  document.getElementById('math-play').style.display = 'block';
  document.getElementById('math-level-tag').textContent = t('math_daily_challenge');
  mathNextTask();
}

// ═══════════════════════════════════════════════════
// SHARE CARD
// ═══════════════════════════════════════════════════
function shareCard(gameEmoji, gameName, scoreText, subText){
  const cv = document.getElementById('share-canvas');
  cv.width = 600; cv.height = 310;
  const ctx = cv.getContext('2d');
  const bg = ctx.createLinearGradient(0,0,600,310);
  bg.addColorStop(0,'#080818'); bg.addColorStop(1,'#0d0d26');
  ctx.fillStyle = bg; ctx.fillRect(0,0,600,310);
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let x=0;x<600;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,310);ctx.stroke();}
  for(let y=0;y<310;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(600,y);ctx.stroke();}
  const glow = ctx.createRadialGradient(300,155,30,300,155,180);
  glow.addColorStop(0,'rgba(251,191,36,.13)'); glow.addColorStop(1,'rgba(251,191,36,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,600,310);
  ctx.fillStyle='rgba(251,191,36,.75)'; ctx.font='bold 13px sans-serif'; ctx.textAlign='left';
  ctx.fillText(lang==='uk'?'БОТАНІК':'MEMBRAIN', 22, 28);
  ctx.textAlign='center';
  ctx.font='48px serif'; ctx.fillText(gameEmoji, 300, 82);
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='bold 17px sans-serif'; ctx.fillText(gameName, 300, 110);
  ctx.fillStyle='#fbbf24'; ctx.font='bold 68px sans-serif'; ctx.fillText(scoreText, 300, 198);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='15px sans-serif'; ctx.fillText(subText, 300, 232);
  ctx.strokeStyle='rgba(251,191,36,.32)'; ctx.lineWidth=2; ctx.strokeRect(1,1,598,308);
  const link = document.createElement('a');
  link.download='membrain-result.png'; link.href=cv.toDataURL(); link.click();
}

function wmShareCard(){
  const score = document.getElementById('wm-score-pct')?.textContent || '';
  const name = t('wm_mode_title');
  shareCard('🧠', name, score, t('app_name'));
}

function spotShareCard(){
  const streak = spotStreak > 0 ? `🔥 ${lang==='uk'?'Серія':'Streak'}: ${spotStreak}` : t('app_name');
  shareCard('👁️', t('spot_mode_title'), spotStreak > 0 ? 'Streak ×'+spotStreak : '✓', streak);
}

