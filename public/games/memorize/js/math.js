// ═══════════════════════════════════════════════════
// MATH DRILLS MODE
// ═══════════════════════════════════════════════════
const MATH_PRESETS = [
  {id:'+',    ops:['+'],             sym:'+',   key:'math_op_add'},
  {id:'-',    ops:['-'],             sym:'−',   key:'math_op_sub'},
  {id:'*',    ops:['*'],             sym:'×',   key:'math_op_mul'},
  {id:'/',    ops:['/'],             sym:'÷',   key:'math_op_div'},
  {id:'+-',   ops:['+','-'],         sym:'±',   key:'math_op_addsub'},
  {id:'+*',   ops:['+','*'],         sym:'+×',  key:'math_op_addmul'},
  {id:'+-*',  ops:['+','-','*'],     sym:'+−×', key:'math_op_mixed'},
  {id:'all',  ops:['+','-','*','/'], sym:'∀',   key:'math_op_all'},
  {id:'%',    ops:['%'],            sym:'%',   key:'math_op_pct'},
];

const MATH_TRICKS = [
  {id:'mul11',    sym:'×11',  key:'trick_mul11',    hintKey:'trick_mul11_hint',    time:20,
    gen:()=>{ const a=mRand(12,89); return {trickQ:`${a} × 11 = ?`, answer:a*11, target:a*11}; }},
  {id:'mul5',     sym:'×5',   key:'trick_mul5',     hintKey:'trick_mul5_hint',     time:14,
    gen:()=>{ const a=mRand(11,199)*2; return {trickQ:`${a} × 5 = ?`, answer:a*5, target:a*5}; }},
  {id:'mul25',    sym:'×25',  key:'trick_mul25',    hintKey:'trick_mul25_hint',    time:16,
    gen:()=>{ const a=mRand(1,20)*4; return {trickQ:`${a} × 25 = ?`, answer:a*25, target:a*25}; }},
  {id:'sq5',      sym:'N5²',  key:'trick_sq5',      hintKey:'trick_sq5_hint',      time:18,
    gen:()=>{ const b=mPick([15,25,35,45,55,65,75,85,95]); return {trickQ:`${b}² = ?`, answer:b*b, target:b*b}; }},
  {id:'near100',  sym:'~100', key:'trick_near100',  hintKey:'trick_near100_hint',  time:25,
    gen:()=>{ const a=mRand(88,99),b=mRand(88,99); return {trickQ:`${a} × ${b} = ?`, answer:a*b, target:a*b}; }},
  {id:'pct_swap', sym:'A%B',  key:'trick_pct_swap', hintKey:'trick_pct_swap_hint', time:16,
    gen:()=>{ const p=mPick([4,8,12,16,24,32,48]); const n=mPick([25,50,75,100,125,150,200]); const ans=Math.round(p*n/100); return {trickQ:`${p}% of ${n} = ?`, answer:ans, target:ans}; }},
];

// 12 levels. Difficulty climbs; "intro" levels add a new mechanic with MORE time,
// the following levels cut the clock so it gets stressful.
const MATH_LEVELS = [
  {operands:2, max:100, time:25, mode:'choice', kind:'plain'},
  {operands:2, max:100, time:22, mode:'choice', kind:'plain'},
  {operands:2, max:300, time:22, mode:'choice', kind:'plain'},
  {operands:2, max:999, time:26, mode:'input',  kind:'plain',    introKey:'math_intro_input'},
  {operands:2, max:999, time:18, mode:'input',  kind:'plain'},
  {operands:2, max:99,  time:28, mode:'input',  kind:'equation', introKey:'math_intro_equation'},
  {operands:2, max:300, time:18, mode:'input',  kind:'equation'},
  {operands:3, max:50,  time:30, mode:'input',  kind:'plain',    introKey:'math_intro_three'},
  {operands:3, max:300, time:22, mode:'input',  kind:'plain'},
  {operands:3, max:999, time:16, mode:'input',  kind:'plain'},
  {operands:3, max:99,  time:30, mode:'input',  kind:'equation', introKey:'math_intro_eq3'},
  {operands:3, max:300, time:15, mode:'input',  kind:'equation'},
];

const ROUND_TARGETS = [100, 200, 500, 750, 1000, 1350, 1500];
const MATH_SYM = {'+':'+','-':'−','*':'×','/':'÷'};

let mathEstMode = localStorage.getItem('membrain_math_est') === 'on';

const mathState = {
  opsId: null, ops: null, level: 0, taskIdx: 0, score: 0, correct: 0,
  task: null, target: 0, timer: null, deadline: 0, dur: 0, answered: false,
  trickDef: null, dailyMode: false, dailyTasks: null,
};

function mRand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function mPick(a){ return a[Math.floor(Math.random()*a.length)]; }
function mShuffle(a){ return [...a].sort(()=>Math.random()-0.5); }

// Build a left-to-right expression with a controlled running value.
function mBuildExpr(level, ops){
  const operators = [];
  for(let i=0;i<level.operands-1;i++) operators.push(mPick(ops));
  let cur;
  if(operators.length && operators[0]==='/'){
    const b = mRand(2, level.max<=100?9:12);
    cur = b * mRand(2, Math.max(2, Math.floor(level.max/b)));
  } else {
    cur = mRand(1, level.max);
  }
  const vals = [cur];
  for(let i=0;i<operators.length;i++){
    let op = operators[i], b;
    if(op==='+'){ b = mRand(1, level.max); cur += b; }
    else if(op==='-'){
      if(cur<1){ op='+'; operators[i]='+'; b = mRand(1, level.max); cur += b; }
      else { b = mRand(1, cur); cur -= b; }
    }
    else if(op==='*'){
      const cap = level.max<=100?9 : level.max<=300?12 : 15;
      b = mRand(2, cap); while(cur*b>500000 && b>2) b--; cur *= b;
    } else { // division — pick a divisor of the running value
      const divs = []; for(let d=2;d<=12;d++) if(cur%d===0) divs.push(d);
      if(divs.length){ b = mPick(divs); cur /= b; }
      else { op='+'; operators[i]='+'; b = mRand(1, level.max); cur += b; }
    }
    vals.push(b);
  }
  return {vals, operators, answer: cur};
}

const PCT_NICE = [5,10,20,25,50,75];
function mGenPercentTask(){
  const pct   = mPick(PCT_NICE);
  const whole = mPick([20,40,50,60,80,100,120,150,200,400]);
  const part  = Math.round(pct*whole/100);
  const lvIdx = mathState.level;
  const roll  = lvIdx < 4 ? 1 : lvIdx < 8 ? (Math.random()<0.6?1:2) : mPick([1,1,2,3]);
  if(roll===1) return {percentQ:`${pct}% of ${whole} = ?`,      answer:part,  target:part,  isPercent:true};
  if(roll===2) return {percentQ:`${part} is what % of ${whole}?`, answer:pct, target:pct,   isPercent:true};
  return             {percentQ:`${part} = ${pct}% of ?`,        answer:whole, target:whole, isPercent:true};
}

function mGenTask(level, ops){
  if(ops.includes('%')) return mGenPercentTask();
  let expr;
  // Sometimes craft a satisfying round-number answer (simple additive tasks).
  if(level.operands===2 && ops.includes('+') && Math.random()<0.3){
    const t = mPick(ROUND_TARGETS.filter(x=>x<=level.max*2));
    if(t){ const a = mRand(Math.floor(t*0.2), Math.floor(t*0.8)); expr={vals:[a, t-a], operators:['+'], answer:t}; }
  }
  if(!expr || expr.answer<0) expr = mBuildExpr(level, ops);
  let equation = null;
  if(level.kind==='equation'){
    const idx = mRand(0, expr.vals.length-1);
    equation = {idx, xValue: expr.vals[idx]};
  }
  const target = equation ? equation.xValue : expr.answer;
  return {...expr, equation, target, level};
}

function mExprHtml(task, hideIdx){
  const {vals, operators} = task;
  const additive = operators.some(o=>o==='+'||o==='-');
  const multiplicative = operators.some(o=>o==='*'||o==='/');
  const tok = i => (i===hideIdx) ? '<span class="mq-x">X</span>' : vals[i];
  if(additive && multiplicative && vals.length===3){
    // force left-to-right reading with parentheses (matches our evaluation)
    return `(${tok(0)} ${MATH_SYM[operators[0]]} ${tok(1)}) ${MATH_SYM[operators[1]]} ${tok(2)}`;
  }
  let s = tok(0);
  for(let i=0;i<operators.length;i++) s += ` ${MATH_SYM[operators[i]]} ${tok(i+1)}`;
  return s;
}

function mChoices(ans){
  const set = new Set([ans]);
  const offs = [1,-1,2,-2,3,-3,5,-5,10,-10];
  let guard = 0;
  while(set.size<4 && guard++<40){
    let d = ans + mPick(offs);
    if(d<0) d = ans + Math.abs(mPick(offs)) + 1;
    set.add(d);
  }
  return mShuffle([...set]);
}

// ── menu / setup ──
function showMathMenu(){
  showScreen('screen-math');
  document.getElementById('math-setup').style.display = 'block';
  document.getElementById('math-play').style.display = 'none';
  document.getElementById('math-result').style.display = 'none';
  if(!mathState.opsId) selectMathOps('+-');
  renderMathOps();
  renderMathLevels();
  renderMathTricks();
  renderMathStats();
  renderMathEstRow();
  renderDailyChallenge();
  restoreOpts('math-opts');
  restoreOpts('lobby-opts');
}

function renderMathOps(){
  const grid = document.getElementById('math-op-grid');
  grid.innerHTML = '';
  MATH_PRESETS.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'op-btn' + (mathState.opsId===p.id ? ' active' : '');
    el.onclick = () => { selectMathOps(p.id); renderMathOps(); };
    el.innerHTML = `<span class="op-sym">${p.sym}</span><span class="op-lbl">${t(p.key)}</span>`;
    grid.appendChild(el);
  });
}

function selectMathOps(id){
  const p = MATH_PRESETS.find(x=>x.id===id);
  mathState.opsId = p.id; mathState.ops = p.ops;
  const hint = document.getElementById('math-op-hint');
  if(hint) hint.textContent = t('math_practicing', p.ops.map(o=>MATH_SYM[o]).join('  '));
}

function renderMathLevels(){
  const grid = document.getElementById('math-level-grid');
  grid.innerHTML = '';
  const isPct = mathState.ops && mathState.ops.includes('%');
  MATH_LEVELS.forEach((lv, i)=>{
    const el = document.createElement('div');
    el.className = 'math-lv' + (lv.introKey ? ' new-lv' : '');
    el.onclick = () => mathStartLevel(i);
    let sub;
    if(isPct) sub = i<4 ? t('math_pct_type1') : i<8 ? t('math_pct_type12') : t('math_pct_type123');
    else if(lv.kind==='equation') sub = `${t('math_sub_eq')}<br>≤${lv.max}`;
    else sub = `${t('math_sub_plain', lv.operands)}<br>≤${lv.max}`;
    el.innerHTML = `${lv.introKey?'<span class="mlv-badge">🆕</span>':''}<span class="mlv-num">${i+1}</span><span class="mlv-sub">${sub}<br>${lv.time}s</span>`;
    grid.appendChild(el);
  });
}

// ── play loop ──
function mathStartLevel(idx){
  if(!mathState.ops) selectMathOps('+-');
  mathState.trickDef = null;
  mathState.level = idx;
  mathState.taskIdx = 0;
  mathState.score = 0;
  mathState.correct = 0;
  document.getElementById('math-setup').style.display = 'none';
  document.getElementById('math-result').style.display = 'none';
  document.getElementById('math-play').style.display = 'block';
  const lv = MATH_LEVELS[idx];
  document.getElementById('math-level-tag').textContent = `${lang==='uk'?'Рівень':'Level'} ${idx+1}` + (lv.introKey ? ' · 🆕' : '');
  mathNextTask();
}

function mathNextTask(){
  const totalTasks = mathState.dailyMode ? 5 : 10;
  if(mathState.taskIdx >= totalTasks){ mathFinish(); return; }
  mathState.answered = false;

  const hintCard = document.getElementById('math-trick-hint');
  const q = document.getElementById('math-question');
  const choicesEl = document.getElementById('math-choices');
  const inputEl   = document.getElementById('math-input');

  if(mathState.dailyMode){
    const dt = mathState.dailyTasks[mathState.taskIdx];
    mathState.target = dt.target;
    mathState.task = {q: dt.q, answer: dt.target, target: dt.target};
    document.getElementById('math-task-counter').textContent = t('math_daily_task_counter', mathState.taskIdx+1);
    document.getElementById('math-score').textContent = t('math_score_pts', mathState.score);
    if(hintCard) hintCard.style.display = 'none';
    q.className = 'math-q trick-q';
    q.innerHTML = dt.q;
    choicesEl.style.display = 'none';
    inputEl.style.display = 'block';
    const ans = document.getElementById('math-answer'); ans.value = ''; ans.className = '';
    mathStartTimer(22);
    return;
  }

  if(mathState.trickDef){
    mathState.task   = mathState.trickDef.gen();
    mathState.target = mathState.task.target;
    document.getElementById('math-task-counter').textContent = t('math_task_counter', mathState.taskIdx+1);
    document.getElementById('math-score').textContent = t('math_score_pts', mathState.score);
    q.className = 'math-q trick-q';
    q.innerHTML = mathState.task.trickQ;
    if(hintCard){ hintCard.style.display='block'; hintCard.textContent='💡 '+t(mathState.trickDef.hintKey); }
    choicesEl.style.display = 'none';
    inputEl.style.display = 'block';
    const ans = document.getElementById('math-answer'); ans.value=''; ans.className='';
    mathStartTimer(mathState.trickDef.time);
    return;
  }

  const lv = MATH_LEVELS[mathState.level];
  mathState.task   = mGenTask(lv, mathState.ops);
  mathState.target = mathState.task.target;
  document.getElementById('math-task-counter').textContent = t('math_task_counter', mathState.taskIdx+1);
  document.getElementById('math-score').textContent = t('math_score_pts', mathState.score);
  if(hintCard) hintCard.style.display = 'none';

  q.className = 'math-q' + (mathState.task.isPercent ? ' pct-q' : '');
  if(mathState.task.isPercent) q.innerHTML = mathState.task.percentQ;
  else if(lv.kind==='equation') q.innerHTML = mExprHtml(mathState.task, mathState.task.equation.idx) + ' = ' + mathState.task.answer;
  else q.innerHTML = mExprHtml(mathState.task, -1) + ' = ?';

  if(lv.mode==='choice'){
    inputEl.style.display = 'none';
    choicesEl.style.display = 'grid';
    choicesEl.innerHTML = '';
    mChoices(mathState.target).forEach(v=>{
      const b = document.createElement('div');
      b.className = 'math-choice'; b.textContent = v;
      b.onclick = () => mathAnswer(v, b);
      choicesEl.appendChild(b);
    });
  } else {
    choicesEl.style.display = 'none';
    inputEl.style.display = 'block';
    const ans = document.getElementById('math-answer');
    ans.value = ''; ans.className = '';
  }
  mathStartTimer(lv.time);
}

function mathStartTimer(seconds){
  clearInterval(mathState.timer);
  mathState.dur = seconds*1000;
  mathState.deadline = Date.now() + mathState.dur;
  const fill = document.getElementById('math-timer-fill');
  fill.classList.remove('warn');
  mathState.timer = setInterval(()=>{
    const left = mathState.deadline - Date.now();
    const frac = Math.max(0, left/mathState.dur);
    fill.style.width = (frac*100)+'%';
    if(frac<0.3) fill.classList.add('warn');
    if(left<=0){ clearInterval(mathState.timer); if(!mathState.answered) mathAnswer(null, null); }
  }, 80);
}

function mathRemainFrac(){ return Math.max(0, (mathState.deadline-Date.now())/mathState.dur); }

function mathAnswer(value, btnEl){
  if(mathState.answered) return;
  mathState.answered = true;
  clearInterval(mathState.timer);
  const numVal = Number(value);
  const useEst = mathEstMode && !mathState.trickDef && !mathState.dailyMode;
  const correct = value !== null && (
    useEst
      ? Math.abs(numVal - mathState.target) / Math.max(1, Math.abs(mathState.target)) <= 0.10
      : numVal === mathState.target
  );
  const q = document.getElementById('math-question');

  if(correct){
    mathState.correct++;
    mathState.score += 100 + Math.round(mathRemainFrac()*50);
    q.classList.add('flash-ok');
    soundPairFound();
    if(btnEl) btnEl.classList.add('ok');
    else { const a=document.getElementById('math-answer'); if(a.offsetParent) a.classList.add('ok'); }
  } else {
    q.classList.add('flash-bad');
    soundNoMatch();
    if(btnEl) btnEl.classList.add('bad');
    else { const a=document.getElementById('math-answer'); if(a.offsetParent){ a.classList.add('bad'); a.value = a.value || '—'; } }
    // reveal the correct answer briefly
    if(mathState.trickDef){
      q.innerHTML = mathState.task.trickQ.replace(' = ?', ' = <b>'+mathState.task.answer+'</b>');
    } else if(mathState.task.isPercent){
      q.innerHTML = mathState.task.percentQ.replace(' = ?','').replace(' of ?','') + ' = <b>'+mathState.task.answer+'</b>';
    } else {
      q.innerHTML = mExprHtml(mathState.task, -1) + ' = ' + mathState.task.answer
        + (MATH_LEVELS[mathState.level].kind==='equation' ? `  (X=${mathState.target})` : '');
    }
  }
  document.getElementById('math-score').textContent = t('math_score_pts', mathState.score);
  setTimeout(()=>{ mathState.taskIdx++; mathNextTask(); }, correct ? 700 : 1300);
}

// keypad + physical keyboard
function mathKey(k){
  const lv = mathState.trickDef ? {mode:'input'} : MATH_LEVELS[mathState.level];
  if(!lv || lv.mode!=='input') return;
  const ans = document.getElementById('math-answer');
  if(mathState.answered) return;
  if(k==='del'){ ans.value = ans.value.slice(0,-1); playTone(330,'sine',0.1,0.05); }
  else if(k==='enter'){ if(ans.value!=='') mathAnswer(Number(ans.value), null); }
  else { if(ans.value.length<7){ ans.value += k; playTone(620,'sine',0.1,0.04); } }
}

document.addEventListener('keydown', e=>{
  if(!document.getElementById('screen-math').classList.contains('active')) return;
  if(document.getElementById('math-play').style.display==='none') return;
  if(/^[0-9]$/.test(e.key)) mathKey(e.key);
  else if(e.key==='Backspace'){ e.preventDefault(); mathKey('del'); }
  else if(e.key==='Enter') mathKey('enter');
});

// ── finish + stats ──
function mathFinish(){
  clearInterval(mathState.timer);

  if(mathState.dailyMode){
    mathState.dailyMode = false;
    const correct = mathState.correct, total = 5;
    const streak = saveDailyResult(mathState.score, correct);
    const pct = Math.round(correct/total*100);
    document.getElementById('math-play').style.display = 'none';
    document.getElementById('math-result').style.display = 'block';
    document.getElementById('math-result-pct').textContent = pct + '%';
    document.getElementById('math-result-label').textContent = pct>=80 ? t('math_brilliant') : pct>=60 ? t('math_complete') : t('math_keep');
    document.getElementById('math-result-stats').innerHTML = `
      <div class="stat-box"><div class="sv">${correct}/${total}</div><div class="sl">${t('math_stat_correct')}</div></div>
      <div class="stat-box"><div class="sv">${mathState.score}</div><div class="sl">${t('math_stat_score')}</div></div>
      <div class="stat-box"><div class="sv">🔥${streak}</div><div class="sl">${t('math_streak_lbl')}</div></div>`;
    document.getElementById('math-next-btn').style.display = 'none';
    if(pct>=60) soundWin(); else soundNoMatch();
    const toEarn = ['mt_first','mt_daily'];
    if(streak >= 7) toEarn.push('mt_daily_week');
    checkAchievements(toEarn);
    addXp(40, t('math_daily_challenge'));
    renderDailyChallenge();
    return;
  }

  const correct = mathState.correct, total = 10;
  mathRecordSession(total, correct, mathState.score);
  const pct = Math.round(correct/total*100);
  document.getElementById('math-play').style.display = 'none';
  document.getElementById('math-result').style.display = 'block';
  document.getElementById('math-result-pct').textContent = pct + '%';
  document.getElementById('math-result-label').textContent =
    pct>=90 ? t('math_brilliant') : pct>=60 ? t('math_complete') : t('math_keep');
  document.getElementById('math-result-stats').innerHTML = `
    <div class="stat-box"><div class="sv">${correct}/${total}</div><div class="sl">${t('math_stat_correct')}</div></div>
    <div class="stat-box"><div class="sv">${mathState.score}</div><div class="sl">${t('math_stat_score')}</div></div>
    <div class="stat-box"><div class="sv">L${mathState.level+1}</div><div class="sl">${t('math_stat_level')}</div></div>`;
  const nextBtn = document.getElementById('math-next-btn');
  if(mathState.trickDef){ nextBtn.style.display='none'; }
  else if(mathState.level < MATH_LEVELS.length-1){ nextBtn.style.display=''; nextBtn.disabled = correct<6;
    nextBtn.textContent = correct<6 ? t('math_need_6') : t('math_next_level');
  } else nextBtn.style.display='none';
  if(pct>=60) soundWin(); else soundNoMatch();

  // trick mastery
  if(mathState.trickDef && mathState.correct >= 10){
    const newMastery = trickMasteryIncrement(mathState.trickDef.id);
    if(newMastery >= 3) checkAchievements(['mt_trick_master']);
    renderMathTricks();
  }

  // achievements
  const toEarn = ['mt_first'];
  if(mathState.correct >= 10) toEarn.push('mt_perfect');
  if(mathState.trickDef) toEarn.push('mt_trick');
  if(mathState.opsId === '%') toEarn.push('mt_pct');
  const played = metaTrackGame('math');
  if(played.length >= 3) toEarn.push('all_games');
  checkAchievements(toEarn);
  const mathXp = Math.max(5, Math.round(mathState.score * 0.03));
  addXp(mathXp, t('math_section_title'));
  if(workoutState.active && workoutState.step === 2) workoutStepDone(mathXp);
}

function mathReplay(){ if(mathState.dailyMode) return; if(mathState.trickDef) _mathDoStartTrick(mathState.trickDef); else mathStartLevel(mathState.level); }
function mathNextLevel(){ if(mathState.level<MATH_LEVELS.length-1) mathStartLevel(mathState.level+1); }

function mathStartTrick(id){
  const trick = MATH_TRICKS.find(tr=>tr.id===id);
  if(!trick) return;
  const instrKey = 'trick_' + trick.id + '_instr';
  showInfoPopup(t(trick.key), t(instrKey), () => _mathDoStartTrick(trick));
}
function _mathDoStartTrick(trick){
  mathState.trickDef = trick;
  mathState.level = -1;
  mathState.taskIdx = 0; mathState.score = 0; mathState.correct = 0;
  document.getElementById('math-setup').style.display = 'none';
  document.getElementById('math-result').style.display = 'none';
  document.getElementById('math-play').style.display = 'block';
  document.getElementById('math-level-tag').textContent = t(trick.key);
  mathNextTask();
}

function renderMathTricks(){
  const lbl = document.getElementById('math-tricks-lbl');
  const sub = document.getElementById('math-tricks-sub');
  if(lbl) lbl.textContent = t('math_tricks_lbl');
  if(sub) sub.textContent = t('math_tricks_sub');
  const grid = document.getElementById('math-tricks-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const mastery = trickMasteryLoad();
  MATH_TRICKS.forEach(tr=>{
    const m = mastery[tr.id] || 0;
    const card = document.createElement('div');
    card.className = 'trick-card' + (m >= 3 ? ' mastered' : '');
    const masteryHtml = m >= 3
      ? `<div class="tc-mastery">${t('trick_mastered')}</div>`
      : `<div class="tc-mastery">${'⭐'.repeat(m)}${'☆'.repeat(3-m)}</div>`;
    card.innerHTML = `<div class="tc-sym">${tr.sym}</div><div class="tc-name">${t(tr.key)}</div><div class="tc-hint">${t(tr.hintKey)}</div>${masteryHtml}`;
    card.onclick = () => mathStartTrick(tr.id);
    grid.appendChild(card);
  });
}

function mathTodayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mathDayKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mathLoadStats(){ try{ return JSON.parse(localStorage.getItem('membrain_stats_v1')) || {days:{}}; }catch{ return {days:{}}; } }
function mathSaveStats(s){ try{ localStorage.setItem('membrain_stats_v1', JSON.stringify(s)); }catch{} }
function mathRecordSession(tasks, correct, score){
  const s = mathLoadStats(); const k = mathTodayKey();
  const day = s.days[k] || {tasks:0, correct:0, score:0, sessions:0};
  day.tasks += tasks; day.correct += correct; day.score += score; day.sessions += 1;
  s.days[k] = day; mathSaveStats(s);
}
function mathStreak(s){
  let streak = 0; const d = new Date();
  if(!(s.days[mathDayKey(d)] && s.days[mathDayKey(d)].tasks>0)) d.setDate(d.getDate()-1);
  while(s.days[mathDayKey(d)] && s.days[mathDayKey(d)].tasks>0){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function renderMathStats(){
  const s = mathLoadStats();
  document.getElementById('math-streak').textContent = t('math_day_streak', mathStreak(s));
  const bars = document.getElementById('math-bars'); bars.innerHTML = '';
  const days = []; const base = new Date();
  for(let i=6;i>=0;i--){ const dd=new Date(base); dd.setDate(base.getDate()-i); days.push(dd); }
  const counts = days.map(dd => s.days[mathDayKey(dd)]?.tasks || 0);
  const maxT = Math.max(10, ...counts);
  const tk = mathTodayKey();
  const dow = t('dow');
  days.forEach((dd, i)=>{
    const t = counts[i];
    const el = document.createElement('div');
    el.className = 'bar7' + (mathDayKey(dd)===tk ? ' today' : '');
    el.innerHTML = `<div class="bval">${t||''}</div><div class="bcol" style="height:${Math.round(t/maxT*100)}%"></div><div class="bday">${dow[dd.getDay()]}</div>`;
    bars.appendChild(el);
  });
  const allTasks = Object.values(s.days).reduce((a,x)=>a+x.tasks,0);
  const allCorrect = Object.values(s.days).reduce((a,x)=>a+x.correct,0);
  const today = s.days[tk] || {tasks:0};
  const acc = allTasks ? Math.round(allCorrect/allTasks*100) : 0;
  document.getElementById('math-daily-stats').innerHTML = `
    <div class="stat-box"><div class="sv">${today.tasks}</div><div class="sl">${t('math_today')}</div></div>
    <div class="stat-box"><div class="sv">${allTasks}</div><div class="sl">${t('math_alltime')}</div></div>
    <div class="stat-box"><div class="sv">${acc}%</div><div class="sl">${t('math_accuracy')}</div></div>`;
}

