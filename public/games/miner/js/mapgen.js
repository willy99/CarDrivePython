import { T } from './constants.js';

// Seeded PRNG (matches board.js so a level's terrain + relief stay consistent).
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── height field over the (cols+1)×(rows+1) lattice of cell corners ────────
// Two octaves of value noise, then biased so water sits low and mountains high
// → contour lines naturally wrap the terrain the board placed.
export function buildHeightField(board) {
  const rng = mulberry32((board.seed ^ 0x2654a5b9) >>> 0);
  const W = board.cols + 1, H = board.rows + 1;
  const field = new Float32Array(W * H);

  const coarse = (step) => {
    const gw = Math.ceil(W / step) + 2, gh = Math.ceil(H / step) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rng();
    return (x, y) => {
      const gx = x / step, gy = y / step;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const fx = gx - x0, fy = gy - y0;
      const s = (t) => t * t * (3 - 2 * t);
      const v = (cx, cy) => g[Math.min(gh - 1, cy) * gw + Math.min(gw - 1, cx)];
      const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
      const top = a + (b - a) * s(fx), bot = c + (d - c) * s(fx);
      return top + (bot - top) * s(fy);
    };
  };
  const n1 = coarse(4), n2 = coarse(2);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      field[y * W + x] = n1(x, y) * 0.65 + n2(x, y) * 0.35;
    }
  }

  // bias by nearby terrain
  const corner = (x, y, lo, hi) => {
    // a cell (c,r) touches corners (c,r),(c+1,r),(c,r+1),(c+1,r+1)
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
      const cx = x + dx, cy = y + dy;
      const cell = board.get(cx, cy);
      if (!cell) continue;
      if (cell.type === T.WATER || cell.type === T.BRIDGE) lo.hit = true;
      if (cell.type === T.MOUNTAIN) hi.hit = true;
    }
  };
  const out = new Float32Array(field);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lo = { hit: false }, hi = { hit: false };
      corner(x, y, lo, hi);
      let v = field[y * W + x];
      if (lo.hit) v = Math.min(v, 0.18) * 0.6;
      if (hi.hit) v = Math.max(v, 0.82) + 0.1;
      out[y * W + x] = v;
    }
  }
  return { field: out, W, H };
}

// ─── marching squares: iso-line segments at a threshold ─────────────────────
// Returns [[x0,y0,x1,y1], …] in CELL coordinates.
export function contourAt({ field, W, H }, thr) {
  const segs = [];
  const at = (x, y) => field[y * W + x];
  const interp = (xa, ya, xb, yb) => {
    const va = at(xa, ya), vb = at(xb, yb);
    const t = (thr - va) / (vb - va || 1e-6);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  };
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = at(x, y), tr = at(x + 1, y), br = at(x + 1, y + 1), bl = at(x, y + 1);
      let idx = 0;
      if (tl > thr) idx |= 8;
      if (tr > thr) idx |= 4;
      if (br > thr) idx |= 2;
      if (bl > thr) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const top = () => interp(x, y, x + 1, y);
      const right = () => interp(x + 1, y, x + 1, y + 1);
      const bottom = () => interp(x, y + 1, x + 1, y + 1);
      const left = () => interp(x, y, x, y + 1);
      const push = (a, b) => segs.push([a[0], a[1], b[0], b[1]]);
      switch (idx) {
        case 1: case 14: push(left(), bottom()); break;
        case 2: case 13: push(bottom(), right()); break;
        case 3: case 12: push(left(), right()); break;
        case 4: case 11: push(top(), right()); break;
        case 5: push(left(), top()); push(bottom(), right()); break;
        case 6: case 9: push(top(), bottom()); break;
        case 7: case 8: push(left(), top()); break;
        case 10: push(left(), bottom()); push(top(), right()); break;
      }
    }
  }
  return segs;
}

// Boundary edges between a region (predicate) and the rest → for shorelines.
// Returns [[x0,y0,x1,y1], …] in CELL coordinates (cell-edge lines).
export function regionBoundary(board, pred) {
  const edges = [];
  for (const cell of board.cells) {
    if (!pred(cell)) continue;
    const { c, r } = cell;
    const n = (dc, dr) => { const o = board.get(c + dc, r + dr); return o && pred(o); };
    if (!n(0, -1)) edges.push([c, r, c + 1, r]);
    if (!n(0, 1)) edges.push([c, r + 1, c + 1, r + 1]);
    if (!n(-1, 0)) edges.push([c, r, c, r + 1]);
    if (!n(1, 0)) edges.push([c + 1, r, c + 1, r + 1]);
  }
  return edges;
}

// Connected clusters of a given terrain type → for placing one hill per massif.
export function clusters(board, type) {
  const seen = new Set();
  const out = [];
  const key = (c, r) => r * board.cols + c;
  for (const cell of board.cells) {
    if (cell.type !== type || seen.has(key(cell.c, cell.r))) continue;
    const comp = [];
    const stack = [cell];
    seen.add(key(cell.c, cell.r));
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const o = board.get(cur.c + dc, cur.r + dr);
        if (o && o.type === type && !seen.has(key(o.c, o.r))) { seen.add(key(o.c, o.r)); stack.push(o); }
      }
    }
    out.push(comp);
  }
  return out;
}

export { mulberry32 };
