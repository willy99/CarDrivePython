// ═══════════════════════════════════════════════════
// OBJECT SPOTTING MODE
// ═══════════════════════════════════════════════════
let spotLevel = 0, spotScene = [], spotMissings = [], spotSelected = [],
    spotStreak = 0, spotPhase = 'idle', spotTimer = null, spotCollection = 'classic';
let spotSelectedLevel = parseInt(localStorage.getItem('membrain_spot_level') || '0');
let spotNumVanished   = parseInt(localStorage.getItem('membrain_spot_vanished') || '1');
let spotNumAppeared   = parseInt(localStorage.getItem('membrain_spot_appeared') || '0');
let spotDiffMult = parseFloat(localStorage.getItem('membrain_spot_diff') || '1.0');

// ── SOUNDS (reuse the global playTone from pairs.js) ──
function spotSnd(fn){ try{ if(typeof playTone==='function') fn(); }catch(e){} }
function spotSndTap(){     spotSnd(()=>{ playTone(500,'sine',0.10,0.05); }); }
function spotSndReveal(){  spotSnd(()=>{ playTone(300,'sine',0.10,0.18); }); }
function spotSndCorrect(){ spotSnd(()=>{ playTone(523,'triangle',0.22,0.12); playTone(659,'triangle',0.20,0.12,0.12); playTone(880,'triangle',0.18,0.16,0.24); }); }
function spotSndWrong(){   spotSnd(()=>{ playTone(220,'sawtooth',0.16,0.16); playTone(165,'sawtooth',0.12,0.22,0.13); }); }

const SPOT_PACK_ICONS = {
  classic:'🎯', animals:'🦁', sealife:'🐬', fruits:'🍓', food:'🍕',
  sweets:'🍭', flora:'🌸', kitchen:'🍳', devices:'💻', transport:'🚀',
  sports:'⚽', smileys:'😎', funpoop:'💩', cats:'😺',
};

function spotBack() {
  try { clearInterval(spotTimer); spotTimer = null; } catch(e) {}
  spotPhase = 'idle';
  showSpotMenu();
}

function spotStepLevel(delta) {
  spotSelectedLevel = Math.max(0, Math.min(SPOT_LEVELS.length - 1, spotSelectedLevel + delta));
  localStorage.setItem('membrain_spot_level', String(spotSelectedLevel));
  spotUpdateSpinner();
}

function spotUpdateSpinner() {
  const lv = SPOT_LEVELS[spotSelectedLevel];
  const pool = collById(spotCollection).pool;
  const totalChanges = spotNumVanished + spotNumAppeared;
  const count = Math.min(lv.count, pool.length - Math.max(0, spotNumAppeared));
  document.getElementById('spot-level-num').textContent = spotSelectedLevel + 1;
  document.getElementById('spot-level-info').textContent =
    count + ' ' + t('spot_objects') + ' · ' + (lv.memorize / 1000) + 's';
  document.getElementById('spot-level-down').disabled = spotSelectedLevel === 0;
  document.getElementById('spot-level-up').disabled = spotSelectedLevel === SPOT_LEVELS.length - 1;
}

function spotStartSelected() {
  spotStart(spotSelectedLevel);
}

function showSpotMenu() {
  showScreen('screen-spot');
  document.getElementById('spot-result-overlay').classList.remove('show');
  document.getElementById('spot-select').style.display = 'block';
  document.getElementById('spot-game').style.display = 'none';

  // Clamp stored level
  spotSelectedLevel = Math.min(spotSelectedLevel, SPOT_LEVELS.length - 1);
  spotUpdateSpinner();

  // i18n labels
  const packLbl = document.getElementById('spot-choose-pack-lbl');
  const removedLbl = document.getElementById('spot-removed-lbl');
  const appearedLbl = document.getElementById('spot-appeared-lbl');
  const diffLbl = document.getElementById('spot-diff-lbl');
  if (packLbl) packLbl.textContent = t('spot_choose_pack');
  if (removedLbl) removedLbl.textContent = t('spot_removed_lbl');
  if (appearedLbl) appearedLbl.textContent = t('spot_appeared_lbl');
  if (diffLbl) diffLbl.textContent = t('spot_diff_lbl');

  const startLbl = document.getElementById('spot-start-lbl');
  if (startLbl) startLbl.textContent = t('spot_start_btn');

  // Pack selector (in opts)
  const packRow = document.getElementById('spot-pack-row');
  if (packRow) {
    packRow.innerHTML = '';
    COLLECTIONS.forEach(c => {
      const btn = document.createElement('div');
      btn.className = 'spot-pack-opt' + (c.id === spotCollection ? ' active' : '');
      btn.innerHTML = `<span class="sp-icon">${SPOT_PACK_ICONS[c.id] || '📦'}</span>${c.name}`;
      btn.onclick = () => {
        spotCollection = c.id;
        packRow.querySelectorAll('.spot-pack-opt').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        spotUpdateSpinner();
      };
      packRow.appendChild(btn);
    });
  }

  // Vanished count (0–4)
  const vanishedRow = document.getElementById('spot-vanished-row');
  if (vanishedRow) {
    vanishedRow.innerHTML = '';
    for (let n = 0; n <= 4; n++) {
      const b = document.createElement('div');
      b.className = 'spot-ctrl-btn' + (spotNumVanished === n ? ' active' : '');
      b.textContent = n === 0 ? '0' : String(n);
      b.onclick = () => {
        if (n === 0 && spotNumAppeared === 0) return;
        spotNumVanished = n;
        localStorage.setItem('membrain_spot_vanished', String(n));
        showSpotMenu();
      };
      vanishedRow.appendChild(b);
    }
  }

  // Appeared count (0–4)
  const appearedRow = document.getElementById('spot-appeared-row');
  if (appearedRow) {
    appearedRow.innerHTML = '';
    for (let n = 0; n <= 4; n++) {
      const b = document.createElement('div');
      b.className = 'spot-ctrl-btn' + (spotNumAppeared === n ? ' active' : '');
      b.textContent = n === 0 ? '0' : String(n);
      b.onclick = () => {
        if (n === 0 && spotNumVanished === 0) return;
        spotNumAppeared = n;
        localStorage.setItem('membrain_spot_appeared', String(n));
        showSpotMenu();
      };
      appearedRow.appendChild(b);
    }
  }

  // Difficulty
  const diffRow = document.getElementById('spot-diff-row');
  if (diffRow) {
    diffRow.innerHTML = '';
    [[0.5,'spot_diff_fast'],[1.0,'spot_diff_normal'],[1.5,'spot_diff_slow'],[2.0,'spot_diff_relaxed']].forEach(([mult,key])=>{
      const b = document.createElement('div');
      b.className = 'spot-ctrl-btn' + (spotDiffMult===mult?' active':'');
      b.textContent = t(key);
      b.onclick = () => { spotDiffMult=mult; localStorage.setItem('membrain_spot_diff',String(mult)); showSpotMenu(); };
      diffRow.appendChild(b);
    });
  }

  restoreOpts('spot-opts');
}

function spotStart(lvIdx) {
  spotLevel = lvIdx;
  spotSelected = [];
  document.getElementById('spot-select').style.display = 'none';
  document.getElementById('spot-game').style.display = 'flex';
  document.getElementById('spot-level-tag').textContent = `${lang==='uk'?'Рівень':'Level'} ${lvIdx+1}`;
  document.getElementById('spot-streak').textContent = spotStreak;
  spotRunRound();
}

function spotRunRound() {
  const lv = SPOT_LEVELS[spotLevel];
  const coll = collById(spotCollection);
  const pool = coll.pool;

  // Clamp settings to pool size
  const safeAppeared = Math.min(spotNumAppeared, Math.max(0, pool.length - 2));
  const safeVanished = Math.min(spotNumVanished, Math.max(0, pool.length - safeAppeared - 1));
  const count = Math.min(lv.count, pool.length - safeAppeared);

  // Pick original scene tokens
  const shuffled = [...pool].sort(() => Math.random()-0.5);
  const chosen = shuffled.slice(0, count);
  const chosenSet = new Set(chosen);

  // Tokens outside the original scene (candidates for appearing)
  const outsidePool = pool.filter(id => !chosenSet.has(id));

  // Pick which scene items will vanish
  const vanishedTokens = [...chosen].sort(() => Math.random()-0.5).slice(0, safeVanished);
  // Pick which outside items will appear
  const appearedTokens = [...outsidePool].sort(() => Math.random()-0.5).slice(0, safeAppeared);

  spotMissings = [
    ...vanishedTokens.map(token => {
      const obj = OBJECTS.find(o => o.id === token);
      return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind, changeType: 'vanished' };
    }),
    ...appearedTokens.map(token => {
      const obj = OBJECTS.find(o => o.id === token);
      return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind, changeType: 'appeared' };
    }),
  ];
  spotSelected = [];

  const canvas = document.getElementById('spot-canvas');
  const wrap = document.getElementById('spot-canvas-wrap');
  const W = Math.min(wrap.clientWidth - 24, 780);
  const H = Math.min(wrap.clientHeight - 24, 500);
  canvas.width = W; canvas.height = H;
  const objSize = Math.max(44, Math.min(70, W / (count * 0.7)));
  const positions = placePacked(count, W, H, objSize);

  spotScene = chosen.map((token, i) => {
    const obj = OBJECTS.find(o => o.id === token);
    return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind, x: positions[i].x, y: positions[i].y };
  });

  // Memorize phase label
  let label;
  const totalChanges = safeVanished + safeAppeared;
  if (safeVanished > 0 && safeAppeared > 0) {
    label = t('spot_memorize_combo', totalChanges);
  } else if (safeAppeared > 0) {
    label = safeAppeared > 1 ? t('spot_memorize_appeared', safeAppeared) : t('spot_memorize_one_appeared');
  } else {
    label = safeVanished > 1 ? t('spot_memorize_multi', safeVanished) : t('spot_memorize_one');
  }
  document.getElementById('spot-phase-label').textContent = label;
  document.getElementById('spot-choices').innerHTML = '';
  spotPhase = 'memorize';
  renderSpotScene(canvas, objSize, []);

  const overlay = document.getElementById('spot-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('spot-overlay-text').textContent = '';
  document.getElementById('spot-overlay-sub').textContent = '';
  const fill = document.getElementById('spot-timer-fill');
  fill.style.width = '100%';
  const memorizeMs = Math.round(lv.memorize * spotDiffMult);
  let elapsed = 0; const tick = 100;
  clearInterval(spotTimer);
  spotTimer = setInterval(() => {
    elapsed += tick;
    fill.style.width = Math.max(0,(1-elapsed/memorizeMs)*100)+'%';
    const rem = Math.ceil((memorizeMs-elapsed)/1000);
    document.getElementById('spot-overlay-text').textContent = rem > 0 ? rem : '';
    if (elapsed >= memorizeMs) { clearInterval(spotTimer); spotStartBlackout(canvas, objSize, lv.blackout); }
  }, tick);
}

function renderSpotScene(canvas, objSize, hideIds) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0,0,0,canvas.height);
  bg.addColorStop(0,'#0d0d30'); bg.addColorStop(1,'#080818');
  ctx.fillStyle = bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let x=0;x<canvas.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for (let y=0;y<canvas.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
  for (const obj of spotScene) {
    if (hideIds.includes(obj.id)) continue;
    ctx.save();
    if (obj.kind === 'emoji') {
      ctx.font = `${Math.floor(objSize*0.85)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(obj.id, obj.x, obj.y + objSize * 0.04);
    } else {
      ctx.shadowColor = obj.glow; ctx.shadowBlur = 18;
      drawObject(ctx, obj.id, obj.x, obj.y, objSize);
    }
    ctx.restore();
  }
}

function spotStartBlackout(canvas, objSize, duration) {
  spotPhase = 'blackout';
  const overlay = document.getElementById('spot-overlay');
  overlay.classList.remove('hidden');
  overlay.style.background = 'rgba(8,8,24,0.92)';
  document.getElementById('spot-overlay-text').textContent = t('spot_eyes_closed');
  document.getElementById('spot-overlay-sub').textContent = t('spot_rearranging');
  document.getElementById('spot-timer-fill').style.width = '100%';
  let elapsed = 0; const tick = 100;
  clearInterval(spotTimer);
  spotTimer = setInterval(() => {
    elapsed += tick;
    document.getElementById('spot-timer-fill').style.width = Math.max(0,(1-elapsed/duration)*100)+'%';
    if (elapsed >= duration) {
      clearInterval(spotTimer);
      overlay.style.background = '';
      spotStartFind(canvas, objSize);
    }
  }, tick);
}

function spotStartFind(canvas, objSize) {
  spotPhase = 'find';
  const vanishedItems = spotMissings.filter(o => o.changeType === 'vanished');
  const appearedItems = spotMissings.filter(o => o.changeType === 'appeared');
  const vanishedIds = vanishedItems.map(o => o.id);
  const totalChanges = spotMissings.length;

  // Build final scene: remove vanished, add appeared
  const finalScene = spotScene.filter(o => !vanishedIds.includes(o.id));

  if (appearedItems.length > 0) {
    const totalFinal = finalScene.length + appearedItems.length;
    const allPositions = placePacked(totalFinal, canvas.width, canvas.height, objSize);
    finalScene.forEach((obj, i) => { obj.x = allPositions[i].x; obj.y = allPositions[i].y; });
    appearedItems.forEach((obj, i) => {
      const pos = allPositions[finalScene.length + i];
      spotScene.push({ ...obj, x: pos.x, y: pos.y });
    });
  } else {
    // Only vanished — reposition remaining items
    const positions = placePacked(finalScene.length, canvas.width, canvas.height, objSize);
    finalScene.forEach((obj, i) => { obj.x = positions[i].x; obj.y = positions[i].y; });
  }

  document.getElementById('spot-overlay').classList.add('hidden');
  renderSpotScene(canvas, objSize, vanishedIds);

  // Phase label
  let label;
  if (appearedItems.length > 0 && vanishedItems.length > 0) {
    label = t('spot_find_many_changes', totalChanges);
  } else if (appearedItems.length > 1) {
    label = t('spot_find_many_appeared', appearedItems.length);
  } else if (appearedItems.length === 1) {
    label = t('spot_find_intruder');
  } else if (vanishedItems.length > 1) {
    label = t('spot_find_many', vanishedItems.length);
  } else {
    label = t('spot_find_one');
  }
  document.getElementById('spot-phase-label').textContent = label;

  // Build choices
  const choices = document.getElementById('spot-choices');
  choices.innerHTML = '';

  if (totalChanges > 1) {
    const ctr = document.createElement('div');
    ctr.id = 'spot-find-counter';
    ctr.style.cssText = 'width:100%;text-align:center;font-size:.88rem;font-weight:800;color:var(--goldL);padding:4px 0 6px;';
    ctr.textContent = t('spot_select_changes', totalChanges);
    choices.appendChild(ctr);
  }

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';
  const coll = collById(spotCollection);
  const changedIds = new Set(spotMissings.map(o => o.id));

  // Distractors: items from the original scene that didn't change
  const sceneDistractors = spotScene
    .filter(o => !vanishedIds.includes(o.id) && !changedIds.has(o.id))
    .sort(() => Math.random()-0.5)
    .slice(0, Math.max(3, totalChanges * 2));

  // Extra random items from pool not in missings or scene distractors
  const usedIds = new Set([...changedIds, ...sceneDistractors.map(o => o.id)]);
  const extraTokens = coll.pool.filter(id => !usedIds.has(id))
    .sort(() => Math.random()-0.5)
    .slice(0, Math.max(2, totalChanges))
    .map(token => {
      const obj = OBJECTS.find(o => o.id === token);
      return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind };
    });

  const choicePool = [...spotMissings, ...sceneDistractors, ...extraTokens]
    .sort(() => Math.random()-0.5);

  choicePool.forEach(obj => {
    const el = document.createElement('div');
    el.className = 'spot-choice';
    el.dataset.id = obj.id;
    if (obj.kind === 'emoji') {
      el.style.cssText = 'font-size:2rem;flex-direction:column;gap:0;';
      el.textContent = obj.id;
    } else {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const ctx2 = c.getContext('2d');
      ctx2.save(); ctx2.shadowColor = obj.glow; ctx2.shadowBlur = 8;
      drawObject(ctx2, obj.id, 24, 24, 38);
      ctx2.restore();
      el.appendChild(c);
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:.6rem;color:var(--text2);text-align:center;margin-top:2px;';
      lbl.textContent = obj.name;
      el.appendChild(lbl);
    }
    el.onclick = () => spotGuess(obj.id);
    row.appendChild(el);
  });
  choices.appendChild(row);
}

function spotGuess(id) {
  if (spotPhase !== 'find') return;
  const totalChanges = spotMissings.length;
  const changedIds = spotMissings.map(o => o.id);

  if (totalChanges === 1) {
    spotPhase = 'result';
    const correct = id === changedIds[0];
    if (correct) spotStreak++; else spotStreak = 0;
    document.getElementById('spot-streak').textContent = spotStreak;
    document.querySelectorAll('.spot-choice').forEach(el => el.onclick = null);
    showSpotResult(correct);
    return;
  }

  // Multi-select: toggle
  const idx = spotSelected.indexOf(id);
  const el = document.querySelector(`.spot-choice[data-id="${CSS.escape(id)}"]`);
  if (idx >= 0) {
    spotSelected.splice(idx, 1);
    if (el) el.classList.remove('selected');
  } else if (spotSelected.length < totalChanges) {
    spotSelected.push(id);
    if (el) el.classList.add('selected');
    spotSndTap();
  }
  const left = totalChanges - spotSelected.length;
  const ctr = document.getElementById('spot-find-counter');
  if (ctr) ctr.textContent = left > 0 ? t('spot_select_changes', left) : t('spot_checking');

  if (spotSelected.length === totalChanges) {
    spotPhase = 'result';
    document.querySelectorAll('.spot-choice').forEach(el => el.onclick = null);
    const correct = spotSelected.every(sid => changedIds.includes(sid));
    if (correct) spotStreak++; else spotStreak = 0;
    document.getElementById('spot-streak').textContent = spotStreak;
    setTimeout(() => showSpotResult(correct), 350);
  }
}

function showSpotResult(correct) {
  (correct ? spotSndCorrect() : spotSndWrong());
  const overlay = document.getElementById('spot-result-overlay');
  document.getElementById('spot-result-emoji').textContent = correct ? '🎉' : '😅';
  document.getElementById('spot-result-title').textContent = correct ? t('spot_correct') : t('spot_wrong');

  const vanished = spotMissings.filter(o => o.changeType === 'vanished');
  const appeared = spotMissings.filter(o => o.changeType === 'appeared');
  const allLabels = spotMissings.map(o => o.kind === 'emoji' ? o.id : o.name);

  let sub;
  if (vanished.length > 0 && appeared.length > 0) {
    const vl = vanished.map(o => o.kind === 'emoji' ? o.id : o.name);
    const al = appeared.map(o => o.kind === 'emoji' ? o.id : o.name);
    sub = t('spot_changes_were', vl, al);
  } else if (appeared.length > 0) {
    sub = t('spot_intruder_was', allLabels);
  } else {
    sub = vanished.length > 1 ? t('spot_missing_were', allLabels) : t('spot_missing_was', allLabels);
  }
  document.getElementById('spot-result-sub').textContent = sub;
  document.getElementById('spot-result-streak').textContent = spotStreak > 1 ? `🔥 Streak: ${spotStreak}` : '';
  const nextBtn = document.getElementById('spot-next-btn');
  if (spotLevel < SPOT_LEVELS.length - 1 && correct) {
    nextBtn.textContent = t('spot_next_level'); nextBtn.style.display = '';
  } else { nextBtn.style.display = 'none'; }
  overlay.classList.add('show');

  // achievements
  const toEarn = ['sp_first'];
  if (correct && spotMissings.length >= 4) toEarn.push('sp_boss');
  if (correct && spotStreak >= 5) toEarn.push('sp_streak5');
  if (correct && appeared.length > 0) toEarn.push('sp_appeared');
  const played = metaTrackGame('spot');
  if (played.length >= 3) toEarn.push('all_games');
  checkAchievements(toEarn);
  if (correct) {
    const best = parseInt(localStorage.getItem('membrain_spot_best') || '0');
    if (spotLevel > best) localStorage.setItem('membrain_spot_best', String(spotLevel));
  }
  const spotXp = correct ? 15 + Math.min(spotStreak, 5) * 3 : 5;
  addXp(spotXp, t('spot_mode_title'));
  if (workoutState.active && workoutState.step === 1) workoutStepDone(spotXp);
}

function spotNextLevel() {
  document.getElementById('spot-result-overlay').classList.remove('show');
  spotSelectedLevel = Math.min(spotLevel + 1, SPOT_LEVELS.length - 1);
  localStorage.setItem('membrain_spot_level', String(spotSelectedLevel));
  spotStart(spotSelectedLevel);
}

function placePacked(count, W, H, objSize) {
  const margin = objSize * 0.7;
  const positions = [];
  const maxAttempts = 200;
  for (let i=0;i<count;i++) {
    let placed = false;
    for (let a=0;a<maxAttempts;a++) {
      const x = margin + Math.random()*(W-2*margin);
      const y = margin + Math.random()*(H-2*margin);
      let ok = true;
      for (const p of positions) {
        if (Math.hypot(x-p.x,y-p.y) < objSize*1.6) { ok=false; break; }
      }
      if (ok) { positions.push({x,y}); placed=true; break; }
    }
    if (!placed) positions.push({x:margin+Math.random()*(W-2*margin),y:margin+Math.random()*(H-2*margin)});
  }
  return positions;
}
