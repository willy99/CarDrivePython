import { T } from './constants.js?v=10';
import { ARTIFACT_IDS } from './artifacts.js?v=10';

// Small seeded PRNG so each level's *shape* looks consistent run to run.
// (Mine placement still uses Math.random, so every replay differs.)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export class Board {
  constructor(level) {
    this.level = level;
    this.cols = level.cols;
    this.rows = level.rows;
    // fresh random seed every game → a brand-new map layout each play. The
    // seed is stored so the renderer (relief/grain/mountains) stays consistent
    // with the terrain carved here, and theme switches re-render the same map.
    this.seed = (Math.random() * 0x7fffffff) | 0;
    this.rng = mulberry32(this.seed);
    this.cells = [];
    this.mineCount = 0;
    this.minesPlaced = false;

    this._initShape();
    this._carveTerrain();
    this._pruneToMainComponent();
    this.landTotal = this.cells.filter(c => c.type === T.LAND).length;
  }

  idx(c, r) { return r * this.cols + c; }
  inB(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }
  get(c, r) { return this.inB(c, r) ? this.cells[this.idx(c, r)] : null; }

  // ── shape mask ──────────────────────────────────────────────────────────
  _initShape() {
    const { cols, rows } = this;
    const shape = this.level.shape || 'rect';
    const cx = cols / 2, cy = rows / 2;
    const rx = cols / 2, ry = rows / 2;
    // angular radius modulation for organic blobs
    const bumps = Array.from({ length: 8 }, () => 0.6 + this.rng() * 0.4);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = T.LAND;
        if (shape !== 'rect') {
          const ang = Math.atan2(r + 0.5 - cy, c + 0.5 - cx);
          const k = ((ang + Math.PI) / (2 * Math.PI)) * bumps.length;
          const i0 = Math.floor(k) % bumps.length;
          const frac = k - Math.floor(k);
          const rad = bumps[i0] * (1 - frac) + bumps[(i0 + 1) % bumps.length] * frac;
          const d = Math.hypot((c + 0.5 - cx) / rx, (r + 0.5 - cy) / ry);
          if (d > rad) type = T.VOID;
        }
        this.cells.push({ c, r, type, mine: false, adj: 0, revealed: false, flagged: false });
      }
    }
  }

  _landCells() { return this.cells.filter(c => c.type === T.LAND); }
  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  // ── terrain features (progressive per level) ──────────────────────────────
  _carveTerrain() {
    const ter = this.level.terrain || {};
    if (ter.river) this._carveRiver();
    if (ter.lake) for (let i = 0; i < ter.lake; i++) this._carveBlobOf(T.WATER, 1 + Math.floor(this.rng() * 2));
    if (ter.sea) this._carveSea();
    if (ter.mountains) for (let i = 0; i < ter.mountains; i++) this._carveBlobOf(T.MOUNTAIN, 1 + Math.floor(this.rng() * 2));
    if (ter.trees) this._scatter(T.TREE, ter.trees);
    if (ter.paths) this._carvePaths(ter.paths);
    this._scatterArtifacts();
    this._scatterDevices();
  }

  // Place 0-2 special device cells on the field (wire-cutting mini-game triggers).
  // Device types + variant counts must mirror DEVICES in defusal.js.
  _scatterDevices() {
    const id = this.level.id || 99;
    if (id < 3) return;

    const DTYPES = [
      { id: 'svp_simple', vc: 3, minLv: 3  },
      { id: 'timer_bomb', vc: 3, minLv: 10 },
      { id: 'radio_ied',  vc: 2, minLv: 19 },
      { id: 'mm_t1',      vc: 2, minLv: 5  },
      { id: 'mm_t2',      vc: 2, minLv: 15 },
      { id: 'mm_t3',      vc: 2, minLv: 22 },
      { id: 'mm_t4',      vc: 2, minLv: 27 },
    ];
    const types = DTYPES.filter(d => id >= d.minLv);
    if (!types.length) return;

    let count = 1;
    if (id < 10 && this.rng() < 0.5) count = 0;  // 50% chance on early levels
    if (id >= 28 && this.rng() < 0.4) count = 2;  // occasional 2nd on mega maps
    if (!count) return;

    const cands = this._landCells().filter(c => !c.artifact);
    for (let i = 0; i < Math.min(count, cands.length); i++) {
      const ci = Math.floor(this.rng() * cands.length);
      const cell = cands.splice(ci, 1)[0];
      const dt = types[Math.floor(this.rng() * types.length)];
      cell.device = { type: dt.id, variantIdx: Math.floor(this.rng() * dt.vc) };
    }
  }

  // Dirt tracks that meander across the map — walkable like LAND, faster feel.
  _carvePaths(count) {
    for (let p = 0; p < count; p++) {
      const land = this.cells.filter(c => c.type === T.LAND);
      if (!land.length) return;
      const start = this._pick(land);
      const horiz = this.rng() < 0.5;
      let c = start.c, r = start.r;
      const steps = Math.floor((horiz ? this.cols : this.rows) * (0.5 + this.rng() * 0.35));
      for (let i = 0; i < steps; i++) {
        const cell = this.get(c, r);
        if (cell && cell.type === T.LAND) cell.type = T.PATH;
        if (horiz) { c++; if (this.rng() < 0.22) r += this.rng() < 0.5 ? 1 : -1; }
        else        { r++; if (this.rng() < 0.22) c += this.rng() < 0.5 ? 1 : -1; }
        c = Math.max(0, Math.min(this.cols - 1, c));
        r = Math.max(0, Math.min(this.rows - 1, r));
        if (!this.inB(c, r)) break;
      }
    }
  }

  // Always drop 1-3 artifacts per level (was 0-2).
  _scatterArtifacts() {
    let n = 1;
    if (this.rng() < 0.55) n++;
    if (n === 2 && this.rng() < 0.30) n++;
    for (let i = 0; i < n; i++) {
      const land = this._landCells().filter(c => !c.artifact);
      if (land.length < 6) return;
      const cell = this._pick(land);
      if (cell) cell.artifact = ARTIFACT_IDS[Math.floor(this.rng() * ARTIFACT_IDS.length)];
    }
  }

  _carveRiver() {
    // a single meandering river that stays ORTHOGONALLY connected (no diagonal
    // gaps), so the renderer's corner-rounding turns the staircase into a
    // smooth natural ribbon. At each bend the elbow cell is carved too.
    const wide = this.rng() < 0.25;
    const rowCols = []; // rowCols[r] = water columns carved at row r
    const carve = (cc, r) => {
      const cell = this.get(cc, r);
      if (cell && cell.type === T.LAND) { cell.type = T.WATER; (rowCols[r] || (rowCols[r] = [])).push(cc); }
    };
    let c = 2 + Math.floor(this.rng() * Math.max(1, this.cols - 4));
    const maxC = () => this.cols - 1 - (wide ? 1 : 0);
    for (let r = 0; r < this.rows; r++) {
      carve(c, r); if (wide) carve(c + 1, r);
      if (r < this.rows - 1) {
        const m = this.rng();
        let nc = c;
        if (m < 0.34) nc = c - 1; else if (m > 0.66) nc = c + 1;
        nc = Math.max(1, Math.min(maxC(), nc));
        if (nc !== c) { // carve the bend so both columns of the elbow connect
          const lo = Math.min(c, nc), hi = Math.max(c, nc);
          carve(lo, r); carve(hi, r); if (wide) { carve(lo + 1, r); carve(hi + 1, r); }
        }
        c = nc;
      }
    }
    // rows where the river has LAND on both banks → a bridge there is crossable
    const sites = [];
    for (let r = 0; r < this.rows; r++) {
      const cols = rowCols[r];
      if (!cols || !cols.length) continue;
      const left = this.get(Math.min(...cols) - 1, r);
      const right = this.get(Math.max(...cols) + 1, r);
      if (left && left.type === T.LAND && right && right.type === T.LAND) sites.push(r);
    }
    // at least one bridge, two on a long river; each spans the WHOLE width so
    // there's never a half-bridge that dead-ends in the water.
    const n = sites.length > 7 ? 2 : 1;
    for (let i = 0; i < n && sites.length; i++) {
      const r = sites.splice(Math.floor(this.rng() * sites.length), 1)[0];
      for (const cc of rowCols[r]) { const cell = this.get(cc, r); if (cell) cell.type = T.BRIDGE; }
      for (let k = sites.length - 1; k >= 0; k--) if (Math.abs(sites[k] - r) < 2) sites.splice(k, 1);
    }
  }

  _carveBlobOf(type, radius) {
    const land = this._landCells();
    if (!land.length) return;
    const seed = this._pick(land);
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.hypot(dc, dr) > radius + 0.3) continue;
        const cell = this.get(seed.c + dc, seed.r + dr);
        if (cell && cell.type === T.LAND) cell.type = type;
      }
    }
  }

  _carveSea() {
    // turn the void rim around the land into ocean for an island look
    const toSea = [];
    for (const cell of this.cells) {
      if (cell.type !== T.VOID) continue;
      if (DIRS8.some(([dc, dr]) => { const n = this.get(cell.c + dc, cell.r + dr); return n && n.type !== T.VOID; }))
        toSea.push(cell);
    }
    toSea.forEach(c => { c.type = T.WATER; });
  }

  _scatter(type, n) {
    for (let i = 0; i < n; i++) {
      const land = this._landCells();
      if (!land.length) return;
      this._pick(land).type = type;
    }
  }

  // ── keep only the largest connected walkable region ──────────────────────
  _isStandableType(cell) { return cell && (cell.type === T.LAND || cell.type === T.BRIDGE || cell.type === T.PATH); }

  _pruneToMainComponent() {
    const seen = new Array(this.cells.length).fill(false);
    let best = [];
    for (const start of this.cells) {
      if (!this._isStandableType(start) || seen[this.idx(start.c, start.r)]) continue;
      const comp = [];
      const stack = [start];
      seen[this.idx(start.c, start.r)] = true;
      while (stack.length) {
        const cur = stack.pop();
        comp.push(cur);
        for (const [dc, dr] of DIRS4) {
          const n = this.get(cur.c + dc, cur.r + dr);
          if (n && this._isStandableType(n) && !seen[this.idx(n.c, n.r)]) {
            seen[this.idx(n.c, n.r)] = true;
            stack.push(n);
          }
        }
      }
      if (comp.length > best.length) best = comp;
    }
    const keep = new Set(best.map(c => this.idx(c.c, c.r)));
    for (const cell of this.cells) {
      if (this._isStandableType(cell) && !keep.has(this.idx(cell.c, cell.r))) {
        cell.type = cell.type === T.BRIDGE ? T.WATER : T.VOID;
      }
    }
  }

  // ── mines ─────────────────────────────────────────────────────────────────
  placeMines(safeC, safeR) {
    const safe = new Set();
    // Safe zone: start cell + 8 neighbours
    safe.add(this.idx(safeC, safeR));
    for (const [dc, dr] of DIRS8) {
      if (this.inB(safeC + dc, safeR + dr)) safe.add(this.idx(safeC + dc, safeR + dr));
    }
    // Protect land cells directly touching bridges — mines there make bridges uncrossable
    for (const cell of this.cells) {
      if (cell.type === T.BRIDGE) {
        for (const [dc, dr] of DIRS4) {
          const n = this.get(cell.c + dc, cell.r + dr);
          if (n && n.type === T.LAND) safe.add(this.idx(n.c, n.r));
        }
      }
    }
    const candidates = this._landCells().filter(c => c.type === T.LAND && !safe.has(this.idx(c.c, c.r)) && !c.artifact && !c.device);
    let count = Math.round((this.level.density || 0.15) * this.landTotal);
    count = Math.max(1, Math.min(count, candidates.length));

    // Re-roll until every non-mine cell is physically reachable from the safe start.
    // noGuess levels additionally require the layout to be logically solvable by
    // single-cell constraint propagation (no guessing). Attempt budget is higher
    // to avoid unnecessary mine-count reduction on those levels.
    // Worst case: count reaches 0 → first reveal opens everything → always found.
    const noGuess = !!this.level.noGuess;
    const maxAttempts = noGuess ? 200 : 40;
    let found = false;
    while (!found && count >= 0) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        for (const c of candidates) c.mine = false;
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        for (let i = 0; i < count; i++) candidates[i].mine = true;
        if (this._allSafeReachable(safeC, safeR) &&
            (!noGuess || this._isSolvable(safeC, safeR))) { found = true; break; }
      }
      if (!found) count--;
    }
    this.mineCount = Math.max(0, count);
    this.minesPlaced = true;
    this._computeAdj();
    this._relocateDevices();
  }

  // After mines are placed, move any device cells that have no adjacent mines
  // to positions that ARE adjacent to at least one mine, so the player is
  // guaranteed to encounter the device on the way through the field.
  _relocateDevices() {
    const devCells = this.cells.filter(c => c.device);
    if (!devCells.length) return;
    // Candidate target cells: land, unrevealed, not mined, not artifact, adj > 0
    const mineEdge = this.cells.filter(c =>
      c.type === T.LAND && !c.mine && !c.revealed && !c.artifact && !c.device && c.adj > 0
    );
    if (!mineEdge.length) return;
    for (const devCell of devCells) {
      if (devCell.adj > 0) continue; // already touches a mine, keep in place
      const i = Math.floor(Math.random() * mineEdge.length);
      const tgt = mineEdge[i];
      tgt.device = devCell.device;
      devCell.device = null;
      mineEdge.splice(i, 1); // don't assign two devices to the same cell
    }
  }

  // BFS over non-mine land + bridges (4-connected) from the safe start: true iff
  // every cell that still has to be cleared can be walked to.
  _allSafeReachable(sc, sr) {
    const seen = new Set([this.idx(sc, sr)]);
    const q = [this.get(sc, sr)];
    while (q.length) {
      const cur = q.shift();
      for (const [dc, dr] of DIRS4) {
        const n = this.get(cur.c + dc, cur.r + dr);
        if (!n || seen.has(this.idx(n.c, n.r))) continue;
        if (n.type === T.BRIDGE || n.type === T.PATH || (n.type === T.LAND && !n.mine)) {
          seen.add(this.idx(n.c, n.r)); q.push(n);
        }
      }
    }
    return this.cells.every(c => c.type !== T.LAND || c.mine || seen.has(this.idx(c.c, c.r)));
  }

  // Simulate single-cell constraint propagation from the first-click cascade.
  // Returns true iff a perfect player can deduce every cell without guessing.
  // Called only when level.noGuess is set, before _computeAdj() runs, so adj is
  // computed locally here rather than read from cell.adj.
  _isSolvable(safeC, safeR) {
    const adjOf = cell => {
      let n = 0;
      for (const [dc, dr] of DIRS8) {
        const nb = this.get(cell.c + dc, cell.r + dr);
        if (nb && nb.type === T.LAND && nb.mine) n++;
      }
      return n;
    };

    // 0 = unknown, 1 = revealed-safe, 2 = flagged-mine
    const st = new Uint8Array(this.cols * this.rows);

    const floodReveal = (sc, sr) => {
      const stack = [this.get(sc, sr)];
      while (stack.length) {
        const cell = stack.pop();
        if (!cell || cell.type !== T.LAND || cell.mine || st[this.idx(cell.c, cell.r)] !== 0) continue;
        st[this.idx(cell.c, cell.r)] = 1;
        if (adjOf(cell) === 0) {
          for (const [dc, dr] of DIRS8) {
            const nb = this.get(cell.c + dc, cell.r + dr);
            if (nb) stack.push(nb);
          }
        }
      }
    };

    floodReveal(safeC, safeR);

    let progress = true;
    while (progress) {
      progress = false;
      for (const cell of this.cells) {
        if (cell.type !== T.LAND || cell.mine || st[this.idx(cell.c, cell.r)] !== 1) continue;
        const adj = adjOf(cell);
        const unknown = [];
        let mines = 0;
        for (const [dc, dr] of DIRS8) {
          const nb = this.get(cell.c + dc, cell.r + dr);
          if (!nb || nb.type !== T.LAND) continue;
          const s = st[this.idx(nb.c, nb.r)];
          if (s === 2) mines++;
          else if (s === 0) unknown.push(nb);
        }
        const rem = adj - mines;
        if (rem === unknown.length && unknown.length > 0) {
          for (const nb of unknown) st[this.idx(nb.c, nb.r)] = 2;
          progress = true;
        } else if (rem === 0 && unknown.length > 0) {
          for (const nb of unknown) floodReveal(nb.c, nb.r);
          progress = true;
        }
      }
    }

    return this.cells.every(c => c.type !== T.LAND || c.mine || st[this.idx(c.c, c.r)] === 1);
  }

  // Returns one representative cell per isolated region (connected component of safe
  // LAND cells unreachable by normal walking from (sc, sr)). One probe per region suffices.
  isolatedRegions(sc, sr) {
    // BFS from start to find the reachable set
    const reachable = new Set([this.idx(sc, sr)]);
    const q = [this.get(sc, sr)];
    while (q.length) {
      const cur = q.shift();
      for (const [dc, dr] of DIRS4) {
        const n = this.get(cur.c + dc, cur.r + dr);
        if (!n || reachable.has(this.idx(n.c, n.r))) continue;
        if (n.type === T.BRIDGE || (n.type === T.LAND && !n.mine)) {
          reachable.add(this.idx(n.c, n.r)); q.push(n);
        }
      }
    }
    // Flood-fill isolated cells into connected components; return one rep per component
    const unreached = this.cells.filter(c => (c.type === T.LAND) && !c.mine && !reachable.has(this.idx(c.c, c.r)));
    const componentSeen = new Set();
    const reps = [];
    for (const seed of unreached) {
      const key = this.idx(seed.c, seed.r);
      if (componentSeen.has(key)) continue;
      reps.push(seed); // representative for this component
      const cq = [seed];
      componentSeen.add(key);
      while (cq.length) {
        const cur = cq.shift();
        for (const [dc, dr] of DIRS4) {
          const n = this.get(cur.c + dc, cur.r + dr);
          if (!n || componentSeen.has(this.idx(n.c, n.r))) continue;
          if (n.type === T.LAND && !n.mine) {
            componentSeen.add(this.idx(n.c, n.r)); cq.push(n);
          }
        }
      }
    }
    return reps;
  }

  _computeAdj() {
    for (const cell of this.cells) {
      if (cell.type !== T.LAND) continue;
      let n = 0;
      for (const [dc, dr] of DIRS8) {
        const nb = this.get(cell.c + dc, cell.r + dr);
        if (nb && nb.type === T.LAND && nb.mine) n++;
      }
      cell.adj = n;
    }
  }

  // ── reveal (flood) ──────────────────────────────────────────────────────
  reveal(c, r) {
    const start = this.get(c, r);
    if (!start || start.type !== T.LAND || start.revealed || start.flagged) return [];
    const out = [];
    const stack = [start];
    while (stack.length) {
      const cell = stack.pop();
      if (cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      out.push(cell);
      if (cell.mine || cell.adj !== 0) continue;
      for (const [dc, dr] of DIRS8) {
        const nb = this.get(cell.c + dc, cell.r + dr);
        // Do not cascade into device cells — sapper must step on them deliberately
        if (nb && nb.type === T.LAND && !nb.revealed && !nb.flagged && !nb.device) stack.push(nb);
      }
    }
    return out;
  }

  // ── pathfinding for the sapper ───────────────────────────────────────────
  standable(cell) {
    return cell && (cell.type === T.BRIDGE || cell.type === T.PATH ||
      (cell.type === T.LAND && cell.revealed && !cell.flagged));
  }

  // BFS over already-cleared ground; the target may be a hidden land cell that
  // is orthogonally adjacent to cleared ground. Returns [[c,r],…] or null.
  pathTo(sc, sr, tc, tr) {
    if (sc === tc && sr === tr) return [[tc, tr]];
    const prev = new Map();
    const k0 = this.idx(sc, sr);
    prev.set(k0, null);
    const q = [[sc, sr]];
    while (q.length) {
      const [cc, rr] = q.shift();
      for (const [dc, dr] of DIRS4) {
        const nc = cc + dc, nr = rr + dr;
        if (!this.inB(nc, nr)) continue;
        const k = this.idx(nc, nr);
        if (prev.has(k)) continue;
        if (nc === tc && nr === tr) {
          prev.set(k, [cc, rr]);
          return this._reconstruct(prev, [tc, tr]);
        }
        if (this.standable(this.get(nc, nr))) {
          prev.set(k, [cc, rr]);
          q.push([nc, nr]);
        }
      }
    }
    return null;
  }

  // Path for the UGV: rides over ANY land/bridge/path (mines + flags included), so
  // it can cross a mine wall to a cut-off cell. Water/rock/forest still block.
  pathCross(sc, sr, tc, tr) {
    if (sc === tc && sr === tr) return [[tc, tr]];
    const ok = cell => cell && (cell.type === T.LAND || cell.type === T.BRIDGE || cell.type === T.PATH);
    const prev = new Map();
    prev.set(this.idx(sc, sr), null);
    const q = [[sc, sr]];
    while (q.length) {
      const [cc, rr] = q.shift();
      for (const [dc, dr] of DIRS4) {
        const nc = cc + dc, nr = rr + dr;
        if (!this.inB(nc, nr)) continue;
        const k = this.idx(nc, nr);
        if (prev.has(k)) continue;
        const cell = this.get(nc, nr);
        if (nc === tc && nr === tr) {
          if (!ok(cell)) return null;
          prev.set(k, [cc, rr]);
          return this._reconstruct(prev, [tc, tr]);
        }
        if (ok(cell)) { prev.set(k, [cc, rr]); q.push([nc, nr]); }
      }
    }
    return null;
  }

  _reconstruct(prev, end) {
    const path = [];
    let cur = end;
    while (cur) {
      path.push(cur);
      cur = prev.get(this.idx(cur[0], cur[1]));
    }
    return path.reverse();
  }

  // ── status helpers ───────────────────────────────────────────────────────
  flagCount() { return this.cells.filter(c => c.flagged).length; }

  isWon() {
    return this.cells.every(c => c.type !== T.LAND || c.mine || c.revealed);
  }

  revealAllMines() {
    for (const c of this.cells) if (c.type === T.LAND && c.mine) c.revealed = true;
  }
}
