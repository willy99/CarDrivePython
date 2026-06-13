const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const OBJECTS = ['duck','ball','star','heart','diamond','crown','rocket','moon','flower','butterfly','apple','cloud','fish','mushroom','snowflake','sun'];

// players: Map<username, {ws, status:'lobby'|'playing', room:string|null}>
const players = new Map();
// rooms: Map<roomId, GameRoom>
const rooms = new Map();
// pendingInvites: Map<inviteId, {from, to, gridSize, timer}>
const pendingInvites = new Map();

let inviteCounter = 0;

class GameRoom {
  constructor(id, p1, p2, gridSize) {
    this.id = id;
    this.players = [p1, p2];
    const [rows, cols] = gridSize.split('x').map(Number);
    this.gridSize = gridSize;
    this.rows = rows; this.cols = cols;
    const totalCards = rows * cols;
    const pairCount = totalCards / 2;
    const pool = [...OBJECTS].sort(() => Math.random() - 0.5).slice(0, pairCount);
    const deck = [...pool, ...pool].sort(() => Math.random() - 0.5);
    this.cards = deck;
    this.revealed = new Array(totalCards).fill(false);
    this.matched = new Array(totalCards).fill(false);
    this.holeCount = new Array(totalCards).fill(0);
    this.scores = {};
    for (const p of [p1, p2]) this.scores[p] = { pairs: 0, holes: 0, holePenalty: 0 };
    this.currentTurn = p1;
    this.flipBuffer = [];
    this.rematchVotes = new Set();
  }

  flipCard(byPlayer, index) {
    if (this.currentTurn !== byPlayer) return { error: 'not your turn' };
    if (this.matched[index]) return { error: 'already matched' };
    if (this.revealed[index]) return { error: 'already revealed' };
    if (this.flipBuffer.length >= 2) return { error: 'buffer full' };
    this.revealed[index] = true;
    this.flipBuffer.push(index);
    if (this.flipBuffer.length === 2) {
      const [i1, i2] = this.flipBuffer;
      if (this.cards[i1] === this.cards[i2]) {
        this.matched[i1] = true; this.matched[i2] = true;
        this.scores[byPlayer].pairs++;
        this.flipBuffer = [];
        const over = this.isGameOver();
        return { type: 'pair_found', indices: [i1, i2], by: byPlayer, scores: this.scores, nextTurn: byPlayer, gameOver: over };
      } else {
        this.holeCount[i1]++; this.holeCount[i2]++;
        this.scores[byPlayer].holes++;
        this.scores[byPlayer].holePenalty += this.holeCount[i1] + this.holeCount[i2];
        return { type: 'no_match', indices: [i1, i2], by: byPlayer, scores: this.scores };
      }
    }
    return { type: 'card_revealed', index, object: this.cards[index], by: byPlayer };
  }

  hideCards(indices) {
    for (const i of indices) this.revealed[i] = false;
    this.flipBuffer = [];
    const idx = this.players.indexOf(this.currentTurn);
    this.currentTurn = this.players[(idx + 1) % 2];
  }

  isGameOver() { return this.matched.every(Boolean); }

  getWinner() {
    const [p1, p2] = this.players;
    const net = p => this.scores[p].pairs * 10 - this.scores[p].holePenalty;
    const n1 = net(p1), n2 = net(p2);
    if (n1 > n2) return p1;
    if (n2 > n1) return p2;
    return null;
  }
}

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj, except = null) {
  for (const name of room.players) {
    const p = players.get(name);
    if (p && p.ws !== except) send(p.ws, obj);
  }
}

function broadcastLobby() {
  const list = [...players.values()]
    .filter(p => p.status !== 'disconnected')
    .map(p => ({ name: p.name, status: p.status }));
  for (const p of players.values()) {
    if (p.status === 'lobby') send(p.ws, { type: 'players', list: list.filter(x => x.name !== p.name) });
  }
}

wss.on('connection', (ws) => {
  let myName = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'register': {
        const name = String(msg.username || '').trim().slice(0, 20);
        if (!name) { send(ws, { type: 'error', msg: 'Name required' }); return; }
        if (players.has(name)) { send(ws, { type: 'error', msg: 'Name taken' }); return; }
        myName = name;
        players.set(name, { ws, name, status: 'lobby', room: null });
        send(ws, { type: 'registered', username: name });
        broadcastLobby();
        break;
      }

      case 'invite': {
        if (!myName) return;
        const target = msg.target;
        const tp = players.get(target);
        if (!tp || tp.status !== 'lobby') { send(ws, { type: 'error', msg: 'Player unavailable' }); return; }
        const inviteId = `inv_${++inviteCounter}`;
        const timer = setTimeout(() => {
          pendingInvites.delete(inviteId);
          send(ws, { type: 'invite_expired' });
          send(tp.ws, { type: 'invite_expired' });
        }, 30000);
        pendingInvites.set(inviteId, { from: myName, to: target, gridSize: msg.gridSize || '4x4', timer });
        send(tp.ws, { type: 'invite', from: myName, inviteId, gridSize: msg.gridSize || '4x4' });
        break;
      }

      case 'invite_response': {
        if (!myName) return;
        // Find invite where I'm the target
        const inviteId = msg.inviteId;
        const inv = pendingInvites.get(inviteId);
        if (!inv || inv.to !== myName) return;
        clearTimeout(inv.timer);
        pendingInvites.delete(inviteId);
        const fromP = players.get(inv.from);
        if (!fromP) return;
        if (!msg.accepted) {
          send(fromP.ws, { type: 'invite_declined', from: myName });
          return;
        }
        // Start game
        const roomId = `room_${Date.now()}`;
        const room = new GameRoom(roomId, inv.from, myName, inv.gridSize);
        rooms.set(roomId, room);
        players.get(inv.from).status = 'playing'; players.get(inv.from).room = roomId;
        players.get(myName).status = 'playing'; players.get(myName).room = roomId;
        const baseMsg = {
          type: 'game_start', gridSize: inv.gridSize,
          cards: room.cards, scores: room.scores, firstTurn: room.currentTurn,
        };
        send(fromP.ws, { ...baseMsg, partner: myName });
        send(ws, { ...baseMsg, partner: inv.from });
        broadcastLobby();
        break;
      }

      case 'card_flip': {
        if (!myName) return;
        const p = players.get(myName);
        if (!p || !p.room) return;
        const room = rooms.get(p.room);
        if (!room) return;
        const result = room.flipCard(myName, msg.index);
        if (result.error) return;
        if (result.type === 'card_revealed') {
          broadcast(room, result);
        } else if (result.type === 'pair_found') {
          broadcast(room, result);
          if (result.gameOver) {
            const winner = room.getWinner();
            setTimeout(() => broadcast(room, { type: 'game_over', scores: room.scores, winner }), 700);
          }
        } else if (result.type === 'no_match') {
          broadcast(room, result);
          // Hide cards after delay
          setTimeout(() => {
            const indices = [...result.indices];
            room.hideCards(indices);
            broadcast(room, { type: 'cards_hidden', indices });
            broadcast(room, { type: 'turn_change', player: room.currentTurn });
          }, 1400);
        }
        break;
      }

      case 'rematch': {
        if (!myName) return;
        const p = players.get(myName);
        if (!p?.room) return;
        const room = rooms.get(p.room);
        if (!room) return;
        room.rematchVotes.add(myName);
        // Notify partner
        const partner = room.players.find(n => n !== myName);
        const pp = players.get(partner);
        if (pp) send(pp.ws, { type: 'rematch_offered', by: myName });
        if (room.rematchVotes.size === 2) {
          // Both agreed: start new game in same room
          const newRoom = new GameRoom(room.id, room.players[0], room.players[1], room.gridSize);
          rooms.set(room.id, newRoom);
          const baseMsg = { type: 'game_start', gridSize: newRoom.gridSize, cards: newRoom.cards, scores: newRoom.scores, firstTurn: newRoom.currentTurn };
          const p0 = players.get(newRoom.players[0]);
          const p1 = players.get(newRoom.players[1]);
          if (p0) send(p0.ws, { ...baseMsg, partner: newRoom.players[1] });
          if (p1) send(p1.ws, { ...baseMsg, partner: newRoom.players[0] });
        }
        break;
      }

      case 'leave_room': {
        if (!myName) return;
        leaveRoom(myName);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!myName) return;
    leaveRoom(myName);
    players.delete(myName);
    broadcastLobby();
  });

  function leaveRoom(name) {
    const p = players.get(name);
    if (!p?.room) return;
    const room = rooms.get(p.room);
    if (room) {
      const partner = room.players.find(n => n !== name);
      const pp = players.get(partner);
      if (pp) { send(pp.ws, { type: 'partner_left' }); pp.status = 'lobby'; pp.room = null; }
      rooms.delete(p.room);
    }
    p.status = 'lobby'; p.room = null;
    broadcastLobby();
  }
});

console.log('🧠 Memorize WebSocket server running on ws://localhost:8080');
