// Cloudflare Durable Object — Memorize Pairs Battle WebSocket server
// One global instance ("global-lobby") handles the entire lobby + all rooms.

const OBJECTS = [
  'duck','ball','star','heart','diamond','crown','rocket','moon',
  'flower','butterfly','apple','cloud','fish','mushroom','snowflake','sun',
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── In-memory game room ──────────────────────────────────────────────────────
class GameRoom {
  constructor(id, p1, p2, gridSize) {
    this.id = id;
    this.players = [p1, p2];
    this.gridSize = gridSize;
    const [rows, cols] = gridSize.split('x').map(Number);
    const pairCount = (rows * cols) / 2;
    const pool = shuffle(OBJECTS).slice(0, pairCount);
    this.cards = shuffle([...pool, ...pool]);
    const total = rows * cols;
    this.revealed   = new Array(total).fill(false);
    this.matched    = new Array(total).fill(false);
    this.holeCount  = new Array(total).fill(0);
    this.scores     = Object.fromEntries([p1, p2].map(n => [n, { pairs: 0, holes: 0, holePenalty: 0 }]));
    this.currentTurn = p1;
    this.flipBuffer  = [];
    this.rematchVotes = new Set();
  }

  flipCard(by, index) {
    if (this.currentTurn !== by)      return { error: 'not your turn' };
    if (this.matched[index])           return { error: 'already matched' };
    if (this.revealed[index])          return { error: 'already revealed' };
    if (this.flipBuffer.length >= 2)   return { error: 'buffer full' };

    this.revealed[index] = true;
    this.flipBuffer.push(index);

    if (this.flipBuffer.length === 2) {
      const [i1, i2] = this.flipBuffer;
      if (this.cards[i1] === this.cards[i2]) {
        this.matched[i1] = this.matched[i2] = true;
        this.scores[by].pairs++;
        this.flipBuffer = [];
        return { type: 'pair_found', indices: [i1, i2], by, scores: this.scores,
                 nextTurn: by, gameOver: this.isGameOver() };
      }
      this.holeCount[i1]++; this.holeCount[i2]++;
      this.scores[by].holes++;
      this.scores[by].holePenalty += this.holeCount[i1] + this.holeCount[i2];
      return { type: 'no_match', indices: [i1, i2], by, scores: this.scores };
    }

    return { type: 'card_revealed', index, object: this.cards[index], by };
  }

  hideCards(indices) {
    for (const i of indices) this.revealed[i] = false;
    this.flipBuffer = [];
    const idx = this.players.indexOf(this.currentTurn);
    this.currentTurn = this.players[(idx + 1) % 2];
  }

  isGameOver() { return this.matched.every(Boolean); }

  getWinner() {
    const net = p => this.scores[p].pairs * 10 - this.scores[p].holePenalty;
    const [p1, p2] = this.players;
    const n1 = net(p1), n2 = net(p2);
    return n1 > n2 ? p1 : n2 > n1 ? p2 : null;
  }
}

// ── Durable Object ───────────────────────────────────────────────────────────
export class GameServer {
  constructor(state, env) {
    this.state   = state;
    this.wsSessions     = new Map(); // WebSocket → username
    this.players        = new Map(); // username  → { ws, name, status, room }
    this.rooms          = new Map(); // roomId    → GameRoom
    this.pendingInvites = new Map(); // inviteId  → { from, to, gridSize }
    this.counter        = 0;
  }

  // ── fetch — WebSocket upgrade ──────────────────────────────────────────────
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    server.addEventListener('message', ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this.handleMessage(server, msg);
    });

    const cleanup = () => this.handleClose(server);
    server.addEventListener('close', cleanup);
    server.addEventListener('error', cleanup);

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch {}
  }

  broadcastRoom(room, obj) {
    for (const name of room.players) {
      const p = this.players.get(name);
      if (p) this.send(p.ws, obj);
    }
  }

  broadcastLobby() {
    const list = [...this.players.values()].map(p => ({ name: p.name, status: p.status }));
    for (const p of this.players.values()) {
      if (p.status === 'lobby') {
        this.send(p.ws, { type: 'players', list: list.filter(x => x.name !== p.name) });
      }
    }
  }

  // ── message router ─────────────────────────────────────────────────────────
  handleMessage(ws, msg) {
    switch (msg.type) {

      case 'register': {
        const name = String(msg.username ?? '').trim().slice(0, 20);
        if (!name) { this.send(ws, { type: 'error', msg: 'Name required' }); return; }
        if (this.players.has(name)) { this.send(ws, { type: 'error', msg: 'Name taken' }); return; }
        this.wsSessions.set(ws, name);
        this.players.set(name, { ws, name, status: 'lobby', room: null });
        this.send(ws, { type: 'registered', username: name });
        this.broadcastLobby();
        break;
      }

      case 'invite': {
        const myName = this.wsSessions.get(ws);
        if (!myName) return;
        const tp = this.players.get(msg.target);
        if (!tp || tp.status !== 'lobby') { this.send(ws, { type: 'error', msg: 'Player unavailable' }); return; }
        const inviteId = `i${++this.counter}`;
        this.pendingInvites.set(inviteId, { from: myName, to: msg.target, gridSize: msg.gridSize || '4x4' });
        this.send(tp.ws, { type: 'invite', from: myName, inviteId, gridSize: msg.gridSize || '4x4' });
        // Auto-expire after 30 s
        setTimeout(() => {
          if (!this.pendingInvites.has(inviteId)) return;
          this.pendingInvites.delete(inviteId);
          const fp = this.players.get(myName);
          if (fp) this.send(fp.ws, { type: 'invite_expired' });
          this.send(tp.ws, { type: 'invite_expired' });
        }, 30_000);
        break;
      }

      case 'invite_response': {
        const myName = this.wsSessions.get(ws);
        if (!myName) return;
        const inv = this.pendingInvites.get(msg.inviteId);
        if (!inv || inv.to !== myName) return;
        this.pendingInvites.delete(msg.inviteId);
        const fromP = this.players.get(inv.from);
        if (!fromP) return;
        if (!msg.accepted) { this.send(fromP.ws, { type: 'invite_declined', from: myName }); return; }

        const roomId = `r${++this.counter}`;
        const room   = new GameRoom(roomId, inv.from, myName, inv.gridSize);
        this.rooms.set(roomId, room);
        this.players.get(inv.from).status = 'playing'; this.players.get(inv.from).room = roomId;
        this.players.get(myName).status   = 'playing'; this.players.get(myName).room   = roomId;

        const base = { type: 'game_start', gridSize: inv.gridSize, cards: room.cards, scores: room.scores, firstTurn: room.currentTurn };
        this.send(fromP.ws, { ...base, partner: myName });
        this.send(ws,        { ...base, partner: inv.from });
        this.broadcastLobby();
        break;
      }

      case 'card_flip': {
        const myName = this.wsSessions.get(ws);
        if (!myName) return;
        const p    = this.players.get(myName);
        const room = p?.room && this.rooms.get(p.room);
        if (!room) return;
        const result = room.flipCard(myName, msg.index);
        if (result.error) return;

        if (result.type === 'card_revealed') {
          this.broadcastRoom(room, result);
        } else if (result.type === 'pair_found') {
          this.broadcastRoom(room, result);
          if (result.gameOver) {
            setTimeout(() => {
              this.broadcastRoom(room, { type: 'game_over', scores: room.scores, winner: room.getWinner() });
            }, 700);
          }
        } else if (result.type === 'no_match') {
          this.broadcastRoom(room, result);
          setTimeout(() => {
            const indices = [...result.indices];
            room.hideCards(indices);
            this.broadcastRoom(room, { type: 'cards_hidden', indices });
            this.broadcastRoom(room, { type: 'turn_change', player: room.currentTurn });
          }, 1_400);
        }
        break;
      }

      case 'rematch': {
        const myName = this.wsSessions.get(ws);
        if (!myName) return;
        const p    = this.players.get(myName);
        const room = p?.room && this.rooms.get(p.room);
        if (!room) return;
        room.rematchVotes.add(myName);
        const partner = room.players.find(n => n !== myName);
        const pp = this.players.get(partner);
        if (pp) this.send(pp.ws, { type: 'rematch_offered', by: myName });
        if (room.rematchVotes.size === 2) {
          const next = new GameRoom(room.id, room.players[0], room.players[1], room.gridSize);
          this.rooms.set(room.id, next);
          const base = { type: 'game_start', gridSize: next.gridSize, cards: next.cards, scores: next.scores, firstTurn: next.currentTurn };
          const p0 = this.players.get(next.players[0]);
          const p1 = this.players.get(next.players[1]);
          if (p0) this.send(p0.ws, { ...base, partner: next.players[1] });
          if (p1) this.send(p1.ws, { ...base, partner: next.players[0] });
        }
        break;
      }
    }
  }

  // ── disconnect cleanup ─────────────────────────────────────────────────────
  handleClose(ws) {
    const myName = this.wsSessions.get(ws);
    if (!myName) return;
    this.wsSessions.delete(ws);
    const p = this.players.get(myName);
    if (p?.room) {
      const room = this.rooms.get(p.room);
      if (room) {
        const partner = room.players.find(n => n !== myName);
        const pp = this.players.get(partner);
        if (pp) { this.send(pp.ws, { type: 'partner_left' }); pp.status = 'lobby'; pp.room = null; }
        this.rooms.delete(p.room);
      }
    }
    this.players.delete(myName);
    this.broadcastLobby();
  }
}
