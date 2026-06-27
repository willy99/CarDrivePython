// ─── Sapper rank ladder — earned per cleared minefield ──────────────────────
const CLEARS_KEY = 'miner_clears_v1';

// min = total cleared fields needed to hold the rank. ★ count grows with rank.
export const RANKS = [
  { min: 0,   stars: 0, en: 'Recruit',         uk: 'Новобранець' },
  { min: 1,   stars: 1, en: 'Sapper',          uk: 'Сапер' },
  { min: 3,   stars: 1, en: 'Senior Sapper',   uk: 'Старший сапер' },
  { min: 6,   stars: 2, en: 'Junior Sergeant', uk: 'Молодший сержант' },
  { min: 10,  stars: 2, en: 'Sergeant',        uk: 'Сержант' },
  { min: 15,  stars: 3, en: 'Senior Sergeant', uk: 'Старший сержант' },
  { min: 22,  stars: 3, en: 'Master Sergeant', uk: 'Старшина' },
  { min: 30,  stars: 4, en: 'Warrant Officer', uk: 'Прапорщик' },
  { min: 40,  stars: 4, en: 'Lieutenant',      uk: 'Лейтенант' },
  { min: 52,  stars: 5, en: 'Captain',         uk: 'Капітан' },
  { min: 66,  stars: 5, en: 'Major',           uk: 'Майор' },
  { min: 82,  stars: 6, en: 'Lt. Colonel',     uk: 'Підполковник' },
  { min: 100, stars: 6, en: 'Colonel',         uk: 'Полковник' },
  { min: 130, stars: 7, en: 'General',         uk: 'Генерал' },
];

export function loadClears() { return parseInt(localStorage.getItem(CLEARS_KEY), 10) || 0; }
export function addClear() {
  const n = loadClears() + 1;
  localStorage.setItem(CLEARS_KEY, String(n));
  return n;
}

// → { index, rank, next, toNext } for a given cleared-field count.
export function rankFor(clears) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (clears >= RANKS[k].min) i = k;
  const next = RANKS[i + 1] || null;
  return { index: i, rank: RANKS[i], next, toNext: next ? next.min - clears : 0 };
}

export function rankName(rank, lang) { return rank[lang] || rank.en; }
export function rankStars(rank) { return '★'.repeat(rank.stars) || '•'; }

// ── Rank insignia SVG (Ukrainian army epaulette style) ────────────────────
export function rankInsignia(index) {
  const W = 46, H = 62;
  const G = '#c8a040';   // gold
  const GL = '#e8d070';  // light gold highlight
  const BG = '#28402e';  // dark olive

  // Epaulette outline: rounded rect body + circular button at top
  const body = `<rect x="3" y="12" width="40" height="46" rx="3" fill="${BG}"/>` +
               `<circle cx="23" cy="9" r="6" fill="${BG}" stroke="${G}" stroke-width="1.2"/>` +
               `<circle cx="23" cy="9" r="3.5" fill="${G}" opacity="0.7"/>` +
               `<rect x="3" y="12" width="40" height="46" rx="3" fill="none" stroke="${G}" stroke-width="1.2" opacity="0.6"/>`;

  // ── helpers ──────────────────────────────────────────────────────────────
  // Upward-pointing chevron (Ukrainian style) centred at y
  const chev = (y, thick = 3.2, w = 16) =>
    `<polyline points="${23-w},${y+thick} ${23},${y-thick} ${23+w},${y+thick}"` +
    ` fill="none" stroke="${G}" stroke-width="${thick}" stroke-linecap="round" stroke-linejoin="round"/>`;

  // Diamond (ромб)
  const diam = (cx, cy, r = 7) =>
    `<polygon points="${cx},${cy-r} ${cx+r*0.7},${cy} ${cx},${cy+r} ${cx-r*0.7},${cy}"` +
    ` fill="${G}" stroke="${GL}" stroke-width="0.6"/>`;

  // Horizontal gold braid bar across the bottom
  const braid = (y = 50, h = 5.5) =>
    `<rect x="3" y="${y}" width="40" height="${h}" rx="1.5" fill="${G}" opacity="0.85"/>` +
    `<line x1="3" y1="${y+1.5}" x2="43" y2="${y+1.5}" stroke="${GL}" stroke-width="0.8" opacity="0.5"/>`;

  // 5-pointed star
  const star = (cx, cy, r = 7) => {
    const pts = Array.from({length: 10}, (_, i) => {
      const a = (i * 36 - 90) * Math.PI / 180;
      const rr = i % 2 === 0 ? r : r * 0.42;
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${G}" stroke="${GL}" stroke-width="0.5"/>`;
  };

  // ── per-rank markings ────────────────────────────────────────────────────
  const M = {
    0:  '',                                                                    // Новобранець
    1:  chev(49),                                                              // Сапер
    2:  chev(46) + chev(54),                                                  // Старший сапер
    3:  chev(43,2.5,14) + chev(50,2.5,14) + chev(57,2.5,14),                 // Мол. сержант
    4:  chev(42,3,16) + chev(50,3,16) + chev(58,3,16),                        // Сержант
    5:  chev(40,2.5,14)+chev(46.5,2.5,14)+chev(53,2.5,14)+chev(59.5,2.5,14), // Ст. сержант
    6:  braid(51,6)+chev(38,2.5,14)+chev(44,2.5,14)+chev(50,2.5,14),         // Старшина
    7:  diam(23, 36),                                                          // Прапорщик
    8:  diam(23, 30) + diam(23, 44),                                           // Лейтенант
    9:  diam(23,22) + diam(14,36) + diam(32,36),                               // Капітан
    10: braid(50,6) + diam(23, 33),                                            // Майор
    11: braid(50,6) + diam(15,33) + diam(31,33),                              // Підполковник
    12: braid(50,6) + diam(23,22) + diam(14,35) + diam(32,35),               // Полковник
    13: braid(50,7) + star(23,22,8) + star(12,36,7) + star(34,36,7),          // Генерал
  };

  const marks = M[index] ?? M[0];
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${body}${marks}</svg>`;
}

// How many loadout slots a sapper has, spread across all 14 ranks (0-13):
// ranks 0-1 → кульок ATB(1), 2-3 → котомочка(2), 4-5 → сумка(3),
// 6-7 → рюкзак(4), 8-9 → великий рюкзак(5), 10-13 → баул(6).
export function bagCapacity(rankIndex) {
  if (rankIndex <= 1) return 1;
  if (rankIndex <= 3) return 2;
  if (rankIndex <= 5) return 3;
  if (rankIndex <= 7) return 4;
  if (rankIndex <= 9) return 5;
  return 6;
}

// Rank perks: earned permanently when the rank is first reached.
// Each perk key maps to the minimum rank index that grants it.
export const RANK_PERKS = {
  helmet:    4,  // Sergeant     — survives one mine hit per op (field shakes, 3 cells open)
  fieldMap:  8,  // Lieutenant   — perimeter row+col revealed at level start
  radio:     9,  // Captain      — one free safe-cell reveal per op
  jeep:      13, // General      — survives one mine hit per op (no shake penalty)
};

// Returns an object { helmet, fieldMap, radio, jeep } → true if the rank index grants it.
export function rankPerks(rankIndex) {
  const r = {};
  for (const [k, min] of Object.entries(RANK_PERKS)) r[k] = rankIndex >= min;
  return r;
}

export const BAG_NAMES = {
  uk: ['кульок ATB', 'котомочка', 'сумка', 'рюкзак', 'великий рюкзак', 'баул'],
  en: ['ATB bag', 'pouch', 'bag', 'backpack', 'large backpack', 'duffel bag'],
};
