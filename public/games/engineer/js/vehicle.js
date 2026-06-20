import { GRAVITY } from './constants.js';

// Rounded-rectangle path helper. r can be a number or {tl,tr,br,bl}.
function rr(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

export class Vehicle {
  constructor(type, physics, lBankX, rBankX, groundY, startX, startY) {
    this.type    = type.id;
    this.w       = type.width;
    this.h       = type.height;
    this.speed   = type.speed;
    this.load    = type.load;
    this.physics = physics;
    this.lBankX  = lBankX;
    this.rBankX  = rBankX;
    this.groundY = groundY;

    this.x       = startX - this.w - 14;
    this.y       = startY - this.h;
    this.vy      = 0;
    this.fallen  = false;
    this.done    = false;
    this.wheelAngle = 0;
    this.tilt    = 0;
  }

  // The deck level the vehicle is currently riding on (its wheel-contact line).
  get refY() { return this.y + this.h; }

  update() {
    if (this.done || this.fallen) return null;

    const cx = this.x + this.w / 2;
    const RANGE = this.w * 0.6;

    // Press the deck down under the wheels.
    for (const n of this.physics.nodes) {
      if (n.pinned) continue;
      const d = Math.abs(n.x - cx);
      if (d < RANGE) n.py -= this.load * (1 - d / RANGE);
    }

    const ref   = this.refY;
    const sy    = this.physics.surfaceAt(cx, ref);
    const inGap = (this.x + this.w * 0.1 > this.lBankX) &&
                  (this.x + this.w * 0.9 < this.rBankX);

    // No deck beneath us while over the chasm → fall.
    if (sy === null && inGap) {
      this.vy   += GRAVITY * 2.5;
      this.y    += this.vy;
      this.x    += this.speed * 0.3;
      this.tilt  = 0.45;
      this.wheelAngle += 0.05;
      if (this.y > this.groundY + 90) { this.fallen = true; return 'fail'; }
      return null;
    }

    this.x += this.speed;
    this.wheelAngle += this.speed / 26;
    this.y  = sy !== null ? sy - this.h : this.groundY - this.h;
    this.vy = 0;

    // Tilt follows the local slope of the deck.
    const syL = this.physics.surfaceAt(cx - 22, ref) ?? this.y + this.h;
    const syR = this.physics.surfaceAt(cx + 22, ref) ?? this.y + this.h;
    this.tilt = Math.atan2(syR - syL, 44) * 0.7;

    if (this.x > this.rBankX + 36) { this.done = true; return 'success'; }
    return null;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.tilt);
    if      (this.type === 'car')   this._car(ctx);
    else if (this.type === 'bus')   this._bus(ctx);
    else                            this._truck(ctx);
    ctx.restore();
  }

  // ── Shared bits ───────────────────────────────────────────────────────────

  _shadow(ctx, rx) {
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(0, this.h / 2 + 3, rx, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _arches(ctx, xs, wy, r) {
    ctx.fillStyle = this.fallen ? '#0a0f1a' : '#0f172a';
    for (const x of xs) {
      ctx.beginPath();
      ctx.arc(x, wy, r + 2.5, Math.PI, 0);
      ctx.fill();
    }
  }

  _wheel(ctx, x, y, r) {
    // Tire
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.stroke();
    // Rim
    ctx.fillStyle = this.fallen ? '#475569' : '#cbd5e1';
    ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2); ctx.fill();
    // Spokes (rotate)
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.4;
    for (let s = 0; s < 5; s++) {
      const a = this.wheelAngle + s * (Math.PI * 2 / 5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46);
      ctx.stroke();
    }
    // Hub
    ctx.fillStyle = '#475569';
    ctx.beginPath(); ctx.arc(x, y, r * 0.17, 0, Math.PI * 2); ctx.fill();
  }

  // ── Car (sedan) ───────────────────────────────────────────────────────────

  _car(ctx) {
    const w = this.w, h = this.h, dark = this.fallen;
    this._shadow(ctx, w * 0.46);

    const wheelR = h * 0.27;
    const wy  = h / 2 - wheelR;
    const wxF =  w * 0.30, wxR = -w * 0.30;
    this._arches(ctx, [wxF, wxR], wy, wheelR);

    // Greenhouse + lower body (single colour, gradient)
    const g = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.4);
    g.addColorStop(0, dark ? '#1e3a5f' : '#3b82f6');
    g.addColorStop(1, dark ? '#0f1f33' : '#1d4ed8');
    ctx.fillStyle = g;

    // cabin
    ctx.beginPath();
    ctx.moveTo(-w * 0.26, -h * 0.08);
    ctx.lineTo(-w * 0.15, -h * 0.46);
    ctx.lineTo( w * 0.07, -h * 0.46);
    ctx.lineTo( w * 0.25, -h * 0.08);
    ctx.closePath();
    ctx.fill();

    // lower body
    rr(ctx, -w * 0.5, -h * 0.14, w, h * 0.52, { tl: 6, tr: 9, br: 5, bl: 5 });
    ctx.fill();

    // Windows
    ctx.fillStyle = dark ? '#1e3a5f' : '#cfeafe';
    // rear window
    ctx.beginPath();
    ctx.moveTo(-w * 0.20, -h * 0.10);
    ctx.lineTo(-w * 0.12, -h * 0.40);
    ctx.lineTo(-w * 0.02, -h * 0.40);
    ctx.lineTo(-w * 0.02, -h * 0.10);
    ctx.closePath(); ctx.fill();
    // windshield
    ctx.beginPath();
    ctx.moveTo( w * 0.02, -h * 0.10);
    ctx.lineTo( w * 0.02, -h * 0.40);
    ctx.lineTo( w * 0.05, -h * 0.40);
    ctx.lineTo( w * 0.21, -h * 0.10);
    ctx.closePath(); ctx.fill();
    // glass glare
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(-w * 0.18, -h * 0.12);
      ctx.lineTo(-w * 0.13, -h * 0.36);
      ctx.lineTo(-w * 0.10, -h * 0.36);
      ctx.lineTo(-w * 0.15, -h * 0.12);
      ctx.closePath(); ctx.fill();
    }

    // Belt-line highlight
    ctx.strokeStyle = dark ? '#0f1f33' : '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, -h * 0.06);
    ctx.lineTo( w * 0.44, -h * 0.06);
    ctx.stroke();

    // Lights
    ctx.fillStyle = dark ? '#713f12' : '#fef3c7';
    rr(ctx, w * 0.44, -h * 0.02, 5, 6, 2); ctx.fill();
    ctx.fillStyle = dark ? '#3f1212' : '#ef4444';
    rr(ctx, -w * 0.49, -h * 0.02, 4, 6, 2); ctx.fill();

    this._wheel(ctx, wxF, wy, wheelR);
    this._wheel(ctx, wxR, wy, wheelR);
  }

  // ── Truck ─────────────────────────────────────────────────────────────────

  _truck(ctx) {
    const w = this.w, h = this.h, dark = this.fallen;
    this._shadow(ctx, w * 0.48);

    const wheelR = h * 0.23;
    const wy  = h / 2 - wheelR;
    const wxs = [-w * 0.32, -w * 0.12, w * 0.34];
    this._arches(ctx, wxs, wy, wheelR);

    // Cargo box (silver)
    const box = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.4);
    box.addColorStop(0, dark ? '#475569' : '#e2e8f0');
    box.addColorStop(1, dark ? '#1e293b' : '#94a3b8');
    ctx.fillStyle = box;
    rr(ctx, -w * 0.5, -h * 0.5, w * 0.6, h * 0.92, { tl: 4, tr: 4, br: 3, bl: 3 });
    ctx.fill();
    // box ribs
    ctx.strokeStyle = dark ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const rx = -w * 0.5 + (w * 0.6) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(rx, -h * 0.46);
      ctx.lineTo(rx,  h * 0.34);
      ctx.stroke();
    }

    // Cab (red)
    const cab = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.4);
    cab.addColorStop(0, dark ? '#7f1d1d' : '#ef4444');
    cab.addColorStop(1, dark ? '#450a0a' : '#b91c1c');
    ctx.fillStyle = cab;
    rr(ctx, w * 0.11, -h * 0.30, w * 0.39, h * 0.72, { tl: 9, tr: 11, br: 4, bl: 0 });
    ctx.fill();

    // Windshield
    ctx.fillStyle = dark ? '#1e3a5f' : '#cfeafe';
    ctx.beginPath();
    ctx.moveTo(w * 0.30, -h * 0.24);
    ctx.lineTo(w * 0.46, -h * 0.24);
    ctx.lineTo(w * 0.49, -h * 0.02);
    ctx.lineTo(w * 0.30, -h * 0.02);
    ctx.closePath(); ctx.fill();
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(w * 0.31, -h * 0.22);
      ctx.lineTo(w * 0.37, -h * 0.22);
      ctx.lineTo(w * 0.35, -h * 0.04);
      ctx.lineTo(w * 0.31, -h * 0.04);
      ctx.closePath(); ctx.fill();
    }

    // Headlight + bumper
    ctx.fillStyle = dark ? '#713f12' : '#fef3c7';
    rr(ctx, w * 0.47, h * 0.06, 4, 6, 1.5); ctx.fill();
    ctx.fillStyle = dark ? '#0f172a' : '#334155';
    rr(ctx, w * 0.44, h * 0.18, w * 0.06, 5, 2); ctx.fill();

    for (const wx of wxs) this._wheel(ctx, wx, wy, wheelR);
  }

  // ── Bus ───────────────────────────────────────────────────────────────────

  _bus(ctx) {
    const w = this.w, h = this.h, dark = this.fallen;
    this._shadow(ctx, w * 0.48);

    const wheelR = h * 0.21;
    const wy  = h / 2 - wheelR;
    const wxs = [-w * 0.33, w * 0.33];
    this._arches(ctx, wxs, wy, wheelR);

    // Body (amber)
    const g = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.4);
    g.addColorStop(0, dark ? '#78350f' : '#fbbf24');
    g.addColorStop(1, dark ? '#451a03' : '#d97706');
    ctx.fillStyle = g;
    rr(ctx, -w * 0.5, -h * 0.5, w, h * 0.9, { tl: 7, tr: 15, br: 6, bl: 6 });
    ctx.fill();

    // Roof highlight
    ctx.fillStyle = dark ? '#92400e' : '#fcd34d';
    rr(ctx, -w * 0.5, -h * 0.5, w, h * 0.08, { tl: 7, tr: 15, br: 0, bl: 0 });
    ctx.fill();

    // Window strip
    ctx.fillStyle = dark ? '#1e3a5f' : '#bae6fd';
    rr(ctx, -w * 0.45, -h * 0.34, w * 0.74, h * 0.30, 3);
    ctx.fill();
    // Window dividers
    ctx.strokeStyle = dark ? '#78350f' : '#d97706';
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      const rx = -w * 0.45 + (w * 0.74) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(rx, -h * 0.34);
      ctx.lineTo(rx, -h * 0.04);
      ctx.stroke();
    }
    // Glass glare
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      rr(ctx, -w * 0.45, -h * 0.34, w * 0.74, h * 0.10, { tl: 3, tr: 3, br: 0, bl: 0 });
      ctx.fill();
    }

    // Front windshield (right)
    ctx.fillStyle = dark ? '#1e3a5f' : '#cfeafe';
    rr(ctx, w * 0.32, -h * 0.34, w * 0.15, h * 0.42, { tl: 3, tr: 10, br: 8, bl: 3 });
    ctx.fill();

    // Door (front-left of body, behind front axle)
    ctx.fillStyle = dark ? '#451a03' : '#b45309';
    rr(ctx, -w * 0.16, -h * 0.02, w * 0.10, h * 0.40, 2);
    ctx.fill();
    ctx.strokeStyle = dark ? '#78350f' : '#92400e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.11, -h * 0.02);
    ctx.lineTo(-w * 0.11,  h * 0.36);
    ctx.stroke();

    // Headlight + taillight
    ctx.fillStyle = dark ? '#713f12' : '#fef3c7';
    rr(ctx, w * 0.46, h * 0.10, 4, 6, 1.5); ctx.fill();
    ctx.fillStyle = dark ? '#3f1212' : '#ef4444';
    rr(ctx, -w * 0.5, h * 0.10, 4, 6, 1.5); ctx.fill();

    for (const wx of wxs) this._wheel(ctx, wx, wy, wheelR);
  }
}
