// Cloudflare Durable Object — Memorize Pairs Battle WebSocket server
// Uses Hibernation WebSocket API (required for new_sqlite_classes):
//   - ctx.acceptWebSocket()  instead of server.accept() + addEventListener
//   - webSocketMessage / webSocketClose / webSocketError methods
//   - Player state stored in WS attachments (survives hibernation)
//   - Room state stored in SQLite via ctx.storage (survives hibernation)

const COLLECTIONS = {
  classic:  ['duck','ball','star','heart','diamond','crown','rocket','moon',
             'flower','butterfly','apple','cloud','fish','mushroom','snowflake','sun',
             'turtle','balloon','icecream','lightning','planet','gift','cat','tree'],
  animals:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦄','🐴','🐗','🐺','🦓','🦒'],
  sealife:  ['🐠','🐟','🐡','🦈','🐙','🦑','🦐','🦞','🦀','🐬','🐳','🐋','🐢','🐊','🦭','🐚','🦦','🪼','🦩','🦆','🦢','🐸','🦫','🪸'],
  fruits:   ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽'],
  food:     ['🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥞','🧇','🥓','🍗','🍖','🥨','🧀','🥗','🍝','🍜','🍣','🍱','🍙'],
  sweets:   ['🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍡','🥮','🥠','🍢','🧋','🍵','🌰','🥜','🍓','🫐'],
  flora:    ['🌸','🌹','🌺','🌻','🌷','🌼','💐','🏵️','🌳','🌲','🌴','🌵','🌿','🍀','🍁','🍂','🍃','🌱','🪴','🌾','🪷','🍄','🎍','🌰'],
  kitchen:  ['🍴','🥄','🔪','🍳','🥘','🫕','🍲','🥣','🥢','🧂','🫖','🍵','☕','🥤','🧋','🍶','🍽️','🧊','🧈','🧇','🍞','🥖','🥡','🧁'],
  devices:  ['💻','🖥️','⌨️','🖱️','🖨️','📱','☎️','📞','📟','📠','📷','📹','🎥','📺','📻','🎙️','⏰','⌚','🔋','🔌','💡','🔦','🧮','🎮'],
  transport:['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','✈️','🚀','🚁','⛵','🚤','🚢','🚂'],
  sports:   ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥅','🏒','🏑','🥍','🏏','⛳','🏹','🎣','🥊','🥋','🎽','⛸️'],
  smileys:  ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😋','😜','🤪','😎','🤩','🥳','😏'],
  funpoop:  ['💩','😈','👿','👹','👺','🤡','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🤓','🥶'],
  cats:     ['😺','😸','😹','😻','😼','😽','🙀','😿','😾','🐱','🐈','🐈‍⬛','🦁','🐯','🐅','🐆'],
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ── Game room (plain data, JSON-serializable) ────────────────────────────────
function makeRoom(id, p1, p2, gridSize, collection) {
  const col = COLLECTIONS[collection] ? collection : 'classic';
  const [cols, rows] = gridSize.split('x').map(Number);
  const pairCount = (rows * cols) / 2;
  const pool = shuffle(COLLECTIONS[col]).slice(0, pairCount);
  const total = rows * cols;
  return {
    id, players: [p1, p2], gridSize, collection: col,
    cards: shuffle([...pool, ...pool]),
    revealed:  new Array(total).fill(false),
    matched:   new Array(total).fill(false),
    holeCount: new Array(total).fill(0),
    scores: { [p1]: { pairs:0, holes:0, holePenalty:0 }, [p2]: { pairs:0, holes:0, holePenalty:0 } },
    currentTurn: p1, flipBuffer: [], rematchVotes: [],
  };
}

function roomFlipCard(room, by, index) {
  if (room.currentTurn !== by)     return { error: 'not your turn' };
  if (room.matched[index])          return { error: 'already matched' };
  if (room.revealed[index])         return { error: 'already revealed' };
  if (room.flipBuffer.length >= 2)  return { error: 'buffer full' };

  room.revealed[index] = true;
  room.flipBuffer.push(index);

  if (room.flipBuffer.length === 2) {
    const [i1, i2] = room.flipBuffer;
    if (room.cards[i1] === room.cards[i2]) {
      room.matched[i1] = room.matched[i2] = true;
      room.revealed[i1] = room.revealed[i2] = true;
      room.scores[by].pairs++;
      room.flipBuffer = [];
      const gameOver = room.matched.every(Boolean);
      return { type: 'pair_found', indices: [i1, i2], by, scores: room.scores,
               nextTurn: by, gameOver };
    }
    room.holeCount[i1]++; room.holeCount[i2]++;
    room.scores[by].holes++;
    room.scores[by].holePenalty += room.holeCount[i1] + room.holeCount[i2];
    return { type: 'no_match', indices: [i1, i2], by, scores: room.scores };
  }
  return { type: 'card_revealed', index, object: room.cards[index], by };
}

function roomHideCards(room, indices) {
  for (const i of indices) room.revealed[i] = false;
  room.flipBuffer = [];
  const idx = room.players.indexOf(room.currentTurn);
  room.currentTurn = room.players[(idx + 1) % 2];
}

function roomGetWinner(room) {
  const net = p => room.scores[p].pairs * 10 - room.scores[p].holePenalty;
  const [p1, p2] = room.players;
  const n1 = net(p1), n2 = net(p2);
  return n1 > n2 ? p1 : n2 > n1 ? p2 : null;
}

// ── Durable Object ───────────────────────────────────────────────────────────
export class GameServer {
  constructor(state, env) {
    this.ctx = state;
    this._pendingInvites = new Map(); // ephemeral — lost on hibernate, acceptable
  }

  // ── Player helpers (stored in WS attachment, survives hibernate) ──────────
  _att(ws)            { return ws.deserializeAttachment() || {}; }
  _nameOf(ws)         { return this._att(ws).name; }
  _setAtt(ws, patch)  { ws.serializeAttachment({ ...this._att(ws), ...patch }); }

  // Rebuild players map from all active WS attachments
  get _players() {
    const map = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      const att = this._att(ws);
      if (att.name) map.set(att.name, { ws, ...att });
    }
    return map;
  }

  // ── Room helpers (stored in SQLite, survives hibernate) ───────────────────
  async _getRoom(id)     { return (await this.ctx.storage.get(`room:${id}`)) || null; }
  async _saveRoom(room)  { await this.ctx.storage.put(`room:${room.id}`, room); }
  async _delRoom(id)     { await this.ctx.storage.delete(`room:${id}`); }

  // ── WebSocket lifecycle (Hibernation API) ─────────────────────────────────
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    await this._handle(ws, msg);
  }

  async webSocketClose(ws)  { await this._disconnect(ws); }
  async webSocketError(ws)  { await this._disconnect(ws); }

  // ── Broadcast helpers ─────────────────────────────────────────────────────
  _send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch {} }

  _broadcastRoom(room, obj) {
    const players = this._players;
    for (const name of room.players) {
      const p = players.get(name);
      if (p) this._send(p.ws, obj);
    }
  }

  _broadcastLobby() {
    const players = this._players;
    const list = [...players.values()].map(p => ({ name: p.name, status: p.status }));
    for (const p of players.values()) {
      if (p.status === 'lobby') {
        this._send(p.ws, { type: 'players', list: list.filter(x => x.name !== p.name) });
      }
    }
  }

  // ── Message router ────────────────────────────────────────────────────────
  async _handle(ws, msg) {
    switch (msg.type) {

      case 'register': {
        const name = String(msg.username ?? '').trim().slice(0, 20);
        if (!name) { this._send(ws, { type: 'error', msg: 'Name required' }); return; }
        if (this._players.has(name)) { this._send(ws, { type: 'error', msg: 'Name taken' }); return; }
        this._setAtt(ws, { name, status: 'lobby', room: null });
        this._send(ws, { type: 'registered', username: name });
        this._broadcastLobby();
        break;
      }

      case 'invite': {
        const myName = this._nameOf(ws);
        if (!myName) return;
        const players = this._players;
        const tp = players.get(msg.target);
        if (!tp || tp.status !== 'lobby') { this._send(ws, { type: 'error', msg: 'Player unavailable' }); return; }
        const inviteId = `i${Date.now()}`;
        const collection = COLLECTIONS[msg.collection] ? msg.collection : 'classic';
        this._pendingInvites.set(inviteId, { from: myName, to: msg.target, gridSize: msg.gridSize || '4x4', collection });
        this._send(tp.ws, { type: 'invite', from: myName, inviteId, gridSize: msg.gridSize || '4x4', collection });
        setTimeout(() => {
          if (!this._pendingInvites.has(inviteId)) return;
          this._pendingInvites.delete(inviteId);
          const ps = this._players;
          const fp = ps.get(myName);  if (fp) this._send(fp.ws, { type: 'invite_expired' });
          const tp2 = ps.get(msg.target); if (tp2) this._send(tp2.ws, { type: 'invite_expired' });
        }, 30_000);
        break;
      }

      case 'invite_response': {
        const myName = this._nameOf(ws);
        if (!myName) return;
        const inv = this._pendingInvites.get(msg.inviteId);
        if (!inv || inv.to !== myName) return;
        this._pendingInvites.delete(msg.inviteId);
        const players = this._players;
        const fromP = players.get(inv.from);
        if (!fromP) return;
        if (!msg.accepted) { this._send(fromP.ws, { type: 'invite_declined', from: myName }); return; }

        const roomId = `r${Date.now()}`;
        const room = makeRoom(roomId, inv.from, myName, inv.gridSize, inv.collection);
        await this._saveRoom(room);

        this._setAtt(fromP.ws, { status: 'playing', room: roomId });
        this._setAtt(ws,        { status: 'playing', room: roomId });

        const base = { type:'game_start', gridSize:inv.gridSize, collection:room.collection,
                       cards:room.cards, scores:room.scores, firstTurn:room.currentTurn };
        this._send(fromP.ws, { ...base, partner: myName });
        this._send(ws,        { ...base, partner: inv.from });
        this._broadcastLobby();
        break;
      }

      case 'card_flip': {
        const myName = this._nameOf(ws);
        if (!myName) return;
        const att = this._att(ws);
        if (!att.room) return;
        const room = await this._getRoom(att.room);
        if (!room) return;

        const result = roomFlipCard(room, myName, msg.index);
        if (result.error) return;

        if (result.type === 'card_revealed') {
          await this._saveRoom(room);
          this._broadcastRoom(room, result);

        } else if (result.type === 'pair_found') {
          await this._saveRoom(room);
          this._broadcastRoom(room, { type:'card_revealed', index:msg.index, object:room.cards[msg.index], by:myName });
          const roomId = att.room;
          setTimeout(async () => {
            const r = await this._getRoom(roomId); if (!r) return;
            this._broadcastRoom(r, result);
            if (result.gameOver) {
              setTimeout(async () => {
                const r2 = await this._getRoom(roomId); if (!r2) return;
                this._broadcastRoom(r2, { type:'game_over', scores:r2.scores, winner:roomGetWinner(r2) });
              }, 600);
            }
          }, 450);

        } else if (result.type === 'no_match') {
          await this._saveRoom(room);
          this._broadcastRoom(room, { type:'card_revealed', index:msg.index, object:room.cards[msg.index], by:myName });
          const roomId = att.room;
          const noMatch = result;
          setTimeout(async () => {
            const r = await this._getRoom(roomId); if (!r) return;
            this._broadcastRoom(r, noMatch);
            setTimeout(async () => {
              const r2 = await this._getRoom(roomId); if (!r2) return;
              roomHideCards(r2, [...noMatch.indices]);
              await this._saveRoom(r2);
              this._broadcastRoom(r2, { type:'cards_hidden', indices:noMatch.indices });
              this._broadcastRoom(r2, { type:'turn_change',  player:r2.currentTurn });
            }, 900);
          }, 750);
        }
        break;
      }

      case 'rematch': {
        const myName = this._nameOf(ws);
        if (!myName) return;
        const att = this._att(ws);
        const room = att.room ? await this._getRoom(att.room) : null;
        if (!room) return;

        if (!room.rematchVotes.includes(myName)) room.rematchVotes.push(myName);
        await this._saveRoom(room);

        const partner = room.players.find(n => n !== myName);
        const pp = this._players.get(partner);
        if (pp) this._send(pp.ws, { type: 'rematch_offered', by: myName });

        if (room.rematchVotes.length === 2) {
          const next = makeRoom(room.id, room.players[0], room.players[1], room.gridSize, room.collection);
          await this._saveRoom(next);
          const players = this._players;
          const p0 = players.get(next.players[0]);
          const p1 = players.get(next.players[1]);
          const base = { type:'game_start', gridSize:next.gridSize, collection:next.collection,
                         cards:next.cards, scores:next.scores, firstTurn:next.currentTurn };
          if (p0) this._send(p0.ws, { ...base, partner: next.players[1] });
          if (p1) this._send(p1.ws, { ...base, partner: next.players[0] });
        }
        break;
      }
    }
  }

  // ── Disconnect cleanup ────────────────────────────────────────────────────
  async _disconnect(ws) {
    const att = this._att(ws);
    if (!att.name) return;
    // Clear attachment immediately so _players won't include this WS anymore
    // (the WS is still in ctx.getWebSockets() during the close handler)
    ws.serializeAttachment({});

    if (att.room) {
      const room = await this._getRoom(att.room);
      if (room) {
        const partner = room.players.find(n => n !== att.name);
        const pp = this._players.get(partner);
        if (pp) {
          this._send(pp.ws, { type: 'partner_left' });
          this._setAtt(pp.ws, { status: 'lobby', room: null });
        }
        await this._delRoom(att.room);
      }
    }

    this._broadcastLobby();
  }
}
