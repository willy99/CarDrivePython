// ── Level Editor for Бабум/Miner ─────────────────────────────────────────────
import { T } from './constants.js?v=10';

const LS_KEY  = 'miner_custom_levels';
const CELL    = 28;   // px per grid cell in editor

const TOOLS = [
  { type: T.LAND,     label: 'Land',     color: '#3d5e42', icon: '🌿' },
  { type: T.VOID,     label: 'Void',     color: '#0a1209', icon: '⬛' },
  { type: T.TREE,     label: 'Tree',     color: '#1e5c30', icon: '🌲' },
  { type: T.MOUNTAIN, label: 'Mountain', color: '#6b6359', icon: '⛰' },
  { type: T.WATER,    label: 'Water',    color: '#1d4e88', icon: '🌊' },
  { type: T.BRIDGE,   label: 'Bridge',   color: '#8a5a28', icon: '🌉' },
  { type: T.PATH,     label: 'Path',     color: '#b8985a', icon: '🛤' },
];
const TYPE_COLOR = Object.fromEntries(TOOLS.map(t => [t.type, t.color]));

// ── localStorage helpers ───────────────────────────────────────────────────
export function loadCustomLevels() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function saveLS(levels) { localStorage.setItem(LS_KEY, JSON.stringify(levels)); }

// ── inline style snippets ──────────────────────────────────────────────────
const S = {
  inp: 'display:block;width:100%;margin-top:3px;padding:5px 7px;box-sizing:border-box;' +
       'background:#0d1f17;color:#c8e8c8;border:1px solid #2d4a35;border-radius:5px;font-size:.78rem;',
  btn: 'padding:7px 10px;border-radius:7px;border:1px solid #2d4a35;background:#0d1f17;' +
       'color:#c8e8c8;font-size:.78rem;cursor:pointer;width:100%;text-align:center;',
  lbl: 'display:block;font-size:.78rem;color:#8aaa88;margin-bottom:6px;',
  sec: 'font-weight:800;font-size:.82rem;color:#a0c8a0;margin:8px 0 4px;',
};

// ── LevelEditor ───────────────────────────────────────────────────────────
export class LevelEditor {
  constructor(onTest) {
    this.onTest   = onTest;
    this.cols     = 14;
    this.rows     = 13;
    this.map      = [];
    this.tool     = T.LAND;
    this.painting = false;
    this.editId   = null;
    this._canvas  = null;
    this._ctx     = null;
    this._built   = false;
  }

  // ── public ──────────────────────────────────────────────────────────────
  open(levelDef = null) {
    if (!this._built) this._build();
    if (levelDef) this._loadDef(levelDef);
    else { this._freshMap(); this._syncForm(); }
    const modal = document.getElementById('editor-modal');
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.7);' +
                          'align-items:center;justify-content:center;padding:10px;';
    this._render();
    this._refreshSavedList();
  }

  close() {
    document.getElementById('editor-modal').style.display = 'none';
  }

  // ── build DOM (once) ────────────────────────────────────────────────────
  _build() {
    this._built = true;
    const box  = document.getElementById('editor-box');
    box.style.cssText = 'display:flex;flex-direction:column;width:min(96vw,1100px);height:min(94vh,780px);' +
                        'background:#0d1a12;border:2px solid #2d4a35;border-radius:14px;overflow:hidden;';

    const hdr = document.getElementById('editor-header');
    hdr.style.cssText = 'display:flex;align-items:center;padding:10px 16px;background:#0a150e;' +
                        'border-bottom:1px solid #2d4a35;flex-shrink:0;';
    document.getElementById('editor-title').style.cssText = 'font-size:1rem;font-weight:800;color:#c8e8c8;flex:1;';
    document.getElementById('btn-editor-close').style.cssText =
      'background:none;border:1px solid #2d4a35;color:#88aa88;border-radius:6px;padding:2px 9px;cursor:pointer;font-size:.9rem;';
    document.getElementById('btn-editor-close').onclick = () => this.close();

    const body = document.getElementById('editor-body');
    body.style.cssText = 'display:flex;flex-direction:row;flex:1;overflow:hidden;gap:0;';

    // ── Left panel ──────────────────────────────────────────────────────
    const left = this._el('div',
      'flex:0 0 210px;display:flex;flex-direction:column;gap:0;overflow-y:auto;padding:12px;' +
      'border-right:1px solid #1e3a28;background:#0b1810;');
    left.innerHTML = `
<div style="${S.sec}">⚙️ Map</div>
<label style="${S.lbl}">Name<input id="ed-name" placeholder="My Level" style="${S.inp}"></label>
<div style="display:flex;gap:6px;margin-bottom:8px;">
  <label style="flex:1;${S.lbl}">Cols<input id="ed-cols" type="number" min="6" max="32" value="14" style="${S.inp}"></label>
  <label style="flex:1;${S.lbl}">Rows<input id="ed-rows" type="number" min="5" max="26" value="13" style="${S.inp}"></label>
</div>
<button id="ed-resize" style="${S.btn}margin-bottom:10px;">↔ Resize grid</button>

<div style="${S.sec}">🕹 Mode</div>
<label style="${S.lbl}">Goal type<select id="ed-goal" style="${S.inp}margin-bottom:8px;">
  <option value="clear">💣 Minesweeper</option>
  <option value="ambush">🎯 Ambush (ворог наступає)</option>
</select></label>

<div id="ed-clear-section">
  <label style="${S.lbl}">Mine density<input id="ed-density" type="number" min="5" max="30" value="15" style="${S.inp}"> %</label>
</div>

<div id="ed-ambush-section" style="display:none;">
<label style="${S.lbl}">Enemy side<select id="ed-side" style="${S.inp}">
  <option value="left">← Left</option><option value="right">→ Right</option>
  <option value="top">↑ Top</option><option value="bottom">↓ Bottom</option>
</select></label>
<div style="display:flex;gap:6px;margin-bottom:6px;">
  <label style="flex:1;${S.lbl}">Enemies<input id="ed-ecount" type="number" min="1" max="20" value="3" style="${S.inp}"></label>
  <label style="flex:1;${S.lbl}">Mines<input id="ed-mines" type="number" min="1" max="30" value="8" style="${S.inp}"></label>
</div>
<label style="${S.lbl}">AI tier<select id="ed-tier" style="${S.inp}margin-bottom:8px;">
  <option value="1">1 — Basic</option><option value="2">2 — Smart</option><option value="3">3 — Expert</option>
</select></label>
</div>

<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
  <button id="ed-new"    style="${S.btn}">✨ New map</button>
  <button id="ed-save"   style="${S.btn}background:#112a1a;">💾 Save</button>
  <button id="ed-test"   style="${S.btn}background:#0f1e2a;">▶ Test in game</button>
  <button id="ed-export" style="${S.btn}background:#1e1a0a;">📋 Export JSON</button>
</div>

<div style="${S.sec}">📂 Saved maps</div>
<div id="ed-saved-list" style="display:flex;flex-direction:column;gap:4px;"></div>`;
    body.appendChild(left);

    // ── Right panel ─────────────────────────────────────────────────────
    const right = this._el('div', 'flex:1;display:flex;flex-direction:column;overflow:hidden;');

    // Tools bar
    const toolbar = this._el('div',
      'display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid #1e3a28;flex-shrink:0;');
    TOOLS.forEach(t => {
      const b = this._el('button',
        `padding:5px 11px;border-radius:6px;border:2px solid ${t.color};background:${t.color}33;` +
        'color:#e8f0e8;font-size:.78rem;cursor:pointer;font-weight:700;transition:outline .1s;');
      b.id = 'ed-tool-' + t.type;
      b.textContent = t.icon + ' ' + t.label;
      b.onclick = () => this._selectTool(t.type);
      toolbar.appendChild(b);
    });

    // Hint
    const hint = this._el('span',
      'margin-left:auto;font-size:.7rem;color:#556;align-self:center;padding-right:4px;');
    hint.textContent = 'Click/drag to paint · Right-click = Void';
    toolbar.appendChild(hint);
    right.appendChild(toolbar);

    // Canvas scroll area
    const wrap = this._el('div', 'flex:1;overflow:auto;background:#060e08;');
    const cv = document.createElement('canvas');
    cv.id = 'ed-canvas';
    cv.style.cssText = 'display:block;cursor:crosshair;image-rendering:pixelated;';
    wrap.appendChild(cv);
    right.appendChild(wrap);
    body.appendChild(right);

    // Export textarea (floats on top)
    const expArea = document.createElement('textarea');
    expArea.id = 'ed-export-area';
    expArea.style.cssText = 'display:none;position:fixed;inset:60px;z-index:800;background:#0d1a12;' +
      'color:#a0c8a0;border:2px solid #2d4a35;border-radius:10px;padding:14px;' +
      'font-family:monospace;font-size:.73rem;resize:none;';
    expArea.setAttribute('readonly', true);
    document.body.appendChild(expArea);
    expArea.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => { expArea.style.display = 'none'; });

    this._canvas = cv;
    this._ctx = cv.getContext('2d');

    // Wire events
    document.getElementById('ed-resize').onclick  = () => this._resize();
    document.getElementById('ed-new').onclick     = () => { this._freshMap(); this._syncForm(); this._render(); this._refreshSavedList(); };
    document.getElementById('ed-goal').onchange   = () => this._syncModeVisibility();
    document.getElementById('ed-save').onclick   = () => this._save();
    document.getElementById('ed-test').onclick   = () => this._test();
    document.getElementById('ed-export').onclick = () => this._export();

    cv.addEventListener('pointerdown', e => {
      this.painting = true;
      this._paint(e, e.button === 2 ? T.VOID : null);
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => { if (this.painting) this._paint(e); });
    cv.addEventListener('pointerup',   () => { this.painting = false; });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); this._paint(e, T.VOID); });

    this._freshMap();
    this._selectTool(T.LAND);
  }

  _el(tag, css) {
    const el = document.createElement(tag);
    el.style.cssText = css;
    return el;
  }

  // ── tools ────────────────────────────────────────────────────────────────
  _selectTool(type) {
    this.tool = type;
    TOOLS.forEach(t => {
      const b = document.getElementById('ed-tool-' + t.type);
      if (b) b.style.outline = t.type === type ? '2px solid #fff' : 'none';
    });
  }

  // ── paint ────────────────────────────────────────────────────────────────
  _cellAt(e) {
    const r = this._canvas.getBoundingClientRect();
    const sx = this._canvas.width / r.width, sy = this._canvas.height / r.height;
    const c = Math.floor((e.clientX - r.left) * sx / CELL);
    const row = Math.floor((e.clientY - r.top)  * sy / CELL);
    if (c >= 0 && c < this.cols && row >= 0 && row < this.rows) return { c, r: row };
    return null;
  }

  _paint(e, forceTool) {
    const pos = this._cellAt(e);
    if (!pos) return;
    const type = forceTool !== undefined ? forceTool : this.tool;
    const k = pos.r * this.cols + pos.c;
    if (this.map[k] === type) return;
    this.map[k] = type;
    this._drawCell(pos.c, pos.r);
  }

  // ── render ───────────────────────────────────────────────────────────────
  _render() {
    const cv = this._canvas;
    cv.width  = this.cols * CELL;
    cv.height = this.rows * CELL;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        this._drawCell(c, r);
  }

  _drawCell(c, r) {
    const ctx = this._ctx;
    const type = this.map[r * this.cols + c];
    const x = c * CELL, y = r * CELL, S2 = CELL / 2;

    ctx.fillStyle = TYPE_COLOR[type] || '#111';
    ctx.fillRect(x, y, CELL, CELL);

    // Grid line
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + .25, y + .25, CELL - .5, CELL - .5);

    // Type icons
    ctx.save();
    if (type === T.TREE) {
      ctx.fillStyle = '#4fbe6a';
      ctx.beginPath(); ctx.arc(x + S2, y + S2 - 1, CELL * .24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a6e3e'; ctx.fillRect(x + S2 - 2, y + CELL - 7, 4, 6);
    } else if (type === T.MOUNTAIN) {
      ctx.fillStyle = '#b0a898';
      ctx.beginPath();
      ctx.moveTo(x + 3, y + CELL - 3); ctx.lineTo(x + S2, y + 3); ctx.lineTo(x + CELL - 3, y + CELL - 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ddd'; ctx.beginPath();
      ctx.moveTo(x + S2 - 4, y + 10); ctx.lineTo(x + S2, y + 3); ctx.lineTo(x + S2 + 4, y + 10);
      ctx.closePath(); ctx.fill();
    } else if (type === T.WATER) {
      ctx.fillStyle = '#5090d8';
      for (let i = 0; i < 3; i++) {
        const wy = y + 5 + i * 7;
        ctx.beginPath(); ctx.moveTo(x + 2, wy);
        ctx.bezierCurveTo(x + CELL/4, wy - 3, x + CELL * .75, wy + 3, x + CELL - 2, wy);
        ctx.lineWidth = 2; ctx.strokeStyle = '#5090d8'; ctx.stroke();
      }
    } else if (type === T.BRIDGE) {
      ctx.fillStyle = '#c89060'; ctx.fillRect(x + 2, y + S2 - 4, CELL - 4, 8);
      ctx.fillStyle = '#7a4a18';
      for (let bx = x + 4; bx < x + CELL - 2; bx += 6) ctx.fillRect(bx, y + S2 - 4, 3, 8);
    } else if (type === T.PATH) {
      ctx.fillStyle = '#d4b870'; ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      ctx.fillStyle = '#b89850';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 6 + i * 7, y + 8, 4, CELL - 16);
    } else if (type === T.VOID) {
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }
    ctx.restore();
  }

  // ── state helpers ─────────────────────────────────────────────────────────
  _freshMap() {
    this.map = Array(this.cols * this.rows).fill(T.LAND);
    this.editId = null;
  }

  _resize() {
    const nc = Math.max(6, Math.min(32, +document.getElementById('ed-cols').value || 14));
    const nr = Math.max(5, Math.min(26, +document.getElementById('ed-rows').value || 13));
    const old = this.map, oc = this.cols, or = this.rows;
    this.cols = nc; this.rows = nr;
    this.map = Array(nc * nr).fill(T.LAND);
    for (let r = 0; r < Math.min(or, nr); r++)
      for (let c = 0; c < Math.min(oc, nc); c++)
        this.map[r * nc + c] = old[r * oc + c];
    this._render();
  }

  _syncForm() {
    document.getElementById('ed-cols').value    = this.cols;
    document.getElementById('ed-rows').value    = this.rows;
    document.getElementById('ed-name').value    = '';
    document.getElementById('ed-goal').value    = 'clear';
    document.getElementById('ed-density').value = 15;
    document.getElementById('ed-side').value    = 'left';
    document.getElementById('ed-ecount').value  = 3;
    document.getElementById('ed-mines').value   = 8;
    document.getElementById('ed-tier').value    = 1;
    this._syncModeVisibility();
  }

  _syncModeVisibility() {
    const isAmbush = document.getElementById('ed-goal').value === 'ambush';
    document.getElementById('ed-ambush-section').style.display = isAmbush ? '' : 'none';
    document.getElementById('ed-clear-section').style.display  = isAmbush ? 'none' : '';
  }

  _readForm() {
    const goalType = document.getElementById('ed-goal').value;
    return {
      name:        document.getElementById('ed-name').value.trim() || 'Custom Level',
      cols:        this.cols,
      rows:        this.rows,
      goalType,
      density:     Math.max(0.05, Math.min(0.30, (+document.getElementById('ed-density').value || 15) / 100)),
      enemySide:   document.getElementById('ed-side').value,
      enemyCount:  Math.max(1, +document.getElementById('ed-ecount').value || 3),
      minesBudget: Math.max(1, +document.getElementById('ed-mines').value || 8),
      aiTier:      +document.getElementById('ed-tier').value || 1,
    };
  }

  _toLevelDef(id, form) {
    const def = {
      id,
      name:      form.name,
      cols:      form.cols,
      rows:      form.rows,
      shape:     'rect',
      density:   form.goalType === 'ambush' ? 0 : form.density,
      terrain:   {},
      goalType:  form.goalType,
      custom:    true,
      customMap: [...this.map],
    };
    if (form.goalType === 'ambush') {
      def.minesBudget = form.minesBudget;
      def.enemyCount  = form.enemyCount;
      def.enemySide   = form.enemySide;
      def.aiTier      = form.aiTier;
    }
    return def;
  }

  _loadDef(def) {
    this.cols   = def.cols;
    this.rows   = def.rows;
    this.map    = [...(def.customMap || Array(def.cols * def.rows).fill(T.LAND))];
    this.editId = def.id;
    document.getElementById('ed-cols').value     = def.cols;
    document.getElementById('ed-rows').value     = def.rows;
    document.getElementById('ed-name').value     = def.name || '';
    document.getElementById('ed-goal').value     = def.goalType || 'clear';
    document.getElementById('ed-density').value  = Math.round((def.density || 0.15) * 100);
    document.getElementById('ed-side').value     = def.enemySide   || 'left';
    document.getElementById('ed-ecount').value   = def.enemyCount  || 3;
    document.getElementById('ed-mines').value    = def.minesBudget || 8;
    document.getElementById('ed-tier').value     = def.aiTier      || 1;
    this._syncModeVisibility();
  }

  // ── persistence ───────────────────────────────────────────────────────────
  _save() {
    const form = this._readForm();
    const id   = this.editId || ('custom_' + Date.now());
    const def  = this._toLevelDef(id, form);
    const all  = loadCustomLevels();
    const i    = all.findIndex(l => l.id === id);
    if (i >= 0) all[i] = def; else all.push(def);
    saveLS(all);
    this.editId = id;
    this._refreshSavedList();
    this._flash('💾 Saved!');
  }

  _delete(id) {
    saveLS(loadCustomLevels().filter(l => l.id !== id));
    if (this.editId === id) { this._freshMap(); this._syncForm(); this._render(); }
    this._refreshSavedList();
  }

  _refreshSavedList() {
    const list = document.getElementById('ed-saved-list');
    if (!list) return;
    const levels = loadCustomLevels();
    list.innerHTML = '';
    if (!levels.length) {
      list.innerHTML = '<span style="font-size:.72rem;color:#445">No saved levels yet</span>';
      return;
    }
    levels.forEach(lv => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;align-items:center;';
      const nb = document.createElement('button');
      nb.textContent = lv.name || lv.id;
      nb.title = `${lv.cols}×${lv.rows}, ${lv.enemyCount} enemies, tier ${lv.aiTier}`;
      nb.style.cssText = `flex:1;${S.btn}font-size:.72rem;text-align:left;padding:4px 7px;` +
        (this.editId === lv.id ? 'background:#1a3a28;border-color:#4a8a5a;' : '');
      nb.onclick = () => { this._loadDef(lv); this._render(); this._refreshSavedList(); };
      const del = document.createElement('button');
      del.textContent = '✕';
      del.style.cssText = 'padding:3px 7px;border-radius:5px;border:none;background:#3a1010;color:#f87;font-size:.7rem;cursor:pointer;flex-shrink:0;';
      del.onclick = () => { if (confirm('Delete "' + (lv.name || lv.id) + '"?')) this._delete(lv.id); };
      row.append(nb, del);
      list.appendChild(row);
    });
  }

  // ── actions ───────────────────────────────────────────────────────────────
  _test() {
    const form = this._readForm();
    const def  = this._toLevelDef(this.editId || ('preview_' + Date.now()), form);
    this.close();
    this.onTest(def);
  }

  _export() {
    const form = this._readForm();
    const id   = this.editId || ('custom_' + Date.now());
    const def  = this._toLevelDef(id, form);
    // Format as JS object for easy copy-paste into levels.js
    const rows2d = [];
    for (let r = 0; r < this.rows; r++) {
      const row = this.map.slice(r * this.cols, (r + 1) * this.cols).map(t => `'${t}'`);
      rows2d.push('    [' + row.join(', ') + ']');
    }
    const jsCode =
`// ── Add to levels.js ─────────────────────────────────────────────────────
// (bump LEVEL_COUNT and add to LEVELS array)
{
  id: ${JSON.stringify(id)}, name: '${def.name}',
  cols: ${def.cols}, rows: ${def.rows},
  shape: 'rect', density: 0, terrain: {},
  goalType: 'ambush',
  minesBudget: ${def.minesBudget},
  enemyCount:  ${def.enemyCount},
  enemySide:   '${def.enemySide}',
  aiTier:      ${def.aiTier},
  custom:      true,
  customMap: [
${rows2d.join(',\n')}
  ].flat(),
},`;
    const area = document.getElementById('ed-export-area');
    area.value = jsCode;
    area.style.display = 'block';
    area.focus(); area.select();
    try { document.execCommand('copy'); this._flash('📋 Copied!'); } catch {}
  }

  _flash(msg) {
    const b = document.getElementById('ed-save');
    if (!b) return;
    const orig = b.textContent;
    b.textContent = msg;
    setTimeout(() => { b.textContent = orig; }, 1600);
  }
}
