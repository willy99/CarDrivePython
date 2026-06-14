// ═══════════════════════════════════════════════════
// OBJECT SPOTTING MODE
// ═══════════════════════════════════════════════════
let spotLevel = 0, spotScene = [], spotMissings = [], spotSelected = [],
    spotStreak = 0, spotPhase = 'idle', spotTimer = null, spotCollection = 'classic';
let spotMode     = localStorage.getItem('membrain_spot_mode') || 'missing';
let spotDiffMult = parseFloat(localStorage.getItem('membrain_spot_diff') || '1.0');

const SPOT_PACK_ICONS = {
  classic:'🎯', animals:'🦁', sealife:'🐬', fruits:'🍓', food:'🍕',
  sweets:'🍭', flora:'🌸', kitchen:'🍳', devices:'💻', transport:'🚀',
  sports:'⚽', smileys:'😎', funpoop:'💩', cats:'😺',
};

function showSpotMenu() {
  showScreen('screen-spot');
  document.getElementById('spot-result-overlay').classList.remove('show');
  document.getElementById('spot-select').style.display = 'block';
  document.getElementById('spot-game').style.display = 'none';
  // Pack selector
  const packRow = document.getElementById('spot-pack-row');
  packRow.innerHTML = '';
  COLLECTIONS.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'spot-pack-opt' + (c.id === spotCollection ? ' active' : '');
    btn.innerHTML = `<span class="sp-icon">${SPOT_PACK_ICONS[c.id] || '📦'}</span>${c.name}`;
    btn.onclick = () => {
      spotCollection = c.id;
      packRow.querySelectorAll('.spot-pack-opt').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      refreshSpotLevels();
    };
    packRow.appendChild(btn);
  });
  refreshSpotLevels();

  // Mode toggle
  const modeLbl = document.getElementById('spot-mode-lbl');
  const modeRow = document.getElementById('spot-mode-row');
  if (modeLbl) modeLbl.textContent = t('spot_mode_lbl');
  if (modeRow) {
    modeRow.innerHTML = '';
    [['missing','spot_mode_missing'],['appeared','spot_mode_appeared']].forEach(([id,key])=>{
      const b = document.createElement('div');
      b.className = 'spot-ctrl-btn' + (spotMode===id?' active':'');
      b.textContent = t(key);
      b.onclick = () => { spotMode=id; localStorage.setItem('membrain_spot_mode',id); showSpotMenu(); };
      modeRow.appendChild(b);
    });
  }

  // Difficulty (memorize time multiplier)
  const diffLbl = document.getElementById('spot-diff-lbl');
  const diffRow = document.getElementById('spot-diff-row');
  if (diffLbl) diffLbl.textContent = t('spot_diff_lbl');
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

function refreshSpotLevels() {
  const pool = collById(spotCollection).pool;
  const grid = document.getElementById('spot-level-grid');
  grid.innerHTML = '';
  SPOT_LEVELS.forEach((lv, i) => {
    const count = Math.min(lv.count, pool.length - (lv.missing || 1));
    const b = document.createElement('div');
    const isMulti = (lv.missing || 1) > 1;
    b.className = 'level-btn' + (isMulti ? ' miss-lv' : '');
    const missTag = isMulti ? `<span class="lv-miss-badge">${t('spot_find_label', lv.missing)}</span>` : '';
    b.innerHTML = `<span class="lv-num">${i+1}</span><span class="lv-sub">${count} ${t('spot_objects')}<br>${lv.memorize/1000}s</span>${missTag}`;
    b.onclick = () => spotStart(i);
    grid.appendChild(b);
  });
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
  const numMissing = Math.min(lv.missing || 1, pool.length - 1);
  const count = Math.min(lv.count, pool.length);

  // Pick tokens
  const shuffled = [...pool].sort(() => Math.random()-0.5);
  const chosen = shuffled.slice(0, count);

  // Pick missing objects or intruder depending on mode
  if (spotMode === 'appeared') {
    // Appeared mode: pick an intruder from pool tokens NOT in the scene
    const sceneIds = new Set(chosen);
    const candidates = pool.filter(id => !sceneIds.has(id));
    const intruderToken = candidates[Math.floor(Math.random()*candidates.length)] || pool[0];
    const obj = OBJECTS.find(o => o.id === intruderToken);
    spotMissings = [{ id: intruderToken, name: obj ? obj.name : intruderToken, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind }];
  } else {
    const shuffledChosen = [...chosen].sort(() => Math.random()-0.5);
    spotMissings = shuffledChosen.slice(0, numMissing).map(token => {
      const obj = OBJECTS.find(o => o.id === token);
      return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind };
    });
  }
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

  const label = lv.introKey ? t(lv.introKey) : (numMissing > 1 ? t('spot_memorize_multi', numMissing) : t('spot_memorize_one'));
  document.getElementById('spot-phase-label').textContent = label;
  document.getElementById('spot-choices').innerHTML = '';
  spotPhase = 'memorize';
  renderSpotScene(canvas, objSize, []);

  const overlay = document.getElementById('spot-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('spot-overlay-text').textContent = '';
  document.getElementById('spot-overlay-sub').textContent = lv.intro ? '' : '';
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
  const lv = SPOT_LEVELS[spotLevel];
  const numMissing = lv.missing || 1;
  const missingIds = spotMissings.map(o => o.id);

  if (spotMode === 'appeared') {
    // Appeared mode: add intruder to scene, render everything
    document.getElementById('spot-phase-label').textContent = t('spot_find_intruder');
    const intruder = spotMissings[0];
    const allPositions = placePacked(spotScene.length + 1, canvas.width, canvas.height, objSize);
    spotScene.forEach((obj, i) => { obj.x = allPositions[i].x; obj.y = allPositions[i].y; });
    const ipos = allPositions[spotScene.length];
    spotScene.push({ ...intruder, x: ipos.x, y: ipos.y });
    document.getElementById('spot-overlay').classList.add('hidden');
    renderSpotScene(canvas, objSize, []);
  } else {
    document.getElementById('spot-phase-label').textContent =
      numMissing > 1 ? t('spot_find_many', numMissing) : t('spot_find_one');
    const remaining = spotScene.filter(o => !missingIds.includes(o.id));
    const positions = placePacked(remaining.length, canvas.width, canvas.height, objSize);
    remaining.forEach((obj, i) => { obj.x = positions[i].x; obj.y = positions[i].y; });
    document.getElementById('spot-overlay').classList.add('hidden');
    renderSpotScene(canvas, objSize, missingIds);
  }

  // Build choices row
  const choices = document.getElementById('spot-choices');
  choices.innerHTML = '';

  if (numMissing > 1) {
    const ctr = document.createElement('div');
    ctr.id = 'spot-find-counter';
    ctr.style.cssText = 'width:100%;text-align:center;font-size:.88rem;font-weight:800;color:var(--goldL);padding:4px 0 6px;';
    ctr.textContent = t('spot_select_n', numMissing);
    choices.appendChild(ctr);
  }

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';
  const coll = collById(spotCollection);
  const sceneIds = new Set(spotScene.map(o => o.id));
  let choicePool;
  if (spotMode === 'appeared') {
    // In appeared mode: choices = original scene objects (without intruder) + intruder (already in sceneIds now)
    // sceneIds includes the intruder we pushed, so distractors exclude it — exactly what we want
    const distractorTokens = coll.pool.filter(id => !sceneIds.has(id));
    const numDist = Math.min(Math.max(2, Math.ceil((spotScene.length-1)*0.4)), distractorTokens.length);
    const extras = [...distractorTokens].sort(()=>Math.random()-0.5).slice(0,numDist).map(token=>{
      const obj=OBJECTS.find(o=>o.id===token);
      return {id:token,name:obj?obj.name:token,glow:obj?obj.glow:'rgba(255,255,255,.2)',kind:coll.kind};
    });
    choicePool = [...spotScene, ...extras];
  } else {
    const distractorTokens = coll.pool.filter(id => !sceneIds.has(id));
    const numDistractors = Math.min(Math.max(3, Math.ceil(spotScene.length * 0.5)), distractorTokens.length);
    const extraTokens = [...distractorTokens].sort(() => Math.random()-0.5).slice(0, numDistractors);
    const extraObjs = extraTokens.map(token => {
      const obj = OBJECTS.find(o => o.id === token);
      return { id: token, name: obj ? obj.name : token, glow: obj ? obj.glow : 'rgba(255,255,255,.2)', kind: coll.kind };
    });
    choicePool = [...spotScene, ...extraObjs];
  }
  const shuffled = choicePool.sort(() => Math.random()-0.5);
  shuffled.forEach(obj => {
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
  const lv = SPOT_LEVELS[spotLevel];
  const numMissing = spotMode === 'appeared' ? 1 : (lv.missing || 1);
  const missingIds = spotMissings.map(o => o.id);

  if (numMissing === 1) {
    spotPhase = 'result';
    const correct = id === missingIds[0];
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
  } else if (spotSelected.length < numMissing) {
    spotSelected.push(id);
    if (el) el.classList.add('selected');
  }
  const left = numMissing - spotSelected.length;
  const ctr = document.getElementById('spot-find-counter');
  if (ctr) ctr.textContent = left > 0 ? t('spot_select_n', left) : t('spot_checking');

  if (spotSelected.length === numMissing) {
    spotPhase = 'result';
    document.querySelectorAll('.spot-choice').forEach(el => el.onclick = null);
    const correct = spotSelected.every(sid => missingIds.includes(sid));
    if (correct) spotStreak++; else spotStreak = 0;
    document.getElementById('spot-streak').textContent = spotStreak;
    setTimeout(() => showSpotResult(correct), 350);
  }
}

function showSpotResult(correct) {
  const overlay = document.getElementById('spot-result-overlay');
  document.getElementById('spot-result-emoji').textContent = correct ? '🎉' : '😅';
  document.getElementById('spot-result-title').textContent = correct ? t('spot_correct') : t('spot_wrong');
  const labels = spotMissings.map(o => o.kind === 'emoji' ? o.id : o.name);
  if (spotMode === 'appeared') {
    document.getElementById('spot-result-sub').textContent = correct
      ? t('spot_intruder_was', labels) : t('spot_intruder_was', labels);
  } else {
    document.getElementById('spot-result-sub').textContent = correct
      ? (spotMissings.length > 1 ? t('spot_missing_were', labels) : t('spot_missing_was', labels))
      : t('spot_missing_were', labels);
  }
  document.getElementById('spot-result-streak').textContent = spotStreak > 1 ? `🔥 Streak: ${spotStreak}` : '';
  const nextBtn = document.getElementById('spot-next-btn');
  if (spotLevel < SPOT_LEVELS.length - 1 && correct) {
    nextBtn.textContent = t('spot_next_level'); nextBtn.style.display = '';
  } else { nextBtn.style.display = 'none'; }
  overlay.classList.add('show');

  // achievements
  const toEarn = ['sp_first'];
  if (correct && SPOT_LEVELS[spotLevel].missing === 4) toEarn.push('sp_boss');
  if (correct && spotStreak >= 5) toEarn.push('sp_streak5');
  if (correct && spotMode === 'appeared') toEarn.push('sp_appeared');
  const played = metaTrackGame('spot');
  if (played.length >= 3) toEarn.push('all_games');
  checkAchievements(toEarn);
  // save best level for radar
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
  spotStart(Math.min(spotLevel + 1, SPOT_LEVELS.length - 1));
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

