// ── Waiter subgame ─────────────────────────────────────────────────────────
const WTR_W = 800, WTR_H = 420;

const WTR_MENU = [
  {id:'burger',    emoji:'🍔'}, {id:'pizza',     emoji:'🍕'},
  {id:'pasta',     emoji:'🍝'}, {id:'salad',     emoji:'🥗'},
  {id:'soup',      emoji:'🥣'}, {id:'steak',     emoji:'🥩'},
  {id:'ramen',     emoji:'🍜'}, {id:'sushi',     emoji:'🍣'},
  {id:'taco',      emoji:'🌮'}, {id:'sandwich',  emoji:'🥪'},
  {id:'coffee',    emoji:'☕'}, {id:'juice',     emoji:'🧃'},
  {id:'water',     emoji:'💧'}, {id:'tea',       emoji:'🍵'},
  {id:'bubbletea', emoji:'🧋'}, {id:'cake',      emoji:'🍰'},
  {id:'icecream',  emoji:'🍦'}, {id:'pie',       emoji:'🥧'},
  {id:'pancakes',  emoji:'🥞'}, {id:'croissant', emoji:'🥐'},
];

// 20 levels across the fixed table — adaptive beyond
const WTR_LEVELS = [
  {customers:2, items:1, studyMs:12000},
  {customers:2, items:2, studyMs:18000},
  {customers:3, items:1, studyMs:16000},
  {customers:3, items:2, studyMs:22000},
  {customers:3, items:3, studyMs:28000},
  {customers:4, items:2, studyMs:26000},
  {customers:4, items:3, studyMs:34000},
  {customers:5, items:2, studyMs:30000},
  {customers:5, items:3, studyMs:42000},
  {customers:5, items:4, studyMs:55000},
  {customers:5, items:5, studyMs:65000},
  {customers:6, items:3, studyMs:40000},
  {customers:6, items:4, studyMs:52000},
  {customers:6, items:5, studyMs:68000},
  {customers:7, items:3, studyMs:48000},
  {customers:7, items:4, studyMs:62000},
  {customers:7, items:5, studyMs:80000},
  {customers:8, items:4, studyMs:72000},
  {customers:8, items:5, studyMs:92000},
  {customers:8, items:6, studyMs:115000},
];

const WTR_SHIRTS = [
  {clr:'#e74c3c', dark:'#c0392b'},
  {clr:'#3498db', dark:'#2471a3'},
  {clr:'#27ae60', dark:'#1e8449'},
  {clr:'#9b59b6', dark:'#7d3c98'},
  {clr:'#e67e22', dark:'#ca6f1e'},
  {clr:'#16a085', dark:'#0e7862'},
  {clr:'#e91e63', dark:'#c2185b'},
  {clr:'#795548', dark:'#5d4037'},
];
const WTR_SKINS = ['#f5c5a3','#e0a87c','#c68642','#a0694a','#8d5524','#f1dfc4'];

// ── State ──────────────────────────────────────────────────────────────────
let wtrLevel = 0;
let wtrCurrent = null;
let wtrTimers = [];
let wtrAnswers = [];

// ── SOUNDS (reuse the global playTone from pairs.js) ──
function wtrSnd(fn){ try{ if(typeof playTone==='function') fn(); }catch(e){} }
function wtrSndPick(){    wtrSnd(()=>{ playTone(520,'sine',0.10,0.05); }); }
function wtrSndNext(){    wtrSnd(()=>{ playTone(392,'triangle',0.12,0.10); playTone(523,'triangle',0.10,0.12,0.09); }); }
function wtrSndVerdict(stars){ wtrSnd(()=>{
  if(stars>=2){ [523,659,784,1047].forEach((f,i)=>playTone(f,'triangle',0.24,0.20,i*0.11)); }
  else if(stars===1){ playTone(440,'triangle',0.18,0.18); playTone(523,'triangle',0.16,0.20,0.15); }
  else { playTone(330,'sawtooth',0.16,0.24); playTone(247,'sawtooth',0.13,0.28,0.16); }
}); }
let wtrRecallIdx = 0;

// ── RNG ────────────────────────────────────────────────────────────────────
function wtrRng(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function wtrDailySeed() { return Math.floor(Date.now() / 86400000); }

// Adaptive: any level index, even beyond WTR_LEVELS.length
function wtrLevelCfg(i) {
  if (i < WTR_LEVELS.length) return WTR_LEVELS[i];
  const extra = i - WTR_LEVELS.length;
  const customers = Math.min(8, 8 + Math.floor(extra / 4));
  const items     = Math.min(8, 6 + 1 + (extra % 4));
  return {customers, items, studyMs: customers * items * 3200};
}

// ── Build round ────────────────────────────────────────────────────────────
function wtrBuild(lvIdx, seed) {
  const cfg = wtrLevelCfg(lvIdx);
  const rng = wtrRng(seed >>> 0);
  const pickN = (arr, n) => {
    const pool = [...arr]; const out = [];
    while (out.length < n && pool.length)
      out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  const customers = WTR_SHIRTS.slice(0, Math.min(cfg.customers, WTR_SHIRTS.length)).map(() => ({
    skin: WTR_SKINS[Math.floor(rng() * WTR_SKINS.length)],
    items: pickN(WTR_MENU, cfg.items).map(m => m.id),
  }));
  return {customers, cfg, lvIdx, seed};
}

// ── SVG scene ─────────────────────────────────────────────────────────────
function wtrCx(i, n) {
  const margin = n >= 7 ? 50 : n >= 6 ? 60 : n >= 5 ? 75 : n >= 4 ? 100 : 130;
  return n === 1 ? WTR_W / 2 : Math.round(margin + (WTR_W - 2 * margin) / (n - 1) * i);
}

function wtrSceneSvg(customers, showBubbles) {
  const n = customers.length;
  const P = [];
  P.push(`<svg viewBox="0 0 ${WTR_W} ${WTR_H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">`);

  P.push(`<rect width="${WTR_W}" height="${WTR_H}" fill="#28180a"/>`);
  P.push(`<rect y="${WTR_H * 0.76}" width="${WTR_W}" height="${WTR_H * 0.24}" fill="#3a2008"/>`);
  P.push(`<line x1="0" y1="${WTR_H * 0.76}" x2="${WTR_W}" y2="${WTR_H * 0.76}" stroke="#58340c" stroke-width="4"/>`);
  for (let b = 0; b < 4; b++) {
    const fy = Math.round(WTR_H * 0.76 + 24 + b * 22);
    P.push(`<line x1="0" y1="${fy}" x2="${WTR_W}" y2="${fy}" stroke="#432510" stroke-width="1.5" opacity=".45"/>`);
  }
  const nLamps = n + 1;
  for (let li = 0; li < nLamps; li++) {
    const lx = Math.round(WTR_W / (nLamps + 1) * (li + 1));
    P.push(`<line x1="${lx}" y1="0" x2="${lx}" y2="48" stroke="#4a2e10" stroke-width="2"/>`);
    P.push(`<path d="M${lx - 14} 48 l4 -8 h20 l4 8 z" fill="#c4902a"/>`);
    P.push(`<ellipse cx="${lx}" cy="50" rx="14" ry="7" fill="#f8e090" opacity=".9"/>`);
    P.push(`<ellipse cx="${lx}" cy="${Math.round(WTR_H * 0.55)}" rx="100" ry="${Math.round(WTR_H * 0.5)}" fill="rgba(248,224,144,.03)"/>`);
  }
  customers.forEach((c, i) => wtrDrawCustomer(P, wtrCx(i, n), c, WTR_SHIRTS[i], showBubbles, i + 1, n));
  P.push('</svg>');
  return P.join('');
}

function wtrDrawCustomer(P, cx, c, sh, showBubble, num, totalN) {
  const tableY = 320, bodyY = 265, headY = 238;
  const compact = totalN >= 6; // tight spacing

  P.push(`<ellipse cx="${cx}" cy="354" rx="${compact ? 36 : 46}" ry="10" fill="rgba(0,0,0,.45)"/>`);
  P.push(`<rect x="${cx - 5}" y="${tableY + 12}" width="10" height="28" fill="#5a3c08"/>`);
  P.push(`<ellipse cx="${cx}" cy="${tableY + 8}" rx="${compact ? 42 : 54}" ry="13" fill="#7a5010"/>`);
  P.push(`<ellipse cx="${cx}" cy="${tableY}" rx="${compact ? 42 : 54}" ry="13" fill="#c49a2a"/>`);
  P.push(`<ellipse cx="${cx}" cy="${tableY - 3}" rx="${compact ? 40 : 52}" ry="11" fill="#d4aa32" opacity=".8"/>`);
  P.push(`<rect x="${cx - (compact ? 18 : 24)}" y="${bodyY}" width="${compact ? 36 : 48}" height="${tableY - bodyY + 12}" rx="10" fill="${sh.clr}"/>`);
  const r = compact ? 19 : 24;
  P.push(`<circle cx="${cx}" cy="${headY}" r="${r}" fill="${c.skin}"/>`);
  P.push(`<circle cx="${cx - 6}" cy="${headY - 3}" r="3" fill="#1c1c24"/>`);
  P.push(`<circle cx="${cx + 6}" cy="${headY - 3}" r="3" fill="#1c1c24"/>`);
  P.push(`<circle cx="${cx - 5}" cy="${headY - 5}" r="1.1" fill="rgba(255,255,255,.55)"/>`);
  P.push(`<path d="M${cx - 6} ${headY + 10} q6 7 12 0" fill="none" stroke="#1c1c24" stroke-width="2" stroke-linecap="round"/>`);
  const bx2 = compact ? cx + 12 : cx + 17;
  P.push(`<circle cx="${bx2}" cy="${bodyY + 9}" r="${compact ? 8 : 11}" fill="${sh.dark}"/>`);
  P.push(`<text x="${bx2}" y="${bodyY + 14}" text-anchor="middle" font-size="${compact ? 9 : 12}" fill="white" font-family="sans-serif" font-weight="bold">${num}</text>`);

  if (showBubble && c.items && c.items.length) {
    const nItems = c.items.length;
    // Compact bubbles for crowded scenes
    const smallMode = totalN >= 6;
    const lineH = smallMode ? 28 : 38;
    const bubH  = (smallMode ? 16 : 20) + nItems * lineH;
    const bubW  = smallMode ? Math.max(58, 50 + nItems * 8) : Math.max(86, 76 + nItems * 12);
    let bx = cx - bubW / 2;
    bx = Math.max(4, Math.min(WTR_W - bubW - 4, bx));
    const by    = Math.max(4, headY - bubH - (compact ? 20 : 26));
    const tailX = Math.min(Math.max(cx, bx + 14), bx + bubW - 14);

    P.push(`<rect x="${bx + 3}" y="${by + 3}" width="${bubW}" height="${bubH}" rx="12" fill="rgba(0,0,0,.2)"/>`);
    P.push(`<rect x="${bx}" y="${by}" width="${bubW}" height="${bubH}" rx="12" fill="rgba(255,255,255,.97)" stroke="${sh.clr}" stroke-width="2"/>`);
    P.push(`<path d="M${tailX - 6} ${by + bubH} l6 16 l6 -16 z" fill="rgba(255,255,255,.97)"/>`);
    P.push(`<path d="M${tailX - 6} ${by + bubH} l6 16 l6 -16 z" fill="none" stroke="${sh.clr}" stroke-width="2"/>`);
    P.push(`<rect x="${tailX - 7}" y="${by + bubH - 2}" width="14" height="5" fill="rgba(255,255,255,.97)"/>`);

    c.items.forEach((itemId, j) => {
      const item = WTR_MENU.find(m => m.id === itemId);
      const iy   = by + (smallMode ? 16 : 22) + j * lineH;
      const lc   = bx + bubW / 2;
      P.push(`<text x="${lc}" y="${iy + 2}" text-anchor="middle" font-size="${smallMode ? 17 : 21}" font-family="Apple Color Emoji,Segoe UI Emoji,serif">${item.emoji}</text>`);
      if (!smallMode) {
        P.push(`<text x="${lc}" y="${iy + 20}" text-anchor="middle" font-size="10" fill="#2a2a2a" font-family="system-ui,sans-serif">${t('wtr_' + item.id)}</text>`);
      }
    });
  }
}

// ── Result scene (happy / angry customers) ─────────────────────────────────
function wtrResultSceneSvg(results) {
  const n = results.length;
  const H = 200;
  const P = [];
  P.push(`<svg viewBox="0 0 ${WTR_W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">`);
  P.push(`<rect width="${WTR_W}" height="${H}" fill="#28180a"/>`);
  P.push(`<rect y="${H * 0.72}" width="${WTR_W}" height="${H * 0.28}" fill="#3a2008"/>`);
  P.push(`<line x1="0" y1="${H * 0.72}" x2="${WTR_W}" y2="${H * 0.72}" stroke="#58340c" stroke-width="3"/>`);

  results.forEach((r, i) => {
    const cx   = wtrCx(i, n);
    const sh   = WTR_SHIRTS[i];
    const pct  = r.correct.length > 0 ? r.hits / r.correct.length : 0;
    const headY = 86, bodyY = 112, tableY = 152;
    const compact = n >= 6;
    const headR  = compact ? 18 : 22;

    // Shadow + table
    P.push(`<ellipse cx="${cx}" cy="${H * 0.86}" rx="${compact ? 34 : 40}" ry="8" fill="rgba(0,0,0,.38)"/>`);
    P.push(`<rect x="${cx - 4}" y="${tableY + 8}" width="8" height="20" fill="#5a3c08"/>`);
    P.push(`<ellipse cx="${cx}" cy="${tableY + 5}" rx="${compact ? 38 : 46}" ry="10" fill="#7a5010"/>`);
    P.push(`<ellipse cx="${cx}" cy="${tableY}" rx="${compact ? 38 : 46}" ry="10" fill="#c49a2a"/>`);

    // Body
    P.push(`<rect x="${cx - (compact ? 16 : 20)}" y="${bodyY}" width="${compact ? 32 : 40}" height="${tableY - bodyY + 8}" rx="8" fill="${sh.clr}"/>`);

    // Head
    P.push(`<circle cx="${cx}" cy="${headY}" r="${headR}" fill="${r.c.skin}"/>`);

    if (pct === 1) {
      // Happy: wide smile, happy eyes
      P.push(`<circle cx="${cx - 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      P.push(`<circle cx="${cx + 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      P.push(`<circle cx="${cx - 5}" cy="${headY - 5}" r="1" fill="rgba(255,255,255,.6)"/>`);
      P.push(`<path d="M${cx - 8} ${headY + 8} q8 11 16 0" fill="none" stroke="#1c1c24" stroke-width="2.2" stroke-linecap="round"/>`);
      // Rosy cheeks
      P.push(`<ellipse cx="${cx - headR + 4}" cy="${headY + 5}" rx="5" ry="3" fill="rgba(255,150,130,.4)"/>`);
      P.push(`<ellipse cx="${cx + headR - 4}" cy="${headY + 5}" rx="5" ry="3" fill="rgba(255,150,130,.4)"/>`);
      // Star above
      P.push(`<text x="${cx}" y="${headY - headR - 8}" text-anchor="middle" font-size="${compact ? 16 : 20}" font-family="Apple Color Emoji,serif">⭐</text>`);
    } else if (pct === 0) {
      // Angry: frown, angry eyebrows
      P.push(`<circle cx="${cx - 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      P.push(`<circle cx="${cx + 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      // Angry eyebrows
      P.push(`<line x1="${cx - 10}" y1="${headY - 11}" x2="${cx - 3}" y2="${headY - 7}" stroke="#3a2010" stroke-width="2" stroke-linecap="round"/>`);
      P.push(`<line x1="${cx + 3}" y1="${headY - 7}" x2="${cx + 10}" y2="${headY - 11}" stroke="#3a2010" stroke-width="2" stroke-linecap="round"/>`);
      // Frown
      P.push(`<path d="M${cx - 7} ${headY + 12} q7 -9 14 0" fill="none" stroke="#1c1c24" stroke-width="2.2" stroke-linecap="round"/>`);
      // Anger mark
      P.push(`<text x="${cx}" y="${headY - headR - 8}" text-anchor="middle" font-size="${compact ? 14 : 18}" font-family="Apple Color Emoji,serif">💢</text>`);
    } else {
      // Partial: neutral mouth, slight frown
      P.push(`<circle cx="${cx - 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      P.push(`<circle cx="${cx + 6}" cy="${headY - 3}" r="2.8" fill="#1c1c24"/>`);
      P.push(`<line x1="${cx - 7}" y1="${headY + 10}" x2="${cx + 7}" y2="${headY + 10}" stroke="#1c1c24" stroke-width="2" stroke-linecap="round"/>`);
      // Question mark above
      P.push(`<text x="${cx}" y="${headY - headR - 6}" text-anchor="middle" font-size="${compact ? 14 : 18}" font-family="sans-serif" fill="rgba(255,255,255,.5)">?</text>`);
    }
  });

  P.push('</svg>');
  return P.join('');
}

// ── Menu screen ────────────────────────────────────────────────────────────
function showWaiterMenu() {
  showScreen('screen-waiter');
  document.getElementById('wtr-select').style.display  = 'block';
  document.getElementById('wtr-study').style.display   = 'none';
  document.getElementById('wtr-recall').style.display  = 'none';
  document.getElementById('wtr-result').style.display  = 'none';
  wtrRenderMenu();
}

function wtrRenderMenu() {
  const stats   = wtrLoadStats();
  const hist    = stats.history || [];
  const dayKey  = wtrDailySeed();
  const dayDone = (stats.days || {})[dayKey];
  const badge   = document.getElementById('wtr-daily-badge');
  if (badge) badge.textContent = dayDone ? `✓ ${dayDone.pct}%` : t('wtr_open');

  const grid = document.getElementById('wtr-level-grid');
  if (!grid) return;

  // Show all 20 base levels + adaptive extra levels if last one beaten
  const highestBeaten = hist.reduce((m, h) => Math.max(m, h.lvIdx), -1);
  const showCount = Math.max(WTR_LEVELS.length, highestBeaten + 2);

  grid.innerHTML = Array.from({length: showCount}, (_, i) => {
    const lv     = wtrLevelCfg(i);
    const done   = hist.filter(h => h.lvIdx === i);
    const best   = done.length ? Math.max(...done.map(h => h.pct)) : null;
    const locked = i > 1 && !hist.some(h => h.lvIdx === i - 1 && h.pct >= 60);

    // Visual guest dots (one per customer, using their shirt color)
    const guestDots = WTR_SHIRTS.slice(0, lv.customers).map(s =>
      `<span class="wtr-lv-dot" style="background:${s.clr}"></span>`).join('');

    // Dish icons (fork emoji repeated)
    const dishIcons = '🍴'.repeat(Math.min(lv.items, 6));

    return `<button class="wtr-lv-btn${locked ? ' locked' : ''}" onclick="${locked ? '' : 'wtrStart(' + i + ')'}" ${locked ? 'disabled' : ''}>
      <div class="wtr-lv-guests">${guestDots}</div>
      <div class="wtr-lv-forks">${dishIcons}</div>
      ${best !== null
        ? `<div class="wtr-lv-score">${best}%</div>`
        : locked
          ? `<div class="wtr-lv-lock">🔒</div>`
          : `<div class="wtr-lv-score" style="opacity:.35">—</div>`}
    </button>`;
  }).join('');

  const total   = hist.length;
  const todayS  = new Date().toDateString();
  const today   = hist.filter(h => h.date === todayS).length;
  const avg     = total ? Math.round(hist.reduce((a, h) => a + h.pct, 0) / total) : 0;
  const bestPct = total ? Math.max(...hist.map(h => h.pct)) : 0;
  const statsEl = document.getElementById('wtr-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="math-stat-cell"><div class="math-stat-n">${today}</div><div class="math-stat-l">${t('wtr_stat_today')}</div></div>
    <div class="math-stat-cell"><div class="math-stat-n">${total}</div><div class="math-stat-l">${t('wtr_stat_total')}</div></div>
    <div class="math-stat-cell"><div class="math-stat-n">${avg}%</div><div class="math-stat-l">${t('wtr_stat_avg')}</div></div>
    <div class="math-stat-cell"><div class="math-stat-n">${bestPct}%</div><div class="math-stat-l">${t('wtr_stat_best')}</div></div>
  `;
}

// ── Start / Study ──────────────────────────────────────────────────────────
function wtrStart(lvIdx, fixedSeed) {
  wtrLevel    = lvIdx != null ? lvIdx : wtrLevel;
  const seed  = fixedSeed != null ? fixedSeed : Math.floor(Math.random() * 2147483647);
  wtrCurrent  = wtrBuild(wtrLevel, seed);
  wtrCurrent.daily = fixedSeed != null;
  wtrAnswers  = wtrCurrent.customers.map(() => []);
  wtrRecallIdx = 0;

  showScreen('screen-waiter');
  document.getElementById('wtr-select').style.display  = 'none';
  document.getElementById('wtr-study').style.display   = 'block';
  document.getElementById('wtr-recall').style.display  = 'none';
  document.getElementById('wtr-result').style.display  = 'none';

  document.getElementById('wtr-scene').innerHTML = wtrSceneSvg(wtrCurrent.customers, true);
  document.getElementById('wtr-study-lbl').textContent  = t('wtr_study_cap');
  document.getElementById('wtr-skip-btn').textContent   = t('wtr_skip');

  const bar = document.getElementById('wtr-timebar');
  bar.style.transition = 'none'; bar.style.width = '100%';
  void bar.offsetWidth;
  bar.style.transition = `width ${wtrCurrent.cfg.studyMs}ms linear`;
  bar.style.width = '0%';

  wtrTimers.forEach(clearTimeout); wtrTimers = [];
  wtrTimers.push(setTimeout(wtrStartRecall, wtrCurrent.cfg.studyMs));
  try { metaTrackGame && metaTrackGame('waiter'); } catch (e) {}
}

function wtrStartDaily() {
  wtrStart(Math.min(3, WTR_LEVELS.length - 1), wtrDailySeed());
}

// ── Recall ─────────────────────────────────────────────────────────────────
function wtrStartRecall() {
  wtrTimers.forEach(clearTimeout); wtrTimers = [];
  wtrRecallIdx = 0;
  document.getElementById('wtr-study').style.display  = 'none';
  document.getElementById('wtr-recall').style.display = 'block';
  wtrRenderRecall();
}

function wtrRenderRecall() {
  const {customers, cfg} = wtrCurrent;
  const i     = wtrRecallIdx;
  const c     = customers[i];
  const sh    = WTR_SHIRTS[i];
  const nItems = cfg.items;
  const mine  = wtrAnswers[i];

  document.getElementById('wtr-recall-dots').innerHTML = customers.map((_, ci) => {
    const s = WTR_SHIRTS[ci];
    return `<div class="wtr-dot${ci === i ? ' active' : ci < i ? ' done' : ''}" style="background:${ci === i ? s.clr : ci < i ? '#4ade80' : 'rgba(255,255,255,.15)'}"></div>`;
  }).join('');

  document.getElementById('wtr-recall-q').innerHTML = `
    <div class="wtr-avatar-big" style="background:${sh.clr};border-color:${sh.dark}">${i + 1}</div>
    <div class="wtr-recall-text">${t('wtr_question', i + 1)}</div>
  `;

  document.getElementById('wtr-slots').innerHTML = Array.from({length: nItems}, (_, si) => {
    const filledId = mine[si];
    const item     = filledId ? WTR_MENU.find(m => m.id === filledId) : null;
    return `<div class="wtr-slot${item ? ' filled' : ''}" onclick="wtrClearSlot(${si})">
      ${item
        ? `<span class="wtr-slot-em">${item.emoji}</span><span class="wtr-slot-nm">${t('wtr_' + item.id)}</span>`
        : `<span class="wtr-slot-ph">?</span>`}
    </div>`;
  }).join('');

  const full = mine.length >= nItems;
  document.getElementById('wtr-menu-grid').innerHTML = WTR_MENU.map(item => {
    const used = mine.includes(item.id);
    return `<button class="wtr-menu-btn${used ? ' used' : ''}" onclick="wtrPickItem('${item.id}')" ${(used || full) ? 'disabled' : ''}>
      <span class="wtr-menu-em">${item.emoji}</span>
      <span class="wtr-menu-nm">${t('wtr_' + item.id)}</span>
    </button>`;
  }).join('');

  const isLast     = i === customers.length - 1;
  const canProceed = mine.length === nItems;
  document.getElementById('wtr-recall-action').innerHTML =
    `<button class="btn btn-primary" onclick="${isLast ? 'wtrSubmit()' : 'wtrNextCustomer()'}" ${canProceed ? '' : 'disabled'} style="min-width:150px">
      ${isLast ? t('wtr_submit') : t('wtr_next')}
    </button>`;
}

function wtrPickItem(itemId) {
  const mine   = wtrAnswers[wtrRecallIdx];
  const nItems = wtrCurrent.cfg.items;
  if (mine.length >= nItems || mine.includes(itemId)) return;
  mine.push(itemId);
  wtrSndPick();
  wtrRenderRecall();
}

function wtrClearSlot(si) {
  const mine = wtrAnswers[wtrRecallIdx];
  if (mine[si] !== undefined) { mine.splice(si, 1); wtrRenderRecall(); }
}

function wtrNextCustomer() {
  if (wtrRecallIdx < wtrCurrent.customers.length - 1) {
    wtrRecallIdx++;
    wtrRenderRecall();
  }
}

// ── Submit & Result ────────────────────────────────────────────────────────
function wtrSubmit() {
  const {customers, cfg, lvIdx, seed} = wtrCurrent;
  const nItems = cfg.items;
  let correct  = 0;
  const total  = customers.length * nItems;

  const results = customers.map((c, i) => {
    const mine       = wtrAnswers[i] || [];
    const correctSet = new Set(c.items);
    const hits       = mine.filter(id => correctSet.has(id)).length;
    correct += hits;
    return {c, correct: c.items, mine, hits, num: i + 1};
  });

  const pct = Math.round(correct / total * 100);

  const stats = wtrLoadStats();
  stats.history = (stats.history || []);
  stats.history.push({lvIdx, seed, pct, date: new Date().toDateString(), ts: Date.now()});
  if (stats.history.length > 200) stats.history = stats.history.slice(-200);
  if (wtrCurrent.daily) {
    stats.days = stats.days || {};
    stats.days[seed] = {pct, ts: Date.now()};
  }
  wtrSaveStats(stats);

  try { if (typeof addXp === 'function') addXp(Math.round(pct / 10) * 5 + 5, t('wtr_mode_title')); } catch (e) {}
  try { checkAchievements && checkAchievements(['wtr_first']); } catch (e) {}

  document.getElementById('wtr-recall').style.display = 'none';
  document.getElementById('wtr-result').style.display = 'block';
  wtrRenderResult(results, pct, correct, total);
}

function wtrRenderResult(results, pct, correct, total) {
  const verdict = pct === 100 ? t('wtr_perfect') : pct >= 80 ? t('wtr_good') : pct >= 50 ? t('wtr_ok') : t('wtr_poor');
  const stars   = pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
  wtrSndVerdict(stars);

  // Emotional customer scene
  document.getElementById('wtr-result-faces').innerHTML = wtrResultSceneSvg(results);

  document.getElementById('wtr-result-score').innerHTML = `
    <div class="result-hero">${pct}%</div>
    <div class="wm-stars" style="font-size:1.6rem;margin:2px 0">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <div class="result-label">${verdict}</div>
    <div class="section-sub">${correct} / ${total} ${t('wtr_items_correct')}</div>
  `;

  document.getElementById('wtr-result-grid').innerHTML = results.map(r => {
    const sh         = WTR_SHIRTS[r.num - 1];
    const correctSet = new Set(r.correct);
    return `<div class="wtr-res-row">
      <div class="wtr-res-av" style="background:${sh.clr};border-color:${sh.dark}">${r.num}</div>
      <div class="wtr-res-items">
        ${r.correct.map(id => {
          const item = WTR_MENU.find(m => m.id === id);
          const hit  = r.mine.includes(id);
          return `<span class="wtr-res-item ${hit ? 'hit' : 'miss'}">${item.emoji}<sup>${hit ? '✓' : '✗'}</sup></span>`;
        }).join('')}
        ${r.mine.filter(id => !correctSet.has(id)).map(id => {
          const item = WTR_MENU.find(m => m.id === id);
          return `<span class="wtr-res-item wrong">${item.emoji}<sup>+</sup></span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  document.getElementById('wtr-result-btns').innerHTML = `
    <button class="btn" onclick="showWaiterMenu()">${t('wtr_to_menu')}</button>
    <button class="btn btn-primary" onclick="wtrStart(${wtrCurrent.lvIdx})">${t('wtr_retry')}</button>
  `;
}

// ── Persistence ────────────────────────────────────────────────────────────
function wtrLoadStats() {
  try { return JSON.parse(localStorage.getItem('membrain_waiter_v1')) || {}; } catch (e) { return {}; }
}
function wtrSaveStats(s) { try{ localStorage.setItem('membrain_waiter_v1', JSON.stringify(s)); }catch(e){} }

// ── Lang re-render hook ────────────────────────────────────────────────────
function showWaiterMenuLang() {
  const s = document.getElementById('screen-waiter');
  if (s && s.classList.contains('active') &&
      document.getElementById('wtr-select').style.display !== 'none') {
    wtrRenderMenu();
  }
}
