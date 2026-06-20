import { SAPPER_SPEED, T } from './constants.js';
import { t, levelName, toggleLang, lang } from './i18n.js';
import { LEVELS, LEVEL_COUNT, loadProgress, markCompleted, isUnlocked } from './levels.js';
import { Board } from './board.js';
import { PixiRenderer } from './pixiRenderer.js';
import { THEMES, loadTheme, saveTheme, nextTheme } from './themes.js';

const $ = id => document.getElementById(id);

class Game {
  constructor() {
    this.renderer = new PixiRenderer($('stage'));
    this.themeId = loadTheme();
    this.renderer.setTheme(THEMES[this.themeId]);
    this.board = null;
    this.sapper = null;
    this.state = 'SELECT';
    this.level = null;
    this.elapsed = 0;
    this.startTime = -1;
    this.loseTimer = 0;

    this.renderer.onCellTap = (c, r) => this.primaryAction(c, r);
    this.renderer.onCellFlag = (c, r) => this.flagAction(c, r);
    this.renderer.onTick = null;
    this.renderer.tickCbs.push(dt => this._update(dt));

    this._wire();
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());
    this.applyLang();
    this.showSelect();
  }

  _wire() {
    $('btn-back').onclick = () => this.showSelect();
    $('btn-restart').onclick = () => { if (this.level) this.startLevel(this.level); };
    $('lang-toggle').onclick = () => { toggleLang(); this.applyLang(); this.renderSelect(); };
    $('theme-toggle').onclick = () => {
      this.themeId = nextTheme(this.themeId);
      saveTheme(this.themeId);
      this.renderer.setTheme(THEMES[this.themeId]);
      this.updateThemeBtn();
      if (this.board) this._rebuildScene();
    };
    $('ov-next').onclick = () => this.nextLevel();
    $('ov-again').onclick = () => this.startLevel(this.level);
    $('ov-map').onclick = () => this.showSelect();
  }

  applyLang() {
    $('title').textContent = t('title');
    $('btn-back').textContent = t('back');
    $('btn-restart').textContent = t('restart');
    $('lang-toggle').textContent = t('langBtn');
    $('select-title').textContent = t('pickLevel');
    this.updateThemeBtn();
    this.updateHUD();
  }

  updateThemeBtn() {
    $('theme-toggle').textContent = '🎨 ' + THEMES[this.themeId].name[lang];
  }

  // ── level select ────────────────────────────────────────────────────────
  showSelect() {
    this.state = 'SELECT';
    this.board = null; this.sapper = null;
    this.renderer.clear();
    $('select').style.display = 'flex';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'hidden';
    $('hint').style.display = 'none';
    this.renderSelect();
  }

  renderSelect() {
    $('select-title').textContent = t('pickLevel');
    const done = loadProgress();
    const grid = $('level-grid');
    grid.innerHTML = '';
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const unlocked = isUnlocked(id, done);
      const cleared = done.has(id);
      const card = document.createElement('button');
      card.className = 'lvl' + (unlocked ? '' : ' locked') + (cleared ? ' done' : '');
      card.disabled = !unlocked;
      card.innerHTML =
        `<span class="lvl-num">${unlocked ? id : '🔒'}</span>` +
        `<span class="lvl-name">${unlocked ? levelName(id) : t('locked')}</span>` +
        (cleared ? `<span class="lvl-check">✓ ${t('completed')}</span>` : '');
      if (unlocked) card.onclick = () => this.startLevel(LEVELS[id]);
      grid.appendChild(card);
    }
  }

  // ── play ──────────────────────────────────────────────────────────────────
  startLevel(level) {
    this.level = level;
    this.board = new Board(level);
    this.sapper = { px: 0, pr: 0, cell: null, path: null, pathI: 0, moving: false, anim: 0 };
    this.state = 'PLAYING';
    this.startTime = -1;
    this.elapsed = 0;
    this.loseTimer = 0;
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    $('select').style.display = 'none';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'visible';
    $('hint').textContent = t('hintFirst');
    $('hint').style.display = 'block';
    this.updateHUD();
  }

  // rebuild map visuals (theme change) and replay board state
  _rebuildScene() {
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    const revealed = this.board.cells.filter(c => c.type === T.LAND && c.revealed);
    if (revealed.length) this.renderer.onReveal(revealed);
    for (const c of this.board.cells) if (c.flagged) this.renderer.setFlag(c);
    if (this.board.lost) this.renderer.setLost();
    if (this.sapper.cell) this.renderer.setSapper(this.sapper.px, this.sapper.pr, false, 0);
  }

  nextLevel() {
    const id = this.level.id + 1;
    if (id <= LEVEL_COUNT && isUnlocked(id)) this.startLevel(LEVELS[id]);
    else this.showSelect();
  }

  primaryAction(c, r) {
    if (this.state !== 'PLAYING' || this.sapper.moving) return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell) return;

    if (!b.minesPlaced) {
      if (cell.type !== T.LAND) return;
      b.placeMines(c, r);
      this.startTime = this.elapsed;
      this.sapper.px = c; this.sapper.pr = r; this.sapper.cell = cell;
      this.renderer.setSapper(c, r, false, 0);
      this._revealAt(c, r);
      $('hint').textContent = t('hintMove');
      this.updateHUD();
      return;
    }

    if (cell.type !== T.LAND || cell.revealed || cell.flagged) return;
    const path = b.pathTo(this.sapper.cell.c, this.sapper.cell.r, c, r);
    if (!path) { this._flashHint(); return; }
    this.sapper.action = 'reveal';
    this.sapper.path = path;
    this.sapper.pathI = 1;
    this.sapper.target = cell;
    this.sapper.moving = path.length > 1;
    if (!this.sapper.moving) this._arrive();
  }

  flagAction(c, r) {
    if (this.state !== 'PLAYING' || !this.board.minesPlaced || this.sapper.moving) return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) return;
    // un-flagging is instant; flagging walks the sapper up to a bordering cell
    // so he never steps onto the cell he suspects is mined.
    if (cell.flagged) { cell.flagged = false; this.renderer.setFlag(cell); this.updateHUD(); return; }
    const sp = this.sapper;
    let best = null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = b.get(c + dc, r + dr);
      if (!b.standable(n)) continue;
      const path = b.pathTo(sp.cell.c, sp.cell.r, n.c, n.r);
      if (path && (!best || path.length < best.length)) best = path;
    }
    if (!best) { this._flashHint(); return; }
    sp.action = 'flag';
    sp.flagTarget = cell;
    sp.path = best;
    sp.pathI = 1;
    sp.target = b.get(best[best.length - 1][0], best[best.length - 1][1]);
    sp.moving = best.length > 1;
    if (!sp.moving) this._arrive();
  }

  _arrive() {
    const sp = this.sapper;
    const tgt = sp.target;
    sp.cell = tgt;
    sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    if (sp.action === 'flag') {
      const fc = sp.flagTarget; sp.flagTarget = null; sp.action = null;
      if (fc && !fc.revealed) { fc.flagged = true; this.renderer.setFlag(fc); this.updateHUD(); }
      return;
    }
    sp.action = null;
    this._revealAt(tgt.c, tgt.r);
  }

  _revealAt(c, r) {
    const b = this.board;
    const cell = b.get(c, r);
    if (cell.mine) { this._boom(c, r); return; }
    const out = b.reveal(c, r);
    this.renderer.onReveal(out);
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _boom(c, r) {
    this.state = 'OVER';
    this.board.lost = true;
    this.renderer.spawnExplosion(c, r);
    this.renderer.setLost();
    this.loseTimer = 0.85;
  }

  _win() {
    this.state = 'OVER';
    markCompleted(this.level.id);
    this._showOverlay(true);
  }

  _showOverlay(won) {
    $('overlay').style.display = 'flex';
    $('ov-icon').textContent = won ? '🎖️' : '💥';
    $('ov-title').textContent = won ? t('win') : t('lose');
    $('ov-text').textContent = won ? t('winSub') : t('loseSub');
    const hasNext = won && this.level.id < LEVEL_COUNT && isUnlocked(this.level.id + 1);
    $('ov-next').style.display = hasNext ? 'inline-block' : 'none';
    $('ov-next').textContent = t('next');
    $('ov-again').textContent = t('again');
    $('ov-map').textContent = t('toMap');
    if (won) this.renderSelect();
  }

  _flashHint() {
    const h = $('hint');
    h.style.color = '#ff6b6b';
    setTimeout(() => { h.style.color = ''; }, 250);
  }

  updateHUD() {
    const b = this.board;
    const mines = b && b.minesPlaced ? Math.max(0, b.mineCount - b.flagCount()) : (b ? '?' : 0);
    $('stat-mines').textContent = `💣 ${mines}`;
    $('stat-flags').textContent = `🚩 ${b ? b.flagCount() : 0}`;
    $('stat-time').textContent = `⏱ ${this._fmt(this.startTime < 0 ? 0 : this.elapsed - this.startTime)}`;
  }

  _fmt(sec) {
    const s = Math.floor(sec);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  _update(dt) {
    if (this.state === 'PLAYING' && this.startTime >= 0) {
      this.elapsed += dt;
      this._hudAcc = (this._hudAcc || 0) + dt;
      if (this._hudAcc > 0.25) { this._hudAcc = 0; this.updateHUD(); }
    }

    const sp = this.sapper;
    if (sp && sp.moving && sp.path) {
      sp.anim += dt;
      const tgt = sp.path[sp.pathI];
      const dx = tgt[0] - sp.px, dy = tgt[1] - sp.pr;
      const dist = Math.hypot(dx, dy);
      const step = SAPPER_SPEED * dt;
      if (dist <= step) {
        sp.px = tgt[0]; sp.pr = tgt[1]; sp.pathI++;
        if (sp.pathI >= sp.path.length) this._arrive();
      } else {
        sp.px += (dx / dist) * step; sp.pr += (dy / dist) * step;
      }
      this.renderer.setSapper(sp.px, sp.pr, true, sp.anim);
    }

    if (this.loseTimer > 0) {
      this.loseTimer -= dt;
      if (this.loseTimer <= 0) this._showOverlay(false);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
