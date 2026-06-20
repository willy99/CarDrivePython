import { SAPPER_SPEED, T } from './constants.js';
import { t, levelName, toggleLang, lang } from './i18n.js';
import { LEVELS, LEVEL_COUNT, loadProgress, markCompleted, isUnlocked } from './levels.js';
import { Board } from './board.js';
import { PixiRenderer } from './pixiRenderer.js';
import { THEMES, loadTheme, saveTheme, nextTheme } from './themes.js';
import { Sound, isMuted, toggleMute } from './audio.js';
import { loadClears, addClear, rankFor, rankName, rankStars } from './ranks.js';
import { ARTIFACTS, ARTIFACT_IDS, artifactName, artifactDesc, loadStash, addArtifact, consumeArtifact, loadEquip, toggleEquip } from './artifacts.js';

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

    this.loadout = [];        // artifact ids carried into the current op (≤2)
    this.toolUses = [];        // per-slot remaining-use flags
    this.targetMode = null;    // 'drone' | 'probe' when a tool awaits a tap
    this.probeArmed = false;
    this.detectorReady = false;
    this._stepAcc = 0;

    this.renderer.onCellTap = (c, r) => this.primaryAction(c, r);
    this.renderer.onCellFlag = (c, r) => this.flagAction(c, r);
    this.renderer.onTick = null;
    this.renderer.tickCbs.push(dt => this._update(dt));

    // browsers need a user gesture to start audio
    window.addEventListener('pointerdown', () => Sound.resume(), { once: true });

    this._wire();
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());
    this.applyLang();
    this.showSelect();
  }

  _wire() {
    $('btn-back').onclick = () => this.showSelect();
    $('btn-restart').onclick = () => { Sound.click(); if (this.level) this.startLevel(this.level); };
    $('mute-toggle').onclick = () => { const m = toggleMute(); if (!m) Sound.click(); this.updateMuteBtn(); };
    $('lang-toggle').onclick = () => { Sound.click(); toggleLang(); this.applyLang(); this.renderSelect(); };
    $('theme-toggle').onclick = () => {
      Sound.click();
      this.themeId = nextTheme(this.themeId);
      saveTheme(this.themeId);
      this.renderer.setTheme(THEMES[this.themeId]);
      this.updateThemeBtn();
      if (this.board) this._rebuildScene();
    };
    $('ov-next').onclick = () => this.nextLevel();
    $('ov-again').onclick = () => this.startLevel(this.level);
    $('ov-map').onclick = () => this.showSelect();
    $('btn-stash-close').onclick = () => this.hideStashModal();
    $('stash-modal').onclick = e => { if (e.target === $('stash-modal')) this.hideStashModal(); };
    this._cheatBuf = '';
    window.addEventListener('keydown', e => {
      this._cheatBuf = (this._cheatBuf + e.key).toLowerCase().slice(-5);
      if (this._cheatBuf === 'iddqd') {
        this._cheatBuf = '';
        for (const id of ARTIFACT_IDS) addArtifact(id, 3);
        this.showToast('💀 IDDQD — всі артефакти отримано!');
        if (this.state === 'SELECT') this.renderSelect();
      }
    });
  }

  _getMode() { return localStorage.getItem('miner_mode') || 'arcade'; }
  _setMode(m) { localStorage.setItem('miner_mode', m); }

  showStashModal() {
    $('stash-modal-title').textContent = t('gear');
    this.renderStashPanel();
    $('stash-modal').classList.add('open');
  }

  hideStashModal() {
    $('stash-modal').classList.remove('open');
  }

  applyLang() {
    $('title').textContent = t('title');
    $('btn-back').textContent = t('back');
    $('btn-restart').textContent = t('restart');
    $('lang-toggle').textContent = t('langBtn');
    $('select-title').textContent = t('pickLevel');
    this.updateThemeBtn();
    this.updateMuteBtn();
    this.updateHUD();
  }

  updateThemeBtn() {
    $('theme-toggle').textContent = '🎨 ' + THEMES[this.themeId].name[lang];
  }

  updateMuteBtn() { $('mute-toggle').textContent = isMuted() ? '🔇' : '🔊'; }

  // ── level select ────────────────────────────────────────────────────────
  showSelect() {
    this.state = 'SELECT';
    this.board = null; this.sapper = null;
    this.targetMode = null; this.probeArmed = false;
    this.renderer.clear();
    $('select').style.display = 'flex';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'hidden';
    $('hint').style.display = 'none';
    $('tools').style.display = 'none';
    this.renderSelect();
  }

  renderSelect() {
    $('select-title').textContent = t('pickLevel');
    this.renderRankCard();
    this._renderSelectToolbar();
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

  _renderSelectToolbar() {
    const mode = this._getMode();
    const toolbar = $('select-toolbar');
    toolbar.innerHTML = `
      <button class="gear-btn" id="btn-stash-open">${t('gear')}</button>
      <div class="mode-pill" id="mode-pill" data-mode="${mode}">
        <div class="mode-pill-slider"></div>
        <button class="mode-pill-opt${mode === 'classic' ? ' active' : ''}" data-mode="classic">${t('classicMode')}</button>
        <button class="mode-pill-opt${mode === 'arcade' ? ' active' : ''}" data-mode="arcade">${t('arcadeMode')}</button>
      </div>`;
    $('btn-stash-open').onclick = () => { Sound.click(); this.showStashModal(); };
    toolbar.querySelectorAll('.mode-pill-opt').forEach(btn => {
      btn.onclick = () => {
        const m = btn.dataset.mode;
        if (m === this._getMode()) return;
        Sound.click();
        this._setMode(m);
        $('mode-pill').dataset.mode = m;
        toolbar.querySelectorAll('.mode-pill-opt').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      };
    });
  }

  // ── play ──────────────────────────────────────────────────────────────────
  startLevel(level) {
    this.level = level;
    this.board = new Board(level);
    this.sapper = { px: 0, pr: 0, cell: null, prevCell: null, path: null, pathI: 0, moving: false, anim: 0 };
    this.state = 'PLAYING';
    this.startTime = -1;
    this.elapsed = 0;
    this.loseTimer = 0;
    // carry the chosen backpack into the op; each slot is one use
    this.loadout = loadEquip();
    this.toolUses = this.loadout.map(() => true);
    this._loadoutBase = this.loadout.length; // bonus probes added after this index
    this.targetMode = null;
    this.probeArmed = false;
    this._busy = false;
    this.detectorReady = this.loadout.includes('detector');
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    $('select').style.display = 'none';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'visible';
    $('hint').textContent = t(this._getMode() === 'classic' ? 'hintFirstClassic' : 'hintFirst');
    $('hint').style.display = 'block';
    this.renderTools();
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
    if (this.state !== 'PLAYING' || this.sapper.moving || this._busy) return;
    if (this._getMode() === 'classic') { this._primaryClassic(c, r); return; }
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell) return;

    if (!b.minesPlaced) {
      if (cell.type !== T.LAND) return;
      b.placeMines(c, r);
      // Issue one emergency probe per isolated region (connected component of unreachable safe cells)
      const regions = b.isolatedRegions(c, r);
      if (regions.length > 0) {
        for (let i = 0; i < regions.length; i++) {
          this.loadout.push('probe');
          this.toolUses.push(true);
        }
        const n = regions.length;
        const word = lang === 'uk'
          ? `відрізан${n === 1 ? 'а ділянка' : 'их ділянок'}`
          : `isolated region${n === 1 ? '' : 's'}`;
        const given = lang === 'uk'
          ? `видано ${n} щуп${n === 1 ? '' : n < 5 ? 'и' : 'ів'}`
          : `${n} probe${n === 1 ? '' : 's'} issued`;
        this.showToast(`⚠ ${n} ${word} — ${given}`);
        this.renderTools();
      }
      this.startTime = this.elapsed;
      this.sapper.px = c; this.sapper.pr = r; this.sapper.cell = cell;
      this.renderer.setSapper(c, r, false, 0);
      this._revealAt(c, r);
      $('hint').textContent = t('hintMove');
      this.updateHUD();
      return;
    }

    // a tap consumed by an armed tool (drone / probe / arm / ugv / dronex)
    if (this.targetMode) {
      const mode = this.targetMode;
      this.targetMode = null;
      this.renderTools();
      this._useTargetTool(mode, c, r);
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

  _primaryClassic(c, r) {
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell) return;
    if (!b.minesPlaced) {
      if (cell.type !== T.LAND) return;
      b.placeMines(c, r);
      const regions = b.isolatedRegions(c, r);
      if (regions.length > 0) {
        for (let i = 0; i < regions.length; i++) { this.loadout.push('probe'); this.toolUses.push(true); }
        const n = regions.length;
        const word = lang === 'uk' ? `відрізан${n === 1 ? 'а ділянка' : 'их ділянок'}` : `isolated region${n === 1 ? '' : 's'}`;
        const given = lang === 'uk' ? `видано ${n} щуп${n === 1 ? '' : n < 5 ? 'и' : 'ів'}` : `${n} probe${n === 1 ? '' : 's'} issued`;
        this.showToast(`⚠ ${n} ${word} — ${given}`);
        this.renderTools();
      }
      this.startTime = this.elapsed;
      this.sapper.cell = cell;
      this._revealAt(c, r);
      $('hint').textContent = t('hintMoveClassic');
      this.updateHUD();
      return;
    }
    if (this.targetMode) {
      const mode = this.targetMode;
      this.targetMode = null;
      this.renderTools();
      this._useTargetTool(mode, c, r);
      return;
    }
    if (cell.type !== T.LAND || cell.revealed || cell.flagged) return;
    this.sapper.cell = cell;
    this._revealAt(c, r);
  }

  flagAction(c, r) {
    if (this.state !== 'PLAYING' || !this.board.minesPlaced || this.sapper.moving || this._busy) return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) return;
    if (this._getMode() === 'classic') {
      cell.flagged = !cell.flagged;
      this.renderer.setFlag(cell);
      cell.flagged ? Sound.flag() : Sound.unflag();
      this.updateHUD();
      return;
    }
    // un-flagging is instant; flagging walks the sapper up to a bordering cell
    // so he never steps onto the cell he suspects is mined.
    if (cell.flagged) { cell.flagged = false; this.renderer.setFlag(cell); Sound.unflag(); this.updateHUD(); return; }
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
    sp.prevCell = sp.cell;          // where he stood before this move (detector retreat)
    sp.cell = tgt;
    sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    if (sp.action === 'flag') {
      const fc = sp.flagTarget; sp.flagTarget = null; sp.action = null;
      if (fc && !fc.revealed) { fc.flagged = true; this.renderer.setFlag(fc); Sound.flag(); this.updateHUD(); }
      return;
    }
    if (sp.action === 'cross') {            // UGV ride finished
      sp.action = null;
      this.renderer.setPlatform(false);
      if (tgt.mine) {                       // can't dismount onto a mine — flag it, ride back
        if (!tgt.flagged) { tgt.flagged = true; this.renderer.setFlag(tgt); }
        const back = sp.crossStart || sp.prevCell;
        sp.cell = back; sp.px = back.c; sp.pr = back.r;
        this.renderer.setSapper(back.c, back.r, false, 0);
        Sound.probe(); this.showToast('🛻 💣'); this.updateHUD();
      } else {
        this._revealAt(tgt.c, tgt.r);
      }
      return;
    }
    sp.action = null;
    this._revealAt(tgt.c, tgt.r);
  }

  _revealAt(c, r) {
    const b = this.board;
    const cell = b.get(c, r);
    if (cell.mine) {
      if (this.detectorReady) {                 // metal detector forgives one mine
        this.detectorReady = false;
        this._spendTool('detector');
        if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
        const sp = this.sapper, back = sp.prevCell || sp.cell;
        sp.cell = back; sp.px = back.c; sp.pr = back.r;
        this.renderer.setSapper(back.c, back.r, false, 0);
        Sound.save();
        this.showToast('🔍 ' + t('detectorSaved'));
        this.updateHUD();
        return;
      }
      this._boom(c, r); return;
    }
    const out = b.reveal(c, r);
    this.renderer.onReveal(out);
    Sound.reveal();
    this._collect(out);
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  // collect any artifacts on freshly-revealed cells into the stash
  _collect(cells) {
    for (const cell of cells) {
      if (!cell.artifact) continue;
      const id = cell.artifact; cell.artifact = null;
      addArtifact(id, 1);
      this.renderer.showPickup(cell.c, cell.r, ARTIFACTS[id].icon);
      Sound.pickup();
      this.showToast(ARTIFACTS[id].icon + ' ' + t('found') + ': ' + artifactName(id, lang));
    }
  }

  _boom(c, r) {
    this.state = 'OVER';
    this.board.lost = true;
    Sound.boom();
    this.renderer.spawnExplosion(c, r);
    this.renderer.setLost();
    this.loseTimer = 0.85;
  }

  _win() {
    this.state = 'OVER';
    markCompleted(this.level.id);
    const before = rankFor(loadClears()).index;
    const clears = addClear();
    const after = rankFor(clears);
    this._promoted = after.index > before ? after.rank : null;
    Sound.win();
    if (this._promoted) setTimeout(() => Sound.rankup(), 650);
    this._showOverlay(true);
  }

  _showOverlay(won) {
    $('overlay').style.display = 'flex';
    $('tools').style.display = 'none';
    $('ov-icon').textContent = won ? '🎖️' : '💥';
    $('ov-title').textContent = won ? t('win') : t('lose');
    let txt = won ? t('winSub') : t('loseSub');
    if (won && this._promoted) {
      txt += '  ⭐ ' + t('promoted') + ' ' + rankName(this._promoted, lang) + '!';
      this._promoted = null;
    }
    $('ov-text').textContent = txt;
    const hasNext = won && this.level.id < LEVEL_COUNT && isUnlocked(this.level.id + 1);
    $('ov-next').style.display = hasNext ? 'inline-block' : 'none';
    $('ov-next').textContent = t('next');
    $('ov-again').textContent = t('again');
    $('ov-map').textContent = t('toMap');
    if (won) this.renderSelect();
  }

  _flashHint(msg) {
    const h = $('hint');
    if (msg) { h.textContent = msg; h.style.display = 'block'; }
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
      this._stepAcc += dt;
      if (this._stepAcc > 0.2) { this._stepAcc = 0; Sound.step(); }
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

  // ── artifacts in play ─────────────────────────────────────────────────────
  useTool(idx) {
    if (this.state !== 'PLAYING' || !this.toolUses[idx]) return;
    const id = this.loadout[idx], art = ARTIFACTS[id];
    if (art.active === false) return;                      // passive (detector)
    if (!this.board.minesPlaced || !this.sapper.cell) { Sound.deny(); this._flashHint(t('needSapper')); return; }
    if (art.active === 'self') {                           // echo: fire now
      this._useEcho(art);
      this._spendTool(id);
    } else {                                               // drone / probe: arm a tap
      this.targetMode = (this.targetMode === id) ? null : id;
      this.renderTools();
      Sound.click();
      if (this.targetMode) {
        const hk = { drone: 'aimDrone', probe: 'aimProbe', arm: 'aimArm', ugv: 'aimUgv', dronex: 'aimDroneX' };
        $('hint').textContent = t(hk[id] || 'aimProbe');
        $('hint').style.display = 'block';
      }
    }
  }

  _useEcho(art) {
    const sp = this.sapper, rad = art.radius || 2, marks = [];
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      const cell = this.board.get(sp.cell.c + dc, sp.cell.r + dr);
      if (cell && cell.type === T.LAND && !cell.revealed) marks.push({ c: cell.c, r: cell.r, mine: cell.mine });
    }
    this.renderer.echoPing(marks);
    Sound.echo();
  }

  _scanDrone(c, r) {
    let found = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const cell = this.board.get(c + dc, r + dr);
      if (cell && cell.type === T.LAND && cell.mine && !cell.revealed && !cell.flagged) {
        cell.flagged = true; this.renderer.setFlag(cell); found++;
      }
    }
    Sound.drone();
    this._spendTool('drone');
    this.showToast('🚁 ' + found + ' 💣');
    this.updateHUD();
  }

  _probeCell(c, r) {
    const cell = this.board.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) { this.renderTools(); return; }
    this._spendTool('probe');
    Sound.probe();
    if (cell.mine) {
      if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
      this.showToast('🎯 💣');
    } else {
      const out = this.board.reveal(c, r);
      this.renderer.onReveal(out);
      this._collect(out);
      if (this.board.isWon()) this._win();
    }
    this.updateHUD();
  }

  _useTargetTool(mode, c, r) {
    if (mode === 'drone') this._scanDrone(c, r);
    else if (mode === 'probe') this._probeCell(c, r);
    else if (mode === 'arm') this._useArm(c, r);
    else if (mode === 'ugv') this._useUGV(c, r);
    else if (mode === 'dronex') this._useDroneX(c, r);
  }

  // re-arm a target tool and nudge the player when they picked an invalid cell
  _reAim(id, hintKey) {
    Sound.deny();
    this.targetMode = id;
    this.renderTools();
    this._flashHint(t(hintKey));
  }

  // safe remote open used by the arm and the defuser drone
  _remoteOpen(c, r, icon) {
    const cell = this.board.get(c, r);
    if (!cell) return;
    if (cell.mine) {
      if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
      Sound.probe(); this.showToast(icon + ' 💣');
    } else {
      const out = this.board.reveal(c, r);
      this.renderer.onReveal(out);
      Sound.reveal(); this._collect(out);
      if (this.board.isWon()) this._win();
    }
    this.updateHUD();
  }

  _useArm(c, r) {
    const sp = this.sapper, cell = this.board.get(c, r);
    const reach = sp.cell && Math.max(Math.abs(c - sp.cell.c), Math.abs(r - sp.cell.r)) <= 2;
    if (!cell || cell.type !== T.LAND || cell.revealed || !reach) { this._reAim('arm', 'aimArm'); return; }
    this._busy = true;
    Sound.probe();
    this.renderer.armExtend(sp.cell.c, sp.cell.r, c, r, () => {
      this._busy = false;
      this._spendTool('arm');
      this._remoteOpen(c, r, '🦾');
    });
  }

  _useDroneX(c, r) {
    const cell = this.board.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) { this._reAim('dronex', 'aimDroneX'); return; }
    this._busy = true;
    Sound.drone();
    this.renderer.flyDrone(this.sapper.cell.c, this.sapper.cell.r, c, r, () => {
      this._busy = false;
      this._spendTool('dronex');
      this._remoteOpen(c, r, '🛸');
    });
  }

  _useUGV(c, r) {
    const sp = this.sapper, cell = this.board.get(c, r);
    if (!cell || (cell.type !== T.LAND && cell.type !== T.BRIDGE) || cell.revealed) { this._reAim('ugv', 'aimUgv'); return; }
    const path = this.board.pathCross(sp.cell.c, sp.cell.r, c, r);
    if (!path || path.length < 2) { this._reAim('ugv', 'aimUgv'); return; }
    this._spendTool('ugv');
    sp.crossStart = sp.cell;
    sp.action = 'cross';
    sp.path = path;
    sp.pathI = 1;
    sp.target = cell;
    sp.moving = true;
    this.renderer.setPlatform(true);
  }

  _spendTool(id) {
    const idx = this.loadout.findIndex((x, i) => x === id && this.toolUses[i]);
    if (idx < 0) return;
    this.toolUses[idx] = false;
    // Bonus probes (idx >= _loadoutBase) are free — don't consume from stash
    if (idx < this._loadoutBase) consumeArtifact(id);
    this.renderTools();
  }

  renderTools() {
    const el = $('tools');
    el.innerHTML = '';
    if (this.state !== 'PLAYING' || !this.loadout.length) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    this.loadout.forEach((id, idx) => {
      const art = ARTIFACTS[id], spent = !this.toolUses[idx], passive = art.active === false;
      const isBonus = idx >= this._loadoutBase;
      const div = document.createElement('div');
      div.className = 'tool' +
        (spent ? ' spent' : '') +
        (passive ? ' passive' : '') +
        (isBonus ? ' bonus' : '') +
        (this.targetMode === id && !spent ? ' armed' : '');
      const ico = art.svg
        ? `<span class="tool-ico">${art.svg}</span>`
        : `<span class="tool-ico" style="font-size:24px;line-height:1">${art.icon}</span>`;
      const label = isBonus
        ? `<span class="tool-name">${artifactName(id, lang)} <span class="tool-bonus-tag">⚠</span></span>`
        : `<span class="tool-name">${artifactName(id, lang)}</span>`;
      div.innerHTML = ico + label;
      if (!passive && !spent) div.onclick = () => this.useTool(idx);
      el.appendChild(div);
    });
  }

  // ── rank + stash on the level picker ──────────────────────────────────────
  renderRankCard() {
    const clears = loadClears(), info = rankFor(clears), el = $('rank-card');
    let prog;
    if (info.next) {
      const span = info.next.min - info.rank.min;
      const pct = Math.max(0, Math.min(100, Math.round(((clears - info.rank.min) / span) * 100)));
      prog = `<div class="rank-prog">${clears} ${t('clearedFields')} · ${info.toNext} ${t('toNext')}</div>` +
             `<div class="rank-bar"><span style="width:${pct}%"></span></div>`;
    } else {
      prog = `<div class="rank-prog">${clears} ${t('clearedFields')} · ${t('maxRank')}</div>`;
    }
    el.innerHTML = `<div class="rank-stars">${rankStars(info.rank)}</div>` +
      `<div class="rank-main"><div class="rank-name">${t('rankLabel')}: ${rankName(info.rank, lang)}</div>${prog}</div>`;
  }

  renderStashPanel() {
    const panel = $('stash-panel');
    const stash = loadStash(), equip = loadEquip();
    const owned = ARTIFACT_IDS.filter(id => stash[id] > 0);

    // Military backpack SVG
    const BP = `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="165" rx="50" ry="5" fill="#000" opacity="0.22"/>
      <path d="M18,38 Q18,20 36,20 L104,20 Q122,20 122,38 L122,148 Q122,162 108,162 L32,162 Q18,162 18,148Z" fill="#304a28"/>
      <path d="M18,38 Q18,20 36,20 L104,20 Q122,20 122,38 L122,82 Q70,70 18,82Z" fill="#3e6032" opacity="0.45"/>
      <path d="M21,38 Q21,23 36,23 L104,23 Q119,23 119,38 L119,148 Q119,159 108,159 L32,159 Q21,159 21,148Z" fill="none" stroke="#3e6032" stroke-width="1.5" stroke-dasharray="5,4"/>
      <path d="M54,12 Q54,3 70,3 Q86,3 86,12" stroke="#1e3018" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M54,12 Q54,5 70,5 Q86,5 86,12" stroke="#2e4826" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="14" y="70" width="6" height="38" rx="3" fill="#1a2e14" opacity="0.8"/>
      <rect x="120" y="70" width="6" height="38" rx="3" fill="#1a2e14" opacity="0.8"/>
      <rect x="12" y="84" width="10" height="10" rx="3" fill="#c4a862" opacity="0.7"/>
      <rect x="118" y="84" width="10" height="10" rx="3" fill="#c4a862" opacity="0.7"/>
      <rect x="34" y="26" width="72" height="20" rx="5" fill="#1e3018"/>
      <rect x="36" y="28" width="68" height="16" rx="4" fill="#142410"/>
      <text x="70" y="40" font-size="11" fill="#c4a862" text-anchor="middle" font-family="Georgia,serif">★ ★ ★</text>
      <rect x="22" y="54" width="96" height="70" rx="10" fill="#1e3018"/>
      <rect x="24" y="56" width="92" height="66" rx="9" fill="#243820"/>
      <rect x="34" y="55" width="72" height="3" rx="1.5" fill="#c4a862" opacity="0.6"/>
      <rect x="66" y="49" width="8" height="9" rx="2.5" fill="#c4a862"/>
      <circle cx="70" cy="55" r="2" fill="#1e3018"/>
      <rect x="22" y="133" width="96" height="28" rx="8" fill="#1e3018"/>
      <rect x="24" y="135" width="92" height="24" rx="7" fill="#243820"/>
      <rect x="47" y="143" width="46" height="8" rx="4" fill="#c4a862"/>
      <rect x="53" y="145" width="34" height="4" rx="2" fill="#1e3018"/>
    </svg>`;

    const slotHTML = (idx) => {
      const id = equip[idx];
      if (!id) return `<div class="bp-slot bp-slot-empty">
        <span class="bp-slot-plus">+</span>
        <span class="bp-slot-hint">${lang === 'uk' ? 'Порожньо' : 'Empty'}</span>
      </div>`;
      const art = ARTIFACTS[id];
      const ico = art.svg
        ? `<span class="bp-slot-ico">${art.svg}</span>`
        : `<span class="bp-slot-ico-emoji">${art.icon}</span>`;
      return `<div class="bp-slot bp-slot-filled" data-equip-id="${id}">
        ${ico}
        <span class="bp-slot-label">
          <span class="bp-slot-name">${artifactName(id, lang)}</span>
          <span class="bp-slot-sub">${artifactDesc(id, lang)}</span>
        </span>
        <span class="bp-slot-remove">✕</span>
      </div>`;
    };

    panel.innerHTML = `
      <div class="bp-section">
        <div class="bp-section-title">${t('backpack')}</div>
        <div class="bp-row">
          <div class="bp-bag-wrap">${BP}</div>
          <div class="bp-slots">${slotHTML(0)}${slotHTML(1)}</div>
        </div>
      </div>
      <div class="shelf-section">
        <div class="shelf-section-title">${t('stashTitle')}</div>
        <div class="shelf-wrap">
          <div class="shelf-items" id="shelf-items">
            ${!owned.length ? `<div class="shelf-empty">${t('stashEmpty')}</div>` : ''}
          </div>
        </div>
      </div>`;

    // Wire up slot clicks (remove from loadout)
    panel.querySelectorAll('.bp-slot-filled').forEach(el => {
      el.onclick = () => { toggleEquip(el.dataset.equipId); Sound.click(); this.renderStashPanel(); };
    });

    // Build shelf artifact cards
    const shelf = panel.querySelector('#shelf-items');
    for (const id of owned) {
      const art = ARTIFACTS[id], eqCount = equip.filter(x => x === id).length;
      const card = document.createElement('div');
      card.className = 'art-card' + (eqCount ? ' art-card-equipped' : '');
      const ico = art.svg
        ? `<span class="art-card-icon">${art.svg}</span>`
        : `<span class="art-card-icon" style="font-size:36px;line-height:1;display:flex;align-items:center;justify-content:center">${art.icon}</span>`;
      card.innerHTML =
        `<span class="art-card-count">×${stash[id]}</span>` +
        (eqCount ? `<span class="art-card-eqtag">🎒</span>` : '') +
        ico +
        `<span class="art-card-name">${artifactName(id, lang)}</span>`;
      card.onclick = () => { toggleEquip(id); Sound.click(); this.renderStashPanel(); };
      shelf.appendChild(card);
    }
  }

  showToast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 1800);
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
