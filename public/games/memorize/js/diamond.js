// ═══════════════════════════════════════════════════
// DIAMOND GAME
// ═══════════════════════════════════════════════════
const DIAMOND_LEVELS = [
  // 2×2 grid (1-2)
  {grid:2,len:3,showMs:5000},{grid:2,len:4,showMs:5000},
  // 3×3 grid (3-8)
  {grid:3,len:3,showMs:5000},{grid:3,len:4,showMs:5000},
  {grid:3,len:5,showMs:5000},{grid:3,len:6,showMs:4500},
  {grid:3,len:7,showMs:4000},{grid:3,len:8,showMs:3500},
  // 4×4 grid (9-15)
  {grid:4,len:4,showMs:6000},{grid:4,len:5,showMs:5500},
  {grid:4,len:6,showMs:5000},{grid:4,len:7,showMs:4500},
  {grid:4,len:8,showMs:4000},{grid:4,len:9,showMs:3500},
  {grid:4,len:10,showMs:3000},
  // 5×5 grid (16-22)
  {grid:5,len:5,showMs:6000},{grid:5,len:7,showMs:5500},
  {grid:5,len:9,showMs:5000},{grid:5,len:11,showMs:4500},
  {grid:5,len:13,showMs:4000},{grid:5,len:15,showMs:3500},
  {grid:5,len:17,showMs:3000},
  // 6×6 grid (23-27)
  {grid:6,len:8,showMs:6000},{grid:6,len:11,showMs:5500},
  {grid:6,len:14,showMs:5000},{grid:6,len:17,showMs:4500},
  {grid:6,len:20,showMs:4000},
  // 7×7 grid (28-30)
  {grid:7,len:10,showMs:6500},{grid:7,len:15,showMs:6000},
  {grid:7,len:20,showMs:5000},
];

const DIAMOND_UNLOCK_FROM = 15;

// ── SOUNDS (reuse the global playTone from pairs.js) ──
function dmdSnd(fn){ try{ if(typeof playTone==='function') fn(); }catch(e){} }
function dmdSndTap(n){    dmdSnd(()=>{ playTone(440 + (n%6)*40,'sine',0.10,0.05); }); }
function dmdSndCorrect(){ dmdSnd(()=>{ playTone(523,'triangle',0.24,0.14); playTone(659,'triangle',0.22,0.14,0.13); playTone(880,'triangle',0.20,0.18,0.26); }); }
function dmdSndWrong(){   dmdSnd(()=>{ playTone(220,'sawtooth',0.16,0.18); playTone(165,'sawtooth',0.12,0.24,0.14); }); }

function dmdLoadSave() {
  try { return JSON.parse(localStorage.getItem('membrain_diamond') || '{}'); } catch { return {}; }
}
function dmdSave(o) {
  const s = Object.assign(dmdLoadSave(), o);
  try{ localStorage.setItem('membrain_diamond', JSON.stringify(s)); }catch(e){}
}

const dmdState = {
  phase: 'idle', cfg: null, pattern: [], userPat: [],
  adaptLevel: 0, streak: 0, roundsPlayed: 0, roundsCorrect: 0,
  showStart: 0, progressTimer: null, animTimer: null, animRaf: null,
};

function dmdCfg(l) { return DIAMOND_LEVELS[Math.min(l, DIAMOND_LEVELS.length - 1)]; }

function dmdPos(idx, grid, cw, ch) {
  const pad = Math.min(cw, ch) * (grid <= 2 ? 0.18 : grid <= 3 ? 0.14 : 0.11);
  const usable = Math.min(cw, ch) - pad * 2;
  const step = grid > 1 ? usable / (grid - 1) : 0;
  const ox = (cw - usable) / 2;
  const oy = (ch - usable) / 2;
  return { x: ox + (idx % grid) * step, y: oy + Math.floor(idx / grid) * step };
}

function dmdR(grid) { return grid <= 2 ? 22 : grid <= 3 ? 18 : grid <= 4 ? 13 : grid <= 5 ? 10 : grid <= 6 ? 8 : 7; }

function dmdGcd(a, b) { return b === 0 ? Math.abs(a) : dmdGcd(b, a % b); }
function dmdBetween(a, b, grid) {
  const ax = a % grid, ay = Math.floor(a / grid);
  const bx = b % grid, by = Math.floor(b / grid);
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return [];
  const g = dmdGcd(Math.abs(dx), Math.abs(dy));
  if (g <= 1) return [];
  const sx = dx / g, sy = dy / g;
  const res = [];
  for (let s = 1; s < g; s++) res.push((ay + sy * s) * grid + (ax + sx * s));
  return res;
}
function dmdSegCross(ax, ay, bx, by, cx, cy, dx, dy) {
  // True if segment (a→b) properly intersects (c→d), ignoring shared endpoints
  const d1x = bx-ax, d1y = by-ay, d2x = dx-cx, d2y = dy-cy;
  const denom = d1x*d2y - d1y*d2x;
  if (denom === 0) return false;
  const t = ((cx-ax)*d2y - (cy-ay)*d2x) / denom;
  const u = ((cx-ax)*d1y - (cy-ay)*d1x) / denom;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

function dmdGenPattern(grid, len) {
  const total = grid * grid;
  const gpos = i => [i % grid, Math.floor(i / grid)];
  const visited = new Set();
  const pat = [];
  let cur = Math.floor(Math.random() * total);
  visited.add(cur); pat.push(cur);

  while (pat.length < Math.min(len, total)) {
    const avail = [];
    for (let i = 0; i < total; i++) {
      if (!visited.has(i)) avail.push(i);
    }
    if (!avail.length) break;

    // Filter candidates that would visually cross an existing segment
    const [cx, cy] = gpos(cur);
    const noCross = avail.filter(next => {
      const [nx, ny] = gpos(next);
      for (let s = 0; s < pat.length - 1; s++) {
        const [ax, ay] = gpos(pat[s]), [bx, by] = gpos(pat[s+1]);
        // Skip segments sharing cur or next as endpoint
        if (pat[s]===cur||pat[s+1]===cur||pat[s]===next||pat[s+1]===next) continue;
        if (dmdSegCross(cx,cy,nx,ny, ax,ay,bx,by)) return false;
      }
      return true;
    });

    const candidates = noCross.length > 0 ? noCross : avail;
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    // Auto-insert collinear intermediate dots so the finger naturally hits them
    const between = dmdBetween(cur, next, grid).filter(m => !visited.has(m));
    for (const m of between) { visited.add(m); pat.push(m); }
    visited.add(next); pat.push(next);
    cur = next;
  }
  return pat;
}

function dmdDraw(canvas, revealPat, userPat, phase, wrongAt, cursorXY) {
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  const grid = dmdState.cfg.grid;
  const r = dmdR(grid);
  ctx.clearRect(0, 0, cw, ch);

  const drawPath = (pat, color, alpha, width) => {
    if (pat.length < 2) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color;
    ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = dmdPos(pat[0], grid, cw, ch); ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pat.length; i++) { const p = dmdPos(pat[i], grid, cw, ch); ctx.lineTo(p.x, p.y); }
    ctx.stroke(); ctx.restore();
  };

  const total = grid * grid;
  for (let i = 0; i < total; i++) {
    const {x, y} = dmdPos(i, grid, cw, ch);
    const revIdx = revealPat.indexOf(i);
    const usrIdx = userPat.indexOf(i);
    const isWrong = wrongAt !== undefined && usrIdx === wrongAt;

    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
    ctx.fillStyle = revIdx >= 0 ? 'rgba(124,58,237,.12)' : usrIdx >= 0 ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.04)';
    ctx.fill(); ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (isWrong) {
      ctx.fillStyle = 'rgba(239,68,68,.85)'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
    } else if (revIdx >= 0) {
      ctx.fillStyle = 'rgba(124,58,237,.85)'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
    } else if (usrIdx >= 0) {
      ctx.fillStyle = 'rgba(52,211,153,.85)'; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
    }
    ctx.fill(); ctx.restore();

    if (revIdx >= 0) {
      ctx.save(); ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.78))}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(revIdx + 1, x, y); ctx.restore();
    } else if (usrIdx >= 0 && !isWrong) {
      ctx.save(); ctx.fillStyle = '#fff';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.78))}px system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(usrIdx + 1, x, y); ctx.restore();
    }
  }

  if (revealPat.length > 1) drawPath(revealPat, 'rgba(124,58,237,.65)', 1, r * 0.38);
  if (userPat.length > 1) drawPath(userPat, wrongAt !== undefined ? 'rgba(239,68,68,.65)' : 'rgba(52,211,153,.65)', 1, r * 0.38);
  // live drag cursor trail
  if (cursorXY && userPat.length > 0 && phase === 'recall') {
    const rect = canvas.getBoundingClientRect();
    const scX = canvas.width / rect.width, scY = canvas.height / rect.height;
    const cx = (cursorXY[0] - rect.left) * scX;
    const cy = (cursorXY[1] - rect.top)  * scY;
    const lp = dmdPos(userPat[userPat.length - 1], grid, cw, ch);
    ctx.save();
    ctx.strokeStyle = 'rgba(52,211,153,.35)';
    ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
    ctx.setLineDash([r * 0.5, r * 0.5]);
    ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(cx, cy);
    ctx.stroke(); ctx.restore();
  }
}

function dmdIsUnlocked(idx, save) {
  if (idx < DIAMOND_UNLOCK_FROM) return true;
  return (save.completed || {})[idx - 1] === true;
}

function showDiamondMenu() {
  const s = dmdLoadSave();
  document.getElementById('diamond-section-title').textContent = t('diamond_mode_title');
  document.getElementById('diamond-section-sub').textContent = t('diamond_section_sub');
  document.getElementById('diamond-game').style.display = 'none';
  document.getElementById('diamond-select').style.display = '';

  const grid = document.getElementById('dmd-level-grid');
  grid.innerHTML = '';
  DIAMOND_LEVELS.forEach((lv, i) => {
    const unlocked = dmdIsUnlocked(i, s);
    const completed = (s.completed || {})[i];
    const b = document.createElement('div');
    b.className = 'level-btn' + (!unlocked ? ' dmd-locked' : '');
    if (unlocked) {
      b.onclick = () => diamondStartLevel(i);
      const starHtml = completed ? '<span style="color:var(--goldL);font-size:.8rem;">★</span>' : '';
      b.innerHTML = `<span class="lv-num">${i+1}</span><span class="lv-sub">${lv.grid}×${lv.grid}</span>${starHtml}`;
    } else {
      b.innerHTML = `<span class="lv-num" style="opacity:.35">🔒</span><span class="lv-sub" style="opacity:.35">${i+1}</span>`;
    }
    grid.appendChild(b);
  });

  showScreen('screen-diamond');
}

function diamondStartLevel(idx) {
  dmdState.chosenLevel = idx;
  diamondStart();
}

function diamondStart() {
  const s = dmdLoadSave();
  dmdState.adaptLevel = dmdState.chosenLevel !== undefined ? dmdState.chosenLevel : (s.level || 0);
  dmdState.streak = s.streak || 0;
  dmdState.roundsPlayed = 0; dmdState.roundsCorrect = 0;
  dmdState.userPat = [];
  dmdState.phase = 'show';

  document.getElementById('diamond-select').style.display = 'none';
  document.getElementById('diamond-game').style.display = 'flex';
  document.getElementById('diamond-result').classList.remove('show');

  const canvas = document.getElementById('diamond-canvas');
  const game = document.getElementById('diamond-game');
  const avail = game.clientWidth;
  const hdr = document.getElementById('diamond-header').offsetHeight || 52;
  const hint = 52; const prog = 14; const btnArea = 48;
  const size = Math.min(avail, window.innerHeight - hdr - hint - prog - btnArea - 20);
  canvas.width = canvas.height = Math.max(180, size);
  canvas.style.width = canvas.style.height = canvas.width + 'px';

  canvas.onclick = null; canvas.ontouchstart = null;
  canvas.onpointerdown = null; canvas.onpointermove = null; canvas.onpointerup = null;
  canvas.style.touchAction = 'none';
  canvas.onpointerdown = dmdPointerDown;
  canvas.onpointermove = dmdPointerMove;
  canvas.onpointerup = canvas.onpointercancel = dmdPointerEnd;

  diamondNewRound();
}

function diamondNewRound() {
  if (dmdState.animRaf) { cancelAnimationFrame(dmdState.animRaf); dmdState.animRaf = null; }
  if (dmdState.animTimer) clearTimeout(dmdState.animTimer);
  if (dmdState.progressTimer) clearInterval(dmdState.progressTimer);
  const cfg = dmdCfg(dmdState.adaptLevel);
  dmdState.cfg = cfg;
  dmdState.pattern = dmdGenPattern(cfg.grid, cfg.len);
  dmdState.userPat = [];
  dmdState.phase = 'ready';
  dmdState.roundsPlayed++;

  const canvas = document.getElementById('diamond-canvas');
  const levelTag = document.getElementById('diamond-level-tag');
  const phaseLbl = document.getElementById('diamond-phase-lbl');
  const roundLbl = document.getElementById('diamond-round-lbl');
  const hint = document.getElementById('diamond-hint');
  const clearBtn = document.getElementById('diamond-clear-btn');

  levelTag.textContent = `L${dmdState.adaptLevel + 1} · ${cfg.grid}×${cfg.grid}`;
  roundLbl.textContent = t('diamond_round', dmdState.roundsPlayed);
  clearBtn.style.display = 'none';
  document.getElementById('diamond-clear-btn').textContent = t('diamond_clear');

  // Brief "Get ready" phase
  phaseLbl.textContent = t('diamond_phase_ready');
  hint.textContent = '';
  dmdDraw(canvas, [], [], 'ready');

  dmdState.animTimer = setTimeout(() => {
    dmdState.phase = 'show';
    phaseLbl.textContent = t('diamond_phase_show');
    hint.textContent = t('diamond_hint_show');
    dmdAnimateShow(canvas, cfg);
  }, 700);
}

function dmdStartProgressBar(durationMs) {
  if (dmdState.progressTimer) clearInterval(dmdState.progressTimer);
  const fill = document.getElementById('diamond-progress-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  const start = Date.now();
  dmdState.progressTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 100 - (elapsed / durationMs) * 100);
    fill.style.width = pct + '%';
    if (pct <= 0) { clearInterval(dmdState.progressTimer); dmdState.progressTimer = null; }
  }, 50);
}

function diamondRecallPhase() {
  if (dmdState.progressTimer) { clearInterval(dmdState.progressTimer); dmdState.progressTimer = null; }
  document.getElementById('diamond-progress-fill').style.width = '0%';
  dmdState.phase = 'recall';
  dmdState.userPat = [];
  const canvas = document.getElementById('diamond-canvas');
  document.getElementById('diamond-phase-lbl').textContent = t('diamond_phase_recall');
  document.getElementById('diamond-hint').textContent = t('diamond_hint_recall');
  document.getElementById('diamond-clear-btn').style.display = '';
  dmdDraw(canvas, [], [], 'recall');
}

function dmdGetDot(clientX, clientY, radiusMult) {
  const canvas = document.getElementById('diamond-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const grid = dmdState.cfg.grid;
  const r = dmdR(grid) * (radiusMult !== undefined ? radiusMult : 1.9);
  for (let i = 0; i < grid * grid; i++) {
    const p = dmdPos(i, grid, canvas.width, canvas.height);
    if (Math.hypot(x - p.x, y - p.y) <= r) return i;
  }
  return -1;
}

function dmdPointerDown(e) {
  if (dmdState.phase !== 'recall') return;
  this.setPointerCapture(e.pointerId);
  const dot = dmdGetDot(e.clientX, e.clientY);
  if (dot >= 0 && !dmdState.userPat.includes(dot)) dmdTapDot(dot);
  dmdRedrawRecall(e.clientX, e.clientY);
}

function dmdPointerMove(e) {
  if (dmdState.phase !== 'recall' || !(e.buttons & 1) || e.pressure === 0) return;
  const dot = dmdGetDot(e.clientX, e.clientY, 1.2);
  if (dot >= 0 && !dmdState.userPat.includes(dot)) dmdTapDot(dot);
  else dmdRedrawRecall(e.clientX, e.clientY);
}

function dmdPointerEnd(e) {
  dmdRedrawRecall();
}

function dmdRedrawRecall(curX, curY) {
  const canvas = document.getElementById('diamond-canvas');
  if (!canvas || dmdState.phase !== 'recall') return;
  dmdDraw(canvas, [], dmdState.userPat, 'recall', undefined,
          curX !== undefined ? [curX, curY] : null);
}

function dmdAnimateShow(canvas, cfg) {
  const pat = dmdState.pattern;
  const n = pat.length;
  if (n <= 1) {
    dmdDraw(canvas, pat, [], 'show');
    dmdStartProgressBar(cfg.showMs);
    dmdState.animTimer = setTimeout(diamondRecallPhase, cfg.showMs);
    return;
  }
  // Each segment draws in segMs; total anim capped so longer patterns don't take forever
  const segMs = Math.min(600, 3600 / (n - 1));
  const totalMs = segMs * (n - 1);
  let startTs = null;
  const tick = (ts) => {
    if (!startTs) startTs = ts;
    const elapsed = Math.min(totalMs, ts - startTs);
    const rawSeg  = elapsed / segMs;
    const compSegs = Math.min(n - 2, Math.floor(rawSeg));
    const segProg  = rawSeg - compSegs;
    const grid = cfg.grid, r = dmdR(grid);
    const cw = canvas.width, ch = canvas.height;
    const ctx = canvas.getContext('2d');
    const total = grid * grid;
    ctx.clearRect(0, 0, cw, ch);
    // dots
    for (let i = 0; i < total; i++) {
      const {x, y} = dmdPos(i, grid, cw, ch);
      const pi = pat.indexOf(i);
      const done = pi >= 0 && pi <= compSegs;
      const cur  = pi === compSegs + 1;
      const a = cur ? Math.min(1, segProg * 1.8) : 1;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
      ctx.globalAlpha = (done || cur) ? a : 1;
      ctx.fillStyle = done ? 'rgba(124,58,237,.12)' : 'rgba(255,255,255,.04)';
      ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (done || cur) { ctx.fillStyle = 'rgba(124,58,237,.85)'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14; }
      else { ctx.fillStyle = 'rgba(255,255,255,.18)'; }
      ctx.fill(); ctx.restore();
      if ((done || cur) && pi >= 0) {
        ctx.save(); ctx.globalAlpha = cur ? a : 1;
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${Math.max(9, Math.round(r * 0.78))}px system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pi + 1, x, y); ctx.restore();
      }
    }
    // completed segments
    for (let s = 0; s < compSegs; s++) {
      const p1 = dmdPos(pat[s], grid, cw, ch), p2 = dmdPos(pat[s+1], grid, cw, ch);
      ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.65)';
      ctx.lineWidth = r * 0.38; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore();
    }
    // current partial segment (ease-in-out)
    if (compSegs < n - 1 && segProg > 0) {
      const p1 = dmdPos(pat[compSegs], grid, cw, ch), p2 = dmdPos(pat[compSegs+1], grid, cw, ch);
      const ep = segProg < 0.5 ? 2*segProg*segProg : 1 - Math.pow(-2*segProg+2, 2)/2;
      ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.65)';
      ctx.lineWidth = r * 0.38; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p1.x + (p2.x-p1.x)*ep, p1.y + (p2.y-p1.y)*ep);
      ctx.stroke(); ctx.restore();
    }
    if (elapsed < totalMs) {
      dmdState.animRaf = requestAnimationFrame(tick);
    } else {
      dmdState.animRaf = null;
      dmdDraw(canvas, pat, [], 'show');
      dmdStartProgressBar(cfg.showMs);
      dmdState.animTimer = setTimeout(diamondRecallPhase, cfg.showMs);
    }
  };
  dmdState.animRaf = requestAnimationFrame(tick);
}

function dmdTapDot(dot) {
  dmdState.userPat.push(dot);
  const canvas = document.getElementById('diamond-canvas');
  const n = dmdState.userPat.length;
  dmdSndTap(n);
  const total = dmdState.pattern.length;
  document.getElementById('diamond-hint').textContent = t('diamond_hint_selected', n, total);
  dmdDraw(canvas, [], dmdState.userPat, 'recall');
  if (n === total) {
    dmdState.phase = 'checking';
    document.getElementById('diamond-clear-btn').style.display = 'none';
    setTimeout(diamondCheckResult, 350);
  }
}

function diamondClearInput() {
  if (dmdState.phase !== 'recall') return;
  dmdState.userPat = [];
  const canvas = document.getElementById('diamond-canvas');
  document.getElementById('diamond-hint').textContent = t('diamond_hint_recall');
  dmdDraw(canvas, [], [], 'recall');
}

function diamondCheckResult() {
  const correct = dmdState.pattern.every((d, i) => dmdState.userPat[i] === d);
  const canvas = document.getElementById('diamond-canvas');

  if (correct) {
    dmdDraw(canvas, dmdState.pattern, dmdState.userPat, 'correct');
  } else {
    // find first wrong index
    const wrongAt = dmdState.userPat.findIndex((d, i) => d !== dmdState.pattern[i]);
    dmdDraw(canvas, dmdState.pattern, dmdState.userPat, 'wrong', wrongAt);
  }

  setTimeout(() => diamondShowResult(correct), 800);
}

function diamondShowResult(correct) {
  (correct ? dmdSndCorrect() : dmdSndWrong());
  const cfg = dmdState.cfg;
  dmdState.lastResult = correct ? 'win' : 'fail';

  const inChosenMode = dmdState.chosenLevel !== undefined;

  if (inChosenMode) {
    // In chosen-level mode: track correct count but don't adjust adaptLevel with streak
    if (correct) { dmdState.roundsCorrect++; }
    dmdState.streak = 0;
  } else {
    if (correct) {
      dmdState.streak++;
      dmdState.roundsCorrect++;
      if (dmdState.streak >= 2) {
        dmdState.adaptLevel = Math.min(DIAMOND_LEVELS.length - 1, dmdState.adaptLevel + 1);
        dmdState.streak = 0;
      }
    } else {
      dmdState.streak = 0;
      dmdState.adaptLevel = Math.max(0, dmdState.adaptLevel - 1);
    }
  }

  const saved = dmdLoadSave();
  const newBest = Math.max(saved.best || 0, dmdState.adaptLevel);
  const completed = Object.assign({}, saved.completed || {});
  if (correct && inChosenMode) completed[dmdState.chosenLevel] = true;
  dmdSave({ level: dmdState.adaptLevel, best: newBest, streak: dmdState.streak, completed });

  const xp = correct ? 8 + dmdState.adaptLevel * 2 : 0;
  if (correct) addXp(xp, t('diamond_mode_title'));

  const toCheck = ['dmd_first'];
  if (dmdState.roundsCorrect >= 1) toCheck.push('dmd_first');
  if (dmdState.streak >= 5 || (saved.streak || 0) >= 5) toCheck.push('dmd_streak5');
  if (dmdState.adaptLevel >= 9) toCheck.push('dmd_level10');
  if (correct) checkAchievements(toCheck);

  const overlay = document.getElementById('diamond-result');
  const em = document.getElementById('diamond-result-em');
  const title = document.getElementById('diamond-result-title');
  const sub = document.getElementById('diamond-result-sub');
  const stats = document.getElementById('diamond-result-stats');
  const nextBtn = document.getElementById('diamond-next-btn');
  const menuBtn = overlay.querySelector('.btn:not(.btn-primary)');

  em.textContent = correct ? '💎' : '❌';
  title.textContent = correct ? t('diamond_correct') : t('diamond_wrong');
  sub.textContent = correct ? t('diamond_correct_sub', xp) : t('diamond_wrong_sub');
  if (inChosenMode) {
    if (correct) {
      const nextIdx = dmdState.chosenLevel + 1;
      const freshSave = dmdLoadSave();
      const hasNext = nextIdx < DIAMOND_LEVELS.length && dmdIsUnlocked(nextIdx, freshSave);
      nextBtn.textContent = hasNext ? t('diamond_next_level') : t('diamond_menu');
    } else {
      nextBtn.textContent = t('diamond_retry');
    }
  } else {
    nextBtn.textContent = t('diamond_next');
  }
  if (menuBtn) menuBtn.textContent = t('diamond_menu');

  stats.innerHTML = `
    <div class="stat-box"><div class="sv">${dmdState.roundsCorrect}</div><div class="sl">${t('diamond_stat_correct')}</div></div>
    <div class="stat-box"><div class="sv">${dmdState.roundsPlayed}</div><div class="sl">${t('diamond_stat_total')}</div></div>
    <div class="stat-box"><div class="sv">${dmdState.adaptLevel + 1}</div><div class="sl">${t('diamond_stat_level')}</div></div>
    <div class="stat-box"><div class="sv">${cfg.grid}×${cfg.grid}</div><div class="sl">${t('diamond_stat_grid')}</div></div>`;

  overlay.classList.add('show');
}

function diamondNextRound() {
  document.getElementById('diamond-result').classList.remove('show');

  if (dmdState.chosenLevel !== undefined) {
    if (dmdState.lastResult === 'win') {
      const nextIdx = dmdState.chosenLevel + 1;
      const save = dmdLoadSave();
      if (nextIdx < DIAMOND_LEVELS.length && dmdIsUnlocked(nextIdx, save)) {
        diamondStartLevel(nextIdx);
      } else {
        diamondGoSelect();
      }
    } else {
      diamondStartLevel(dmdState.chosenLevel);
    }
  } else {
    diamondNewRound();
  }
}

function diamondGoSelect() {
  document.getElementById('diamond-result').classList.remove('show');
  dmdState.chosenLevel = undefined;
  showDiamondMenu();
}

