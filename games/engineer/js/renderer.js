import { MATERIALS, NODE_R, TOP_BAR, BOT_BAR, GRID } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.tick   = 0;
  }

  get W() { return this.canvas.width; }
  get H() { return this.canvas.height; }

  draw({ nodes, edges, mode, groundY, lBankX, rBankX, dragFrom, hoverN, curMat, mouse, vehicle, snap }) {
    const ctx = this.ctx;
    this.tick++;
    ctx.clearRect(0, 0, this.W, this.H);

    this._sky(groundY, lBankX, rBankX);
    this._water(groundY, lBankX, rBankX);
    this._banks(groundY, lBankX, rBankX);
    if (mode === 'BUILD') this._grid(groundY, lBankX, rBankX);
    this._edges(edges, nodes, mode);
    if (dragFrom >= 0 && curMat !== 'del') this._dragPreview(nodes[dragFrom], curMat, snap(mouse.x, mouse.y));
    this._nodes(nodes, hoverN, dragFrom);
    if (vehicle) vehicle.draw(ctx);
  }

  // ── Background ──────────────────────────────────────────────────────────────

  _sky(groundY, lBankX, rBankX) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, TOP_BAR, 0, groundY);
    g.addColorStop(0, '#060d24');
    g.addColorStop(0.5, '#0c1a40');
    g.addColorStop(1, '#122b52');
    ctx.fillStyle = g;
    ctx.fillRect(0, TOP_BAR, this.W, groundY - TOP_BAR);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const stars = this._getStars();
    for (const [sx, sy, sr] of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(this.tick * 0.04 + sx);
      ctx.globalAlpha = twinkle;
      ctx.beginPath(); ctx.arc(sx, TOP_BAR + sy * (groundY - TOP_BAR - 80), sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath(); ctx.arc(this.W * 0.85, TOP_BAR + 38, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c1a40';
    ctx.beginPath(); ctx.arc(this.W * 0.85 + 6, TOP_BAR + 34, 14, 0, Math.PI * 2); ctx.fill();

    // Mountain silhouette
    ctx.fillStyle = '#0a1830';
    ctx.beginPath();
    ctx.moveTo(lBankX, groundY);
    const mw = rBankX - lBankX;
    const pts = [
      [0.05, 0.72], [0.15, 0.42], [0.28, 0.58], [0.38, 0.28],
      [0.50, 0.52], [0.62, 0.22], [0.73, 0.48], [0.84, 0.36],
      [0.95, 0.60], [1.00, 0.72],
    ];
    for (const [fx, fy] of pts) {
      ctx.lineTo(lBankX + mw * fx, groundY - (groundY - TOP_BAR) * fy * 0.55);
    }
    ctx.lineTo(rBankX, groundY);
    ctx.closePath(); ctx.fill();
  }

  _getStars() {
    if (!this._stars) {
      this._stars = Array.from({ length: 40 }, () => [
        Math.random() * this.W,
        Math.random() * 0.7,
        Math.random() * 1.2 + 0.4,
      ]);
    }
    return this._stars;
  }

  _water(groundY, lBankX, rBankX) {
    const ctx = this.ctx;
    const H = this.H;
    const g = ctx.createLinearGradient(0, groundY, 0, H - BOT_BAR);
    g.addColorStop(0, '#1a3a5f');
    g.addColorStop(1, '#091529');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, this.W, H - BOT_BAR - groundY);

    // Animated waves
    const t = this.tick;
    for (let i = 0; i < 5; i++) {
      const wy = groundY + 12 + i * 14;
      const alpha = 0.07 - i * 0.01;
      ctx.strokeStyle = `rgba(120,200,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lBankX, wy);
      for (let wx = lBankX; wx <= rBankX; wx += 8) {
        ctx.lineTo(wx, wy + Math.sin(wx * 0.06 + t * 0.04 + i * 1.3) * 2.5);
      }
      ctx.stroke();
    }

    // Water reflection glow
    ctx.fillStyle = 'rgba(30,80,140,0.15)';
    ctx.fillRect(lBankX, groundY, rBankX - lBankX, 30);
  }

  _banks(groundY, lBankX, rBankX) {
    const ctx = this.ctx;
    const H = this.H;
    const W = this.W;

    const g = ctx.createLinearGradient(0, groundY - 10, 0, groundY + 30);
    g.addColorStop(0, '#4b5563');
    g.addColorStop(1, '#1f2937');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 6, lBankX + 4, H - BOT_BAR);
    ctx.fillRect(rBankX - 4, groundY - 6, W - rBankX + 4, H - BOT_BAR);

    // Top edge highlight
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, groundY - 6, lBankX, 3);
    ctx.fillRect(rBankX, groundY - 6, W - rBankX, 3);

    // Subtle texture lines on banks
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = groundY + 15 + i * 20;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(lBankX, ly); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rBankX, ly); ctx.lineTo(W, ly); ctx.stroke();
    }
  }

  _grid(groundY, lBankX, rBankX) {
    const ctx = this.ctx;
    const snap = v => Math.round(v / GRID) * GRID;

    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let gx = snap(lBankX); gx <= rBankX; gx += GRID) {
      ctx.beginPath(); ctx.moveTo(gx, TOP_BAR); ctx.lineTo(gx, groundY); ctx.stroke();
    }
    for (let gy = snap(TOP_BAR); gy <= groundY; gy += GRID) {
      ctx.beginPath(); ctx.moveTo(lBankX, gy); ctx.lineTo(rBankX, gy); ctx.stroke();
    }

    // Dots at intersections
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let gx = snap(lBankX); gx <= rBankX; gx += GRID) {
      for (let gy = snap(TOP_BAR); gy <= groundY; gy += GRID) {
        ctx.beginPath(); ctx.arc(gx, gy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── Edges ───────────────────────────────────────────────────────────────────

  _edges(edges, nodes, mode) {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    const testing = mode === 'TEST' || mode === 'RESULT';

    for (const e of edges) {
      const na = nodes[e.a], nb = nodes[e.b];

      if (e.broken) {
        ctx.strokeStyle = 'rgba(239,68,68,0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 8]);
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      const mat   = MATERIALS[e.mat];
      const col   = testing ? this._stressColor(e.stress, mat) : mat.color;
      const lw    = mat.lineWidth;
      const highStress = testing && Math.abs(e.stress) > mat.maxStress * 0.65;

      // Glow for high stress
      if (highStress) {
        ctx.shadowColor = e.stress > 0 ? '#f87171' : '#93c5fd';
        ctx.shadowBlur  = 10;
      }

      // Shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth   = lw + 3;
      ctx.beginPath(); ctx.moveTo(na.x, na.y + 2); ctx.lineTo(nb.x, nb.y + 2); ctx.stroke();

      // Main line
      ctx.strokeStyle = col;
      ctx.lineWidth   = lw;
      ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke();

      ctx.shadowBlur = 0;

      // Highlight stripe on beams
      if (e.mat !== 'cable') {
        ctx.strokeStyle = mat.colorMid + '55';
        ctx.lineWidth   = 1.5;
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ox = -dy / len, oy = dx / len;
        ctx.beginPath();
        ctx.moveTo(na.x + ox * (lw * 0.25), na.y + oy * (lw * 0.25));
        ctx.lineTo(nb.x + ox * (lw * 0.25), nb.y + oy * (lw * 0.25));
        ctx.stroke();
      }

      // Rivets at joints
      if (e.mat !== 'cable') {
        const rivetColor = highStress ? col : mat.colorMid;
        const rivetR = lw * 0.65;
        for (const [rx, ry] of [[na.x, na.y], [nb.x, nb.y]]) {
          ctx.fillStyle = rivetColor;
          ctx.beginPath(); ctx.arc(rx, ry, rivetR, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  _stressColor(stress, mat) {
    const abs = Math.abs(stress);
    const t   = Math.min(abs / mat.maxStress, 1.0);
    if (stress < -0.005) return this._lerp('#64748b', '#3b82f6', Math.min(t * 1.8, 1));
    if (stress >  0.005) {
      if (t < 0.55) return this._lerp(mat.color, '#f97316', t / 0.55);
      return this._lerp('#f97316', '#ef4444', (t - 0.55) / 0.45);
    }
    return mat.color;
  }

  _lerp(c1, c2, t) {
    const p = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const [r1, g1, b1] = p(c1), [r2, g2, b2] = p(c2);
    return `rgb(${~~(r1+(r2-r1)*t)},${~~(g1+(g2-g1)*t)},${~~(b1+(b2-b1)*t)})`;
  }

  // ── Preview & Nodes ─────────────────────────────────────────────────────────

  _dragPreview(fromNode, curMat, snapped) {
    const ctx = this.ctx;
    const mat = MATERIALS[curMat];
    ctx.strokeStyle = mat.color + '77';
    ctx.lineWidth   = mat.lineWidth;
    ctx.lineCap     = 'round';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(snapped.x, snapped.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target snap indicator
    ctx.strokeStyle = mat.colorMid + 'aa';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(snapped.x, snapped.y, 6, 0, Math.PI * 2); ctx.stroke();
  }

  _nodes(nodes, hoverN, dragFrom) {
    const ctx = this.ctx;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const hover = i === hoverN;
      const drag  = i === dragFrom;

      if (n.pinned) {
        // Diamond anchor
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();

        ctx.fillStyle = 'rgba(251,191,36,0.55)';
        ctx.font      = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ОПОРА', n.x, n.y - 16);
      } else {
        const r = NODE_R + (hover || drag ? 2 : 0);

        // Outer glow
        if (hover || drag) {
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = drag ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.08)';
          ctx.fill();
        }

        // Main circle
        ctx.fillStyle   = drag ? '#3b82f6' : hover ? '#cbd5e1' : '#475569';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Inner highlight
        ctx.fillStyle = drag ? '#93c5fd' : '#94a3b8';
        ctx.beginPath(); ctx.arc(n.x - r * 0.2, n.y - r * 0.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
