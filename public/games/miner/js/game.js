import { SAPPER_SPEED, T } from './constants.js?v=10';
import { t, levelName, toggleLang, lang } from './i18n.js?v=17';
import { AmbushSquad } from './ambush.js?v=5';
import { showDefusal } from './defusal.js?v=2';
import { showMultimeter } from './multimeter.js?v=6';
import { showBalance } from './balance.js?v=1';
import { showJammer } from './jammer.js?v=2';
import { LEVELS, LEVEL_COUNT, TIMED_LEVEL_IDS, loadProgress, markCompleted, isUnlocked } from './levels.js?v=13';
import { Board } from './board.js?v=21';
import { LevelEditor, loadCustomLevels } from './editor.js?v=1';
import { PixiRenderer } from './pixiRenderer.js?v=18';
import { THEMES, loadTheme, saveTheme, nextTheme } from './themes.js?v=9';
import { Sound, isMuted, toggleMute } from './audio.js?v=9';
import { loadClears, addClear, rankFor, rankName, rankStars, rankInsignia, bagCapacity, BAG_NAMES, rankPerks } from './ranks.js?v=14';
import { ARTIFACTS, ARTIFACT_IDS, artifactName, artifactDesc, loadStash, addArtifact, consumeArtifact, loadEquip, toggleEquip, removeEquip } from './artifacts.js?v=10';
import { ACHIEVEMENTS, loadAchievements, unlockAchievement, getCleanStreak, setCleanStreak, addCorrectFlags, getVestHits, addVestHit, getArmUses, addArmUse, getDefuseCount, addDefuse, addMMDefuse, getMMMaxTier, SKINS, loadSkin, saveSkin, isSkinUnlocked } from './achievements.js?v=12';

const $ = id => document.getElementById(id);

const BAG_SVGS = [null,
  // 1 — кульок ATB
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="163" rx="42" ry="5" fill="#000" opacity="0.18"/>
    <path d="M35,68 L22,152 Q22,161 33,161 L107,161 Q118,161 118,152 L105,68Z" fill="#dceef8" stroke="#a0c8e0" stroke-width="1.5"/>
    <path d="M55,68 C52,42 58,28 70,28 C82,28 88,42 85,68" fill="none" stroke="#2070b0" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="48" y1="72" x2="43" y2="154" stroke="#b0d0e8" stroke-width="0.9" opacity="0.5"/>
    <line x1="70" y1="70" x2="70" y2="156" stroke="#b0d0e8" stroke-width="0.9" opacity="0.5"/>
    <line x1="92" y1="72" x2="97" y2="154" stroke="#b0d0e8" stroke-width="0.9" opacity="0.5"/>
    <rect x="32" y="95" width="76" height="40" rx="6" fill="#cc1111"/>
    <text x="70" y="122" font-size="26" fill="white" text-anchor="middle" font-family="Arial Black,sans-serif" font-weight="900">ATB</text>
  </svg>`,
  // 2 — котомочка
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="163" rx="40" ry="5" fill="#000" opacity="0.2"/>
    <line x1="70" y1="8" x2="70" y2="80" stroke="#5a3a18" stroke-width="5" stroke-linecap="round"/>
    <path d="M55,76 Q62,68 70,72 Q78,68 85,76 Q78,84 70,79 Q62,84 55,76Z" fill="#3a2010"/>
    <ellipse cx="70" cy="118" rx="46" ry="44" fill="#c8a060"/>
    <path d="M70,78 L38,100" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L26,120" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L30,144" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L56,158" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L84,158" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L110,144" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L114,120" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <path d="M70,78 L102,100" stroke="#a07840" stroke-width="1.5" fill="none" opacity="0.55"/>
    <ellipse cx="53" cy="106" rx="14" ry="10" fill="#e0b870" opacity="0.32"/>
  </svg>`,
  // 3 — сумка
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="164" rx="48" ry="5" fill="#000" opacity="0.2"/>
    <path d="M90,40 Q115,62 102,102" stroke="#7a5830" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <rect x="22" y="48" width="88" height="110" rx="10" fill="#9a7438"/>
    <rect x="24" y="50" width="84" height="106" rx="9" fill="#b88848"/>
    <path d="M22,48 L22,90 Q22,100 32,100 L108,100 Q118,100 118,90 L118,48 Q118,36 108,36 L32,36 Q22,36 22,48Z" fill="#8a6428"/>
    <rect x="22" y="36" width="96" height="20" rx="9" fill="#9a7030" opacity="0.5"/>
    <rect x="57" y="92" width="26" height="12" rx="4" fill="#c8a040"/>
    <rect x="63" y="95" width="14" height="6" rx="2" fill="#8a6820"/>
    <line x1="30" y1="150" x2="110" y2="150" stroke="#8a6424" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.6"/>
  </svg>`,
  // 4 — рюкзак
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
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
  </svg>`,
  // 5 — великий рюкзак
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="165" rx="52" ry="5" fill="#000" opacity="0.22"/>
    <rect x="16" y="14" width="108" height="148" rx="10" fill="#263e1e"/>
    <rect x="18" y="16" width="104" height="144" rx="9" fill="#304828"/>
    <rect x="8" y="52" width="10" height="72" rx="5" fill="#1a2e10" opacity="0.9"/>
    <rect x="122" y="52" width="10" height="72" rx="5" fill="#1a2e10" opacity="0.9"/>
    <rect x="6" y="82" width="14" height="12" rx="3" fill="#c4a862" opacity="0.8"/>
    <rect x="120" y="82" width="14" height="12" rx="3" fill="#c4a862" opacity="0.8"/>
    <rect x="22" y="18" width="96" height="34" rx="7" fill="#1e3018"/>
    <rect x="24" y="20" width="92" height="30" rx="6" fill="#243820"/>
    <line x1="30" y1="36" x2="110" y2="36" stroke="#c4a862" stroke-width="2" opacity="0.65"/>
    <rect x="63" y="31" width="14" height="10" rx="3" fill="#c4a862"/>
    <rect x="20" y="58" width="100" height="88" rx="8" fill="#1e3018"/>
    <rect x="22" y="60" width="96" height="84" rx="7" fill="#243820"/>
    <line x1="38" y1="60" x2="38" y2="144" stroke="#304828" stroke-width="3.5" opacity="0.65"/>
    <line x1="102" y1="60" x2="102" y2="144" stroke="#304828" stroke-width="3.5" opacity="0.65"/>
    <line x1="38" y1="102" x2="102" y2="102" stroke="#304828" stroke-width="3.5" opacity="0.65"/>
    <rect x="20" y="152" width="100" height="10" rx="5" fill="#1a2e10"/>
    <rect x="56" y="153" width="28" height="8" rx="3" fill="#c4a862"/>
    <text x="70" y="96" font-size="10" fill="#c4a862" text-anchor="middle" font-family="Georgia,serif">★ ★ ★ ★</text>
  </svg>`,
  // 6 — баул
  `<svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="70" cy="165" rx="56" ry="5" fill="#000" opacity="0.22"/>
    <rect x="10" y="28" width="120" height="130" rx="22" fill="#302e14"/>
    <rect x="12" y="30" width="116" height="126" rx="21" fill="#40401a"/>
    <rect x="10" y="78" width="120" height="16" rx="0" fill="#222010"/>
    <line x1="10" y1="86" x2="130" y2="86" stroke="#c4a040" stroke-width="2.5" opacity="0.75"/>
    <circle cx="22" cy="86" r="6" fill="#c4a040"/>
    <rect x="18" y="81" width="8" height="10" rx="2.5" fill="#8a7820"/>
    <rect x="10" y="28" width="120" height="14" rx="12" fill="#202010"/>
    <rect x="10" y="144" width="120" height="14" rx="12" fill="#202010"/>
    <circle cx="28" cy="35" r="5" fill="#c4a040" opacity="0.9"/>
    <circle cx="112" cy="35" r="5" fill="#c4a040" opacity="0.9"/>
    <circle cx="28" cy="151" r="5" fill="#c4a040" opacity="0.9"/>
    <circle cx="112" cy="151" r="5" fill="#c4a040" opacity="0.9"/>
    <path d="M44,30 C44,12 96,12 96,30" stroke="#202010" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M44,30 C44,16 96,16 96,30" stroke="#50501e" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="6" y="72" width="10" height="32" rx="5" fill="#202010"/>
    <rect x="7" y="74" width="8" height="28" rx="4" fill="#40401a"/>
    <line x1="12" y1="104" x2="126" y2="104" stroke="#2e2c10" stroke-width="2.5" opacity="0.5"/>
    <line x1="12" y1="120" x2="126" y2="120" stroke="#2e2c10" stroke-width="2.5" opacity="0.5"/>
    <line x1="12" y1="62" x2="126" y2="62" stroke="#2e2c10" stroke-width="2.5" opacity="0.5"/>
    <rect x="35" y="40" width="70" height="34" rx="6" fill="#202010" opacity="0.75"/>
    <text x="70" y="62" font-size="10" fill="#c4a040" text-anchor="middle" font-family="Georgia,serif">★ ★ ★ ★ ★</text>
  </svg>`,
];

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
    this.ambushSquad = null;   // AmbushSquad instance during ambush mode
    this.ambushPhase = null;   // 'placing' | 'running'
    this.ambushMines = new Set(); // cell indices of player-placed mines

    this.loadout = [];        // artifact ids carried into the current op (≤2)
    this.toolUses = [];        // per-slot remaining-use flags
    this.targetMode = null;    // 'drone' | 'probe' when a tool awaits a tap
    this.probeArmed = false;
    this.detectorReady = false;
    this._stepAcc = 0;
    this.editor = new LevelEditor(def => this.startLevel(def));

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
    $('editor-modal').onclick = e => { if (e.target === $('editor-modal')) this.editor.close(); };
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
  showEditorModal() { this.editor.open(); }
  hideEditorModal() { this.editor.close(); }

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
  <h2>⭐ ${t('htRanksTitle')}</h2>
  <p>${t('htRanksP')}</p>
  ${this._buildRankProgressTable()}
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
  <h2>⏱ ${t('htTimedTitle')}</h2>
  <p>${t('htTimedP')}</p>
</div>
<div class="ht-section">
  <h2>🌫 ${t('htFogTitle')}</h2>
  <p>${t('htFogP')}</p>
</div>
<div class="ht-divider"></div>
<div class="ht-section">
  <h2>💣 ${t('htDevicesTitle')}</h2>
  <p>${t('htDevicesP')}</p>
  <div class="ht-device-grid">
    <div class="ht-device-card">
      <div class="ht-device-icon">✂️</div>
      <div>
        <div class="ht-device-name">${t('htIEDTitle')}</div>
        <div class="ht-device-desc">${t('htIEDP')}</div>
      </div>
    </div>
    <div class="ht-device-card">
      <div class="ht-device-icon">🔬</div>
      <div>
        <div class="ht-device-name">${t('htMMTitle')}</div>
        <div class="ht-device-desc">${t('htMMP')}</div>
        <div class="ht-mm-tiers">
          <div class="ht-mm-tier"><span class="mm-tier-1 ht-tier-pill">EASY</span>${t('htMMTier1')}</div>
          <div class="ht-mm-tier"><span class="mm-tier-2 ht-tier-pill">MEDIUM</span>${t('htMMTier2')}</div>
          <div class="ht-mm-tier"><span class="mm-tier-3 ht-tier-pill">HARD</span>${t('htMMTier3')}</div>
          <div class="ht-mm-tier"><span class="mm-tier-4 ht-tier-pill">EXPERT</span>${t('htMMTier4')}</div>
        </div>
      </div>
    </div>
  </div>
</div>`;
  }

  _buildRankProgressTable() {
    const uk = lang === 'uk';
    const TIERS = [
      { en: 'Recruit / Sapper',          uk: 'Новобранець / Сапер',       clears: '0–2',   bag: 1 },
      { en: 'Sr. Sapper / Jr. Sgt.',     uk: 'Ст. Сапер / Мол. Серж.',    clears: '3–9',   bag: 2 },
      { en: 'Sergeant / Sr. Sgt.',       uk: 'Сержант / Ст. Сержант',     clears: '10–21', bag: 3 },
      { en: 'Master Sgt. / Warrant',     uk: 'Старшина / Прапорщик',      clears: '22–39', bag: 4 },
      { en: 'Lieutenant / Captain',      uk: 'Лейтенант / Капітан',       clears: '40–65', bag: 5 },
      { en: 'Major → General',          uk: 'Майор → Генерал',            clears: '66+',   bag: 6 },
    ];
    const bagNames = BAG_NAMES[lang] || BAG_NAMES.en;
    const slotWord = n => uk
      ? (n === 1 ? '1 слот' : n <= 4 ? `${n} слоти` : `${n} слотів`)
      : (n === 1 ? '1 slot' : `${n} slots`);
    const opsWord = uk ? 'оп.' : 'ops';
    const thumb = n => BAG_SVGS[n].replace('<svg ', '<svg width="50" height="60" ');
    return `<div class="ht-rank-prog">${TIERS.map(tier => `
      <div class="ht-tier">
        <div class="ht-tier-svg">${thumb(tier.bag)}</div>
        <div class="ht-tier-slots">${slotWord(tier.bag)}</div>
        <div class="ht-tier-name">${bagNames[tier.bag - 1]}</div>
        <div class="ht-tier-ranks">${uk ? tier.uk : tier.en}</div>
        <div class="ht-tier-clears">${tier.clears} ${opsWord}</div>
      </div>`).join('')}</div>`;
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
    const classic = this._getMode() === 'classic';
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const lv = LEVELS[id];
      const unlocked = isUnlocked(id, done);
      const cleared = done.has(id);
      const arcadeOnly = !!(lv && (lv.night || lv.fog || lv.hasVIP || lv.goalType === 'evacuate' || lv.goalType === 'ambush'));
      const blocked = classic && arcadeOnly;
      const blockedIcon = lv && lv.night ? '🌙' : lv && lv.fog ? '🌫️' : lv && lv.hasVIP ? '👤' : lv && lv.goalType === 'evacuate' ? '🚪' : lv && lv.goalType === 'ambush' ? '🎯' : '🕹';
      const card = document.createElement('button');
      card.className = 'lvl' + (unlocked && !blocked ? '' : ' locked') + (cleared ? ' done' : '');
      card.disabled = !unlocked || blocked;
      card.innerHTML =
        `<span class="lvl-num">${blocked ? blockedIcon : unlocked ? id : '🔒'}</span>` +
        `<span class="lvl-name">${blocked ? levelName(id) : unlocked ? levelName(id) : t('locked')}</span>` +
        (blocked ? `<span class="lvl-check">${t('arcadeOnly')}</span>` : cleared ? `<span class="lvl-check">✓ ${t('completed')}</span>` : '');
      if (unlocked && !blocked) card.onclick = () => this.startLevel(LEVELS[id]);
      grid.appendChild(card);
    }
    this._renderCustomLevels(grid);
  }

  _renderCustomLevels(grid) {
    const custom = loadCustomLevels();
    if (!custom.length) return;
    const sep = document.createElement('div');
    sep.style.cssText = 'grid-column:1/-1;font-weight:800;font-size:.82rem;color:#6a8a70;' +
                        'padding:14px 0 4px;letter-spacing:.04em;';
    sep.textContent = '🗺 ' + (lang === 'uk' ? 'Мої мапи' : 'My Maps');
    grid.appendChild(sep);
    for (const lv of custom) {
      const card = document.createElement('button');
      card.className = 'lvl';
      card.innerHTML = `<span class="lvl-num">🗺</span>` +
                       `<span class="lvl-name">${lv.name || 'Custom'}</span>` +
                       `<span class="lvl-check">${lv.cols}×${lv.rows}</span>`;
      card.title = `${lv.enemyCount} enemies · AI tier ${lv.aiTier}`;
      card.onclick = () => this.startLevel(lv);
      grid.appendChild(card);
    }
  }

  _renderSelectToolbar() {
    const mode = this._getMode();
    const toolbar = $('select-toolbar');
    const stash = loadStash();
    const equip = loadEquip(this._bagSize());
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
        // Instantly rebuild grid so arcade-only cards go disabled/enabled
        const done2 = loadProgress(); const grid2 = $('level-grid'); grid2.innerHTML = '';
        const classic2 = m === 'classic';
        for (let id2 = 1; id2 <= LEVEL_COUNT; id2++) {
          const lv2 = LEVELS[id2];
          const unlocked2 = isUnlocked(id2, done2);
          const cleared2 = done2.has(id2);
          const arcadeOnly2 = !!(lv2 && (lv2.night || lv2.fog || lv2.hasVIP || lv2.goalType === 'evacuate' || lv2.goalType === 'ambush'));
          const blocked2 = classic2 && arcadeOnly2;
          const blockedIcon2 = lv2 && lv2.night ? '🌙' : lv2 && lv2.fog ? '🌫️' : lv2 && lv2.hasVIP ? '👤' : lv2 && lv2.goalType === 'evacuate' ? '🚪' : lv2 && lv2.goalType === 'ambush' ? '🎯' : '🕹';
          const card2 = document.createElement('button');
          card2.className = 'lvl' + (unlocked2 && !blocked2 ? '' : ' locked') + (cleared2 ? ' done' : '');
          card2.disabled = !unlocked2 || blocked2;
          card2.innerHTML =
            `<span class="lvl-num">${blocked2 ? blockedIcon2 : unlocked2 ? id2 : '🔒'}</span>` +
            `<span class="lvl-name">${blocked2 ? levelName(id2) : unlocked2 ? levelName(id2) : t('locked')}</span>` +
            (blocked2 ? `<span class="lvl-check">${t('arcadeOnly')}</span>` : cleared2 ? `<span class="lvl-check">✓ ${t('completed')}</span>` : '');
          if (unlocked2 && !blocked2) card2.onclick = () => this.startLevel(LEVELS[id2]);
          grid2.appendChild(card2);
        }
        this._renderCustomLevels(grid2);
      };
    });
  }

  // ── play ──────────────────────────────────────────────────────────────────
  startLevel(level) {
    this.level = level;
    let board = new Board(level);
    // For ambush levels, regenerate if terrain leaves too few spawn/exit cells.
    // Custom maps are deterministic — retrying won't change the outcome.
    if (!level.customMap) {
      for (let attempt = 0; attempt < 8 && !board.isAmbushValid(); attempt++) {
        board = new Board(level);
      }
    }
    this.board = board;
    this.sapper = { px: 0, pr: 0, cell: null, prevCell: null, path: null, pathI: 0, moving: false, anim: 0 };
    this.state = 'PLAYING';
    this.ambushSquad = null;
    this.ambushPhase = null;
    this.ambushMines = new Set();
    this.startTime = -1;
    this.elapsed = 0;
    this.loseTimer = 0;
    // carry the chosen backpack into the op; each slot is one use
    this.loadout = loadEquip(this._bagSize());
    this.toolUses = this.loadout.map(() => true);
    this._loadoutBase = this.loadout.length; // bonus probes added after this index
    this.targetMode = null;
    this.probeArmed = false;
    this._busy = false;
    this.detectorReady = this.loadout.includes('detector');
    this.vestReady = this.loadout.includes('vest');
    // Rank perks (passive, always active for earned rank)
    const _rp = rankPerks(rankFor(loadClears()).index);
    this.helmetReady  = _rp.helmet;
    this.radioReady   = _rp.radio;
    this.jeepReady    = _rp.jeep;
    this._fieldMapPerk = _rp.fieldMap;
    this._sapperWounded = false;
    this._mineHitThisLevel = false;
    this._usedArtifactThisLevel = false;
    this._flagsPlaced = 0;
    this._lastVIPWarn = 0;
    this._vipFollowing = false;
    this._vipCell = null;
    this.renderer.currentSkin = loadSkin();
    this.renderer.buildLevel(this.board, THEMES[this.themeId]);
    for (const cell of this.board.cells) if (cell.device) this.renderer.setDevice(cell);
    this._syncSapperEquip();
    $('select').style.display = 'none';
    $('overlay').style.display = 'none';
    $('hud').style.visibility = 'visible';
    history.pushState({ miner: 'play' }, '');
    $('btn-restart').style.display = '';
    $('btn-flag-mode').style.display = '';
    this._flagMode = false;
    $('btn-flag-mode').classList.remove('flag-mode-active');
    $('hint').textContent = level.goalType === 'ambush' ? '' : t(this._getMode() === 'classic' ? 'hintFirstClassic' : 'hintFirst');
    $('hint').style.display = 'block';
    this.renderTools();
    this.updateHUD();
    // Field map perk: reveal perimeter row+col (no mines flagged, just numbers)
    // field map perk fires after mines are placed (first click)
    // Evacuation levels: auto-spawn sapper at mid-field and place mines immediately
    const lv = this.level;
    if (lv.goalType === 'evacuate' && !this.board.minesPlaced) {
      const b = this.board;
      const spawnC = b.spawnC != null ? b.spawnC : Math.floor(b.cols / 2);
      const spawnR = b.spawnR != null ? b.spawnR : Math.floor(b.rows / 2);
      b.placeMines(spawnC, spawnR, 2);
      for (const cell2 of b.cells) this.renderer.clearDevice(cell2);
      for (const cell2 of b.cells) if (cell2.device) this.renderer.setDevice(cell2);
      // Re-draw VIP/EXIT markers (placeMines may have relocated VIP)
      this.renderer.clearVIP(); this.renderer.clearExit();
      for (const cell2 of b.cells) {
        if (cell2.vip)  this.renderer.setVIP(cell2);
        if (cell2.exit) this.renderer.setExit(cell2);
      }
      this.startTime = this.elapsed;
      const spawnCell = b.get(spawnC, spawnR);
      this.sapper.px = spawnC; this.sapper.pr = spawnR; this.sapper.cell = spawnCell;
      this.renderer.setSapper(spawnC, spawnR, false, 0);
      this.renderer.updateFoW(spawnC, spawnR);
      // Reveal only the spawn cell — no cascade, to avoid instantly opening a path to exit
      spawnCell.revealed = true;
      this.renderer.onReveal([spawnCell]);
      $('hint').textContent = t('evacuateHint');
      this.updateHUD();
    } else if (lv.hasVIP) {
      $('hint').textContent = t('vipHint');
    } else if (lv.goalType === 'ambush') {
      this._startAmbushPlacing();
    }
  }

  _applyFieldMap() {
    const b = this.board;
    const land = b.cells.filter(c => c.type === T.LAND);
    if (!land.length) return;
    const minR = Math.min(...land.map(c => c.r));
    const minC = Math.min(...land.map(c => c.c));
    const perim = land.filter(c => c.r === minR || c.c === minC);
    const flagged = [];
    for (const cell of perim) {
      if (cell.mine && !cell.flagged && !cell.revealed) {
        cell.flagged = true;
        this.renderer.setFlag(cell);
        flagged.push(cell);
      }
    }
    if (flagged.length) {
      this.updateHUD();
      this.showToast('🗺 ' + (lang === 'uk'
        ? `Польова карта: ${flagged.length} міни позначено`
        : `Field map: ${flagged.length} mine${flagged.length > 1 ? 's' : ''} flagged`));
    }
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
    for (const c of this.board.cells) if (c.device && !c.revealed) this.renderer.setDevice(c);
  }

  // Current rank-based loadout slot count (1 at Recruit, +1 per rank, max 5).
  _bagSize() { return bagCapacity(rankFor(loadClears()).index); }

  // Push current equipment state into the renderer and rebuild sapper sprite.
  _syncSapperEquip() {
    this.renderer.setSapperEquipment({
      hasVest: !!this.vestReady,
      isWounded: !!this._sapperWounded,
      bagSize: this._bagSize(),
    });
  }

  nextLevel() {
    const id = this.level.id + 1;
    if (id <= LEVEL_COUNT && isUnlocked(id)) this.startLevel(LEVELS[id]);
    else this.showSelect();
  }

  primaryAction(c, r) {
    if (this.state !== 'PLAYING' || this._busy) return;
    if (this.level && this.level.goalType === 'ambush') { this._ambushClick(c, r); return; }
    if (this.sapper.moving) return;
    if (this._flagMode && this.board.minesPlaced) { this.flagAction(c, r); return; }
    if (this._getMode() === 'classic') { this._primaryClassic(c, r); return; }
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell) return;

    if (!b.minesPlaced) {
      if (cell.type !== T.LAND) return;
      b.placeMines(c, r);
      // Refresh ⚠ device indicators — relocation may have moved cells to mine-adjacent positions
      for (const cell2 of b.cells) this.renderer.clearDevice(cell2);
      for (const cell2 of b.cells) if (cell2.device) this.renderer.setDevice(cell2);
      // Refresh VIP marker (VIP may have been relocated to a mine-adjacent cell)
      if (b.level.hasVIP) {
        this.renderer.clearVIP();
        for (const cell2 of b.cells) if (cell2.vip) this.renderer.setVIP(cell2);
      }
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
      if (this._fieldMapPerk) this._applyFieldMap();
      this.startTime = this.elapsed;
      if (cell.device) { cell.device = null; this.renderer.clearDevice(cell); }
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
    const prev = sp.cell;
    sp.prevCell = prev;
    sp.cell = tgt; sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null; sp.action = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    this.renderer.updateFoW(tgt.c, tgt.r);
    this._tryActivateVIP(tgt);
    this._followVIP(prev);
    if ((tgt.exit || tgt.vip) && this._checkWin()) this._win();
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
    if (this._busy) return;
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
      if (this._fieldMapPerk) this._applyFieldMap();
      this.startTime = this.elapsed;
      this.sapper.cell = cell;
      if (b.level.hasVIP) {
        this.renderer.clearVIP();
        for (const cell2 of b.cells) if (cell2.vip) this.renderer.setVIP(cell2);
      }
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
      if (cell.flagged) { this._flagsPlaced++; Sound.flag(); } else Sound.unflag();
      this.updateHUD();
      if (this._checkWin()) this._win();
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
    const prev = sp.cell;
    sp.prevCell = prev;          // where he stood before this move (detector retreat)
    sp.cell = tgt;
    sp.px = tgt.c; sp.pr = tgt.r;
    sp.moving = false; sp.path = null;
    this.renderer.setSapper(tgt.c, tgt.r, false, 0);
    this.renderer.updateFoW(tgt.c, tgt.r);
    this._tryActivateVIP(tgt);
    this._followVIP(prev);
    if (sp.action === 'flag') {
      const fc = sp.flagTarget; sp.flagTarget = null; sp.action = null;
      if (fc && !fc.revealed) { fc.flagged = true; this.renderer.setFlag(fc); Sound.flag(); this._flagsPlaced++; this.updateHUD(); if (this._checkWin()) this._win(); }
      return;
    }
    if (sp.action === 'walk') {
      sp.action = null;
      if ((tgt.exit || tgt.vip) && this._checkWin()) this._win();
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
        this._sapperWounded = true;
        this._mineHitThisLevel = true;
        this._spendTool('vest');
        // Mine detonates: mark as flagged-detonated, lift fog, show crater
        if (!cell.flagged) { cell.flagged = true; }
        Sound.boom();
        this.renderer.spawnExplosion(c, r);
        if (this._vipBlastCheck(c, r)) return;
        this.renderer.spawnCrater(c, r);
        this.renderer.revealFog(c, r);
        this.renderer.sapperHit();
        this._syncSapperEquip();
        // Achievements: survivor + pyromaniac
        if (unlockAchievement('survivor')) {
          const a = ACHIEVEMENTS.find(x => x.id === 'survivor');
          this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`);
        }
        const vestTotal = addVestHit();
        if (vestTotal >= 3 && unlockAchievement('pyromaniac')) {
          const a = ACHIEVEMENTS.find(x => x.id === 'pyromaniac');
          setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 1200);
        }
        if (this._getMode() !== 'classic') {
          const sp = this.sapper, back = sp.prevCell || sp.cell;
          sp.cell = back; sp.px = back.c; sp.pr = back.r;
          this.renderer.setSapper(back.c, back.r, false, 0);
        }
        this.showToast('🛡️ 💥 ' + (lang === 'uk' ? 'Бронежилет врятував — сапер поранений!' : 'Vest saved you — sapper wounded!'));
        this.updateHUD();
        return;
      }
      if (this.helmetReady) { this.helmetReady = false; this._perkSurvive(c, r, 'helmet'); return; }
      if (this.jeepReady)   { this.jeepReady   = false; this._perkSurvive(c, r, 'jeep');   return; }
      this._boom(c, r); return;
    }
    if (cell.device) { this._startDefusal(cell); return; }
    const out = b.reveal(c, r);
    this.renderer.onReveal(out);
    Sound.reveal();
    this._collect(out);
    this._tryActivateVIP(b.get(c, r));
    this.updateHUD();
    if (this._checkWin()) this._win();
  }

  _startDefusal(cell) {
    this._busy = true;
    const isMMDevice  = cell.device.type.startsWith('mm_');
    const isBalDevice = cell.device.type.startsWith('balance_');
    const isJamDevice = cell.device.type.startsWith('jammer_');

    const onSuccess = (info) => {
      cell.device = null;
      this.renderer.clearDevice(cell);
      this._busy = false;
      const out = this.board.reveal(cell.c, cell.r);
      this.renderer.onReveal(out);
      Sound.reveal();
      this._collect(out);
      this.updateHUD();
      if (this._checkWin()) this._win();
      this.showToast('💣✅ ' + (lang === 'uk' ? 'Пристрій знешкоджено!' : 'Device neutralized!'));

      const achList = [];
      if (isMMDevice) {
        // Multimeter-specific achievements
        const mmTier = info?.tier || 1;
        const mmTotal = addMMDefuse(mmTier);
        if (mmTotal === 1 && unlockAchievement('analyst')) achList.push('analyst');
        if (mmTier >= 3 && unlockAchievement('circuit_pro')) achList.push('circuit_pro');
        if (mmTier >= 4 && info?.hasTimer && unlockAchievement('under_pressure')) achList.push('under_pressure');
      } else {
        // Wire-cutting achievements
        const total = addDefuse();
        if (total === 1 && unlockAchievement('defuser')) achList.push('defuser');
        if (total >= 5  && unlockAchievement('bomb_squad')) achList.push('bomb_squad');
        if (info?.hasTimer && (info?.secsLeft ?? 999) <= 20 && unlockAchievement('cool_hand')) achList.push('cool_hand');
      }
      for (let i = 0; i < achList.length; i++) {
        const a = ACHIEVEMENTS.find(x => x.id === achList[i]);
        if (a) setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 1200 * (i + 1));
      }
    };

    const onFail = () => {
      cell.device = null;
      this.renderer.clearDevice(cell);
      if (this.vestReady) {
        this.vestReady = false;
        this._sapperWounded = true;
        this._mineHitThisLevel = true;
        this._spendTool('vest');
        Sound.boom();
        this.renderer.spawnExplosion(cell.c, cell.r);
        this.renderer.spawnCrater(cell.c, cell.r);
        this.renderer.sapperHit();
        this._syncSapperEquip();
        const sp = this.sapper, back = sp.prevCell || sp.cell;
        if (back) { sp.cell = back; sp.px = back.c; sp.pr = back.r; this.renderer.setSapper(back.c, back.r, false, 0); }
        this._busy = false;
        this.showToast('🛡️ 💥 ' + (lang === 'uk' ? 'Бронежилет врятував — сапер поранений!' : 'Vest saved you — sapper wounded!'));
        this.updateHUD();
      } else if (this.helmetReady) {
        this.helmetReady = false;
        this._busy = false;
        this._perkSurvive(cell.c, cell.r, 'helmet');
      } else if (this.jeepReady) {
        this.jeepReady = false;
        this._busy = false;
        this._perkSurvive(cell.c, cell.r, 'jeep');
      } else {
        this._busy = false;
        this._boom(cell.c, cell.r);
      }
    };

    if (isMMDevice) {
      const mmTier = parseInt(cell.device.type.replace('mm_t', ''), 10) || 1;
      showMultimeter(cell, (info) => onSuccess({ ...info, tier: mmTier }), onFail);
    } else if (isBalDevice) {
      showBalance(cell, onSuccess, onFail);
    } else if (isJamDevice) {
      showJammer(cell, onSuccess, onFail);
    } else {
      showDefusal(cell, onSuccess, onFail);
    }
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

  // Returns true if explosion at (c,r) is within 2 Chebyshev cells of the VIP.
  // Checks VIP's current escort position (if following) or board cell.
  _vipBlastCheck(c, r) {
    if (!this.board.level.hasVIP) return false;
    const vipPos = this._vipCell || this.board.cells.find(cell => cell.vip);
    if (!vipPos) return false;
    if (Math.max(Math.abs(vipPos.c - c), Math.abs(vipPos.r - r)) > 2) return false;
    // VIP concussed — override to immediate loss
    this.state = 'OVER';
    this.board.lost = true;
    this._mineHitThisLevel = true;
    setCleanStreak(0);
    Sound.boom();
    this.renderer.spawnExplosion(c, r);
    this.renderer.setLost();
    this.loseTimer = 1.2;
    const msg = lang === 'uk'
      ? '💥 VIP контужений! Місія провалена!'
      : '💥 VIP concussed! Mission failed!';
    this.showToast(msg);
    return true;
  }

  _boom(c, r) {
    if (this._vipBlastCheck(c, r)) return;
    this.state = 'OVER';
    this.board.lost = true;
    this._mineHitThisLevel = true;
    setCleanStreak(0);
    Sound.boom();
    this.renderer.spawnExplosion(c, r);
    // Chain: detonate all adjacent mines with staggered delay
    const b = this.board;
    const DIRS8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let delay = 180;
    for (const [dc, dr] of DIRS8) {
      const nb = b.get(c + dc, r + dr);
      if (nb && nb.type === T.LAND && nb.mine && !nb.flagged && !nb.revealed) {
        const nc = nb.c, nr = nb.r;
        setTimeout(() => {
          if (this.state !== 'OVER') return; // only fires after primary boom set state
          nb.revealed = true;
          this._vipBlastCheck(nc, nr);
          this.renderer.spawnExplosion(nc, nr);
        }, delay);
        delay += 120;
      }
    }
    this.renderer.setLost();
    this.loseTimer = 0.85 + delay / 1000;
  }

  // ── Rank perk: survive one mine hit ──────────────────────────────────────
  _perkSurvive(c, r, perk) {
    const isJeep = perk === 'jeep';
    this._sapperWounded = true;
    this._mineHitThisLevel = true;
    const cell = this.board.get(c, r);
    if (cell && !cell.flagged) cell.flagged = true;
    Sound.boom();
    this.renderer.spawnExplosion(c, r);
    if (this._vipBlastCheck(c, r)) return;
    this.renderer.spawnCrater(c, r);
    this.renderer.revealFog(c, r);
    this.renderer.sapperHit();
    if (!isJeep) {
      // Helmet: field shakes + 3 random nearby safe cells open
      this.renderer.shakeCamera?.();
      const b = this.board;
      const DIRS8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
      const candidates = DIRS8
        .map(([dc, dr]) => b.get(c + dc, r + dr))
        .filter(nb => nb && nb.type === T.LAND && !nb.mine && !nb.revealed && !nb.flagged && !nb.device);
      const picks = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
      for (const p of picks) {
        const out = b.reveal(p.c, p.r);
        this.renderer.onReveal(out);
      }
    }
    if (this._getMode() !== 'classic') {
      const sp = this.sapper, back = sp.prevCell || sp.cell;
      if (back) { sp.cell = back; sp.px = back.c; sp.pr = back.r; this.renderer.setSapper(back.c, back.r, false, 0); }
    }
    const msg = isJeep
      ? (lang === 'uk' ? '🚗 Джип врятував — сапер живий!' : '🚗 Jeep saved you — sapper alive!')
      : (lang === 'uk' ? '🪖 Каска врятувала — тремтить поле!' : '🪖 Helmet saved you — field shook!');
    this.showToast(msg);
    this._syncSapperEquip();
    this.renderTools();
    this.updateHUD();
  }

  // ── Rank perk: radio — reveal one safe cell ───────────────────────────────
  _useRadio() {
    if (!this.radioReady || this.state !== 'PLAYING') return;
    const b = this.board;
    const safe = b.cells.filter(c => c.type === T.LAND && !c.mine && !c.revealed && !c.flagged && !c.device);
    if (!safe.length) return;
    const pick = safe[Math.floor(Math.random() * safe.length)];
    this.radioReady = false;
    const out = b.reveal(pick.c, pick.r);
    this.renderer.onReveal(out);
    Sound.reveal();
    this._collect(out);
    this.showToast('📻 ' + (lang === 'uk' ? 'Рація: безпечна клітинка знайдена!' : 'Radio: safe cell found!'));
    this.renderTools();
    this.updateHUD();
    if (this._checkWin()) this._win();
  }

  // Activate VIP escort when sapper steps onto the VIP cell.
  _tryActivateVIP(cell) {
    if (!cell || !cell.vip || this._vipFollowing) return;
    this._vipFollowing = true;
    this._vipCell = cell;
    this.showToast(lang === 'uk'
      ? '👤 VIP знайдено! Ведіть до ВИХОДУ 🚪'
      : '👤 VIP found! Lead to EXIT 🚪');
    $('hint').textContent = lang === 'uk'
      ? '👤 VIP поруч — ведіть до зеленого порталу 🚪'
      : '👤 VIP with you — lead to the green EXIT portal 🚪';
  }

  // Move VIP to sapper's previous cell after each sapper step.
  _followVIP(prevCell) {
    if (!this._vipFollowing || !prevCell) return;
    this._vipCell = prevCell;
    this.renderer.moveVIP(prevCell.c, prevCell.r);
  }

  _isVIPSecured() {
    const b = this.board;
    const vip = b.cells.find(c => c.vip);
    if (!vip) return true;
    const DIRS8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    return DIRS8.every(([dc, dr]) => {
      const n = b.get(vip.c + dc, vip.r + dr);
      return !n || n.type !== T.LAND || !n.mine || n.flagged;
    });
  }

  _checkWin() {
    const b = this.board;
    const lv = b.level;
    if (lv.goalType === 'ambush') return false; // handled by _ambushTick
    if (lv.goalType === 'evacuate') {
      return !!(this.sapper.cell && this.sapper.cell.exit);
    }
    if (lv.hasVIP) {
      // VIP escort: sapper must first reach VIP (activates escort), then lead to EXIT
      return !!(this._vipFollowing && this.sapper.cell && this.sapper.cell.exit);
    }
    return b.isWon();
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
    const ach = id => { if (unlockAchievement(id)) newAch.push(id); };

    // ── Clean streak ────────────────────────────────────────────────────────
    if (!this._mineHitThisLevel) {
      const streak = getCleanStreak() + 1;
      setCleanStreak(streak);
      if (streak >= 3)  ach('pacifist');
      if (streak >= 5)  ach('streak5');
      if (streak >= 10) ach('streak10');
    } else {
      setCleanStreak(0);
    }

    // ── Artifact usage ──────────────────────────────────────────────────────
    if (!this._usedArtifactThisLevel) {
      ach('minimalist');
      if (level.night) ach('night_ace');
    }

    // ── Time-based ──────────────────────────────────────────────────────────
    if (elapsed < 60) ach('lightning');
    if (level.timeLimit) {
      ach('blitz');
      const timeLeft = level.timeLimit - elapsed;
      if (timeLeft > 60) ach('speedrun');
      // timed_ace: all timed levels beaten
      const done = loadProgress();
      if (TIMED_LEVEL_IDS.every(id => done.has(id))) ach('timed_ace');
    }

    // ── Total clears ────────────────────────────────────────────────────────
    if (clears >= 10) ach('veteran');
    if (clears >= 30) { ach('explorer'); ach('marathon'); }

    // ── Map type ────────────────────────────────────────────────────────────
    if (level.night)  ach('nightowl');
    if (level.fog)    ach('fogwalker');
    if (level.shape === 'island') ach('tourist');
    if (level.id === 30) ach('megamap');

    // ── Difficulty / loadout ────────────────────────────────────────────────
    if ((level.density || 0) >= 0.18 && !this._usedArtifactThisLevel) ach('iron');

    // ── Flags ───────────────────────────────────────────────────────────────
    const correctNow = this.board.cells.filter(c => c.flagged && c.mine).length;
    const totalFlags = addCorrectFlags(correctNow);
    if (totalFlags >= 10) ach('strategist');
    if (this._flagsPlaced === 0) ach('no_flags');

    // ── Wounded finisher ────────────────────────────────────────────────────
    if (this._sapperWounded) ach('wounded_finisher');

    // ── Stash checks ────────────────────────────────────────────────────────
    const stash = loadStash();
    const totalItems = Object.values(stash).reduce((s, n) => s + n, 0);
    if (totalItems >= 20) ach('rich');
    if (ARTIFACT_IDS.every(id => (stash[id] || 0) >= 1)) ach('full_stash');

    // ── Announce ─────────────────────────────────────────────────────────────
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
    const lv = this.level;
    const isAmbush = lv && lv.goalType === 'ambush';
    const winIcon = won
      ? (lv && lv.goalType === 'evacuate' ? '🚪' : lv && lv.hasVIP ? '👤' : isAmbush ? '🎯' : '🎖️')
      : '💥';
    $('ov-icon').textContent = winIcon;
    $('ov-title').textContent = won ? (isAmbush ? t('ambushWin') : t('win')) : (isAmbush ? t('ambushLose') : t('lose'));
    let txt = isAmbush
      ? (won ? t('ambushWinSub') : t('ambushLoseSub'))
      : (won ? t('winSub') : t('loseSub'));
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
    const hintSpan = document.getElementById('ambush-hint-text');
    if (msg) {
      if (hintSpan) {
        hintSpan.textContent = msg;
      } else {
        h.textContent = msg;
      }
      h.style.display = 'block';
    }
    h.style.color = '#ff6b6b';
    setTimeout(() => {
      h.style.color = '';
      if (hintSpan) hintSpan.textContent = t('ambushHint');
    }, 1200);
  }

  updateHUD() {
    const b = this.board;
    const lv = b && b.level;
    if (lv && lv.goalType === 'ambush') {
      const budget = lv.minesBudget || 0;
      const placed = this.ambushMines ? this.ambushMines.size : 0;
      $('stat-mines').textContent = `${t('ambushBudget')} ${placed}/${budget}`;
      $('stat-flags').style.display = 'none';
      $('stat-time').style.display = 'none';
      const vipEl = $('stat-vip'); if (vipEl) vipEl.style.display = 'none';
      return;
    }
    $('stat-flags').style.display = '';
    $('stat-time').style.display = '';
    const mines = b && b.minesPlaced ? Math.max(0, b.mineCount - b.flagCount()) : (b ? '?' : 0);
    $('stat-mines').textContent = `💣 ${mines}`;
    $('stat-flags').textContent = `🚩 ${b ? b.flagCount() : 0}`;
    // VIP status indicator
    const vipEl = $('stat-vip');
    if (vipEl) {
      if (b && b.level && b.level.hasVIP && b.minesPlaced) {
        const secured = this._isVIPSecured();
        vipEl.textContent = secured ? t('vipSecured') : t('vipStatus');
        vipEl.style.color = secured ? '#4ade80' : '#fbbf24';
        vipEl.style.display = '';
      } else {
        vipEl.style.display = 'none';
      }
    }
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
      const step = SAPPER_SPEED * dt * (this._sapperWounded ? (2 / 3) : 1);
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

    if (this.ambushSquad && this.ambushPhase === 'running' && this.state === 'PLAYING') {
      this._ambushTick(dt);
    }
  }

  // ── Ambush mode ───────────────────────────────────────────────────────────
  _startAmbushPlacing() {
    this.ambushSquad = null;
    this.ambushPhase = 'placing';
    this.ambushMines = new Set();
    // No sapper drawn in ambush mode
    this.renderer.ambushZoneMarkers && this.renderer.ambushZoneMarkers.destroy({ children: true });
    this.renderer.drawAmbushZones(this.board);
    $('btn-flag-mode').style.display = 'none';
    $('hint').innerHTML = `<span id="ambush-hint-text">${t('ambushHint')}</span> &nbsp;<button id="btn-ambush-launch" style="margin-left:8px;padding:4px 14px;border-radius:8px;border:2px solid #f97316;background:rgba(249,115,22,.15);color:#f97316;font-size:.9rem;font-weight:800;cursor:pointer;pointer-events:auto;">${t('ambushLaunch')}</button>`;
    $('hint').style.pointerEvents = 'auto';
    document.getElementById('btn-ambush-launch').onclick = () => this._ambushLaunch();
    this.updateHUD();
  }

  _ambushClick(c, r) {
    if (this.ambushPhase !== 'placing') return;
    const b = this.board;
    const cell = b.get(c, r);
    if (!cell || (cell.type !== T.LAND && cell.type !== T.PATH && cell.type !== T.BRIDGE)) return;
    const k = b.idx(c, r);
    if (cell.ambushExit) return; // can't mine the exit zone
    if (this.ambushMines.has(k)) {
      // Toggle off
      this.ambushMines.delete(k);
      cell.mine = false;
      this.renderer.clearAmbushMine(cell);
    } else {
      const budget = this.level.minesBudget || 0;
      if (this.ambushMines.size >= budget) {
        this._flashHint(lang === 'uk' ? `Ліміт мін: ${budget}` : `Mine budget: ${budget}`);
        return;
      }
      this.ambushMines.add(k);
      cell.mine = true;
      this.renderer.setAmbushMine(cell);
    }
    this.updateHUD();
  }

  _ambushLaunch() {
    if (this.ambushPhase !== 'placing' || this.state !== 'PLAYING') return;
    this.ambushPhase = 'running';
    $('hint').style.pointerEvents = '';
    $('hint').textContent = t('ambushRunning');
    this.ambushSquad = new AmbushSquad(this.board, this.level);
    this.ambushSquad.spawnEnemies();
    for (const e of this.ambushSquad.enemies) {
      this.renderer.spawnEnemySprite(e.id, e.c, e.r);
    }
  }

  _ambushTick(dt) {
    const sq = this.ambushSquad;
    const events = sq.tick(dt);
    for (const { enemy: e, type } of events) {
      if (type === 'mine') {
        this.renderer.killEnemySprite(e.id, e.c, e.r);
        // Remove mine marker and clear board cell so it doesn't block rendering
        const cell = this.board.get(e.c, e.r);
        if (cell) {
          cell.mine = false;
          this.renderer.clearAmbushMine(cell);
          this.ambushMines.delete(this.board.idx(e.c, e.r));
        }
        Sound.boom && Sound.boom();
      } else if (type === 'exit') {
        this.renderer.reachEnemySprite(e.id);
      }
    }
    // Update all alive sprites
    for (const e of sq.enemies) {
      if (e.alive && !e.reached) {
        this.renderer.updateEnemySprite(e.id, e.px, e.pr, (e.animT + e.pathI * 0.37) % 1);
      }
    }
    if (!sq.allDone) return;
    // All done: check win/lose
    if (sq.reachedCount > 0) {
      // At least one got through → lose
      this.state = 'OVER';
      this.loseTimer = 0.8;
    } else {
      // None got through → win!
      this._win();
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
    if (unlockAchievement('radar')) {
      const a = ACHIEVEMENTS.find(x => x.id === 'radar');
      setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 600);
    }
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
    // Can't probe a device cell — sapper must step on it manually
    if (cell.device) {
      this.showToast(lang === 'uk' ? '⚠ Щуп не може знешкодити пристрій — підійди сапером' : '⚠ Probe can\'t defuse a device — step on it manually');
      return;
    }
    this._spendTool('probe');
    Sound.probe();
    if (cell.mine) {
      if (!cell.flagged) { cell.flagged = true; this.renderer.setFlag(cell); }
      this.showToast('🎯 💣');
    } else {
      const out = this.board.reveal(c, r);
      this.renderer.onReveal(out);
      this._collect(out);
      if (this._checkWin()) this._win();
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
      if (this._checkWin()) this._win();
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
      const armTotal = addArmUse();
      if (armTotal >= 5 && unlockAchievement('arm_master')) {
        const a = ACHIEVEMENTS.find(x => x.id === 'arm_master');
        setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 800);
      }
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
      if (unlockAchievement('pilot')) {
        const a = ACHIEVEMENTS.find(x => x.id === 'pilot');
        setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 800);
      }
    });
  }

  _useUGV(c, r) {
    const sp = this.sapper, cell = this.board.get(c, r);
    if (!cell || (cell.type !== T.LAND && cell.type !== T.BRIDGE) || cell.revealed) { this._reAim('ugv', 'aimUgv'); return; }
    const path = this.board.pathCross(sp.cell.c, sp.cell.r, c, r);
    if (!path || path.length < 2) { this._reAim('ugv', 'aimUgv'); return; }
    this._spendTool('ugv');
    if (unlockAchievement('driver')) {
      const a = ACHIEVEMENTS.find(x => x.id === 'driver');
      setTimeout(() => this.showToast(`${a.icon} ${t('achUnlocked')} ${lang === 'uk' ? a.uk : a.en}!`), 800);
    }
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
    // Exclude device cells — they must be defused by the sapper manually
    const safe = b.cells.filter(c => c.type === T.LAND && !c.mine && !c.revealed && !c.flagged && !c.device);
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
    if (this._checkWin()) this._win();
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
      } else if (!cell.device) {
        const out = b.reveal(cell.c, cell.r);
        this.renderer.onReveal(out);
        revealed.push(...out);
      }
    }
    this._collect(revealed);
    Sound.reveal();
    this.updateHUD();
    if (this._checkWin()) this._win();
  }

  _useDetonator(c, r) {
    const b = this.board, cell = b.get(c, r);
    if (!cell || cell.type !== T.LAND || cell.revealed) { this._reAim('detonator', 'aimDetonator'); return; }
    if (cell.device) {
      this.showToast(lang === 'uk' ? '⚠ Підривник не знешкодить пристрій — підійди сапером' : '⚠ Detonator can\'t defuse a device — step on it manually');
      return;
    }
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
    if (this._checkWin()) this._win();
  }

  _useFlashlight(c, r) {
    const b = this.board;
    this._spendTool('flashlight');
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const cell = b.get(c + dc, r + dr);
      if (!cell || cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      if (cell.mine) { cell.flagged = true; this.renderer.setFlag(cell); }
      else if (!cell.device) { const revealed = b.reveal(cell.c, cell.r); out.push(...revealed); }
    }
    if (out.length) { this.renderer.onReveal(out); this._collect(out); }
    this.renderer.echoPing([{c, r, mine: false}], 2.5);
    Sound.reveal();
    this.updateHUD();
    if (this._checkWin()) this._win();
  }

  _useSpotlight() {
    const b = this.board, sp = this.sapper;
    const out = [];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const cell = b.get(sp.cell.c + dc, sp.cell.r + dr);
      if (!cell || cell.type !== T.LAND || cell.revealed || cell.flagged) continue;
      if (cell.mine) { cell.flagged = true; this.renderer.setFlag(cell); }
      else if (!cell.device) { const revealed = b.reveal(cell.c, cell.r); out.push(...revealed); }
    }
    if (out.length) { this.renderer.onReveal(out); this._collect(out); }
    const marks = b.cells.filter(c => c.type === T.LAND && !c.revealed)
      .filter(c => Math.max(Math.abs(c.c - sp.cell.c), Math.abs(c.r - sp.cell.r)) <= 2)
      .map(c => ({ c: c.c, r: c.r, mine: c.mine }));
    this.renderer.echoPing(marks, 3.0);
    Sound.echo();
    this.updateHUD();
    if (this._checkWin()) this._win();
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
    const hasPerks = this.helmetReady || this.jeepReady || this.radioReady;
    if (this.state !== 'PLAYING' || (!this.loadout.length && !hasPerks)) { el.style.display = 'none'; return; }
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
    // Rank perk buttons
    if (this.helmetReady || this.jeepReady) {
      const perk = this.jeepReady ? 'jeep' : 'helmet';
      const div = document.createElement('div');
      div.className = 'tool rank-perk passive';
      div.title = lang === 'uk' ? (perk === 'jeep' ? 'Джип — пережити підрив' : 'Каска — пережити підрив') : (perk === 'jeep' ? 'Jeep — survive blast' : 'Helmet — survive blast');
      div.innerHTML = `<span class="tool-ico" style="font-size:24px;line-height:1">${perk === 'jeep' ? '🚗' : '🪖'}</span><span class="tool-name">${lang === 'uk' ? (perk === 'jeep' ? 'Джип' : 'Каска') : (perk === 'jeep' ? 'Jeep' : 'Helmet')}</span>`;
      el.appendChild(div);
    }
    if (this.radioReady) {
      const div = document.createElement('div');
      div.className = 'tool rank-perk';
      div.title = lang === 'uk' ? 'Рація — відкрити безпечну клітинку' : 'Radio — reveal safe cell';
      div.innerHTML = `<span class="tool-ico" style="font-size:24px;line-height:1">📻</span><span class="tool-name">${lang === 'uk' ? 'Рація' : 'Radio'}</span>`;
      div.onclick = () => this._useRadio();
      el.appendChild(div);
    }
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
    el.innerHTML = `<div class="rank-insignia">${rankInsignia(info.index)}</div>` +
      `<div class="rank-main"><div class="rank-name">${t('rankLabel')}: ${rankName(info.rank, lang)}</div>${prog}</div>` +
      `<button class="rank-ach-btn" id="btn-ach-open-rank">🏅</button>`;
    $('btn-ach-open-rank').onclick = () => { Sound.click(); this.showAchievementsModal(); };
  }

  renderStashPanel() {
    const panel = $('stash-panel');
    const slots = this._bagSize();
    const stash = loadStash(), equip = loadEquip(slots);
    const owned = ARTIFACT_IDS.filter(id => stash[id] > 0);

    // Bag SVG changes with rank: кульок ATB(1)→котомочка(2)→сумка(3)→рюкзак(4)→великий рюкзак(5)→баул(6)
    const BP = BAG_SVGS[Math.max(1, Math.min(6, slots))];

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

    const bagName = (BAG_NAMES[lang] || BAG_NAMES.en)[Math.max(0, Math.min(5, slots - 1))];
    const bagCapStr = lang === 'uk'
      ? `до ${slots} ${slots === 1 ? 'предмета' : 'предметів'}`
      : `up to ${slots} item${slots === 1 ? '' : 's'}`;
    const slotsHTML = Array.from({ length: slots }, (_, i) => slotHTML(i)).join('');
    panel.innerHTML = `
      <div class="bp-section">
        <div class="bp-section-title"><em>${bagName}</em> — ${bagCapStr}</div>
        <div class="bp-row">
          <div class="bp-bag-wrap">${BP}</div>
          <div class="bp-slots">${slotsHTML}</div>
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
      card.onclick = () => { toggleEquip(id, slots); Sound.click(); this.renderStashPanel(); };
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
