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
    this.renderStashPanel();
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
    this.sapper = { px: 0, pr: 0, cell: null, prevCell: null, path: null, pathI: 0, moving: false, anim: 0 };
    this.state = 'PLAYING';
    this.startTime = -1;
    this.elapsed = 0;
    this.loseTimer = 0;
    // carry the chosen backpack into the op; each slot is one use
    this.loadout = loadEquip();
    this.toolUses = this.loadout.map(() => true);
    this.targetMode = null;
    this.probeArmed = false;
    this._busy = false;
    this.detectorReady = this.loadout.includes('detector');
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    $('select').style.display = 'none';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'visible';
    $('hint').textContent = t('hintFirst');
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

  flagAction(c, r) {
    if (this.state !== 'PLAYING' || !this.board.minesPlaced || this.sapper.moving || this._busy) return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) return;
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
    if (idx >= 0) this.toolUses[idx] = false;
    consumeArtifact(id);
    this.renderTools();
  }

  renderTools() {
    const el = $('tools');
    el.innerHTML = '';
    if (this.state !== 'PLAYING' || !this.loadout.length) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    this.loadout.forEach((id, idx) => {
      const art = ARTIFACTS[id], spent = !this.toolUses[idx], passive = art.active === false;
      const div = document.createElement('div');
      div.className = 'tool' + (spent ? ' spent' : '') + (passive ? ' passive' : '') +
        (this.targetMode === id && !spent ? ' armed' : '');
      div.innerHTML = `<span class="tool-ico">${art.icon}</span>` +
        `<span class="tool-name">${artifactName(id, lang)}</span>`;
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
    $('backpack-head').textContent = t('backpack');
    const stash = loadStash(), equip = loadEquip(), wrap = $('stash-items');
    wrap.innerHTML = '';
    const owned = ARTIFACT_IDS.filter(id => stash[id] > 0);
    if (!owned.length) { wrap.innerHTML = `<div class="stash-empty">${t('stashEmpty')}</div>`; return; }
    for (const id of owned) {
      const art = ARTIFACTS[id], eqCount = equip.filter(x => x === id).length;
      const div = document.createElement('div');
      div.className = 'art' + (eqCount ? ' equipped' : '');
      div.innerHTML =
        `<span class="art-ico">${art.icon}</span>` +
        `<span class="art-txt"><span class="art-name">${artifactName(id, lang)}</span>` +
        `<span class="art-desc">${artifactDesc(id, lang)}</span></span>` +
        `<span class="art-count">×${stash[id]}</span>` +
        (eqCount ? `<span class="art-eqtag">${eqCount > 1 ? eqCount + '× ' : ''}🎒</span>` : '');
      div.onclick = () => { toggleEquip(id); Sound.click(); this.renderStashPanel(); };
      wrap.appendChild(div);
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
