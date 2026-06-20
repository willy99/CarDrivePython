// ── Achievement definitions ───────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  {
    id: 'pacifist',
    icon: '🕊️',
    en: 'Pacifist', uk: 'Пацифіст',
    descEn: 'Clear 3 levels in a row without stepping on a mine.',
    descUk: 'Пройти 3 рівні поспіль без підриву.',
    skin: 'ghost',
  },
  {
    id: 'minimalist',
    icon: '🎯',
    en: 'Minimalist', uk: 'Мінімаліст',
    descEn: 'Clear a level without using any artifact.',
    descUk: 'Пройти рівень без використання артефактів.',
    skin: 'ninja',
  },
  {
    id: 'lightning',
    icon: '⚡',
    en: 'Lightning', uk: 'Блискавка',
    descEn: 'Clear any level in under 60 seconds.',
    descUk: 'Пройти будь-який рівень менш ніж за 60 секунд.',
    skin: 'racer',
  },
  {
    id: 'veteran',
    icon: '🎖️',
    en: 'Veteran', uk: 'Ветеран',
    descEn: 'Clear 10 operations.',
    descUk: 'Пройти 10 операцій.',
    skin: 'soldier',
  },
  {
    id: 'explorer',
    icon: '🗺️',
    en: 'Explorer', uk: 'Дослідник',
    descEn: 'Clear all 24 operations.',
    descUk: 'Пройти всі 24 операції.',
    skin: 'commander',
  },
  {
    id: 'nightowl',
    icon: '🌙',
    en: 'Night Owl', uk: 'Нічний вовк',
    descEn: 'Clear a night operation.',
    descUk: 'Пройти нічну операцію.',
    skin: 'phantom',
  },
  {
    id: 'fogwalker',
    icon: '🌫️',
    en: 'Fog Walker', uk: 'Привид',
    descEn: 'Clear a fog-of-war level.',
    descUk: 'Пройти рівень у тумані.',
    skin: null,
  },
  {
    id: 'blitz',
    icon: '⏱️',
    en: 'Blitz', uk: 'Бліц',
    descEn: 'Complete a timed operation before time runs out.',
    descUk: 'Пройти операцію на час до кінця таймера.',
    skin: null,
  },
  {
    id: 'iron',
    icon: '🛡️',
    en: 'Iron Sapper', uk: 'Залізний сапер',
    descEn: 'Clear a high-density level (≥0.18) with an empty backpack.',
    descUk: 'Пройти щільний рівень (≥0.18) з порожнім рюкзаком.',
    skin: 'iron',
  },
  {
    id: 'strategist',
    icon: '🧠',
    en: 'Strategist', uk: 'Стратег',
    descEn: 'Place 10 correct flags across all operations (cumulative).',
    descUk: 'Поставити 10 правильних прапорців сумарно за всі операції.',
    skin: null,
  },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'miner_achievements';
const STREAK_KEY  = 'miner_clean_streak';
const FLAGS_KEY   = 'miner_correct_flags';

export function loadAchievements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveAchievements(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isAchieved(id) { return !!loadAchievements()[id]; }

// Returns true if this is a NEW unlock (first time), false if already had it
export function unlockAchievement(id) {
  const data = loadAchievements();
  if (data[id]) return false;
  data[id] = Date.now();
  saveAchievements(data);
  return true;
}

// ── Persistent counters ────────────────────────────────────────────────────────

export function getCleanStreak() {
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
}
export function setCleanStreak(n) { localStorage.setItem(STREAK_KEY, String(n)); }

export function getCorrectFlagsTotal() {
  return parseInt(localStorage.getItem(FLAGS_KEY) || '0', 10);
}
export function addCorrectFlags(n) {
  const total = getCorrectFlagsTotal() + n;
  localStorage.setItem(FLAGS_KEY, String(total));
  return total;
}

// ── Skin system ───────────────────────────────────────────────────────────────

const SKIN_KEY = 'miner_skin';

export const SKINS = [
  { id: 'default',   icon: '🟢', en: 'Standard',   uk: 'Стандарт',   achievement: null },
  { id: 'ghost',     icon: '👻', en: 'Ghost',       uk: 'Привид',     achievement: 'pacifist' },
  { id: 'ninja',     icon: '🥷', en: 'Ninja',       uk: 'Ніндзя',     achievement: 'minimalist' },
  { id: 'racer',     icon: '🏎️', en: 'Racer',       uk: 'Гонщик',     achievement: 'lightning' },
  { id: 'soldier',   icon: '🪖', en: 'Soldier',     uk: 'Солдат',     achievement: 'veteran' },
  { id: 'phantom',   icon: '🌙', en: 'Phantom',     uk: 'Фантом',     achievement: 'nightowl' },
  { id: 'iron',      icon: '🤖', en: 'Iron',        uk: 'Залізний',   achievement: 'iron' },
  { id: 'commander', icon: '👑', en: 'Commander',   uk: 'Командир',   achievement: 'explorer' },
];

export function loadSkin() {
  return localStorage.getItem(SKIN_KEY) || 'default';
}
export function saveSkin(id) { localStorage.setItem(SKIN_KEY, id); }

export function isSkinUnlocked(skinId) {
  if (skinId === 'default') return true;
  const skin = SKINS.find(s => s.id === skinId);
  if (!skin || !skin.achievement) return true;
  return isAchieved(skin.achievement);
}
