// ── Ambush mission: enemy AI with heatmap-aware A* pathfinding ───────────────
import { T } from './constants.js?v=10';

const DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];

// Per-tier danger weight applied to heatmap cells in A* cost
const TIER_DANGER = [0, 22, 65, 150];
// How far mine danger spreads (Chebyshev radius) when an enemy is killed
const TIER_SPREAD = [0, 1, 2, 3];
// Baseline danger added to bridge approaches per tier (smarter = more cautious at chokepoints)
const TIER_BASE   = [0, 0.0, 0.1, 0.2];
// How strongly enemies "sense" mine positions before stepping on them (pre-launch awareness)
// dangerW * TIER_AWARENESS = max extra cost enemy will pay to avoid a mine
// Tier 1: avoids if detour ≤ 7 steps  Tier 2: ≤ 26  Tier 3: ≤ 75
const TIER_AWARENESS  = [0, 0.30, 0.40, 0.50];
// Sensing radius around each mine (Chebyshev) — enemies get partial danger from nearby mines
const TIER_SENSE_RAD  = [0, 1, 2, 3];
// Per-enemy path jitter: small random cost added so enemies diverge instead of all clumping
const TIER_JITTER     = [0, 1.8, 1.2, 0.6];

// ── A* ───────────────────────────────────────────────────────────────────────
// Returns array of {c, r} steps (NOT including start cell), or null if unreachable.
// jitter: per-enemy random noise added to movement cost so enemies diverge
function aStar(sc, sr, board, exitSet, heatmap, dangerW, jitter) {
  const { cols, rows } = board;
  const N = cols * rows;
  // Use same row-major indexing as board.idx(c, r) = r * cols + c
  const key = (c, r) => r * cols + c;

  // Manhattan heuristic to nearest exit
  const h = (c, r) => {
    let min = Infinity;
    for (const k of exitSet) {
      const ec = k % cols, er = (k / cols) | 0;
      const d = Math.abs(c - ec) + Math.abs(r - er);
      if (d < min) min = d;
    }
    return min;
  };

  const gScore   = new Float32Array(N).fill(Infinity);
  const cameFrom = new Int32Array(N).fill(-1);
  const inOpen   = new Uint8Array(N);

  const startK = key(sc, sr);
  gScore[startK] = 0;

  // Simple sorted open list (map size is small enough)
  const open = [{ k: startK, f: h(sc, sr) }];
  inOpen[startK] = 1;

  while (open.length) {
    // Pop lowest f
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const ck = open.splice(bi, 1)[0].k;
    inOpen[ck] = 0;

    if (exitSet.has(ck)) {
      // Reconstruct (skip start)
      const path = [];
      let k = ck;
      while (cameFrom[k] !== -1) {
        path.unshift({ c: k % cols, r: (k / cols) | 0 });
        k = cameFrom[k];
      }
      return path;
    }

    const cc = ck % cols, cr = (ck / cols) | 0;
    for (const [dc, dr] of DIRS4) {
      const nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nk = key(nc, nr);
      const nb = board.cells[nk];
      if (!nb || (nb.type !== T.LAND && nb.type !== T.BRIDGE && nb.type !== T.PATH)) continue;

      const ng = gScore[ck] + 1 + heatmap[nk] * dangerW + (jitter > 0 ? (Math.random() * jitter) : 0);
      if (ng < gScore[nk]) {
        gScore[nk] = ng;
        cameFrom[nk] = ck;
        const fv = ng + h(nc, nr);
        if (!inOpen[nk]) { open.push({ k: nk, f: fv }); inOpen[nk] = 1; }
        else { for (const x of open) { if (x.k === nk) { x.f = fv; break; } } }
      }
    }
  }
  return null;
}

// ── Enemy ────────────────────────────────────────────────────────────────────
export class Enemy {
  constructor(id, spawnC, spawnR, squad) {
    this.id      = id;
    this.c       = spawnC; this.r = spawnR;
    this.squad   = squad;
    this.alive   = true;
    this.reached = false;
    this.path    = [];   // [{c,r}] remaining steps
    this.pathI   = 0;

    // Smooth animation
    this.px      = spawnC; this.pr = spawnR;   // visual position (fractional)
    this.prevC   = spawnC; this.prevR = spawnR;
    this.animT   = 1.0;   // 0 = step just started, 1 = arrived at cell
    this.stepDur = 0.5;   // seconds per cell
    this.waitT   = 0;     // delay before first step (stagger)
  }

  computePath() {
    const p = aStar(this.c, this.r, this.squad.board, this.squad.exitSet,
                    this.squad.heatmap, this.squad.dangerW, this.jitter || 0);
    this.path  = p || [];
    this.pathI = 0;
  }

  // Called every frame; returns 'mine' | 'exit' | 'step' | null
  tick(dt) {
    if (!this.alive || this.reached) return null;

    // Animate current step
    if (this.animT < 1.0) {
      this.animT = Math.min(1.0, this.animT + dt / this.stepDur);
      this.px = this.prevC + (this.c - this.prevC) * this.animT;
      this.pr = this.prevR + (this.r - this.prevR) * this.animT;
      return null;
    }

    // Stagger / cooldown
    if (this.waitT > 0) { this.waitT = Math.max(0, this.waitT - dt); return null; }

    // Take next step
    if (this.pathI >= this.path.length) {
      // Re-route (heatmap may have changed)
      this.computePath();
      if (this.pathI >= this.path.length) { this.waitT = 0.8; return null; }
    }

    const next = this.path[this.pathI++];
    this.prevC = this.c; this.prevR = this.r;
    this.c = next.c; this.r = next.r;
    this.animT = 0;

    const board = this.squad.board;
    const k = board.idx(this.c, this.r);

    // Reached exit?
    if (this.squad.exitSet.has(k)) {
      this.reached = true; this.animT = 1.0;
      this.px = this.c; this.pr = this.r;
      return 'exit';
    }

    // Hit mine?
    const cell = board.cells[k];
    if (cell && cell.mine) {
      this.alive = false; this.animT = 1.0;
      this.px = this.c; this.pr = this.r;
      this.squad.onMineTrigger(this.c, this.r);
      return 'mine';
    }

    return 'step';
  }
}

// ── AmbushSquad ──────────────────────────────────────────────────────────────
export class AmbushSquad {
  constructor(board, level) {
    this.board   = board;
    this.level   = level;
    this.tier    = level.aiTier || 1;
    this.dangerW = TIER_DANGER[this.tier];
    this.enemies = [];

    const N = board.cols * board.rows;
    this.heatmap = new Float32Array(N);

    // Exit set: cell indices of all ambushExit cells
    this.exitSet = new Set();
    for (const cell of board.cells) {
      if (cell.ambushExit) this.exitSet.add(board.idx(cell.c, cell.r));
    }

    // Baseline danger at bridges and their approaches (higher tier = more cautious)
    const base = TIER_BASE[this.tier];
    if (base > 0) {
      for (const cell of board.cells) {
        if (cell.type !== T.BRIDGE) continue;
        const bi = board.idx(cell.c, cell.r);
        this.heatmap[bi] = Math.max(this.heatmap[bi], base * 1.5);
        for (const [dc, dr] of DIRS4) {
          const nb = board.get(cell.c + dc, cell.r + dr);
          if (nb && nb.type === T.LAND) {
            const ni = board.idx(nb.c, nb.r);
            this.heatmap[ni] = Math.max(this.heatmap[ni], base);
          }
        }
      }
    }
  }

  spawnEnemies(stagger = 0.9) {
    // Pre-populate heatmap from mine positions so enemies partially "sense" danger
    const awareness = TIER_AWARENESS[this.tier];
    const senseRad  = TIER_SENSE_RAD[this.tier];
    if (awareness > 0) {
      for (const cell of this.board.cells) {
        if (!cell.mine) continue;
        const mi = this.board.idx(cell.c, cell.r);
        this.heatmap[mi] = Math.max(this.heatmap[mi], awareness);
        for (let dc = -senseRad; dc <= senseRad; dc++) {
          for (let dr = -senseRad; dr <= senseRad; dr++) {
            if (!dc && !dr) continue;
            const nb = this.board.get(cell.c + dc, cell.r + dr);
            if (!nb || (nb.type !== T.LAND && nb.type !== T.BRIDGE && nb.type !== T.PATH)) continue;
            const dist = Math.max(Math.abs(dc), Math.abs(dr));
            const ni = this.board.idx(nb.c, nb.r);
            this.heatmap[ni] = Math.max(this.heatmap[ni], awareness * 0.35 / dist);
          }
        }
      }
    }

    const jitter   = TIER_JITTER[this.tier];
    const spawns   = this.board.ambushSpawns || [];
    const total    = this.board.ambushEnemyCount || spawns.length;
    if (!spawns.length) return;

    this.enemies = [];
    for (let i = 0; i < total; i++) {
      const sp = spawns[i % spawns.length];      // cycle if fewer spawns than enemies
      const e  = new Enemy(i, sp.c, sp.r, this);
      e.waitT  = i * stagger;
      e.jitter = jitter * (0.5 + Math.random()); // unique jitter → diverging paths
      e.computePath();
      this.enemies.push(e);
    }
  }

  // Called when an enemy hits a mine at (c, r)
  onMineTrigger(c, r) {
    const { board } = this;
    // Set very high so A* cost (1 + heatmap * dangerW) is enormous — effectively blocks the cell
    this.heatmap[board.idx(c, r)] = 999.0;

    const spreadR = TIER_SPREAD[this.tier];
    for (let dc = -spreadR; dc <= spreadR; dc++) {
      for (let dr = -spreadR; dr <= spreadR; dr++) {
        if (!dc && !dr) continue;
        const nb = board.get(c + dc, r + dr);
        if (!nb || (nb.type !== T.LAND && nb.type !== T.BRIDGE && nb.type !== T.PATH)) continue;
        const dist = Math.max(Math.abs(dc), Math.abs(dr));
        const ni = board.idx(nb.c, nb.r);
        this.heatmap[ni] = Math.min(1.0, this.heatmap[ni] + 0.5 / dist);
      }
    }

    // Survivors re-route around the danger zone
    for (const e of this.enemies) {
      if (e.alive && !e.reached) e.computePath();
    }
  }

  tick(dt) {
    const events = [];
    for (const e of this.enemies) {
      const ev = e.tick(dt);
      if (ev) events.push({ enemy: e, type: ev });
    }
    return events;
  }

  get allDone()      { return this.enemies.every(e => !e.alive || e.reached); }
  get deadCount()    { return this.enemies.filter(e => !e.alive).length; }
  get reachedCount() { return this.enemies.filter(e => e.reached).length; }
}
