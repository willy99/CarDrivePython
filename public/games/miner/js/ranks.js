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
