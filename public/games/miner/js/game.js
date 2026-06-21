import { SAPPER_SPEED, T } from './constants.js?v=9';
import { t, levelName, toggleLang, lang } from './i18n.js?v=9';
import { LEVELS, LEVEL_COUNT, loadProgress, markCompleted, isUnlocked } from './levels.js?v=9';
import { Board } from './board.js?v=9';
import { PixiRenderer } from './pixiRenderer.js?v=9';
import { THEMES, loadTheme, saveTheme, nextTheme } from './themes.js?v=9';
import { Sound, isMuted, toggleMute } from './audio.js?v=9';
import { loadClears, addClear, rankFor, rankName, rankStars } from './ranks.js?v=9';
import { ARTIFACTS, ARTIFACT_IDS, artifactName, artifactDesc, loadStash, addArtifact, consumeArtifact, loadEquip, toggleEquip, removeEquip } from './artifacts.js?v=9';
import { ACHIEVEMENTS, loadAchievements, unlockAchievement, getCleanStreak, setCleanStreak, addCorrectFlags, SKINS, loadSkin, saveSkin, isSkinUnlocked } from './achievements.js?v=9';

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
    this.renderer.onSapperArrow = (dx, dy) => this._arrowMove(dx, dy);
    this.renderer.onTick = null;
    this.renderer.tickCbs.push(dt => this._update(dt));

    // browsers need a user gesture to start audio
    window.addEventListener('pointerdown', () => Sound.resume(), { once: true });

    this._wire();
    this.renderer.resize();
    window.addEventListener('resize', () => { this.renderer.resize(); this.updateThemeBtn(); });
    window.addEventListener('popstate', () => {
      if (this.state === 'PLAYING' || this.state === 'OVER') this.showSelect();
    });
    this.applyLang();
    history.replaceState({ miner: 'select' }, '');
    this.showSelect();
  }

  _wire() {
    $('btn-back').onclick = () => this.showSelect();
    $('btn-restart').onclick = () => { Sound.click(); if (this.level) this.startLevel(this.level); };
    $('btn-howto-open').onclick = () => { Sound.click(); this.showHowTo(); };
    $('btn-flag-mode').onclick = () => { this._toggleFlagMode(); };
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
    $('btn-howto-close').onclick = () => this.hideHowTo();
    $('howto-modal').onclick  = e => { if (e.target === $('howto-modal'))  this.hideHowTo(); };
    $('btn-ach-close').onclick = () => this.hideAchievementsModal();
    $('ach-modal').onclick    = e => { if (e.target === $('ach-modal'))    this.hideAchievementsModal(); };
    $('btn-editor-close').onclick = () => this.hideEditorModal();
    $('editor-modal').onclick = e => { if (e.target === $('editor-modal')) this.hideEditorModal(); };
    this._cheatBuf = '';
    window.addEventListener('keydown', e => {
      this._cheatBuf = (this._cheatBuf + e.key).toLowerCase().slice(-5);
      if (this._cheatBuf === 'iddqd') {
        this._cheatBuf = '';
        if (this.state === 'PLAYING') {
          for (const id of ARTIFACT_IDS) { this.loadout.push(id); this.toolUses.push(true); }
          this.detectorReady = true;
          this.vestReady = true;
          this.renderTools();
          this.showToast('💀 IDDQD — всі артефакти в рюкзаку!');
        }
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

  showHowTo() {
    $('howto-title').textContent = t('howToPlay');
    $('howto-body').innerHTML = this._buildHowToHTML();
    $('howto-modal').classList.add('open');
  }

  hideHowTo() {
    $('howto-modal').classList.remove('open');
  }

  showAchievementsModal() {
    $('ach-title').textContent = t('achTitle');
    $('ach-body').innerHTML = this._buildAchievementsHTML();
    $('ach-modal').classList.add('open');
    $('ach-body').querySelectorAll('.skin-card[data-skin]').forEach(btn => {
      btn.onclick = () => this._equipSkin(btn.dataset.skin);
    });
  }

  hideAchievementsModal() {
    $('ach-modal').classList.remove('open');
  }

  // ── Level Editor ──────────────────────────────────────────────────────────
  showEditorModal() {
    $('editor-title').textContent = t('editorTitle');
    $('editor-body').innerHTML = this._buildEditorHTML();
    this._wireEditorForm();
    $('editor-modal').classList.add('open');
  }

  hideEditorModal() { $('editor-modal').classList.remove('open'); }

  _buildEditorHTML() {
    const sl = (id, min, max, val, unit='') =>
      `<input type="range" id="${id}" min="${min}" max="${max}" value="${val}">
       <span class="ed-val" id="${id}-val">${val}${unit}</span>`;
    return `
      <div class="ed-section">
        <div class="ed-label">${t('editorSize')}</div>
        <div class="ed-row"><label>${t('editorCols')}</label>${sl('ed-cols',8,25,14)}</div>
        <div class="ed-row"><label>${t('editorRows')}</label>${sl('ed-rows',6,20,12)}</div>
      </div>
      <div class="ed-section">
        <div class="ed-label">${t('editorShape')}</div>
        <div class="ed-shape-row">
          <button class="ed-shape-btn active" data-shape="rect">${t('editorShapeRect')}</button>
          <button class="ed-shape-btn" data-shape="blob">${t('editorShapeBlob')}</button>
          <button class="ed-shape-btn" data-shape="island">${t('editorShapeIsland')}</button>
        </div>
      </div>
      <div class="ed-section">
        <div class="ed-label">${t('editorDensity')}</div>
        <div class="ed-row"><label>${t('editorDensity')}</label>${sl('ed-density',10,25,15,'%')}</div>
      </div>
      <div class="ed-section">
        <div class="ed-label">${t('editorTerrain')}</div>
        <div class="ed-row"><label>🌲 ${t('editorTrees')}</label>${sl('ed-trees',0,20,7)}</div>
        <div class="ed-row"><label>⛰ ${t('editorMountains')}</label>${sl('ed-mountains',0,6,0)}</div>
        <div class="ed-row"><label>🌊 ${t('editorLake')}</label>${sl('ed-lakes',0,4,0)}</div>
        <div class="ed-row"><label>🛤 ${t('editorPaths')}</label>${sl('ed-paths',0,4,0)}</div>
        <div class="ed-check-row">
          <label class="ed-check"><input type="checkbox" id="ed-river"> 〜 ${t('editorRiver')}</label>
          <div class="ed-row" style="gap:8px">
            <label style="font-size:13px;color:#c8dace">🌊 ${t('editorSea')}</label>
            <select class="ed-select" id="ed-sea">
              <option value="none">${t('editorSeaNone')}</option>
              <option value="N">N ↑</option><option value="S">S ↓</option>
              <option value="E">E →</option><option value="W">W ←</option>
            </select>
          </div>
        </div>
      </div>
      <div class="ed-section">
        <div class="ed-label">${t('editorExtras')}</div>
        <div class="ed-check-row">
          <label class="ed-check"><input type="checkbox" id="ed-fog"> 🌫 ${t('editorFog')}</label>
          <label class="ed-check"><input type="checkbox" id="ed-night"> 🌙 ${t('editorNight')}</label>
        </div>
        <div class="ed-row">
          <label>⏱ ${t('editorTime')}</label>
          <select class="ed-select" id="ed-time">
            <option value="0">${t('editorTimeNone')}</option>
            <option value="120">2 min</option>
            <option value="180">3 min</option>
            <option value="240">4 min</option>
            <option value="300">5 min</option>
          </select>
        </div>
      </div>
      <button id="ed-play">${t('editorPlay')}</button>`;
  }

  _wireEditorForm() {
    [['ed-cols',''], ['ed-rows',''], ['ed-trees',''], ['ed-mountains',''], ['ed-lakes',''], ['ed-paths','']].forEach(([id]) => {
      const el = $(id); if (!el) return;
      el.oninput = () => { $(`${id}-val`).textContent = el.value; };
    });
    const densEl = $('ed-density');
    if (densEl) densEl.oninput = () => { $('ed-density-val').textContent = densEl.value + '%'; };

    document.querySelectorAll('.ed-shape-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.ed-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    $('ed-play').onclick = () => {
      Sound.click();
      this._playCustomLevel();
      this.hideEditorModal();
    };
  }

  _playCustomLevel() {
    const gi = id => parseInt($(id).value, 10);
    const shape = (document.querySelector('.ed-shape-btn.active') || {}).dataset?.shape || 'rect';
    const sea = $('ed-sea').value;
    const timeLimit = gi('ed-time') || undefined;

    const terrain = {};
    const trees = gi('ed-trees'); if (trees > 0) terrain.trees = trees;
    const mountains = gi('ed-mountains'); if (mountains > 0) terrain.mountains = mountains;
    const lakes = gi('ed-lakes'); if (lakes > 0) terrain.lake = lakes;
    const paths = gi('ed-paths'); if (paths > 0) terrain.paths = paths;
    if ($('ed-river').checked) terrain.river = true;
    if (sea !== 'none') terrain.sea = sea;

    const customLevel = {
      id: 0,
      custom: true,
      cols: gi('ed-cols'),
      rows: gi('ed-rows'),
      shape,
      density: gi('ed-density') / 100,
      terrain,
      fog: $('ed-fog').checked || undefined,
      night: $('ed-night').checked || undefined,
      timeLimit,
      name: { en: 'Custom Op', uk: 'Кастомна операція' },
    };
    this.startLevel(customLevel);
  }

  _toggleFlagMode() {
    this._flagMode = !this._flagMode;
    $('btn-flag-mode').classList.toggle('flag-mode-active', this._flagMode);
    Sound.click();
  }

  _equipSkin(id) {
    saveSkin(id);
    this.renderer.currentSkin = id;
    if (this.board && this.renderer.entityC) {
      this.renderer.rebuildSapperSkin();
      if (this.sapper && this.sapper.cell) {
        this.renderer.setSapper(this.sapper.px, this.sapper.pr, false, 0);
      }
    }
    Sound.click();
    $('ach-body').innerHTML = this._buildAchievementsHTML();
    $('ach-body').querySelectorAll('.skin-card[data-skin]').forEach(btn => {
      btn.onclick = () => this._equipSkin(btn.dataset.skin);
    });
  }

  _buildAchievementsHTML() {
    const achieved = loadAchievements();
    const achCards = ACHIEVEMENTS.map(a => {
      const unlocked = !!achieved[a.id];
      const name = lang === 'uk' ? a.uk : a.en;
      const desc = lang === 'uk' ? a.descUk : a.descEn;
      return `<div class="ach-card ${unlocked ? 'ach-unlocked' : 'ach-locked'}">
        <div class="ach-card-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="ach-card-info">
          <div class="ach-card-name">${name}</div>
          <div class="ach-card-desc">${desc}</div>
        </div>
      </div>`;
    }).join('');

    const currentSkin = loadSkin();
    const skinCards = SKINS.map(s => {
      const unlocked = isSkinUnlocked(s.id);
      const name = lang === 'uk' ? s.uk : s.en;
      const isEquipped = currentSkin === s.id;
      const clickAttr = unlocked && !isEquipped ? ` data-skin="${s.id}"` : '';
      const cls = ['skin-card', unlocked ? '' : 'skin-locked', isEquipped ? 'skin-equipped' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}"${clickAttr}>
        <div class="skin-preview">${this._skinSvg(s.id)}</div>
        <div class="skin-name">${s.icon} ${name}</div>
        <div class="skin-status">${isEquipped ? t('skinEquipped') : unlocked ? t('skinEquip') : t('skinLocked')}</div>
      </div>`;
    }).join('');

    return `
<div class="ach-section">
  <h3 class="ach-section-title">🏅 ${lang === 'uk' ? 'Досягнення' : 'Achievements'}</h3>
  <div class="ach-grid">${achCards}</div>
</div>
<div class="ht-divider"></div>
<div class="ach-section">
  <h3 class="ach-section-title">🥷 ${t('skinsTitle')}</h3>
  <div class="skin-grid">${skinCards}</div>
</div>`;
  }

  _skinSvg(skinId) {
    const P = {
      default:   { body: '#3a6b40', face: '#e8c080', helmet: '#2a5030' },
      ghost:     { body: '#5080c0', face: '#d0e8ff', helmet: '#3060a0' },
      ninja:     { body: '#111', face: '#111', helmet: '#1a1a1a' },
      racer:     { body: '#d06010', face: '#f0b870', helmet: '#e09020' },
      soldier:   { body: '#2a4520', face: '#e0b090', helmet: '#1a3010' },
      phantom:   { body: '#2a0850', face: '#c030d0', helmet: '#4a0870' },
      iron:      { body: '#606070', face: '#b0b8c0', helmet: '#404858' },
      commander: { body: '#3a2000', face: '#f0c060', helmet: '#b08000' },
    };
    const p = P[skinId] || P.default;
    const alpha = skinId === 'ghost' ? ' opacity="0.8"' : '';
    const extra = skinId === 'ninja'
      ? `<rect x="15" y="16.5" width="10" height="2" fill="#ff8c00"/>`
      : skinId === 'commander'
      ? `<polygon points="13,15 15,11 17,15 19,11 21,15 23,11 25,15 27,15 13,15" fill="#ffd700"/>`
      : skinId === 'phantom'
      ? `<circle cx="23" cy="12" r="3" fill="#c0a0ff"/><circle cx="24.5" cy="11" r="2.2" fill="${p.helmet}"/>`
      : skinId === 'racer'
      ? `<rect x="19" y="22" width="2" height="18" fill="rgba(255,255,255,0.3)"/>`
      : skinId === 'soldier'
      ? `<ellipse cx="17" cy="28" rx="3.5" ry="2.5" fill="#1a3010" opacity="0.7"/><ellipse cx="24" cy="32" rx="2.5" ry="2" fill="#1a3010" opacity="0.7"/>`
      : skinId === 'iron'
      ? `<circle cx="14" cy="23" r="1.5" fill="#d0d8e0"/><circle cx="26" cy="23" r="1.5" fill="#d0d8e0"/><circle cx="14" cy="37" r="1.5" fill="#d0d8e0"/><circle cx="26" cy="37" r="1.5" fill="#d0d8e0"/>`
      : '';
    return `<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"${alpha}>
      <rect x="12" y="22" width="16" height="18" rx="3" fill="${p.body}"/>
      ${extra}
      <circle cx="20" cy="17" r="8" fill="${p.face}"/>
      ${skinId === 'ninja' ? `<circle cx="20" cy="17" r="8" fill="${p.helmet}"/>` : ''}
      <path d="M13 14 A7 7 0 0 1 27 14 Z" fill="${p.helmet}"/>
      <rect x="12" y="13" width="16" height="2.5" rx="1" fill="${p.helmet}"/>
    </svg>`;
  }

  _buildHowToHTML() {
    const arts = ARTIFACT_IDS.map(id => {
      const a = ARTIFACTS[id];
      const name = a[lang] || a.en;
      const desc = lang === 'uk' ? a.descUk : a.descEn;
      return `<div class="ht-art"><div class="ht-art-icon">${a.icon}</div><div><div class="ht-art-name">${name}</div><div class="ht-art-desc">${desc}</div></div></div>`;
    }).join('');

    const ranks = [
      ['🪖', lang === 'uk' ? 'Рекрут' : 'Recruit'],
      ['⭐', lang === 'uk' ? 'Сапер' : 'Sapper'],
      ['⭐⭐', lang === 'uk' ? 'Сержант' : 'Sergeant'],
      ['⭐⭐⭐', lang === 'uk' ? 'Лейтенант' : 'Lieutenant'],
      ['🎖️', lang === 'uk' ? 'Капітан' : 'Captain'],
      ['🏅', lang === 'uk' ? 'Майор' : 'Major'],
      ['🎗️', lang === 'uk' ? 'Полковник' : 'Colonel'],
      ['👑', lang === 'uk' ? 'Генерал' : 'General'],
    ].map(([ico, name]) => `<span class="ht-rank-chip">${ico} ${name}</span>`).join('');

    return `
<div class="ht-section">
  <h2>❓ ${t('htWhatTitle')}</h2>
  <p>${t('htWhatP1')}</p>
  <p>${t('htWhatP2')}</p>
  <div class="ht-screenshots">
    ${this._shotRiver()} ${this._shotPath()} ${this._shotFog()} ${this._shotNight()}
  </div>
</div>
<div class="ht-divider"></div>
<div class="ht-section">
  <h2>🎮 ${t('htControlsTitle')}</h2>
  <div class="ht-controls">
    <div class="ht-key">${t('htCtrlPlace')}</div><div class="ht-desc">${t('htCtrlPlaceD')}</div>
    <div class="ht-key">${t('htCtrlReveal')}</div><div class="ht-desc">${t('htCtrlRevealD')}</div>
    <div class="ht-key">${t('htCtrlFlag')}</div><div class="ht-desc">${t('htCtrlFlagD')}</div>
    <div class="ht-key">${t('htCtrlArrows')}</div><div class="ht-desc">${t('htCtrlArrowsD')}</div>
    <div class="ht-key">${t('htCtrlPinch')}</div><div class="ht-desc">${t('htCtrlPinchD')}</div>
  </div>
  <p><strong>${lang === 'uk' ? 'Класичний' : 'Classic'}:</strong> ${t('htModeClassic')}</p>
  <p><strong>${lang === 'uk' ? 'Аркада' : 'Arcade'}:</strong> ${t('htModeArcade')}</p>
</div>
<div class="ht-divider"></div>
<div class="ht-section">
  <h2>🎒 ${t('htGearTitle')}</h2>
  <p>${t('htGearP')}</p>
</div>
<div class="ht-section">
  <h2>🧰 ${t('htArtifactsTitle')}</h2>
  <div class="ht-artifacts">${arts}</div>
</div>
<div class="ht-divider"></div>
<div class="ht-section">
  <h2>⭐ ${t('htRanksTitle')}</h2>
  <p>${t('htRanksP')}</p>
  <div class="ht-rank-row">${ranks}</div>
</div>
<div class="ht-divider"></div>
<div class="ht-section">
  <h2>⏱ ${t('htTimedTitle')}</h2>
  <p>${t('htTimedP')}</p>
</div>
<div class="ht-section">
  <h2>🌫 ${t('htFogTitle')}</h2>
  <p>${t('htFogP')}</p>
</div>`;
  }

  // Mini SVG map illustrations ─────────────────────────────────────────────
  _shotWrap(svgContent, label) {
    return `<div class="ht-shot"><svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg><div class="ht-shot-label">${label}</div></div>`;
  }

  _shotRiver() {
    // Green land with a blue river and bridge
    const bg = '#1a3a20'; const water = '#3a7bc8'; const bridge = '#8a6040'; const grid = '#2a5030';
    let cells = '';
    const W = 20, cols = 8, rows = 5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * W, y = r * W + 5;
      const isRiver = c === 3;
      const isBridge = isRiver && r === 2;
      const fill = isBridge ? bridge : isRiver ? water : bg;
      cells += `<rect x="${x+1}" y="${y+1}" width="${W-2}" height="${W-2}" rx="3" fill="${fill}"/>`;
    }
    // Grid lines
    let grid2 = '';
    for (let c = 0; c <= cols; c++) grid2 += `<line x1="${c*W}" y1="5" x2="${c*W}" y2="${rows*W+5}" stroke="${grid}" stroke-width="0.5"/>`;
    for (let r = 0; r <= rows; r++) grid2 += `<line x1="0" y1="${r*W+5}" x2="${cols*W}" y2="${r*W+5}" stroke="${grid}" stroke-width="0.5"/>`;
    // Sapper
    const sp = `<circle cx="${1.5*W+W*0.5}" cy="${1*W+5+W*0.5}" r="6" fill="#e8c040" stroke="#b09000" stroke-width="1.5"/>`;
    // Numbers
    const nums = [[0,0,'2'],[1,0,'1'],[4,0,'1'],[5,0,'2'],[0,1,'🚩'],[2,1,'1'],[4,2,'1']];
    const labels = nums.map(([c,r,n]) => `<text x="${c*W+W*0.5}" y="${r*W+5+W*0.65}" text-anchor="middle" font-size="7" fill="#8ecf9a">${n}</text>`).join('');
    return this._shotWrap(`<rect width="160" height="110" fill="#0d1f17"/>${cells}${grid2}${sp}${labels}`, t('htShotRiver'));
  }

  _shotPath() {
    // Green terrain with a dirt road
    const bg = '#1a3a20'; const path = '#c8a87a'; const grid = '#2a5030';
    let cells = '';
    const W = 20, cols = 8, rows = 5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * W, y = r * W + 5;
      const isPath = c === 2 || (r === 2 && c >= 2 && c <= 5);
      cells += `<rect x="${x+1}" y="${y+1}" width="${W-2}" height="${W-2}" rx="${isPath ? 5 : 3}" fill="${isPath ? path : bg}"/>`;
    }
    let grid2 = '';
    for (let c = 0; c <= cols; c++) grid2 += `<line x1="${c*W}" y1="5" x2="${c*W}" y2="${rows*W+5}" stroke="${grid}" stroke-width="0.5"/>`;
    for (let r = 0; r <= rows; r++) grid2 += `<line x1="0" y1="${r*W+5}" x2="${cols*W}" y2="${r*W+5}" stroke="${grid}" stroke-width="0.5"/>`;
    // grass tufts alongside path
    let tufts = '';
    [[1,0],[1,1],[1,2],[6,2],[7,2],[1,3],[1,4]].forEach(([c,r]) => {
      const x = c*W + W*0.8, y = r*W + 5 + W*0.4;
      tufts += `<line x1="${x}" y1="${y+4}" x2="${x-2}" y2="${y}" stroke="#4d7a3f" stroke-width="1.2"/>`;
      tufts += `<line x1="${x}" y1="${y+4}" x2="${x+2}" y2="${y+1}" stroke="#4d7a3f" stroke-width="1"/>`;
    });
    const sp = `<circle cx="${2*W+W*0.5}" cy="${0*W+5+W*0.5}" r="6" fill="#e8c040" stroke="#b09000" stroke-width="1.5"/>`;
    return this._shotWrap(`<rect width="160" height="110" fill="#0d1f17"/>${cells}${grid2}${tufts}${sp}`, t('htShotPath'));
  }

  _shotFog() {
    // Partially visible map with dark overlay
    const bg = '#1a3a20'; const fog = '#0d1f17'; const grid = '#2a5030';
    let cells = '';
    const W = 20, cols = 8, rows = 5;
    const sc = 4, sr = 2; // sapper pos
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * W, y = r * W + 5;
      const dist = Math.max(Math.abs(c - sc), Math.abs(r - sr));
      const inFow = dist > 2;
      cells += `<rect x="${x+1}" y="${y+1}" width="${W-2}" height="${W-2}" rx="3" fill="${inFow ? fog : bg}" opacity="${inFow ? 0.9 : 1}"/>`;
      if (!inFow && dist > 0) {
        cells += `<text x="${x+W*0.5}" y="${y+W*0.65}" text-anchor="middle" font-size="8" fill="#8ecf9a">${Math.floor(Math.random()*3)}</text>`;
      }
    }
    let grid2 = '';
    for (let c = 0; c <= cols; c++) grid2 += `<line x1="${c*W}" y1="5" x2="${c*W}" y2="${rows*W+5}" stroke="${grid}" stroke-width="0.5" opacity="0.5"/>`;
    for (let r = 0; r <= rows; r++) grid2 += `<line x1="0" y1="${r*W+5}" x2="${cols*W}" y2="${r*W+5}" stroke="${grid}" stroke-width="0.5" opacity="0.5"/>`;
    const sp = `<circle cx="${sc*W+W*0.5}" cy="${sr*W+5+W*0.5}" r="6" fill="#e8c040" stroke="#b09000" stroke-width="1.5"/>`;
    // fog edge glow
    const glow = `<radialGradient id="fg" cx="${(sc*W+W*0.5)/160}" cy="${(sr*W+5+W*0.5)/110}" r="0.35" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="#0d1f17" stop-opacity="0"/><stop offset="100%" stop-color="#0d1f17" stop-opacity="0.8"/></radialGradient><rect width="160" height="110" fill="url(#fg)"/>`;
    return this._shotWrap(`<rect width="160" height="110" fill="#0d1f17"/>${cells}${grid2}${glow}${sp}`, t('htShotFog'));
  }

  _shotNight() {
    // Dark blue sky, moon, tiny visible zone
    const bg = '#0a1228'; const landVis = '#152240'; const grid = '#1a2a50';
    let cells = '';
    const W = 20, cols = 8, rows = 5;
    const sc = 4, sr = 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * W, y = r * W + 5;
      const dist = Math.max(Math.abs(c - sc), Math.abs(r - sr));
      const vis = dist <= 1;
      cells += `<rect x="${x}" y="${y}" width="${W}" height="${W}" fill="${vis ? '#1a3a20' : bg}"/>`;
    }
    // stars
    const stars = [[15,8],[40,12],[70,6],[100,15],[130,9],[145,20],[20,95],[50,100],[110,90],[155,80]].map(
      ([x,y]) => `<circle cx="${x}" cy="${y}" r="${0.8+Math.random()*0.8}" fill="white" opacity="${0.4+Math.random()*0.6}"/>`
    ).join('');
    // moon
    const moon = `<circle cx="140" cy="20" r="9" fill="#fffdd0"/><circle cx="144" cy="17" r="7" fill="${bg}"/>`;
    let grid2 = '';
    for (let c = 0; c <= cols; c++) grid2 += `<line x1="${c*W}" y1="5" x2="${c*W}" y2="${rows*W+5}" stroke="${grid}" stroke-width="0.5" opacity="0.4"/>`;
    for (let r = 0; r <= rows; r++) grid2 += `<line x1="0" y1="${r*W+5}" x2="${cols*W}" y2="${r*W+5}" stroke="${grid}" stroke-width="0.5" opacity="0.4"/>`;
    const sp = `<circle cx="${sc*W+W*0.5}" cy="${sr*W+5+W*0.5}" r="6" fill="#e8c040" stroke="#b09000" stroke-width="1.5"/>`;
    const spot = `<radialGradient id="nl" cx="${(sc*W+W*0.5)/160}" cy="${(sr*W+5+W*0.5)/110}" r="0.22" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="#e8f0a0" stop-opacity="0.15"/><stop offset="100%" stop-color="#e8f0a0" stop-opacity="0"/></radialGradient><rect width="160" height="110" fill="url(#nl)"/>`;
    return this._shotWrap(`<rect width="160" height="110" fill="${bg}"/>${stars}${moon}${cells}${grid2}${spot}${sp}`, t('htShotNight'));
  }

  applyLang() {
    $('title').textContent = t('title');
    $('btn-back').textContent = t('back');
    // btn-restart is now a fixed ↺ icon, no text to translate
    $('lang-toggle').textContent = t('langBtn');
    $('select-title').textContent = t('pickLevel');
    this.updateThemeBtn();
    this.updateMuteBtn();
    this.updateHUD();
  }

  updateThemeBtn() {
    const name = THEMES[this.themeId].name[lang];
    $('theme-toggle').textContent = window.innerWidth <= 600 ? '🎨' : `🎨 ${name}`;
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
    $('btn-restart').style.display = 'none';
    $('btn-flag-mode').style.display = 'none';
    this._flagMode = false;
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
    const stash = loadStash();
    const equip = loadEquip();
    const hasUnequipped = ARTIFACT_IDS.some(id => stash[id] > 0) && equip.length === 0;
    toolbar.innerHTML = `
      <button class="gear-btn${hasUnequipped ? ' gear-btn-pulse' : ''}" id="btn-stash-open">${t('gear')}</button>
      <button class="ach-btn ed-btn" id="btn-editor-open">${t('editor')}</button>
      <div class="mode-pill" id="mode-pill" data-mode="${mode}">
        <div class="mode-pill-slider"></div>
        <button class="mode-pill-opt${mode === 'classic' ? ' active' : ''}" data-mode="classic">${t('classicMode')}</button>
        <button class="mode-pill-opt${mode === 'arcade' ? ' active' : ''}" data-mode="arcade">${t('arcadeMode')}</button>
      </div>`;
    $('btn-stash-open').onclick = () => { Sound.click(); this.showStashModal(); };
    $('btn-editor-open').onclick = () => { Sound.click(); this.showEditorModal(); };
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
    this.vestReady = this.loadout.includes('vest');
    this._mineHitThisLevel = false;
    this._usedArtifactThisLevel = false;
    this.renderer.currentSkin = loadSkin();
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    $('select').style.display = 'none';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'visible';
    history.pushState({ miner: 'play' }, '');
    $('btn-restart').style.display = '';
    $('btn-flag-mode').style.display = '';
    this._flagMode = false;
    $('btn-flag-mode').classList.remove('flag-mode-active');
    $('hint').textContent = t(this._getMode() === 'classic' ? 'hintFirstClassic' : 'hintFirst');
    $('hint').style.display = 'block';
    this.renderTools();
    this.updateHUD();
  }

  // rebuild map visuals (theme change) and replay board state
  _rebuildScene() {
    this.renderer.currentSkin = loadSkin();
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
    if (this._flagMode && this.board.minesPlaced) { this.flagAction(c, r); return; }
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
      this.renderer.updateFoW(c, r);
      this._revealAt(c, r);
      const lv = b.level;
      if (lv.fog) $('hint').textContent = t('fogHint');
      else if (lv.night) $('hint').textContent = t('nightHint');
      else $('hint').textContent = t('hintMove');
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

    // Tap on already-revealed cell (or PATH/BRIDGE) = move sapper there without revealing
    if ((cell.type === T.LAND && cell.revealed && !cell.flagged) ||
        cell.type === T.BRIDGE || cell.type === T.PATH) {
      if (!this.sapper.cell || (cell.c === this.sapper.cell.c && cell.r === this.sapper.cell.r)) return;
      const path = b.pathTo(this.sapper.cell.c, this.sapper.cell.r, c, r);
      if (!path) { this._flashHint(); return; }
      this.sapper.action = 'walk';
      this.sapper.path = path;
      this.sapper.pathI = 1;
      this.sapper.target = cell;
      this.sapper.moving = path.length > 1;
      if (!this.sapper.moving) this._arriveWalk();
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

  _arriveWalk() {
    const sp = this.sapper;
    const tgt = sp.target;
    sp.prevCell = sp.cell;
    sp.cell = tgt; sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null; sp.action = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    this.renderer.updateFoW(tgt.c, tgt.r);
  }

  _arrowMove(dx, dy) {
    if (this.state !== 'PLAYING' || !this.sapper.cell || this.sapper.moving || this._busy) return;
    if (!this.board.minesPlaced) return;
    const nc = this.sapper.cell.c + dx, nr = this.sapper.cell.r + dy;
    const cell = this.board.get(nc, nr);
    if (!cell) return;
    // On revealed/path/bridge cells: walk without revealing
    if (this.board.standable(cell)) {
      this.sapper.action = 'walk';
      this.sapper.path = [[this.sapper.cell.c, this.sapper.cell.r], [nc, nr]];
      this.sapper.pathI = 1;
      this.sapper.target = cell;
      this.sapper.moving = true;
      return;
    }
    // On unrevealed land: reveal it (normal move)
    if (cell.type === T.LAND && !cell.flagged) {
      const path = [[this.sapper.cell.c, this.sapper.cell.r], [nc, nr]];
      this.sapper.action = 'reveal';
      this.sapper.path = path;
      this.sapper.pathI = 1;
      this.sapper.target = cell;
      this.sapper.moving = true;
    }
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
      this.renderer.updateFoW(c, r);
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
    const sp0 = this.sapper;
    const classic = this._getMode() === 'classic';
    if (this.state !== 'PLAYING') return;
    if (!classic && (!this.board.minesPlaced || sp0.moving || this._busy)) return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell || cell.type === T.VOID || cell.type === T.WATER || cell.revealed) return;
    if (classic) {
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
    if (!sp.moving) this._arrive(); // sapper already adjacent — flag immediately
  }

  _arrive() {
    const sp = this.sapper;
    const tgt = sp.target;
    sp.prevCell = sp.cell;          // where he stood before this move (detector retreat)
    sp.cell = tgt;
    sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    this.renderer.updateFoW(tgt.c, tgt.r);
    if (sp.action === 'flag') {
      const fc = sp.flagTarget; sp.flagTarget = null; sp.action = null;
      if (fc && !fc.revealed) { fc.flagged = true; this.renderer.setFlag(fc); Sound.flag(); this.updateHUD(); }
      return;
    }
    if (sp.action === 'walk') { sp.action = null; return; }
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
        this._mineHitThisLevel = true;
        this._spendTool('detector');
        if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
        const sp = this.sapper, back = sp.prevCell || sp.cell;
        sp.cell = back; sp.px = back.c; sp.pr = back.r;
        if (this._getMode() !== 'classic') this.renderer.setSapper(back.c, back.r, false, 0);
        Sound.save();
        this.showToast('🔍 ' + t('detectorSaved'));
        this.updateHUD();
        return;
      }
      if (this.vestReady) {                    // ballistic vest — one extra life
        this.vestReady = false;
        this._mineHitThisLevel = true;
        this._spendTool('vest');
        if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
        if (this._getMode() !== 'classic') {
          const sp = this.sapper, back = sp.prevCell || sp.cell;
          sp.cell = back; sp.px = back.c; sp.pr = back.r;
          this.renderer.setSapper(back.c, back.r, false, 0);
        }
        Sound.save();
        this.showToast('🛡️ ' + (lang === 'uk' ? 'Бронежилет врятував!' : 'Ballistic vest saved you!'));
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
    this._mineHitThisLevel = true;
    setCleanStreak(0);
    Sound.boom();
    this.renderer.spawnExplosion(c, r);
    this.renderer.setLost();
    this.loseTimer = 0.85;
  }

  _win() {
    this.state = 'OVER';
    if (!this.level.custom) markCompleted(this.level.id);
    const before = rankFor(loadClears()).index;
    const clears = this.level.custom ? loadClears() : addClear();
    const after = rankFor(clears);
    this._promoted = after.index > before ? after.rank : null;
    Sound.win();
    if (this._promoted) setTimeout(() => Sound.rankup(), 650);
    this._checkAchievements(clears);
    this._showOverlay(true);
  }

  _checkAchievements(clears) {
    const level = this.level;
    const elapsed = this.startTime >= 0 ? this.elapsed - this.startTime : 9999;
    const newAch = [];

    // Pacifist: 3 clean levels in a row (no mine hit, no detector/vest trigger)
    if (!this._mineHitThisLevel) {
      const streak = getCleanStreak() + 1;
      setCleanStreak(streak);
      if (streak >= 3 && unlockAchievement('pacifist')) newAch.push('pacifist');
    }

    // Minimalist: cleared without spending any loadout artifact
    if (!this._usedArtifactThisLevel && unlockAchievement('minimalist')) newAch.push('minimalist');

    // Lightning: cleared in under 60 seconds
    if (elapsed < 60 && unlockAchievement('lightning')) newAch.push('lightning');

    // Veteran: 10 total clears
    if (clears >= 10 && unlockAchievement('veteran')) newAch.push('veteran');

    // Explorer: all 24 operations
    if (clears >= 24 && unlockAchievement('explorer')) newAch.push('explorer');

    // Night Owl: clear a night operation
    if (level.night && unlockAchievement('nightowl')) newAch.push('nightowl');

    // Fog Walker: clear a fog level
    if (level.fog && unlockAchievement('fogwalker')) newAch.push('fogwalker');

    // Blitz: beat a timed operation
    if (level.timeLimit && unlockAchievement('blitz')) newAch.push('blitz');

    // Iron Sapper: high-density level cleared with no artifacts
    if ((level.density || 0) >= 0.18 && !this._usedArtifactThisLevel && unlockAchievement('iron')) newAch.push('iron');

    // Strategist: 10 correct flags cumulative
    const correctNow = this.board.cells.filter(c => c.flagged && c.mine).length;
    const totalFlags = addCorrectFlags(correctNow);
    if (totalFlags >= 10 && unlockAchievement('strategist')) newAch.push('strategist');

    for (let i = 0; i < newAch.length; i++) {
      const a = ACHIEVEMENTS.find(x => x.id === newAch[i]);
      if (!a) continue;
      const name = lang === 'uk' ? a.uk : a.en;
      setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${name}!`), 1200 * (i + 1));
    }
  }

  _timeLose() {
    if (this.state !== 'PLAYING') return;
    this.state = 'LOSE';
    Sound.boom();
    this.showToast('⏱ ' + t('timeUp'));
    setTimeout(() => {
      $('overlay').style.display = 'flex';
      $('tools').style.display = 'none';
      $('ov-icon').textContent = '⏱';
      $('ov-title').textContent = t('timeUp');
      $('ov-text').textContent = t('loseSub');
      $('ov-next').style.display = 'none';
      $('ov-again').textContent = t('again');
      $('ov-map').textContent = t('toMap');
    }, 600);
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
    const hasNext = won && !this.level.custom && this.level.id < LEVEL_COUNT && isUnlocked(this.level.id + 1);
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
    const gameTime = this.startTime < 0 ? 0 : this.elapsed - this.startTime;
    const tl = b && b.level && b.level.timeLimit;
    if (tl) {
      const rem = Math.max(0, tl - gameTime);
      const ts = $('stat-time');
      ts.textContent = `⏱ ${this._fmt(rem)}`;
      ts.style.color = rem < 30 ? '#e23b3b' : rem < 60 ? '#d98a00' : '';
    } else {
      $('stat-time').textContent = `⏱ ${this._fmt(gameTime)}`;
      $('stat-time').style.color = '';
    }
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
      // Countdown timer — lose if time runs out
      const tl = this.board && this.board.level && this.board.level.timeLimit;
      if (tl && (this.elapsed - this.startTime) >= tl) {
        this._timeLose();
        return;
      }
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
    if (art.active === 'self') {
      if (id === 'echo') this._useEcho(art);
      else if (id === 'thermal') this._useThermal();
      else if (id === 'autosap') this._useAutoSap();
      else if (id === 'relay') this._useRelay();
      else if (id === 'sniper') this._useSniper();
      else if (id === 'spotlight') this._useSpotlight();
      this._spendTool(id);
    } else {                                               // target tools: arm a tap
      this.targetMode = (this.targetMode === id) ? null : id;
      this.renderTools();
      Sound.click();
      if (this.targetMode) {
        const hk = { drone: 'aimDrone', probe: 'aimProbe', arm: 'aimArm', ugv: 'aimUgv', dronex: 'aimDroneX', detonator: 'aimDetonator', flashlight: 'aimFlashlight' };
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
    else if (mode === 'detonator') this._useDetonator(c, r);
    else if (mode === 'flashlight') this._useFlashlight(c, r);
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

  _useThermal() {
    const b = this.board;
    // Flash all unrevealed cells (mines=red, safe=green) like a global echo
    const marks = b.cells
      .filter(c => c.type === T.LAND && !c.revealed)
      .map(c => ({ c: c.c, r: c.r, mine: c.mine }));
    this.renderer.echoPing(marks, 4.0);
    // Compute row/col mine counts and show overlay
    const rowC = {}, colC = {};
    for (const cell of b.cells) {
      if (cell.type !== T.LAND || cell.revealed || !cell.mine) continue;
      rowC[cell.r] = (rowC[cell.r] || 0) + 1;
      colC[cell.c] = (colC[cell.c] || 0) + 1;
    }
    this.renderer.thermalPing(rowC, colC, b.cols, b.rows);
    Sound.echo();
  }

  _useAutoSap() {
    const b = this.board;
    const safe = b.cells.filter(c => c.type === T.LAND && !c.mine && !c.revealed && !c.flagged);
    for (let i = safe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [safe[i], safe[j]] = [safe[j], safe[i]];
    }
    const picks = safe.slice(0, 5);
    const revealed = [];
    for (const cell of picks) {
      const out = b.reveal(cell.c, cell.r);
      this.renderer.onReveal(out);
      revealed.push(...out);
    }
    this._collect(revealed);
    Sound.reveal();
    this.showToast('🤖 ' + picks.length + ' ' + (lang === 'uk' ? 'клітинок відкрито' : 'cells revealed'));
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _useRelay() {
    const b = this.board;
    const marks = b.cells
      .filter(c => c.type === T.LAND && !c.revealed)
      .map(c => ({ c: c.c, r: c.r, mine: c.mine }));
    this.renderer.echoPing(marks, 3.5);
    Sound.echo();
    this.showToast('📡 ' + (lang === 'uk' ? 'Всі міни на екрані' : 'All mines revealed'));
  }

  _useSniper() {
    const b = this.board, sp = this.sapper.cell;
    const revealed = [];
    for (const cell of b.cells) {
      if (cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      if (cell.r !== sp.r && cell.c !== sp.c) continue;
      if (cell.mine) {
        cell.flagged = true; this.renderer.setFlag(cell);
      } else {
        const out = b.reveal(cell.c, cell.r);
        this.renderer.onReveal(out);
        revealed.push(...out);
      }
    }
    this._collect(revealed);
    Sound.reveal();
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _useDetonator(c, r) {
    const b = this.board, cell = b.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) { this._reAim('detonator', 'aimDetonator'); return; }
    this._spendTool('detonator');
    if (cell.mine) {
      cell.mine = false;
      b.mineCount = Math.max(0, b.mineCount - 1);
      b._computeAdj();
      const out = b.reveal(c, r);
      this.renderer.onReveal(out);
      this._collect(out);
      Sound.probe();
      this.showToast('⚡ 💣 ' + (lang === 'uk' ? 'знешкоджено!' : 'defused!'));
    } else {
      const out = b.reveal(c, r);
      this.renderer.onReveal(out);
      this._collect(out);
      Sound.reveal();
    }
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _useFlashlight(c, r) {
    const b = this.board;
    this._spendTool('flashlight');
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const cell = b.get(c + dc, r + dr);
      if (!cell || cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      if (cell.mine) { cell.flagged = true; this.renderer.setFlag(cell); }
      else { const revealed = b.reveal(cell.c, cell.r); out.push(...revealed); }
    }
    if (out.length) { this.renderer.onReveal(out); this._collect(out); }
    this.renderer.echoPing([{c, r, mine: false}], 2.5);
    Sound.reveal();
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _useSpotlight() {
    const b = this.board, sp = this.sapper;
    const out = [];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const cell = b.get(sp.cell.c + dc, sp.cell.r + dr);
      if (!cell || cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      if (cell.mine) { cell.flagged = true; this.renderer.setFlag(cell); }
      else { const revealed = b.reveal(cell.c, cell.r); out.push(...revealed); }
    }
    if (out.length) { this.renderer.onReveal(out); this._collect(out); }
    const marks = b.cells.filter(c => c.type === T.LAND && !c.revealed)
      .filter(c => Math.max(Math.abs(c.c - sp.cell.c), Math.abs(c.r - sp.cell.r)) <= 2)
      .map(c => ({ c: c.c, r: c.r, mine: c.mine }));
    this.renderer.echoPing(marks, 3.0);
    Sound.echo();
    this.updateHUD();
    if (b.isWon()) this._win();
  }

  _spendTool(id) {
    const idx = this.loadout.findIndex((x, i) => x === id && this.toolUses[i]);
    if (idx < 0) return;
    this.toolUses[idx] = false;
    // Bonus probes (idx >= _loadoutBase) are free — don't consume from stash
    if (idx < this._loadoutBase) {
      consumeArtifact(id);
      this._usedArtifactThisLevel = true;
    }
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
      `<div class="rank-main"><div class="rank-name">${t('rankLabel')}: ${rankName(info.rank, lang)}</div>${prog}</div>` +
      `<button class="rank-ach-btn" id="btn-ach-open-rank">🏅</button>`;
    $('btn-ach-open-rank').onclick = () => { Sound.click(); this.showAchievementsModal(); };
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
      el.onclick = () => { removeEquip(el.dataset.equipId); Sound.click(); this.renderStashPanel(); };
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
