import { T } from './constants.js?v=6';
import { toInt } from './themes.js?v=6';
import { buildHeightField, contourAt, clusters, mulberry32 } from './mapgen.js?v=6';

const BASE = 48; // world units per cell; camera scales to fit

export class PixiRenderer {
  constructor(parentEl) {
    this.app = new PIXI.Application({
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      backgroundColor: 0x0d1f17,
      powerPreference: 'high-performance',
    });
    parentEl.appendChild(this.app.view);
    this.app.view.style.display = 'block';
    this.app.view.style.touchAction = 'none';

    this.world = new PIXI.Container();
    this.app.stage.addChild(this.world);

    this.board = null;
    this.theme = null;
    this.zoom = 1;
    this.fitScale = 1;
    this.fog = new Map();      // cellIndex → Graphics
    this.markers = new Map();  // cellIndex → DisplayObject
    this.flags = new Map();    // cellIndex → Graphics
    this.devices = new Map();  // cellIndex → PIXI.Text (device indicator)
    this.vipMarker = null;     // PIXI.Container — VIP icon
    this.exitMarker = null;    // PIXI.Container — EXIT portal
    this.particles = [];
    this.anims = [];           // timed tween animations (arm extend, drone flight)
    this.sapperC = null;
    this.sapperLegs = null;
    this._sapperEquip = {};
    this.currentSkin = 'default';
    this.tickCbs = [];

    this._wireInput();
    this.app.ticker.add(() => this._tick());
  }

  onTick(cb) { this.tickCbs.push(cb); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight - 54;
    this.app.renderer.resize(w, h);
    if (this.board) this._fitCamera();
  }

  // ── camera ────────────────────────────────────────────────────────────────
  _fitCamera() {
    const cw = this.board.cols * BASE, ch = this.board.rows * BASE;
    const sw = this.app.renderer.width / this.app.renderer.resolution;
    const sh = this.app.renderer.height / this.app.renderer.resolution;
    this.fitScale = Math.min(sw / cw, sh / ch) * 0.94;
    const s = this.fitScale * this.zoom;
    this.world.scale.set(s);
    this.world.position.set((sw - cw * s) / 2, (sh - ch * s) / 2);
  }

  cellAt(clientX, clientY) {
    const r = this.app.view.getBoundingClientRect();
    const p = this.world.toLocal(new PIXI.Point(clientX - r.left, clientY - r.top));
    return { c: Math.floor(p.x / BASE), r: Math.floor(p.y / BASE) };
  }

  // ── input: emits taps/flags; handles pan + zoom internally ─────────────────
  _wireInput() {
    const v = this.app.view;
    let down = null, lp = null, handled = false, panning = false, lpFired = false;
    // pinch zoom state
    const _ptrs = new Map(); // pointerId → {x,y}
    let _pinchDist = 0;
    const center = e => ({ x: e.clientX, y: e.clientY });
    const ptDist = () => {
      const pts = [..._ptrs.values()];
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const ptCenter = () => {
      const pts = [..._ptrs.values()];
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };

    v.addEventListener('pointerdown', e => {
      lpFired = false;
      _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (_ptrs.size === 2) {
        clearTimeout(lp); lp = null; down = null; panning = false; handled = true;
        _pinchDist = ptDist();
        return;
      }
      down = center(e); handled = false; panning = false;
      this._lastPan = down;
      if (this.board) lp = setTimeout(() => {
        handled = true;
        lpFired = true;
        const c = this.cellAt(e.clientX, e.clientY);
        this.onCellFlag && this.onCellFlag(c.c, c.r);
      }, 380);
    });

    v.addEventListener('pointermove', e => {
      _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (_ptrs.size === 2 && _pinchDist > 0) {
        const newDist = ptDist();
        const ratio = newDist / _pinchDist;
        _pinchDist = newDist;
        if (!this.board) return;
        const mid = ptCenter();
        const r = v.getBoundingClientRect();
        const before = this.world.toLocal(new PIXI.Point(mid.x - r.left, mid.y - r.top));
        this.zoom = Math.max(0.6, Math.min(3.5, this.zoom * ratio));
        const s = this.fitScale * this.zoom;
        this.world.scale.set(s);
        const after = this.world.toLocal(new PIXI.Point(mid.x - r.left, mid.y - r.top));
        this.world.position.x += (after.x - before.x) * s;
        this.world.position.y += (after.y - before.y) * s;
        return;
      }
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      // Only cancel long-press on real movement (> 14px) — minor tremor keeps timer alive
      if (!panning && Math.hypot(dx, dy) > 14) { panning = true; clearTimeout(lp); lp = null; }
      if (panning) {
        this.world.position.x += e.clientX - this._lastPan.x;
        this.world.position.y += e.clientY - this._lastPan.y;
        this._lastPan = center(e);
      }
    });

    const end = e => {
      _ptrs.delete(e.pointerId);
      if (_ptrs.size < 2) _pinchDist = 0;
      clearTimeout(lp); lp = null;
      if (down && !handled && !panning && this.board) {
        const c = this.cellAt(e.clientX, e.clientY);
        this.onCellTap && this.onCellTap(c.c, c.r);
      }
      if (_ptrs.size === 0) { down = null; panning = false; }
    };
    v.addEventListener('pointerup', end);
    v.addEventListener('pointercancel', e => { _ptrs.delete(e.pointerId); clearTimeout(lp); lp = null; down = null; });
    v.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this.board) return;
      if (lpFired) { lpFired = false; return; }
      const c = this.cellAt(e.clientX, e.clientY);
      this.onCellFlag && this.onCellFlag(c.c, c.r);
    });
    v.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.board) return;
      const r = v.getBoundingClientRect();
      const before = this.world.toLocal(new PIXI.Point(e.clientX - r.left, e.clientY - r.top));
      this.zoom = Math.max(0.6, Math.min(3.5, this.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
      const s = this.fitScale * this.zoom;
      this.world.scale.set(s);
      const after = this.world.toLocal(new PIXI.Point(e.clientX - r.left, e.clientY - r.top));
      this.world.position.x += (after.x - before.x) * s;
      this.world.position.y += (after.y - before.y) * s;
    }, { passive: false });

    // Arrow keys — emit direction as a synthetic tap on the cell next to sapper
    window.addEventListener('keydown', e => {
      const dirs = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
      const d = dirs[e.key];
      if (!d || !this.board || !this.onSapperArrow) return;
      e.preventDefault();
      this.onSapperArrow(d[0], d[1]);
    });
  }

  // ── scene assembly ──────────────────────────────────────────────────────
  setTheme(theme) { this.theme = theme; this.app.renderer.background.color = toInt(theme.bg); }

  clear() {
    this.world.removeChildren().forEach(c => c.destroy({ children: true }));
    this.board = null;
    this.fog.clear(); this.markers.clear(); this.flags.clear(); this.devices.clear();
    this.vipMarker = null; this.exitMarker = null;
    this.particles = []; this.anims = []; this.sapperC = null; this.sapperLegs = null; this.platform = null;
    this._waterRipple = null; this._clouds = null; this._cloudW = 0;
    this.fowC = null; this._fowRadius = 0; this._fowCells = new Map();
    this.fowC = null; this._fowRadius = 0; this._fowCells = new Map();
  }

  buildLevel(board, theme) {
    this.clear();
    this.board = board;
    this.theme = theme;
    this.zoom = 1;
    this.app.renderer.background.color = toInt(theme.bg);
    const TH = theme;

    if (TH.pixel) {
      this._buildPixelTerrain(board, TH);
    } else {
    // land mask (dry land) for relief + grid clip
    const isDry = c => c.type === T.LAND || c.type === T.TREE || c.type === T.MOUNTAIN || c.type === T.BRIDGE || c.type === T.PATH;
    const mask = new PIXI.Graphics().beginFill(0xffffff);
    for (const cell of board.cells) if (isDry(cell)) mask.drawRect(cell.c * BASE, cell.r * BASE, BASE, BASE);
    mask.endFill();
    this.world.addChild(mask);

    // 1. paper ground
    const ground = new PIXI.Graphics();
    ground.beginFill(toInt(TH.paper));
    for (const cell of board.cells) if (cell.type !== T.VOID) ground.drawRect(cell.c * BASE, cell.r * BASE, BASE, BASE);
    ground.endFill();
    this.world.addChild(ground);

    // 2. relief contours (masked to dry land)
    const masked = new PIXI.Container();
    const hf = buildHeightField(board);
    const relief = new PIXI.Graphics();
    for (let i = 1; i <= 9; i++) {
      const thr = i / 10;
      const index = i % 3 === 0;
      relief.lineStyle({ width: index ? 2 : 1, color: toInt(index ? TH.contourIndex : TH.contour), alpha: TH.contourAlpha });
      for (const [x0, y0, x1, y1] of contourAt(hf, thr)) {
        relief.moveTo(x0 * BASE, y0 * BASE); relief.lineTo(x1 * BASE, y1 * BASE);
      }
    }
    masked.addChild(relief);

    // 3. coordinate grid (masked too)
    const grid = new PIXI.Graphics();
    grid.lineStyle({ width: 1, color: toInt(TH.grid), alpha: TH.gridAlpha });
    for (let c = 0; c <= board.cols; c++) { grid.moveTo(c * BASE, 0); grid.lineTo(c * BASE, board.rows * BASE); }
    for (let r = 0; r <= board.rows; r++) { grid.moveTo(0, r * BASE); grid.lineTo(board.cols * BASE, r * BASE); }
    masked.addChild(grid);

    masked.mask = mask;
    this.world.addChild(masked);

    // 4. water — smooth organic body with a beach band
    this._buildWater(board, TH);

    // 5. bridges (planks over the smoothed water)
    const br = new PIXI.Graphics();
    for (const cell of board.cells) {
      if (cell.type !== T.BRIDGE) continue;
      const x = cell.c * BASE, y = cell.r * BASE;
      br.beginFill(toInt(TH.bridge)).drawRect(x, y + BASE * 0.26, BASE, BASE * 0.48).endFill();
      br.lineStyle({ width: 1, color: toInt(TH.bridgePlank), alpha: 0.85 });
      for (let i = 0; i <= 5; i++) { br.moveTo(x + (BASE / 5) * i, y + BASE * 0.26); br.lineTo(x + (BASE / 5) * i, y + BASE * 0.74); }
      br.lineStyle();
    }
    this.world.addChild(br);

    // 5b. dirt paths — rounded like river, grass verge on sides
    this._buildPaths(board, TH);

    // 6. mountains (one hill symbol per massif)
    const mtn = new PIXI.Graphics();
    const rng = mulberry32((board.seed * 7919 + 17) >>> 0);
    for (const comp of clusters(board, T.MOUNTAIN)) {
      for (const cell of comp) mtn.beginFill(toInt(TH.mountain)).drawRect(cell.c * BASE, cell.r * BASE, BASE, BASE).endFill();
      let cx = 0, cy = 0, minc = 1e9, maxc = -1e9, minr = 1e9, maxr = -1e9;
      for (const cell of comp) { cx += cell.c + 0.5; cy += cell.r + 0.5; minc = Math.min(minc, cell.c); maxc = Math.max(maxc, cell.c); minr = Math.min(minr, cell.r); maxr = Math.max(maxr, cell.r); }
      cx = (cx / comp.length) * BASE; cy = (cy / comp.length) * BASE;
      const rad = (Math.max(maxc - minc, maxr - minr) + 1) * BASE * 0.5;
      mtn.lineStyle({ width: 1.6, color: toInt(TH.mountainLine), alpha: 0.85 });
      for (let k = 3; k >= 1; k--) mtn.drawEllipse(cx, cy, rad * (k / 3.2), rad * (k / 3.2) * 0.74);
      mtn.lineStyle();
      const peak = 100 + Math.floor(rng() * 220);
      const tx = new PIXI.Text('▲' + peak, { fontFamily: 'Georgia, serif', fontSize: 13, fontStyle: 'italic', fill: toInt(TH.peakText) });
      tx.anchor.set(0.5); tx.position.set(cx, cy); this.world.addChild(tx);
    }
    this.world.addChild(mtn);

    // 7. forests
    const forest = new PIXI.Graphics();
    for (const cell of board.cells) {
      if (cell.type !== T.TREE) continue;
      const x = cell.c * BASE, y = cell.r * BASE;
      forest.beginFill(toInt(TH.forestPatch), 0.55).drawRect(x, y, BASE, BASE).endFill();
      for (let i = 0; i < 3; i++) {
        const tx = x + BASE * (0.25 + rng() * 0.5), ty = y + BASE * (0.3 + rng() * 0.45), tr = BASE * 0.16;
        forest.beginFill(toInt(TH.trunk)).drawRect(tx - 1.5, ty, 3, tr).endFill();
        forest.beginFill(toInt(TH.forestDark)).drawCircle(tx, ty, tr).endFill();
        forest.beginFill(toInt(TH.forest)).drawCircle(tx - tr * 0.3, ty - tr * 0.3, tr * 0.7).endFill();
      }
    }
    this.world.addChild(forest);

    // 7b. grain texture over all terrain (under fog/labels)
    const noiseMask = new PIXI.Graphics().beginFill(0xffffff);
    for (const cell of board.cells) if (cell.type !== T.VOID) noiseMask.drawRect(cell.c * BASE, cell.r * BASE, BASE, BASE);
    noiseMask.endFill();
    this.world.addChild(noiseMask);
    const grain = new PIXI.TilingSprite(this._noiseTexture(), board.cols * BASE, board.rows * BASE);
    grain.alpha = 0.18; grain.blendMode = PIXI.BLEND_MODES.OVERLAY; grain.mask = noiseMask;
    this.world.addChild(grain);

    // 8. edge coordinate labels
    const labels = new PIXI.Container();
    for (let c = 0; c < board.cols; c++) this._label(labels, String(30 + c), c * BASE + BASE / 2, -10, TH);
    for (let r = 0; r < board.rows; r++) this._label(labels, String(60 - r), -12, r * BASE + BASE / 2, TH);
    this.world.addChild(labels);
    }

    // 9. water ripple animation overlay (below fog)
    this._buildWaterAnim(board, TH);

    // 10. dynamic layers (fog, markers, sapper)
    this.markersC = new PIXI.Container(); this.world.addChild(this.markersC);
    this.fogC = new PIXI.Container(); this.world.addChild(this.fogC);
    this.entityC = new PIXI.Container(); this.world.addChild(this.entityC);

    for (const cell of board.cells) if (cell.type === T.LAND) this._addFog(cell, TH);

    // 10b. Fog-of-war layer — dark overlay outside sapper's sight radius.
    // Populated on first sapper placement; updated via updateFoW().
    this.fowC = new PIXI.Container(); this.world.addChild(this.fowC);
    this._fowRadius = board.level.night ? 3 : (board.level.fog ? 5 : 0);
    this._fowCells = new Map(); // idx → Graphics — dark overlay per cell

    if (this._fowRadius > 0) {
      for (const cell of board.cells) {
        if (cell.type === T.VOID) continue;
        const g = new PIXI.Graphics();
        g.beginFill(board.level.night ? 0x010408 : 0x0a1208, board.level.night ? 0.97 : 0.9);
        g.drawRect(cell.c * BASE, cell.r * BASE, BASE, BASE);
        g.endFill();
        this.fowC.addChild(g);
        this._fowCells.set(this.board.idx(cell.c, cell.r), g);
      }
    }

    // 10c. Night: moon and stars above terrain but below fog-of-war
    if (board.level.night) this._buildNightSky(board, TH);

    this._buildSapper(TH);

    // VIP and EXIT markers (after entityC exists)
    for (const cell of board.cells) {
      if (cell.vip)  this.setVIP(cell);
      if (cell.exit) this.setExit(cell);
    }

    // 11. clouds — above terrain, below fog-of-war on night levels
    this._buildClouds(board, TH);
    this._fitCamera();
  }

  _label(parent, str, x, y, TH) {
    const t = new PIXI.Text(str, { fontFamily: 'Consolas, monospace', fontSize: 11, fill: toInt(TH.gridText) });
    t.anchor.set(0.5); t.position.set(x, y); parent.addChild(t);
  }

  // ── procedural pixel-art desert terrain (Sega Dune look) ───────────────────
  // Paints the whole map into one low-res canvas (TILE px per cell) and uploads
  // it as a NEAREST-filtered texture so the camera scales crisp chunky pixels.
  _buildPixelTerrain(board, TH) {
    const TILE = 16;
    const cnv = document.createElement('canvas');
    cnv.width = board.cols * TILE;
    cnv.height = board.rows * TILE;
    const ctx = cnv.getContext('2d');
    const { field, W } = buildHeightField(board);
    const rng = mulberry32((board.seed * 1313 + 7) >>> 0);

    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
    const sampleH = (fx, fy) => {
      fx = Math.max(0, Math.min(board.cols - 1e-3, fx));
      fy = Math.max(0, Math.min(board.rows - 1e-3, fy));
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const a = field[y0 * W + x0], b = field[y0 * W + x0 + 1];
      const c = field[(y0 + 1) * W + x0], d = field[(y0 + 1) * W + x0 + 1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const fill = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
    const DRY = [T.LAND, T.TREE, T.MOUNTAIN, T.BRIDGE];
    const isDry = (c, r) => { const o = board.get(c, r); return o && DRY.includes(o.type); };
    const isW = (c, r) => { const o = board.get(c, r); return o && (o.type === T.WATER || o.type === T.BRIDGE); };
    // round a corner only when it's convex (land on both orthogonal sides); a/b
    // are pixel distances from that corner. Straight river edges stay full width.
    const RND = 7;
    const cut = (a, b) => a < RND && b < RND && (a - RND) ** 2 + (b - RND) ** 2 > RND * RND;

    for (const cell of board.cells) {
      if (cell.type === T.VOID) continue;
      const ox = cell.c * TILE, oy = cell.r * TILE, c = cell.c, r = cell.r;

      if (cell.type === T.WATER) {
        const f = {
          tl: !isW(c - 1, r) && !isW(c, r - 1), tr: !isW(c + 1, r) && !isW(c, r - 1),
          br: !isW(c + 1, r) && !isW(c, r + 1), bl: !isW(c - 1, r) && !isW(c, r + 1),
        };
        const rounded = (px, py) =>
          (f.tl && cut(px, py)) || (f.tr && cut(TILE - 1 - px, py)) ||
          (f.br && cut(TILE - 1 - px, TILE - 1 - py)) || (f.bl && cut(px, TILE - 1 - py));
        for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
          const gx = ox + px, gy = oy + py;
          if (rounded(px, py)) { fill(gx, gy, TH.shore); continue; } // rounded sandy bank
          const rip = Math.sin(gx * 0.45 + gy * 0.25 + r) * 0.5 + 0.5;
          let col = TH.waterDeep;
          if (rip + (bayer(gx, gy) - 0.5) * 0.4 > 0.6) col = TH.water;
          if (rip > 0.93) col = TH.waterRipple;
          fill(gx, gy, col);
        }
        // sandy shore band on edges that touch dry land
        if (isDry(c, r - 1)) for (let px = 0; px < TILE; px++) for (let k = 0; k < 2; k++) fill(ox + px, oy + k, TH.shore);
        if (isDry(c, r + 1)) for (let px = 0; px < TILE; px++) for (let k = 0; k < 2; k++) fill(ox + px, oy + TILE - 1 - k, TH.shore);
        if (isDry(c - 1, r)) for (let py = 0; py < TILE; py++) for (let k = 0; k < 2; k++) fill(ox + k, oy + py, TH.shore);
        if (isDry(c + 1, r)) for (let py = 0; py < TILE; py++) for (let k = 0; k < 2; k++) fill(ox + TILE - 1 - k, oy + py, TH.shore);
        continue;
      }

      // sandy base under every dry tile, shaded by the height field + dithered
      for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
        const gx = ox + px, gy = oy + py;
        const h = sampleH(c + px / TILE, r + py / TILE);
        const shade = (1 - h) + (bayer(gx, gy) - 0.5) * 0.22;
        const idx = Math.max(0, Math.min(TH.sand.length - 1, Math.floor(shade * TH.sand.length)));
        let col = TH.sand[idx];
        if (Math.sin(gx * 0.5 + h * 10 + gy * 0.15) > 0.86 && bayer(gx, gy) > 0.4) col = TH.sandRipple;
        fill(gx, gy, col);
      }

      if (cell.type === T.LAND) {
        for (let s = 0; s < 2; s++) if (rng() < 0.1) {
          const sx = ox + 1 + Math.floor(rng() * (TILE - 2)), sy = oy + 1 + Math.floor(rng() * (TILE - 2));
          fill(sx, sy, TH.spice); if (rng() < 0.5) fill(sx + 1, sy, TH.spice);
        }
      }

      if (cell.type === T.MOUNTAIN) {
        for (let py = 2; py < TILE - 2; py++) for (let px = 2; px < TILE - 2; px++) {
          const gx = ox + px, gy = oy + py;
          const i = (bayer(gx, gy) > 0.5 ? 1 : 0) + (rng() < 0.15 ? 1 : 0);
          fill(gx, gy, TH.rock[Math.min(TH.rock.length - 1, i)]);
        }
        for (let px = 2; px < TILE - 2; px++) { fill(ox + px, oy + 2, TH.rockTop); fill(ox + px, oy + TILE - 3, TH.rockShadow); }
        for (let py = 2; py < TILE - 2; py++) { fill(ox + 2, oy + py, TH.rockTop); fill(ox + TILE - 3, oy + py, TH.rockShadow); }
      }

      if (cell.type === T.TREE) {
        const cx = ox + 8, cy = oy + 10;
        for (let py = -4; py <= 4; py++) for (let px = -4; px <= 4; px++) {
          if (px * px + py * py > 16) continue;
          fill(cx + px, cy + py, (px + py) < 0 ? TH.veg : TH.vegDark);
        }
        fill(cx - 3, cy - 5, TH.veg); fill(cx - 3, cy - 6, TH.veg);
        fill(cx + 3, cy - 4, TH.veg); fill(cx + 3, cy - 5, TH.veg);
      }

      if (cell.type === T.BRIDGE) {
        for (let py = 0; py < TILE; py++) for (let px = 0; px < TILE; px++) {
          fill(ox + px, oy + py, px % 4 === 0 ? TH.bridgePlank : TH.bridge);
        }
      }
    }

    const tex = PIXI.Texture.from(cnv);
    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    const sp = new PIXI.Sprite(tex);
    sp.scale.set(BASE / TILE);
    this.world.addChild(sp);
  }

  // rounded-corner cell path; flags decide which corners round (outer convex)
  _roundedCell(g, x, y, s, R, f) {
    const tl = f.tl ? R : 0, tr = f.tr ? R : 0, br = f.br ? R : 0, bl = f.bl ? R : 0;
    g.moveTo(x + tl, y);
    g.lineTo(x + s - tr, y); if (tr) g.arcTo(x + s, y, x + s, y + tr, tr);
    g.lineTo(x + s, y + s - br); if (br) g.arcTo(x + s, y + s, x + s - br, y + s, br);
    g.lineTo(x + bl, y + s); if (bl) g.arcTo(x, y + s, x, y + s - bl, bl);
    g.lineTo(x, y + tl); if (tl) g.arcTo(x, y, x + tl, y, tl);
    g.closePath();
  }

  _buildWater(board, TH) {
    const isW = (c, r) => { const o = board.get(c, r); return !!o && (o.type === T.WATER || o.type === T.BRIDGE); };
    const cells = board.cells.filter(c => c.type === T.WATER || c.type === T.BRIDGE);
    if (!cells.length) return;
    const flags = c => ({
      tl: !isW(c.c - 1, c.r) && !isW(c.c, c.r - 1),
      tr: !isW(c.c + 1, c.r) && !isW(c.c, c.r - 1),
      br: !isW(c.c + 1, c.r) && !isW(c.c, c.r + 1),
      bl: !isW(c.c - 1, c.r) && !isW(c.c, c.r + 1),
    });
    const R = BASE * 0.46, B = BASE * 0.18;
    const rng = mulberry32((board.seed * 6151 + 91) >>> 0);

    const beach = new PIXI.Graphics();
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE, f = flags(c);
      beach.beginFill(toInt(TH.beach), 0.95);
      this._roundedCell(beach, x - B, y - B, BASE + 2 * B, R + B, f);
      beach.endFill();
    }
    this.world.addChild(beach);

    const water = new PIXI.Graphics();
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE, f = flags(c);
      water.beginFill(toInt(TH.waterDeep));
      this._roundedCell(water, x, y, BASE, R, f);
      water.endFill();
    }
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE, f = flags(c);
      water.beginFill(toInt(TH.water), 0.78);
      this._roundedCell(water, x + 2, y + 2, BASE - 4, R, f);
      water.endFill();
    }
    water.lineStyle({ width: 1.6, color: 0xffffff, alpha: 0.14 });
    for (const c of cells) {
      if (rng() < 0.5) continue;
      const x = c.c * BASE, y = c.r * BASE, yy = y + BASE * (0.4 + rng() * 0.3);
      water.moveTo(x + BASE * 0.2, yy);
      water.quadraticCurveTo(x + BASE * 0.4, yy - BASE * 0.08, x + BASE * 0.6, yy);
      water.quadraticCurveTo(x + BASE * 0.78, yy + BASE * 0.07, x + BASE * 0.85, yy - BASE * 0.02);
    }
    water.lineStyle();
    this.world.addChild(water);
  }

  _buildPaths(board, TH) {
    const isP = (c, r) => { const o = board.get(c, r); return !!o && o.type === T.PATH; };
    const cells = board.cells.filter(c => c.type === T.PATH);
    if (!cells.length) return;

    const flags = c => ({
      tl: !isP(c.c - 1, c.r) && !isP(c.c, c.r - 1),
      tr: !isP(c.c + 1, c.r) && !isP(c.c, c.r - 1),
      br: !isP(c.c + 1, c.r) && !isP(c.c, c.r + 1),
      bl: !isP(c.c - 1, c.r) && !isP(c.c, c.r + 1),
    });

    const R = BASE * 0.40;
    const B = BASE * 0.09; // grass shoulder overhang
    const rng = mulberry32((board.seed * 5381 + 47) >>> 0);

    // 1. Grass shoulder — slightly wider, green tint under the dirt
    const shoulder = new PIXI.Graphics();
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE, f = flags(c);
      shoulder.beginFill(toInt(TH.tree || '#4d7a3f'), 0.55);
      this._roundedCell(shoulder, x - B, y - B, BASE + 2 * B, R + B, f);
      shoulder.endFill();
    }
    this.world.addChild(shoulder);

    // 2. Dirt fill (rounded)
    const dirt = new PIXI.Graphics();
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE, f = flags(c);
      dirt.beginFill(toInt(TH.pathFill || '#c8a87a'));
      this._roundedCell(dirt, x, y, BASE, R, f);
      dirt.endFill();
    }
    // 3. Tyre tracks — direction-aware parallel lines
    dirt.lineStyle({ width: 1.5, color: toInt(TH.pathEdge || '#a0845a'), alpha: 0.38 });
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE;
      const hasT = isP(c.c, c.r - 1), hasB = isP(c.c, c.r + 1);
      const hasL = isP(c.c - 1, c.r), hasR = isP(c.c + 1, c.r);
      const vert = hasT || hasB;
      const horiz = hasL || hasR;
      // vertical tracks
      if (vert || !horiz) {
        const y0 = hasT ? y : y + BASE * 0.28, y1 = hasB ? y + BASE : y + BASE * 0.72;
        dirt.moveTo(x + BASE * 0.28, y0).lineTo(x + BASE * 0.28, y1);
        dirt.moveTo(x + BASE * 0.72, y0).lineTo(x + BASE * 0.72, y1);
      }
      // horizontal tracks
      if (horiz || !vert) {
        const x0 = hasL ? x : x + BASE * 0.28, x1 = hasR ? x + BASE : x + BASE * 0.72;
        dirt.moveTo(x0, y + BASE * 0.28).lineTo(x1, y + BASE * 0.28);
        dirt.moveTo(x0, y + BASE * 0.72).lineTo(x1, y + BASE * 0.72);
      }
    }
    dirt.lineStyle();
    this.world.addChild(dirt);

    // 4. Grass tufts on the verge edges
    const grass = new PIXI.Graphics();
    const gc = toInt(TH.tree || '#4d7a3f');
    for (const c of cells) {
      const x = c.c * BASE, y = c.r * BASE;
      const sides = [];
      if (!isP(c.c - 1, c.r)) sides.push('L');
      if (!isP(c.c + 1, c.r)) sides.push('R');
      if (!isP(c.c, c.r - 1)) sides.push('T');
      if (!isP(c.c, c.r + 1)) sides.push('B');
      for (const side of sides) {
        const n = 2 + Math.floor(rng() * 2); // 2-3 tufts per edge
        for (let i = 0; i < n; i++) {
          let gx, gy;
          if (side === 'L')      { gx = x + BASE * (0.02 + rng() * 0.09); gy = y + BASE * (0.15 + rng() * 0.7); }
          else if (side === 'R') { gx = x + BASE * (0.89 + rng() * 0.09); gy = y + BASE * (0.15 + rng() * 0.7); }
          else if (side === 'T') { gx = x + BASE * (0.15 + rng() * 0.7);  gy = y + BASE * (0.02 + rng() * 0.09); }
          else                   { gx = x + BASE * (0.15 + rng() * 0.7);  gy = y + BASE * (0.89 + rng() * 0.09); }
          const h = BASE * (0.12 + rng() * 0.11);
          const alpha = 0.6 + rng() * 0.4;
          grass.lineStyle({ width: 1.3, color: gc, alpha });
          grass.moveTo(gx, gy).lineTo(gx - BASE * 0.04, gy - h);
          grass.lineStyle({ width: 1.1, color: gc, alpha: alpha * 0.8 });
          grass.moveTo(gx, gy).lineTo(gx + BASE * 0.05, gy - h * 0.85);
        }
      }
    }
    grass.lineStyle();
    this.world.addChild(grass);
  }

  // Animated ripple overlay — a small tiling diagonal-wave pattern shifted each frame.
  _buildWaterAnim(board, TH) {
    const watercells = board.cells.filter(c => c.type === T.WATER || c.type === T.BRIDGE);
    if (!watercells.length) return;

    // Build a 32×32 ripple tile on a Canvas (diagonal dashes, two-tone)
    const SZ = 32;
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = SZ;
    const ctx = cnv.getContext('2d');
    // White diagonal ripple stripes — SCREEN blend makes them pop as bright highlights
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.8;
    for (let i = -SZ; i < SZ * 2; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + SZ, SZ);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 0.9;
    for (let i = -SZ; i < SZ * 2; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i + 5, 0);
      ctx.lineTo(i + SZ + 5, SZ);
      ctx.stroke();
    }

    const tex = PIXI.Texture.from(cnv);

    // Mask: water+bridge cells with 1px overlap to avoid visible grid seams
    const wmask = new PIXI.Graphics().beginFill(0xffffff);
    for (const c of watercells) wmask.drawRect(c.c * BASE - 0.5, c.r * BASE - 0.5, BASE + 1, BASE + 1);
    wmask.endFill();

    const W = board.cols * BASE, H = board.rows * BASE;
    const ts = new PIXI.TilingSprite(tex, W, H);
    ts.mask = wmask;
    ts.blendMode = PIXI.BLEND_MODES.ADD;
    ts.alpha = TH.pixel ? 0.22 : 0.18;
    this.world.addChild(wmask);
    this.world.addChild(ts);
    this._waterRipple = ts;
  }

  // Soft drifting clouds — 3 semi-transparent puffs floating across the map.
  // Fog-of-war: hide/show cells based on distance from sapper (c,r).
  updateFoW(sc, sr) {
    if (!this._fowRadius || !this._fowCells.size) return;
    const R = this._fowRadius;
    for (const [idx, g] of this._fowCells) {
      const cell = this.board.cells[idx];
      const dist = Math.max(Math.abs(cell.c - sc), Math.abs(cell.r - sr)); // Chebyshev
      g.visible = dist > R;
    }
  }

  // Starfield + moon for night levels (added to world, below fowC which covers it).
  _buildNightSky(board, TH) {
    const W = board.cols * BASE, H = board.rows * BASE;
    const sky = new PIXI.Graphics();
    sky.beginFill(0x000810, 0.55).drawRect(-BASE * 2, -BASE * 2, W + BASE * 4, H + BASE * 4).endFill();
    // stars
    const rng = mulberry32((board.seed * 4447 + 13) >>> 0);
    sky.beginFill(0xffffff, 0.9);
    for (let i = 0; i < 60; i++) {
      const sx = rng() * W, sy = rng() * H, sr = 0.5 + rng() * 1.2;
      sky.drawCircle(sx, sy, sr);
    }
    sky.endFill();
    // moon
    const mx = W * 0.82, my = H * 0.12, mr = BASE * 0.9;
    sky.beginFill(0xfff8c8, 0.92).drawCircle(mx, my, mr).endFill();
    sky.beginFill(0xe8e0a8, 0.25).drawCircle(mx - mr * 0.3, my - mr * 0.25, mr * 0.45).endFill();
    sky.beginFill(0xd8d0a0, 0.18).drawCircle(mx + mr * 0.45, my + mr * 0.3, mr * 0.3).endFill();
    this.fowC.addChildAt(sky, 0); // behind the dark overlay cells
  }

  _buildClouds(board, TH) {
    const W = board.cols * BASE, H = board.rows * BASE;
    this._cloudW = W;
    const rng = mulberry32((board.seed * 3571 + 99) >>> 0);
    this._clouds = [];
    // Night levels skip daytime clouds
    if (board.level.night) return;
    const count = 3 + Math.floor(board.cols / 6); // more clouds on bigger maps
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Container();
      const gfx = new PIXI.Graphics();
      const r = (BASE * 0.7 + rng() * BASE * 0.55) | 0;
      gfx.beginFill(0xffffff, 0.55);
      gfx.drawEllipse(0, 0, r * 1.8, r * 0.65);
      gfx.drawEllipse(r * 0.5, -r * 0.28, r * 1.1, r * 0.55);
      gfx.drawEllipse(-r * 0.45, -r * 0.22, r, r * 0.5);
      gfx.endFill();
      gfx.beginFill(0x000000, 0.10);
      gfx.drawEllipse(0, r * 0.35, r * 1.6, r * 0.25);
      gfx.endFill();
      g.addChild(gfx);
      // Spread across full width + some offscreen on both sides
      g.x = rng() * (W + r * 4) - r * 2;
      g.y = H * 0.05 + rng() * H * 0.90;
      g._spd = 0.35 + rng() * 0.45;
      g._r = r;
      this.world.addChild(g);
      this._clouds.push(g);
    }
  }

  _noiseTexture() {
    if (this._noiseTex) return this._noiseTex;
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = 96;
    const ctx = cnv.getContext('2d');
    const img = ctx.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 96 + Math.floor(Math.random() * 110);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this._noiseTex = PIXI.Texture.from(cnv);
    this._noiseTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    return this._noiseTex;
  }

  _addFog(cell, TH) {
    const x = cell.c * BASE, y = cell.r * BASE;
    const g = new PIXI.Graphics();
    g.beginFill(toInt(TH.fog), TH.fogAlpha).drawRect(x, y, BASE, BASE).endFill();
    g.lineStyle({ width: 1.4, color: toInt(TH.fogLine), alpha: 0.5 });
    for (let k = -BASE; k <= BASE; k += 8) {
      const xa = Math.max(0, -k), ya = xa + k;
      const xb = Math.min(BASE, BASE - k), yb = xb + k;
      if (xa <= xb) { g.moveTo(x + xa, y + ya); g.lineTo(x + xb, y + yb); }
    }
    g.lineStyle();
    this.fogC.addChild(g);
    this.fog.set(cell.r * this.board.cols + cell.c, g);
  }

  // ── dynamic updates from game ─────────────────────────────────────────────
  onReveal(cells) {
    const TH = this.theme;
    for (const cell of cells) {
      const key = cell.r * this.board.cols + cell.c;
      const f = this.fog.get(key);
      if (f) { f._fade = true; }
      if (cell.adj > 0 && !cell.mine) {
        const t = new PIXI.Text(String(cell.adj), {
          fontFamily: 'Consolas, monospace', fontSize: 25, fontWeight: '700',
          fill: toInt(TH.num[cell.adj] || '#444'),
          stroke: toInt(TH.numHalo || '#fff'), strokeThickness: 3, lineJoin: 'round',
        });
        t.anchor.set(0.5); t.position.set(cell.c * BASE + BASE / 2, cell.r * BASE + BASE * 0.42);
        this.markersC.addChild(t); this.markers.set(key, t);
      }
    }
  }

  setFlag(cell) {
    const key = cell.r * this.board.cols + cell.c;
    const existing = this.flags.get(key);
    if (!cell.flagged) { if (existing) { existing.destroy(); this.flags.delete(key); } return; }
    if (existing) return;
    const x = cell.c * BASE, y = cell.r * BASE;
    const g = new PIXI.Graphics();
    g.lineStyle({ width: 3, color: 0x2a1a0a }).moveTo(x + BASE * 0.4, y + BASE * 0.28).lineTo(x + BASE * 0.4, y + BASE * 0.76).lineStyle();
    g.beginFill(toInt(this.theme.flag)).drawPolygon([x + BASE * 0.4, y + BASE * 0.28, x + BASE * 0.72, y + BASE * 0.4, x + BASE * 0.4, y + BASE * 0.52]).endFill();
    this.entityC.addChild(g); this.flags.set(key, g);
  }

  setDevice(cell) {
    const key = cell.r * this.board.cols + cell.c;
    if (this.devices.has(key)) return;
    const t = new PIXI.Text('⚠', {
      fontSize: BASE * 0.46, fill: 0xffaa00,
      dropShadow: true, dropShadowDistance: 1, dropShadowColor: 0x000000, dropShadowAlpha: 0.9,
    });
    t.anchor.set(0.5);
    t.position.set(cell.c * BASE + BASE / 2, cell.r * BASE + BASE * 0.44);
    this.entityC.addChild(t);
    this.devices.set(key, t);
  }

  clearDevice(cell) {
    const key = cell.r * this.board.cols + cell.c;
    const icon = this.devices.get(key);
    if (icon) { icon.destroy(); this.devices.delete(key); }
  }

  setVIP(cell) {
    if (this.vipMarker) { this.vipMarker.destroy(); this.vipMarker = null; }
    const x = cell.c * BASE + BASE / 2, y = cell.r * BASE + BASE / 2;
    const ctr = new PIXI.Container();

    // gold glow ring
    const ring = new PIXI.Graphics();
    ring.beginFill(0xffd700, 0.15).drawCircle(0, 0, BASE * 0.42).endFill();
    ring.lineStyle({ width: 2, color: 0xffd700, alpha: 0.75 }).drawCircle(0, 0, BASE * 0.42);
    ctr.addChild(ring);

    const g = new PIXI.Graphics();
    const S = BASE * 0.38; // scale unit

    // head (skin)
    g.beginFill(0xf5c5a3).drawCircle(0, -S * 0.52, S * 0.22).endFill();
    // hair
    g.beginFill(0x3a2a1a).drawEllipse(0, -S * 0.67, S * 0.22, S * 0.1).endFill();

    // jacket body — dark navy trapezoid
    g.beginFill(0x1a2a4a);
    g.drawPolygon([
      -S * 0.28, -S * 0.28,   // top-left shoulder
       S * 0.28, -S * 0.28,   // top-right shoulder
       S * 0.32,  S * 0.44,   // bottom-right
      -S * 0.32,  S * 0.44,   // bottom-left
    ]);
    g.endFill();

    // white shirt / collar V
    g.beginFill(0xffffff);
    g.drawPolygon([
      -S * 0.09, -S * 0.28,
       S * 0.09, -S * 0.28,
       0,         S * 0.06,
    ]);
    g.endFill();

    // left lapel
    g.beginFill(0x1a2a4a);
    g.drawPolygon([
      -S * 0.28, -S * 0.28,
      -S * 0.04, -S * 0.28,
       0,         S * 0.06,
      -S * 0.22,  S * 0.0,
    ]);
    g.endFill();

    // right lapel
    g.beginFill(0x1a2a4a);
    g.drawPolygon([
       S * 0.28, -S * 0.28,
       S * 0.04, -S * 0.28,
       0,         S * 0.06,
       S * 0.22,  S * 0.0,
    ]);
    g.endFill();

    // tie (red, narrow)
    g.beginFill(0xcc2222);
    g.drawPolygon([
      -S * 0.045,  S * 0.06,
       S * 0.045,  S * 0.06,
       S * 0.06,   S * 0.28,
       0,          S * 0.38,
      -S * 0.06,   S * 0.28,
    ]);
    g.endFill();

    ctr.addChild(g);
    ctr.position.set(x, y);
    this.entityC.addChild(ctr);
    this.vipMarker = ctr;
  }

  moveVIP(c, r) {
    if (!this.vipMarker) return;
    this.vipMarker.position.set(c * BASE + BASE / 2, r * BASE + BASE / 2);
  }

  clearVIP() {
    if (this.vipMarker) { this.vipMarker.destroy(); this.vipMarker = null; }
  }

  setExit(cell) {
    if (this.exitMarker) { this.exitMarker.destroy(); this.exitMarker = null; }
    const x = cell.c * BASE + BASE / 2, y = cell.r * BASE + BASE / 2;
    const c = new PIXI.Container();
    // pulsing green glow
    const g = new PIXI.Graphics();
    g.beginFill(0x00ff88, 0.22).drawCircle(0, 0, BASE * 0.46).endFill();
    g.lineStyle({ width: 2.5, color: 0x00ff88, alpha: 0.9 }).drawCircle(0, 0, BASE * 0.46);
    c.addChild(g);
    const t = new PIXI.Text('🚪', {
      fontSize: BASE * 0.50, fill: 0x00ff88,
      dropShadow: true, dropShadowDistance: 1, dropShadowColor: 0x000000, dropShadowAlpha: 0.9,
    });
    t.anchor.set(0.5);
    c.addChild(t);
    c.position.set(x, y);
    // store glow for pulse animation
    c._glow = g;
    this.entityC.addChild(c);
    this.exitMarker = c;
  }

  clearExit() {
    if (this.exitMarker) { this.exitMarker.destroy(); this.exitMarker = null; }
  }

  setLost() {
    const TH = this.theme;
    for (const cell of this.board.cells) {
      if (cell.type !== T.LAND || !cell.mine) continue;
      const key = cell.r * this.board.cols + cell.c;
      const f = this.fog.get(key); if (f) f._fade = true;
      const x = cell.c * BASE + BASE / 2, y = cell.r * BASE + BASE / 2, rr = BASE * 0.24;
      const g = new PIXI.Graphics();
      g.beginFill(toInt(TH.mine)).drawCircle(x, y, rr).endFill();
      g.lineStyle({ width: 3, color: toInt(TH.mine) });
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr * 1.6); }
      g.lineStyle().beginFill(0xffffff).drawCircle(x - rr * 0.3, y - rr * 0.3, rr * 0.25).endFill();
      this.markersC.addChild(g);
    }
  }

  // Update equipment state and rebuild the sapper sprite immediately.
  setSapperEquipment({ hasVest = false, isWounded = false, bagSize = 1 } = {}) {
    this._sapperEquip = { hasVest, isWounded, bagSize };
    if (this.entityC) this.rebuildSapperSkin();
  }

  // ── sapper ────────────────────────────────────────────────────────────────
  _buildSapper(TH) {
    if (this.sapperC) {
      this.entityC.removeChild(this.sapperC);
      this.sapperC.destroy({ children: true });
      this.sapperC = null; this.sapperLegs = null;
    }
    const skin = this.currentSkin || 'default';
    const PAL = {
      default:   { body: toInt(TH.sapperBody), face: toInt(TH.sapperSkin), helmet: toInt(TH.sapperHelmet) },
      ghost:     { body: 0x5080c0, face: 0xd0e8ff, helmet: 0x3060a0, alpha: 0.72 },
      ninja:     { body: 0x111111, face: 0x111111, helmet: 0x1a1a1a, eyeSlit: true },
      racer:     { body: 0xd06010, face: 0xf0b870, helmet: 0xe09020, stripe: true },
      soldier:   { body: 0x2a4520, face: 0xe0b090, helmet: 0x1a3010, camo: true },
      phantom:   { body: 0x2a0850, face: 0xc030d0, helmet: 0x4a0870, moon: true },
      iron:      { body: 0x606070, face: 0xb0b8c0, helmet: 0x404858, rivets: true },
      commander: { body: 0x3a2000, face: 0xf0c060, helmet: 0xb08000, crown: true },
    };
    const p = PAL[skin] || PAL.default;
    const { hasVest = false, isWounded = false, bagSize = 1 } = this._sapperEquip || {};
    const u = BASE / 34;

    const c = new PIXI.Container();
    // shadow
    const sh = new PIXI.Graphics().beginFill(0x000000, 0.28).drawEllipse(0, 18 * u, 12 * u, 5 * u).endFill();

    // ── LEGS (added before body so body renders on top) ──────────────────
    const _makeLeg = () => {
      const lc = new PIXI.Container();
      const lg = new PIXI.Graphics();
      // shin
      lg.beginFill(p.body).drawRoundedRect(-2.2 * u, 0, 4.4 * u, 8 * u, 1.5 * u).endFill();
      // boot
      lg.beginFill(0x1a1a1a).drawRoundedRect(-2.6 * u, 7 * u, 5.4 * u, 2.5 * u, 1 * u).endFill();
      lc.addChild(lg);
      return lc;
    };
    const legL = _makeLeg(); legL.position.set(-3.2 * u, 12 * u);
    const legR = _makeLeg(); legR.position.set( 3.2 * u, 12 * u);

    // ── BAG (peeks left from behind the body) ────────────────────────────
    // bagSize: 1=кульок ATB, 2=котомочка, 3=сумка, 4=рюкзак, 5=великий рюкзак, 6=баул
    const bag = new PIXI.Graphics();
    const bagColors = [0, 0xddeeff, 0xc8a060, 0xa07840, 0x7a6030, 0x5a5020, 0x4a4018];
    const bc = bagColors[Math.max(1, Math.min(6, bagSize))];
    if (bagSize === 1) {
      // кульок ATB — plastic grocery bag hanging from arm
      bag.beginFill(0xd0e8f8, 0.85).drawPolygon([
        -8*u, -1*u,  -15*u, -1*u,  -17*u, 10*u,  -6*u, 10*u,
      ]).endFill();
      // bag mouth/handles
      bag.lineStyle({ width: 1.2*u, color: 0x2070b0 });
      bag.moveTo(-9*u, -1*u).lineTo(-9.5*u, -4*u);
      bag.moveTo(-14*u, -1*u).lineTo(-13.5*u, -4*u);
      bag.lineStyle();
      // ATB red label
      bag.beginFill(0xcc1111).drawRoundedRect(-16*u, 3*u, 9*u, 4*u, 1*u).endFill();
    } else if (bagSize === 2) {
      // котомочка — tiny oval cloth bundle
      bag.beginFill(bc).drawEllipse(-12 * u, 6 * u, 3.5 * u, 4.5 * u).endFill();
      bag.lineStyle({ width: 1 * u, color: 0x000000, alpha: 0.35 });
      bag.drawEllipse(-12 * u, 6 * u, 3.5 * u, 4.5 * u);
      bag.lineStyle();
      bag.lineStyle({ width: 1 * u, color: 0x4a3010 });
      bag.moveTo(-12 * u, 1.5 * u).lineTo(-12 * u, 3 * u);
      bag.moveTo(-14 * u, 3 * u).lineTo(-10 * u, 3 * u);
      bag.lineStyle();
    } else if (bagSize === 3) {
      // сумка — small shoulder bag with flap
      bag.beginFill(bc).drawRoundedRect(-15 * u, 0, 7 * u, 10 * u, 2 * u).endFill();
      bag.beginFill(bc - 0x101010).drawRoundedRect(-15 * u, 0, 7 * u, 4 * u, 2 * u).endFill();
      bag.beginFill(0xd0b060).drawRoundedRect(-12.5 * u, 3.5 * u, 2 * u, 1.5 * u, 0.5 * u).endFill();
      bag.lineStyle({ width: 1.2 * u, color: bc });
      bag.moveTo(-11.5 * u, 0).lineTo(-8.5 * u, -3 * u);
      bag.lineStyle();
    } else if (bagSize === 4) {
      // рюкзак — standard backpack
      bag.beginFill(bc).drawRoundedRect(-16 * u, -3 * u, 8 * u, 14 * u, 3 * u).endFill();
      bag.beginFill(bc - 0x0a0a08).drawRoundedRect(-16 * u, -3 * u, 8 * u, 5 * u, 2 * u).endFill();
      bag.lineStyle({ width: 1 * u, color: 0x8a7040 });
      bag.moveTo(-8 * u, 2 * u).lineTo(-4 * u, 2 * u);
      bag.moveTo(-8 * u, 7 * u).lineTo(-4 * u, 7 * u);
      bag.lineStyle();
      bag.beginFill(0x6a5020).drawRoundedRect(-13.5 * u, -5 * u, 3 * u, 2.5 * u, 1 * u).endFill();
    } else if (bagSize === 5) {
      // великий рюкзак — large with side pocket
      bag.beginFill(bc).drawRoundedRect(-17 * u, -4 * u, 9 * u, 16 * u, 3 * u).endFill();
      bag.beginFill(bc - 0x0c0c08).drawRoundedRect(-19 * u, 1 * u, 4 * u, 8 * u, 2 * u).endFill();
      bag.beginFill(0xc0a040).drawRoundedRect(-17.5 * u, 4 * u, 2 * u, 1.5 * u, 0.5 * u).endFill();
      bag.lineStyle({ width: 1.2 * u, color: 0x7a6030 });
      bag.moveTo(-17 * u, 3 * u).lineTo(-8 * u, 3 * u);
      bag.moveTo(-17 * u, 9 * u).lineTo(-8 * u, 9 * u);
      bag.lineStyle();
      bag.beginFill(0x5a4820).drawRoundedRect(-14 * u, -6 * u, 4 * u, 2.5 * u, 1 * u).endFill();
    } else {
      // баул — massive duffel (bagSize 6)
      bag.beginFill(bc).drawRoundedRect(-19 * u, -5 * u, 11 * u, 18 * u, 3 * u).endFill();
      for (const ry of [0, 4, 8]) {
        bag.lineStyle({ width: 1.2 * u, color: bc - 0x181808 });
        bag.moveTo(-19 * u, ry * u).lineTo(-8 * u, ry * u);
      }
      bag.lineStyle();
      bag.lineStyle({ width: 1.5 * u, color: 0x888880 });
      bag.moveTo(-18 * u, -5 * u).lineTo(-18 * u, 13 * u);
      bag.moveTo(-9 * u, -5 * u).lineTo(-9 * u, 13 * u);
      bag.lineStyle();
      bag.beginFill(0x4a4018).drawRoundedRect(-15 * u, -7 * u, 5 * u, 2.5 * u, 1 * u).endFill();
      bag.beginFill(0x4a4018).drawRoundedRect(-21 * u, 3 * u, 2.5 * u, 6 * u, 1 * u).endFill();
    }

    // ── BODY ─────────────────────────────────────────────────────────────
    const body = new PIXI.Graphics();
    // torso base
    body.beginFill(p.body).drawRoundedRect(-8 * u, -4 * u, 16 * u, 16 * u, 4 * u).endFill();
    if (p.stripe) body.beginFill(0xffffff, 0.28).drawRect(-1.5 * u, -4 * u, 3 * u, 16 * u).endFill();
    if (p.camo) {
      body.beginFill(0x1a3010, 0.6).drawEllipse(-3 * u, 2 * u, 3.5 * u, 2.5 * u).endFill();
      body.beginFill(0x1a3010, 0.6).drawEllipse(4 * u, 6 * u, 2.5 * u, 2 * u).endFill();
    }
    if (p.rivets) {
      for (const [rx, ry] of [[-6 * u, -2 * u], [5 * u, -2 * u], [-6 * u, 8 * u], [5 * u, 8 * u]])
        body.beginFill(0xd0d8e0).drawCircle(rx, ry, 1.2 * u).endFill();
    }
    // face
    body.beginFill(p.face).drawCircle(0, -7 * u, 6.5 * u).endFill();
    if (p.eyeSlit) {
      body.beginFill(0x111111).drawCircle(0, -7 * u, 6.5 * u).endFill();
      body.beginFill(0xff8c00).drawRect(-5 * u, -8.2 * u, 10 * u, 2 * u).endFill();
    }
    // helmet
    body.beginFill(p.helmet).arc(0, -8 * u, 7 * u, Math.PI, 0).endFill();
    body.beginFill(p.helmet).drawRect(-7.5 * u, -9 * u, 15 * u, 2 * u).endFill();
    if (p.crown) {
      body.beginFill(0xffd700);
      body.drawPolygon([-6*u,-15*u,-4*u,-12*u,-2*u,-15*u,0,-12*u,2*u,-15*u,4*u,-12*u,6*u,-15*u,6*u,-9*u,-6*u,-9*u]);
      body.endFill();
    }
    if (p.moon) {
      body.beginFill(0xc0a0ff).drawCircle(2 * u, -12 * u, 2.5 * u).endFill();
      body.beginFill(p.helmet).drawCircle(3.5 * u, -12.5 * u, 1.8 * u).endFill();
    }

    // ── VEST OVERLAY ─────────────────────────────────────────────────────
    if (hasVest) {
      // ceramic plate over torso
      body.beginFill(0x3a3a3a, 0.88).drawRoundedRect(-7 * u, -1 * u, 14 * u, 13 * u, 3 * u).endFill();
      // plate highlights
      body.lineStyle({ width: 1 * u, color: 0x888880, alpha: 0.7 });
      body.drawRoundedRect(-7 * u, -1 * u, 14 * u, 13 * u, 3 * u);
      body.lineStyle();
      // MOLLE strap grid (rows of stitching)
      body.lineStyle({ width: 0.8 * u, color: 0x555550, alpha: 0.6 });
      for (const ry of [2, 5, 8]) {
        body.moveTo(-6 * u, ry * u).lineTo(6 * u, ry * u);
      }
      body.lineStyle();
      // centre buckle
      body.beginFill(0x888880).drawRoundedRect(-1.5 * u, 3 * u, 3 * u, 5 * u, 1 * u).endFill();
      // shoulder guards
      body.beginFill(0x2a2a2a, 0.85).drawRoundedRect(-12 * u, -4 * u, 5 * u, 7 * u, 2 * u).endFill();
      body.beginFill(0x2a2a2a, 0.85).drawRoundedRect(7 * u, -4 * u, 5 * u, 7 * u, 2 * u).endFill();
    }

    // ── CRUTCH or DETECTOR ───────────────────────────────────────────────
    if (isWounded) {
      // metal forearm crutch on left side
      const crutchCol = 0x909090;
      body.lineStyle({ width: 2.5 * u, color: crutchCol });
      body.moveTo(-7 * u, 6 * u).lineTo(-14 * u, 21 * u);   // main shaft
      body.lineStyle({ width: 2 * u, color: crutchCol });
      body.moveTo(-10 * u, 5 * u).lineTo(-6 * u, 7 * u);    // forearm cuff bar
      body.lineStyle({ width: 2 * u, color: 0xc0c0b0 });
      body.moveTo(-12 * u, 4 * u).lineTo(-7 * u, 4 * u);    // handle bar (T-top)
      body.lineStyle();
      // rubber tip
      body.beginFill(0x222220).drawCircle(-14 * u, 21 * u, 1.8 * u).endFill();
    } else {
      // mine detector rod (right hand)
      body.lineStyle({ width: 2 * u, color: 0x2a2a2a }).moveTo(5 * u, 2 * u).lineTo(15 * u, 9 * u);
      body.lineStyle({ width: 2 * u, color: 0xcccccc }).drawEllipse(16 * u, 11 * u, 4.2 * u, 2 * u);
      body.lineStyle();
    }

    // ── PLATFORM (UGV ride) ───────────────────────────────────────────────
    const plat = new PIXI.Graphics();
    plat.beginFill(0x2a2a2a).drawRoundedRect(-13 * u, 11 * u, 26 * u, 5 * u, 2 * u).endFill();
    plat.beginFill(0xffcf3a).drawRect(-13 * u, 11 * u, 26 * u, 1.6 * u).endFill();
    for (const wx of [-9, -3, 3, 9]) {
      plat.beginFill(0x111111).drawCircle(wx * u, 18 * u, 3.6 * u).endFill();
      plat.beginFill(0x555555).drawCircle(wx * u, 18 * u, 1.5 * u).endFill();
    }
    plat.visible = false;

    if (p.alpha) c.alpha = p.alpha;
    // legs behind body; bag behind body (peeks left); platform in front of legs
    c.addChild(sh, legL, legR, bag, plat, body);
    c.visible = false;
    c.scale.set(0.66);
    this.entityC.addChild(c);
    this.sapperC = c; this.sapperBody = body; this.platform = plat;
    this.sapperLegs = [legL, legR];
  }

  rebuildSapperSkin() {
    if (!this.entityC) return;
    const wasVisible = this.sapperC && this.sapperC.visible;
    const pos = this.sapperC ? { x: this.sapperC.position.x, y: this.sapperC.position.y } : null;
    this._buildSapper(this.theme);
    if (wasVisible && pos) {
      this.sapperC.visible = true;
      this.sapperC.position.set(pos.x, pos.y);
    }
  }

  setSapper(px, pr, moving, anim) {
    if (!this.sapperC) return;
    this.sapperC.visible = true;
    // sit in the lower part of the cell so the (raised) number stays readable
    this.sapperC.position.set((px + 0.5) * BASE, (pr + 0.74) * BASE);
    const bob = moving ? Math.sin(anim * 12) * 1.5 : 0;
    this.sapperBody.y = bob;
    if (this.sapperLegs) {
      const isWounded = this._sapperEquip && this._sapperEquip.isWounded;
      const t = anim * 12;
      if (isWounded) {
        // left leg hidden — crutch on that side; only right leg swings
        this.sapperLegs[0].visible = false;
        this.sapperLegs[1].visible = true;
        this.sapperLegs[1].rotation = moving ? Math.sin(t) * 0.30 : 0;
      } else {
        this.sapperLegs[0].visible = true;
        this.sapperLegs[1].visible = true;
        const swing = moving ? 0.32 : 0;
        this.sapperLegs[0].rotation =  Math.sin(t) * swing;
        this.sapperLegs[1].rotation = -Math.sin(t) * swing;
      }
    }
  }

  // ── crater (permanent burnt scar left after a vest-save detonation) ──────
  spawnCrater(c, r) {
    const x = (c + 0.5) * BASE, y = (r + 0.5) * BASE;
    const g = new PIXI.Graphics();
    // outer scorched ring
    g.beginFill(0x1a0f06, 0.80).drawEllipse(x, y + BASE * 0.04, BASE * 0.40, BASE * 0.30).endFill();
    // dark centre pit
    g.beginFill(0x0a0604, 0.92).drawEllipse(x, y + BASE * 0.04, BASE * 0.24, BASE * 0.17).endFill();
    // earthen rim highlight
    g.lineStyle({ width: 2, color: 0x6b4a28, alpha: 0.65 });
    g.drawEllipse(x, y + BASE * 0.04, BASE * 0.40, BASE * 0.30);
    g.lineStyle();
    this.markersC.addChild(g);
  }

  // Lift fog from a single cell (same fade used by onReveal).
  revealFog(c, r) {
    const key = r * this.board.cols + c;
    const f = this.fog.get(key);
    if (f) f._fade = true;
  }

  // Tint the sapper red and fade back to normal over ~1.2 s (damage hit effect).
  sapperHit() {
    if (!this.sapperC) return;
    this.anims.push({
      t: 0, dur: 1.2,
      update: (p) => {
        if (!this.sapperC) return;
        const gb = Math.round(255 * Math.min(1, p * 2.5));
        this.sapperC.tint = (0xff << 16) | (gb << 8) | gb;
      },
      done: () => { if (this.sapperC) this.sapperC.tint = 0xffffff; },
    });
  }

  // ── explosion ─────────────────────────────────────────────────────────────
  spawnExplosion(c, r) {
    const x = (c + 0.5) * BASE, y = (r + 0.5) * BASE;
    const flash = new PIXI.Graphics().beginFill(0xfff2b0).drawCircle(x, y, BASE * 0.7).endFill();
    flash._flash = true; flash._life = 1;
    this.entityC.addChild(flash); this.particles.push(flash);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2, sp = (0.6 + Math.random()) * BASE * 0.06;
      const col = [0xfff2b0, 0xff8c1a, 0xd83a14][i % 3];
      const p = new PIXI.Graphics().beginFill(col).drawCircle(0, 0, BASE * (0.06 + Math.random() * 0.07)).endFill();
      p.position.set(x, y); p._vx = Math.cos(a) * sp; p._vy = Math.sin(a) * sp - 0.5; p._life = 1;
      this.entityC.addChild(p); this.particles.push(p);
    }
  }

  // ── artifact effects ──────────────────────────────────────────────────────
  // marks: [{c,r,mine}] — red ✗ over mines, green ○ over clear cells, fade out.
  echoPing(marks, life = 2.2) {
    for (const m of marks) {
      const x = (m.c + 0.5) * BASE, y = (m.r + 0.5) * BASE, rr = BASE * 0.3;
      const g = new PIXI.Graphics();
      if (m.mine) {
        g.lineStyle({ width: 4, color: 0xff3b30 });
        g.drawCircle(x, y, rr);
        g.moveTo(x - rr * 0.6, y - rr * 0.6).lineTo(x + rr * 0.6, y + rr * 0.6);
        g.moveTo(x + rr * 0.6, y - rr * 0.6).lineTo(x - rr * 0.6, y + rr * 0.6);
      } else {
        g.lineStyle({ width: 3, color: 0x35d07f });
        g.drawCircle(x, y, rr);
      }
      g._ping = true; g._life = life;
      this.entityC.addChild(g); this.particles.push(g);
    }
  }

  thermalPing(rowCounts, colCounts, cols, rows) {
    const style = new PIXI.TextStyle({ fontSize: BASE * 0.44, fill: 0xffd24a, fontWeight: 'bold', dropShadow: true, dropShadowDistance: 2, dropShadowColor: 0x000000, dropShadowAlpha: 0.8 });
    const labels = [];
    for (let r = 0; r < rows; r++) {
      const n = rowCounts[r];
      if (!n) continue;
      const t = new PIXI.Text(String(n), style);
      t.anchor.set(1, 0.5);
      t.x = -4; t.y = (r + 0.5) * BASE;
      this.world.addChild(t); labels.push(t);
    }
    for (let c = 0; c < cols; c++) {
      const n = colCounts[c];
      if (!n) continue;
      const t = new PIXI.Text(String(n), style);
      t.anchor.set(0.5, 1);
      t.x = (c + 0.5) * BASE; t.y = -4;
      this.world.addChild(t); labels.push(t);
    }
    // fade out after 4 seconds
    let age = 0;
    const ticker = PIXI.Ticker.shared;
    const fn = () => {
      age += ticker.deltaMS / 1000;
      const alpha = Math.max(0, 1 - Math.max(0, age - 2.5) / 1.5);
      for (const l of labels) l.alpha = alpha;
      if (age > 4) { for (const l of labels) { l.parent && l.parent.removeChild(l); l.destroy(); } ticker.remove(fn); }
    };
    ticker.add(fn);
  }

  // telescoping manipulator arm extending from sapper to a target cell
  armExtend(fc, fr, tc, tr, onDone) {
    const g = new PIXI.Graphics();
    this.entityC.addChild(g);
    const x0 = (fc + 0.5) * BASE, y0 = (fr + 0.45) * BASE;
    const x1 = (tc + 0.5) * BASE, y1 = (tr + 0.5) * BASE;
    this.anims.push({
      t: 0, dur: 0.6, gfx: g,
      update: (p) => {
        const e = p < 0.65 ? p / 0.65 : 1;                 // extend, then hold
        const xx = x0 + (x1 - x0) * e, yy = y0 + (y1 - y0) * e;
        g.clear();
        g.lineStyle({ width: 6, color: 0x4a4a4a }); g.moveTo(x0, y0); g.lineTo(xx, yy);
        g.lineStyle({ width: 3, color: 0xc8c8c8 }); g.moveTo(x0, y0); g.lineTo(xx, yy);
        g.lineStyle({ width: 3, color: 0x888888 });
        g.beginFill(0x999999).drawCircle(xx, yy, 8).endFill();              // claw head
        const grip = p > 0.55 ? 1 + Math.sin(p * 40) * 0.25 : 1;            // little clamp at the end
        g.beginFill(0xffd24a).drawCircle(xx, yy, 3.4 * grip).endFill();
      },
      done: onDone,
    });
  }

  // recon/defuser drone flying along an arc from sapper to a target cell
  flyDrone(fc, fr, tc, tr, onDone) {
    const t = new PIXI.Text('🛸', { fontSize: 22 });
    t.anchor.set(0.5);
    this.entityC.addChild(t);
    const x0 = (fc + 0.5) * BASE, y0 = (fr + 0.4) * BASE;
    const x1 = (tc + 0.5) * BASE, y1 = (tr + 0.5) * BASE;
    const arc = -BASE * (0.7 + Math.min(3, Math.hypot(tc - fc, tr - fr)) * 0.15);
    this.anims.push({
      t: 0, dur: 0.75, gfx: t,
      update: (p) => {
        t.x = x0 + (x1 - x0) * p;
        t.y = y0 + (y1 - y0) * p + Math.sin(Math.PI * p) * arc;
        t.scale.set(1 - 0.18 * Math.sin(Math.PI * p));
      },
      done: () => { const x = (tc + 0.5) * BASE, y = (tr + 0.5) * BASE; this._dropFlash(x, y); if (onDone) onDone(); },
    });
  }

  _dropFlash(x, y) {
    const f = new PIXI.Graphics().beginFill(0xbfe8ff).drawCircle(x, y, BASE * 0.4).endFill();
    f._flash = true; f._life = 1;
    this.entityC.addChild(f); this.particles.push(f);
  }

  setPlatform(on) { if (this.platform) this.platform.visible = on; }

  // a found-artifact icon floating up from a cell
  showPickup(c, r, icon) {
    const t = new PIXI.Text(icon, { fontSize: 26 });
    t.anchor.set(0.5);
    t.position.set((c + 0.5) * BASE, (r + 0.4) * BASE);
    t._float = true; t._life = 1.4; t._vy = -BASE * 0.012;
    this.entityC.addChild(t); this.particles.push(t);
  }

  // ── per-frame ───────────────────────────────────────────────────────────
  _tick() {
    const dt = this.app.ticker.deltaMS / 1000;
    for (const cb of this.tickCbs) cb(dt);

    // river / water ripple animation
    if (this._waterRipple) {
      this._waterRipple.tilePosition.x += dt * 18;
      this._waterRipple.tilePosition.y += dt * 9;
    }
    // drifting clouds
    if (this._clouds) {
      for (const c of this._clouds) {
        c.x += c._spd;
        if (c.x > this._cloudW + c._r * 2) c.x = -c._r * 2;
      }
    }

    // exit portal pulse
    if (this.exitMarker && this.exitMarker._glow) {
      const pulse = 0.18 + Math.abs(Math.sin(Date.now() / 600)) * 0.15;
      this.exitMarker._glow.alpha = pulse;
    }

    // fog fade-out
    for (const [key, f] of this.fog) {
      if (f._fade) { f.alpha -= dt * 4; if (f.alpha <= 0) { f.destroy(); this.fog.delete(key); } }
    }
    // particles
    if (this.particles.length) {
      for (const p of this.particles) {
        if (p._ping) { p._life -= dt; p.alpha = Math.max(0, Math.min(1, p._life)); continue; }
        if (p._float) { p._life -= dt; p.y += p._vy; p.alpha = Math.max(0, Math.min(1, p._life)); continue; }
        p._life -= dt * (p._flash ? 3 : 1.5);
        if (p._flash) { p.scale.set(1 + (1 - p._life) * 1.4); p.alpha = Math.max(0, p._life); }
        else { p.x += p._vx; p.y += p._vy; p._vy += 0.18; p.alpha = Math.max(0, p._life); }
      }
      this.particles = this.particles.filter(p => { if (p._life <= 0) { p.destroy(); return false; } return true; });
    }
    // timed tween animations
    if (this.anims.length) {
      for (const a of this.anims) { a.t += dt; a.update(Math.min(1, a.t / a.dur)); }
      this.anims = this.anims.filter(a => {
        if (a.t >= a.dur) { if (a.gfx) a.gfx.destroy(); if (a.done) a.done(); return false; }
        return true;
      });
    }
  }
}
