import { GRAVITY, DAMPING, ITERATIONS, MATERIALS, TOP_BAR, BOT_BAR } from './constants.js';

export class Physics {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  reset() {
    this.nodes = [];
    this.edges = [];
  }

  addNode(x, y, pinned = false) {
    this.nodes.push({ x, y, px: x, py: y, pinned });
    return this.nodes.length - 1;
  }

  addEdge(a, b, mat) {
    if (a === b) return -1;
    if (this.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return -1;
    const dx = this.nodes[b].x - this.nodes[a].x;
    const dy = this.nodes[b].y - this.nodes[a].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return -1;
    const cost = len * MATERIALS[mat].costPerPx;
    this.edges.push({ a, b, restLen: len, mat, broken: false, stress: 0, cost });
    return this.edges.length - 1;
  }

  removeNode(idx) {
    this.edges = this.edges
      .filter(e => e.a !== idx && e.b !== idx)
      .map(e => ({ ...e, a: e.a > idx ? e.a - 1 : e.a, b: e.b > idx ? e.b - 1 : e.b }));
    this.nodes.splice(idx, 1);
  }

  removeEdge(idx) {
    this.edges.splice(idx, 1);
  }

  getTotalCost() {
    return Math.round(this.edges.reduce((s, e) => s + e.cost, 0));
  }

  step(canvasH) {
    const floor = canvasH - BOT_BAR - 8;

    for (const n of this.nodes) {
      if (n.pinned) continue;
      const vx = (n.x - n.px) * DAMPING;
      const vy = (n.y - n.py) * DAMPING;
      n.px = n.x; n.py = n.y;
      n.x += vx;
      n.y += vy + GRAVITY;
    }

    for (let it = 0; it < ITERATIONS; it++) {
      for (const e of this.edges) {
        if (e.broken) continue;
        const na = this.nodes[e.a], nb = this.nodes[e.b];
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (len - e.restLen) / len;
        e.stress = (len - e.restLen) / e.restLen;

        const m = MATERIALS[e.mat];
        if (m.tensionOnly && diff < 0) continue;

        const half = diff * 0.5 * m.stiffness;
        if (!na.pinned) { na.x += dx * half; na.y += dy * half; }
        if (!nb.pinned) { nb.x -= dx * half; nb.y -= dy * half; }
      }
    }

    for (const e of this.edges) {
      if (!e.broken && Math.abs(e.stress) > MATERIALS[e.mat].maxStress) e.broken = true;
    }

    for (const n of this.nodes) {
      if (n.pinned) continue;
      if (n.y > floor) { n.py = floor + (n.py - n.y) * 0.5; n.y = floor; }
      if (n.y < TOP_BAR + 4) { n.y = TOP_BAR + 4; n.py = n.y; }
    }
  }

  findNodeAt(x, y, radius = 15) {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if ((n.x - x) ** 2 + (n.y - y) ** 2 <= radius * radius) return i;
    }
    return -1;
  }

  findEdgeAt(x, y, maxDist = 8) {
    let best = maxDist, bi = -1;
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      const na = this.nodes[e.a], nb = this.nodes[e.b];
      const d = distToSeg(x, y, na.x, na.y, nb.x, nb.y);
      if (d < best) { best = d; bi = i; }
    }
    return bi;
  }

  // Returns the deck surface height at x. When refY is given, the surface
  // CLOSEST to refY wins (keeps a vehicle on the road deck it is already
  // riding on, instead of snapping up onto the top chord of a truss).
  // Vertical members (na.x === nb.x) are skipped — they are not a drivable surface.
  surfaceAt(x, refY = null) {
    let best = null;
    for (const e of this.edges) {
      if (e.broken) continue;
      const na = this.nodes[e.a], nb = this.nodes[e.b];
      if (na.x === nb.x) continue;
      const x0 = Math.min(na.x, nb.x), x1 = Math.max(na.x, nb.x);
      if (x < x0 || x > x1) continue;
      const t  = (x - na.x) / (nb.x - na.x);
      const sy = na.y + t * (nb.y - na.y);
      if (best === null) { best = sy; continue; }
      if (refY === null) { if (sy < best) best = sy; }
      else if (Math.abs(sy - refY) < Math.abs(best - refY)) best = sy;
    }
    return best;
  }
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
