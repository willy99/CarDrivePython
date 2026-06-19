// ═══════════════════════════════════════════════════
// PAIRS GAME (CLIENT LOGIC)
// ═══════════════════════════════════════════════════
let pairsState = {
  myName: '', partner: '', gridSize: null,
  cards: [], revealed: [], matched: [], holeCount: [],
  scores: {}, myTurn: false, flipBuffer: [],
  waitingFlipBack: false,
  // AI mode extras
  aiMode: false, aiDiff: 'medium', aiMemory: [],
  aiFreeze: 0, powerups: {peek:1,freeze:1,hint:1}, pairsMatchedByPlayer: 0,
};

function renderPairsBoard() {
  const board = document.getElementById('pairs-board');
  board.innerHTML = '';
  const gs = pairsState.gridSize;
  if (!gs) return;
  const [cols, rows] = gs.split('x').map(Number);
  // Calculate card size to fill available space while keeping aspect ratio.
  // Use visualViewport.height (excludes mobile browser chrome) so bottom cards never get clipped.
  const wrap = document.getElementById('pairs-board-wrap');
  const headerH = document.getElementById('pairs-header').offsetHeight;
  const vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const maxW = wrap.clientWidth - 24;
  const maxH = vvh - headerH - 52; // 52px bottom breathing room
  const gap = 8;
  const cardW = Math.floor(Math.min((maxW - (cols-1)*gap) / cols, (maxH - (rows-1)*gap) / rows));
  const cardH = cardW; // square cards
  board.style.gridTemplateColumns = `repeat(${cols}, ${cardW}px)`;
  board.style.gridTemplateRows = `repeat(${rows}, ${cardH}px)`;
  board.style.width = 'fit-content';
  board.style.margin = '0 auto';

  pairsState.cards.forEach((objId, idx) => {
    const wrap2 = document.createElement('div');
    wrap2.className = 'card-wrap';
    wrap2.style.width = cardW+'px'; wrap2.style.height = cardH+'px';

    const card = document.createElement('div');
    card.className = 'card' + (pairsState.revealed[idx]||pairsState.matched[idx] ? ' flipped' : '') + (pairsState.matched[idx] ? ' matched' : '');
    card.dataset.idx = idx;
    card.onclick = () => pairsCardClick(idx);

    // Back face
    const back = document.createElement('div');
    back.className = 'card-face card-back';
    const pat = document.createElement('div');
    pat.className = 'card-back-pattern';
    back.appendChild(pat);

    // Front face
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    const obj = OBJECTS.find(o=>o.id===objId);
    const glow = obj ? obj.glow : 'rgba(255,255,255,.32)';
    front.style.setProperty('--card-border', glow.replace('.4', pairsState.matched[idx]?'.6':'.35'));
    front.style.setProperty('--card-glow', glow);
    const c = document.createElement('canvas');
    const s = Math.floor(Math.min(cardW, cardH) * 0.58);
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');
    if (obj) {
      ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = s*0.25;
      drawObject(ctx, objId, s/2, s/2, s*0.82);
      ctx.restore();
    } else {
      // emoji token — draw the character itself
      ctx.save();
      ctx.font = `${Math.floor(s*0.74)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(objId, s/2, s*0.54);
      ctx.restore();
    }
    front.appendChild(c);

    card.appendChild(back); card.appendChild(front);
    wrap2.appendChild(card);
    board.appendChild(wrap2);
  });
  // Update hole markers
  pairsState.holeCount.forEach((h, idx) => {
    if (h > 0) {
      const cardEl = board.children[idx]?.querySelector('.card-back');
      if (cardEl) {
        const dot = document.createElement('div');
        dot.style.cssText = `position:absolute;bottom:4px;right:5px;font-size:${Math.min(9+h,16)}px;color:rgba(248,113,113,0.7);`;
        dot.textContent = '●'.repeat(Math.min(h,3));
        cardEl.appendChild(dot);
      }
    }
  });
}

function pairsCardClick(idx) {
  if (!pairsState.myTurn) return;
  if (pairsState.waitingFlipBack) return;
  if (pairsState.matched[idx]) return;
  if (pairsState.revealed[idx]) return;
  if (pairsState.flipBuffer.length >= 2) return;

  if (pairsState.aiMode) {
    pairsState.revealed[idx] = true;
    pairsState.flipBuffer.push(idx);
    soundCardFlip();
    renderPairsBoard();

    if (pairsState.flipBuffer.length === 2) {
      const [i1, i2] = pairsState.flipBuffer;
      const id1 = pairsState.cards[i1], id2 = pairsState.cards[i2];
      pairsState.myTurn = false;
      renderPowerupBar(true);

      if (id1 === id2) {
        setTimeout(() => {
          pairsState.matched[i1] = pairsState.matched[i2] = true;
          pairsState.revealed[i1] = pairsState.revealed[i2] = true;
          pairsState.flipBuffer = [];
          pairsState.scores[pairsState.myName].pairs++;
          pairsState.pairsMatchedByPlayer++;
          if (pairsState.pairsMatchedByPlayer % 3 === 0) earnPowerup();
          soundPairFound();
          renderPairsBoard();
          if (checkAiGameOver()) return;
          pairsState.myTurn = true;
          updatePairsScores();
          renderPowerupBar(true);
        }, 400);
      } else {
        setTimeout(() => {
          pairsState.scores[pairsState.myName].holes = (pairsState.scores[pairsState.myName].holes || 0) + 1;
          soundNoMatch();
          updatePairsScores();
          pairsState.waitingFlipBack = true;
          renderPairsBoard();
          setTimeout(() => {
            pairsState.revealed[i1] = pairsState.revealed[i2] = false;
            pairsState.flipBuffer = [];
            pairsState.waitingFlipBack = false;
            renderPairsBoard();
            setTimeout(() => aiTakeTurn(), 300);
          }, 900);
        }, 400);
      }
    }
    return;
  }

  if (pendingFlip) return;
  pendingFlip = true;
  ws?.send(JSON.stringify({type:'card_flip', index:idx}));
}

function updatePairsScores() {
  const {scores, myName, partner, myTurn} = pairsState;
  const p1 = myName, p2 = partner;
  document.getElementById('p1-name').textContent = p1;
  document.getElementById('p2-name').textContent = p2;
  document.getElementById('p1-pairs').textContent = scores[p1]?.pairs ?? 0;
  document.getElementById('p2-pairs').textContent = scores[p2]?.pairs ?? 0;
  document.getElementById('p1-holes').textContent = `${t('pairs_holes')} ${scores[p1]?.holes ?? 0}`;
  document.getElementById('p2-holes').textContent = `${t('pairs_holes')} ${scores[p2]?.holes ?? 0}`;
  document.getElementById('turn-name').textContent = myTurn ? t('pairs_your_turn') : t('pairs_their_turn', partner);
  document.getElementById('turn-name').style.color = myTurn ? 'var(--greenL)' : 'var(--text2)';
}

function showGameOver(scores, winner) {
  const overlay = document.getElementById('gameover-overlay');
  const {myName, partner} = pairsState;
  const isWinner = winner === myName;
  const isTie = winner === null;
  document.getElementById('gameover-emoji').textContent = isTie ? '🤝' : isWinner ? '🏆' : '😞';
  document.getElementById('gameover-title').textContent = isTie ? t('pairs_gameover_tie') : isWinner ? t('pairs_gameover_win') : t('pairs_gameover_lose', winner);
  document.getElementById('gameover-sub').textContent = isTie ? t('pairs_tie_sub') : isWinner ? t('pairs_win_sub') : t('pairs_lose_sub');
  const p1s = scores[myName], p2s = scores[partner];
  document.getElementById('go-scores').innerHTML = `
    <div class="go-score">
      <div class="gsn">${myName} (You)</div>
      <div class="gsp" style="color:var(--goldL)">${p1s?.pairs??0} pairs</div>
      <div class="gsh">${p1s?.holes??0} holes · −${p1s?.holePenalty??0} pts</div>
    </div>
    <div class="go-score">
      <div class="gsn">${partner}</div>
      <div class="gsp" style="color:var(--blueL)">${p2s?.pairs??0} pairs</div>
      <div class="gsh">${p2s?.holes??0} holes · −${p2s?.holePenalty??0} pts</div>
    </div>
  `;
  overlay.classList.add('show');
}

function requestRematch() {
  ws?.send(JSON.stringify({type:'rematch'}));
  document.getElementById('rematch-btn').textContent = 'Waiting…';
  document.getElementById('rematch-btn').disabled = true;
}

// ═══════════════════════════════════════════════════
// WEBSOCKET CLIENT
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// SOUNDS (Web Audio API — no external files)
// ═══════════════════════════════════════════════════
let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }

function playTone(freq, type, gain, dur, delay=0) {
  try {
    const ctx = ac();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch {}
}

function soundCardFlip() {
  playTone(440, 'sine', 0.18, 0.08);
}

function soundPairFound() {
  playTone(523, 'triangle', 0.25, 0.12);
  playTone(659, 'triangle', 0.25, 0.12, 0.13);
  playTone(784, 'triangle', 0.25, 0.18, 0.26);
}

function soundNoMatch() {
  playTone(220, 'sawtooth', 0.15, 0.15);
  playTone(180, 'sawtooth', 0.12, 0.18, 0.12);
}

function soundWin() {
  [0,0.12,0.24,0.38,0.52].forEach((d,i) => {
    playTone([523,587,659,784,1047][i], 'triangle', 0.28, 0.22, d);
  });
}

function soundLose() {
  playTone(330, 'sawtooth', 0.18, 0.2);
  playTone(262, 'sawtooth', 0.15, 0.25, 0.18);
  playTone(196, 'sawtooth', 0.12, 0.35, 0.38);
}

// ═══════════════════════════════════════════════════
// WEBSOCKET CLIENT
// ═══════════════════════════════════════════════════
let ws = null;
let pendingInvite = null;
let selectedGrid = '4x4';
let selectedCollection = 'classic';
let pendingFlip = false;

const GRID_OPTS = ['2x4','4x4','4x6','4x8','6x6','6x8','8x8'];
function gridPairs(g){ const [c,r] = g.split('x').map(Number); return c*r/2; }

function renderCollOptions(){
  const wrap = document.getElementById('coll-options');
  if(!wrap) return;
  wrap.innerHTML = '';
  COLLECTIONS.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'coll-opt' + (c.id===selectedCollection ? ' active' : '');
    el.onclick = () => selectColl(c.id);
    const ico = c.kind==='emoji' ? c.pool[0] : '✦';
    el.innerHTML = `<span class="coll-ico">${ico}</span><span class="coll-name">${c.name}</span><span class="coll-cap">${c.pool.length} cards</span>`;
    wrap.appendChild(el);
  });
}

function selectColl(id){
  selectedCollection = id;
  renderCollOptions();
  refreshGridOptions();
}

// All grid sizes are always available (pool cycles when needed > pool.length).
function refreshGridOptions(){
  document.querySelectorAll('.grid-opt').forEach(el=>{
    el.classList.remove('disabled');
  });
}

// On localhost → local dev server; on Cloudflare (or any deployed host) → /ws on same host
function wsUrl() {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return isLocal ? 'ws://localhost:8080' : `wss://${location.host}/ws`;
}

function selectGrid(el) {
  document.querySelectorAll('.grid-opt').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');
  selectedGrid = el.dataset.grid;
}

function showLobby() {
  showScreen('screen-lobby');
  document.getElementById('ws-url-hint').textContent = wsUrl();
  renderCollOptions();
  refreshGridOptions();
  updateEloDisplay();
  // Sync AI diff buttons with saved state
  const saved = localStorage.getItem('membrain_ai_diff') || 'medium';
  document.querySelectorAll('.ai-diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === saved));
  restoreOpts('lobby-opts');
}

function lobbyConnect() {
  const username = document.getElementById('lobby-username').value.trim();
  if (!username) { alert('Enter your name first!'); return; }
  if (ws) { ws.close(); ws = null; }
  setWsStatus('connecting');
  try {
    ws = new WebSocket(wsUrl());
  } catch(e) {
    setWsStatus('offline'); return;
  }
  ws.onopen = () => {
    ws.send(JSON.stringify({type:'register', username}));
  };
  ws.onclose = () => { setWsStatus('offline'); ws = null; };
  ws.onerror = () => { setWsStatus('offline'); };
  ws.onmessage = (ev) => {
    try { handleWsMsg(JSON.parse(ev.data)); } catch(e) { console.warn('ws parse err', e); }
  };
}

function handleWsMsg(msg) {
  switch(msg.type) {
    case 'registered':
      setWsStatus('online');
      document.getElementById('ws-my-name').textContent = '👤 ' + msg.username;
      pairsState.myName = msg.username;
      break;
    case 'error':
      alert('Error: ' + msg.msg);
      break;
    case 'players':
      renderPlayerList(msg.list);
      break;
    case 'invite':
      pendingInvite = {from: msg.from, inviteId: msg.inviteId, gridSize: msg.gridSize, collection: msg.collection};
      document.getElementById('invite-from-text').textContent = t('pairs_challenges', msg.from);
      document.getElementById('invite-grid-text').textContent = t('pairs_grid_coll', msg.gridSize, collById(msg.collection||'classic').name);
      document.getElementById('invite-popup').classList.add('show');
      break;
    case 'invite_declined':
      alert(t('pairs_declined', msg.from));
      break;
    case 'invite_expired':
      document.getElementById('invite-popup').classList.remove('show');
      break;
    case 'game_start':
      document.getElementById('invite-popup').classList.remove('show');
      document.getElementById('gameover-overlay').classList.remove('show');
      startPairsGame(msg);
      break;
    case 'card_revealed':
      pendingFlip = false;
      pairsState.revealed[msg.index] = true;
      pairsState.flipBuffer.push(msg.index);
      soundCardFlip();
      renderPairsBoard();
      break;
    case 'pair_found':
      msg.indices.forEach(i => { pairsState.matched[i]=true; pairsState.revealed[i]=true; });
      pairsState.flipBuffer = [];
      pairsState.scores = msg.scores;
      pairsState.myTurn = msg.nextTurn === pairsState.myName;
      soundPairFound();
      renderPairsBoard();
      updatePairsScores();
      break;
    case 'no_match':
      pairsState.scores = msg.scores;
      msg.indices.forEach(i => pairsState.holeCount[i]++);
      pairsState.waitingFlipBack = true;
      soundNoMatch();
      renderPairsBoard();
      updatePairsScores();
      break;
    case 'cards_hidden':
      msg.indices.forEach(i => { pairsState.revealed[i]=false; });
      pairsState.flipBuffer = [];
      pairsState.waitingFlipBack = false;
      renderPairsBoard();
      break;
    case 'turn_change':
      pairsState.myTurn = msg.player === pairsState.myName;
      updatePairsScores();
      break;
    case 'game_over':
      if (msg.winner === pairsState.myName) soundWin(); else soundLose();
      showGameOver(msg.scores, msg.winner);
      break;
    case 'partner_left':
      alert('Your opponent disconnected.');
      showLobby();
      break;
    case 'rematch_offered':
      document.getElementById('rematch-btn').textContent = 'Accept Rematch';
      document.getElementById('rematch-btn').disabled = false;
      document.getElementById('rematch-btn').onclick = () => {
        ws?.send(JSON.stringify({type:'rematch'}));
      };
      break;
  }
}

function startPairsGame(msg) {
  const [cols, rows] = msg.gridSize.split('x').map(Number);
  pairsState.partner = msg.partner;
  pairsState.gridSize = msg.gridSize;
  pairsState.cards = msg.cards;
  pairsState.revealed = new Array(cols*rows).fill(false);
  pairsState.matched = new Array(cols*rows).fill(false);
  pairsState.holeCount = new Array(cols*rows).fill(0);
  pairsState.scores = msg.scores;
  pairsState.myTurn = msg.firstTurn === pairsState.myName;
  pairsState.flipBuffer = [];
  pairsState.waitingFlipBack = false;
  pairsState.aiMode = false;
  renderPowerupBar(false);
  document.getElementById('lobby-back-btn').textContent = t('pairs_lobby_btn');
  document.getElementById('lobby-back-btn').onclick = showLobby;
  const eloEl = document.getElementById('go-elo-change');
  if (eloEl) eloEl.style.display = 'none';
  showScreen('screen-pairs');
  requestAnimationFrame(() => { renderPairsBoard(); updatePairsScores(); });
  document.getElementById('rematch-btn').textContent = t('pairs_rematch');
  document.getElementById('rematch-btn').disabled = false;
  document.getElementById('rematch-btn').onclick = requestRematch;
}

function renderPlayerList(players) {
  const el = document.getElementById('player-list');
  if (!players.length) {
    el.innerHTML = `<div style="color:var(--text3);font-size:.85rem;padding:12px 0;">${t('pairs_no_other')}</div>`;
    return;
  }
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2'];
  el.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    const color = colors[i % colors.length];
    row.innerHTML = `
      <div class="player-avatar" style="background:${color}22;color:${color};border:1px solid ${color}44;">${p.name[0].toUpperCase()}</div>
      <div>
        <div class="player-name">${p.name}</div>
        <div class="player-status">${p.status === 'lobby' ? '🟢 ' + t('pairs_in_lobby') : '🎮 ' + t('pairs_in_game')}</div>
      </div>
      <button class="invite-btn" ${p.status!=='lobby'?'disabled':''} onclick="sendInvite('${p.name}')">${t('pairs_invite_btn')}</button>
    `;
    el.appendChild(row);
  });
}

function sendInvite(target) {
  if (!ws) return;
  ws.send(JSON.stringify({type:'invite', target, gridSize: selectedGrid, collection: selectedCollection}));
  alert(t('pairs_sent', target));
}

function respondInvite(accepted) {
  document.getElementById('invite-popup').classList.remove('show');
  if (!ws || !pendingInvite) return;
  ws.send(JSON.stringify({type:'invite_response', accepted, inviteId: pendingInvite.inviteId}));
  pendingInvite = null;
}

function setWsStatus(status) {
  const dot = document.getElementById('ws-dot');
  const label = document.getElementById('ws-status-label');
  dot.className = 'status-dot ' + status;
  label.textContent = status === 'online' ? t('pairs_connected') : status === 'connecting' ? t('pairs_connecting') : t('pairs_disconnected');
}

