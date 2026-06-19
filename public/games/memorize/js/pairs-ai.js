// ═══════════════════════════════════════════════════
// PAIRS vs AI
// ═══════════════════════════════════════════════════
let aiDiff = localStorage.getItem('membrain_ai_diff') || 'medium';

function selectAiDiff(el) {
  aiDiff = el.dataset.diff;
  localStorage.setItem('membrain_ai_diff', aiDiff);
  document.querySelectorAll('.ai-diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === aiDiff));
}

function loadElo() { return parseInt(localStorage.getItem('membrain_pairs_elo') || '1200'); }
function saveElo(v) { localStorage.setItem('membrain_pairs_elo', String(Math.max(600, v))); }
function updateEloDisplay() {
  const badge = document.getElementById('pairs-elo-badge');
  if (badge) badge.textContent = 'ELO: ' + loadElo();
}

function startAiGame() {
  const coll = collById(selectedCollection);
  const [cols, rows] = selectedGrid.split('x').map(Number);
  const needed = cols * rows / 2;
  let pool = [...coll.pool].sort(() => Math.random() - .5);
  while (pool.length < needed) pool.push(...[...coll.pool].sort(() => Math.random() - .5));
  pool = pool.slice(0, needed);
  const cards = [...pool, ...pool].sort(() => Math.random() - .5);

  pairsState.myName = t('ai_player_name');
  pairsState.partner = t('ai_name_' + aiDiff);
  pairsState.gridSize = selectedGrid;
  pairsState.cards = cards;
  pairsState.revealed = new Array(cols * rows).fill(false);
  pairsState.matched = new Array(cols * rows).fill(false);
  pairsState.holeCount = new Array(cols * rows).fill(0);
  pairsState.scores = {
    [pairsState.myName]: { pairs: 0, holes: 0, holePenalty: 0 },
    [pairsState.partner]: { pairs: 0, holes: 0, holePenalty: 0 },
  };
  pairsState.myTurn = true;
  pairsState.flipBuffer = [];
  pairsState.waitingFlipBack = false;
  pairsState.aiMode = true;
  pairsState.aiDiff = aiDiff;
  pairsState.aiMemory = [];
  pairsState.aiFreeze = 0;
  pairsState.powerups = { peek: 1, freeze: 1, hint: 1 };
  pairsState.pairsMatchedByPlayer = 0;

  document.getElementById('gameover-overlay').classList.remove('show');
  const eloEl = document.getElementById('go-elo-change');
  if (eloEl) eloEl.style.display = 'none';
  document.getElementById('lobby-back-btn').textContent = t('back_menu');
  document.getElementById('lobby-back-btn').onclick = () => {
    document.getElementById('gameover-overlay').classList.remove('show');
    goMenu();
  };
  showScreen('screen-pairs');
  renderPowerupBar(true);
  requestAnimationFrame(() => { renderPairsBoard(); updatePairsScores(); });
  document.getElementById('rematch-btn').textContent = t('math_replay');
  document.getElementById('rematch-btn').disabled = false;
  document.getElementById('rematch-btn').onclick = startAiGame;
  checkAchievements(['pb_first']);
  metaTrackGame('pairs');
}

function renderPowerupBar(show) {
  const bar = document.getElementById('pairs-powerup-bar');
  if (!bar) return;
  bar.classList.toggle('visible', !!show);
  if (!show) return;
  const pu = pairsState.powerups || { peek: 0, freeze: 0, hint: 0 };
  ['peek', 'freeze', 'hint'].forEach(k => {
    const btn = document.getElementById('pu-' + k);
    const ct = document.getElementById('pu-' + k + '-ct');
    if (btn) btn.disabled = (pu[k] || 0) <= 0 || !pairsState.myTurn;
    if (ct) ct.textContent = pu[k] || 0;
  });
}

function usePowerup(type) {
  if (!pairsState.aiMode || !pairsState.myTurn) return;
  const pu = pairsState.powerups;
  if (!pu[type] || pu[type] <= 0) return;
  pu[type]--;

  if (type === 'peek') {
    pairsState.cards.forEach((_, i) => {
      if (!pairsState.matched[i] && !pairsState.revealed[i]) {
        const el = document.querySelector(`#pairs-board .card-wrap:nth-child(${i + 1}) .card`);
        if (el) el.classList.add('flipped');
      }
    });
    setTimeout(() => {
      pairsState.cards.forEach((_, i) => {
        if (!pairsState.matched[i] && !pairsState.revealed[i]) {
          const el = document.querySelector(`#pairs-board .card-wrap:nth-child(${i + 1}) .card`);
          if (el) el.classList.remove('flipped');
        }
      });
    }, 1800);
  } else if (type === 'freeze') {
    pairsState.aiFreeze++;
  } else if (type === 'hint') {
    const seen = {};
    pairsState.cards.forEach((id, i) => {
      if (!pairsState.matched[i]) {
        if (seen[id] !== undefined) {
          [seen[id], i].forEach(idx => {
            const el = document.querySelector(`#pairs-board .card-wrap:nth-child(${idx + 1}) .card-back`);
            if (el) { el.style.boxShadow = '0 0 18px var(--goldL)'; setTimeout(() => el.style.boxShadow = '', 1500); }
          });
        } else seen[id] = i;
      }
    });
  }
  renderPowerupBar(true);
}

function earnPowerup() {
  const types = ['peek', 'freeze', 'hint'];
  const pick = types[Math.floor(Math.random() * types.length)];
  pairsState.powerups[pick] = (pairsState.powerups[pick] || 0) + 1;
  renderPowerupBar(true);
  const bar = document.getElementById('pairs-powerup-bar');
  if (bar) { bar.style.background = 'rgba(124,58,237,.22)'; setTimeout(() => bar.style.background = '', 500); }
}

function aiTakeTurn() {
  if (!pairsState.aiMode || pairsState.myTurn) return;

  if (pairsState.aiFreeze > 0) {
    pairsState.aiFreeze--;
    setTimeout(() => { pairsState.myTurn = true; updatePairsScores(); renderPowerupBar(true); }, 600);
    return;
  }

  setTimeout(() => {
    const idx1 = aiPickCard1();
    if (idx1 < 0) { aiEndTurn(); return; }
    pairsState.revealed[idx1] = true;
    pairsState.flipBuffer = [idx1];
    aiLearnCard(idx1);
    soundCardFlip();
    renderPairsBoard();

    setTimeout(() => {
      const idx2 = aiPickCard2(idx1);
      if (idx2 < 0) { aiEndTurn(); return; }
      pairsState.revealed[idx2] = true;
      pairsState.flipBuffer = [idx1, idx2];
      aiLearnCard(idx2);
      soundCardFlip();
      renderPairsBoard();

      setTimeout(() => {
        const id1 = pairsState.cards[idx1], id2 = pairsState.cards[idx2];
        if (id1 === id2) {
          pairsState.matched[idx1] = pairsState.matched[idx2] = true;
          pairsState.revealed[idx1] = pairsState.revealed[idx2] = true;
          pairsState.flipBuffer = [];
          pairsState.scores[pairsState.partner].pairs++;
          soundPairFound();
          renderPairsBoard();
          updatePairsScores();
          if (checkAiGameOver()) return;
          aiTakeTurn();
        } else {
          pairsState.scores[pairsState.partner].holes = (pairsState.scores[pairsState.partner].holes || 0) + 1;
          updatePairsScores();
          soundNoMatch();
          setTimeout(() => {
            pairsState.revealed[idx1] = pairsState.revealed[idx2] = false;
            pairsState.flipBuffer = [];
            renderPairsBoard();
            aiEndTurn();
          }, 800);
        }
      }, 500);
    }, 700);
  }, 700);
}

function aiPickCard1() {
  const pair = findKnownAiPair();
  return pair ? pair[0] : randomUnrevealedCard();
}

function aiPickCard2(idx1) {
  const id1 = pairsState.cards[idx1];
  const forgetChance = pairsState.aiDiff === 'easy' ? 0.65 : pairsState.aiDiff === 'medium' ? 0.28 : 0.0;
  if (Math.random() > forgetChance) {
    const mem = pairsState.aiMemory.find(m => m.idx !== idx1 && m.objId === id1 && !pairsState.matched[m.idx]);
    if (mem) return mem.idx;
  }
  return randomUnrevealedCard(idx1);
}

function aiLearnCard(idx) {
  if (!pairsState.aiMemory.find(m => m.idx === idx)) {
    pairsState.aiMemory.push({ idx, objId: pairsState.cards[idx] });
    const cap = { easy: 4, medium: 8, hard: 999 }[pairsState.aiDiff] || 8;
    if (pairsState.aiMemory.length > cap) pairsState.aiMemory.shift();
  }
}

function findKnownAiPair() {
  const mem = pairsState.aiMemory;
  for (let i = 0; i < mem.length; i++) {
    if (pairsState.matched[mem[i].idx]) continue;
    for (let j = i + 1; j < mem.length; j++) {
      if (pairsState.matched[mem[j].idx]) continue;
      if (mem[i].objId === mem[j].objId) return [mem[i].idx, mem[j].idx];
    }
  }
  return null;
}

function randomUnrevealedCard(exclude = -1) {
  const cands = pairsState.cards.map((_, i) => i).filter(i => i !== exclude && !pairsState.matched[i] && !pairsState.revealed[i]);
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : -1;
}

function aiEndTurn() {
  pairsState.myTurn = true;
  pairsState.flipBuffer = [];
  renderPairsBoard();
  updatePairsScores();
  renderPowerupBar(true);
}

function checkAiGameOver() {
  if (!pairsState.matched.every(Boolean)) return false;
  const me = pairsState.scores[pairsState.myName];
  const ai = pairsState.scores[pairsState.partner];
  const winner = me.pairs > ai.pairs ? pairsState.myName : ai.pairs > me.pairs ? pairsState.partner : null;

  const oldElo = loadElo();
  const diff = pairsState.aiDiff;
  const eloChange = winner === pairsState.myName
    ? (diff === 'hard' ? +30 : diff === 'medium' ? +20 : +10)
    : winner === null ? 0
    : (diff === 'hard' ? -20 : diff === 'medium' ? -15 : -5);
  const newElo = oldElo + eloChange;
  saveElo(newElo);
  updateEloDisplay();

  const eloEl = document.getElementById('go-elo-change');
  if (eloEl) {
    eloEl.style.display = '';
    eloEl.style.color = eloChange > 0 ? 'var(--greenL)' : eloChange < 0 ? 'var(--redL)' : 'var(--text2)';
    eloEl.textContent = `ELO: ${oldElo} ${eloChange >= 0 ? '+' : ''}${eloChange} → ${newElo}`;
  }

  if (winner === pairsState.myName) soundWin(); else if (winner) soundLose();
  showGameOver(pairsState.scores, winner);

  const toEarn = [];
  if (winner === pairsState.myName) toEarn.push('pb_win');
  if (winner === pairsState.myName && diff === 'hard') toEarn.push('pb_hard');
  if (newElo >= 1400) toEarn.push('pb_elo1400');
  checkAchievements(toEarn);
  const pairsXp = winner === pairsState.myName ? 30 : winner === null ? 15 : 10;
  addXp(pairsXp, t('pairs_mode_title'));
  return true;
}

