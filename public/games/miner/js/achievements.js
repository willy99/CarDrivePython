// ── Achievement definitions ───────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  // ── Existing ──────────────────────────────────────────────────────────────
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
    descEn: 'Clear all 30 operations.',
    descUk: 'Пройти всі 30 операцій.',
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
    en: 'Fog Walker', uk: 'Привид туману',
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

  // ── New ───────────────────────────────────────────────────────────────────
  {
    id: 'survivor',
    icon: '💥',
    en: 'Safety Master', uk: 'Майстер безпеки',
    descEn: 'Survive a mine explosion thanks to a ballistic vest.',
    descUk: 'Вижити після підриву на міні завдяки бронежилету.',
    skin: null,
  },
  {
    id: 'wounded_finisher',
    icon: '🩼',
    en: 'Combat Veteran', uk: 'Учасник бойових',
    descEn: 'After surviving a mine explosion, still finish the level successfully.',
    descUk: 'Підірватися на міні (в броніку) і все одно успішно завершити рівень.',
    skin: null,
  },
  {
    id: 'speedrun',
    icon: '🏃',
    en: 'Speed King', uk: 'Король швидкості',
    descEn: 'Clear a timed level with over 60 seconds remaining.',
    descUk: 'Пройти рівень з лімітом часу, залишивши понад 60 секунд.',
    skin: null,
  },
  {
    id: 'no_flags',
    icon: '🚫',
    en: 'Flag-Free', uk: 'Безстрашний',
    descEn: 'Clear a level without placing a single flag.',
    descUk: 'Пройти рівень, не поставивши жодного прапорця.',
    skin: null,
  },
  {
    id: 'pyromaniac',
    icon: '🔥',
    en: 'Pyromaniac', uk: 'Піротехнік',
    descEn: 'Survive 3 mine explosions total (cumulative) wearing a vest.',
    descUk: 'Вижити 3 рази після підриву на міні у бронежилеті (сумарно).',
    skin: null,
  },
  {
    id: 'tourist',
    icon: '🏝️',
    en: 'Islander', uk: 'Островитянин',
    descEn: 'Clear an island-type operation.',
    descUk: 'Пройти операцію на острові.',
    skin: null,
  },
  {
    id: 'night_ace',
    icon: '🦉',
    en: 'Night Ace', uk: 'Нічний снайпер',
    descEn: 'Clear a night operation without using any artifact.',
    descUk: 'Пройти нічну операцію, не використовуючи артефактів.',
    skin: null,
  },
  {
    id: 'streak5',
    icon: '✋',
    en: 'High Five', uk: "П'ятірня",
    descEn: 'Clear 5 levels in a row without hitting a mine.',
    descUk: 'Пройти 5 рівнів поспіль без підриву.',
    skin: null,
  },
  {
    id: 'streak10',
    icon: '💎',
    en: 'Iron Will', uk: 'Залізні нерви',
    descEn: 'Clear 10 levels in a row without hitting a mine.',
    descUk: 'Пройти 10 рівнів поспіль без підриву.',
    skin: null,
  },
  {
    id: 'pilot',
    icon: '🛸',
    en: 'Drone Pilot', uk: 'Пілот дрона',
    descEn: 'Use the defuser drone to neutralise a mine.',
    descUk: 'Використати дрон-знешкоджувач для нейтралізації міни.',
    skin: null,
  },
  {
    id: 'driver',
    icon: '🛻',
    en: 'Armoured Driver', uk: 'Водій броні',
    descEn: 'Ride the UGV across a minefield.',
    descUk: 'Проїхати на UGV через мінне поле.',
    skin: null,
  },
  {
    id: 'radar',
    icon: '📡',
    en: 'Radar Operator', uk: 'Радарник',
    descEn: 'Use echo sonar to scan for mines.',
    descUk: 'Використати ехо-сканування для пошуку мін.',
    skin: null,
  },
  {
    id: 'arm_master',
    icon: '🦾',
    en: 'Long Arm', uk: 'Довгі руки',
    descEn: 'Neutralise 5 mines using the manipulator arm (cumulative).',
    descUk: 'Знешкодити 5 мін маніпулятором-рукою (сумарно).',
    skin: null,
  },
  {
    id: 'defuser',
    icon: '✂️',
    en: 'Defuser', uk: 'Знешкоджувач',
    descEn: 'Successfully defuse your first IED by cutting the right wire.',
    descUk: 'Успішно знешкодити перший пристрій, перерізавши правильний дріт.',
    skin: null,
  },
  {
    id: 'bomb_squad',
    icon: '💣',
    en: 'Bomb Squad', uk: 'Вибухотехнік',
    descEn: 'Defuse 5 IEDs in total across all operations.',
    descUk: 'Знешкодити 5 пристроїв сумарно за всі операції.',
    skin: null,
  },
  {
    id: 'cool_hand',
    icon: '🥶',
    en: 'Cool Hand', uk: 'Холодна рука',
    descEn: 'Defuse a timer bomb with 20 seconds or less remaining.',
    descUk: 'Знешкодити тайм-бомбу, коли залишилося ≤20 секунд.',
    skin: null,
  },
  {
    id: 'analyst',
    icon: '📊',
    en: 'Field Analyst', uk: 'Польовий аналітик',
    descEn: 'Successfully defuse your first multimeter device.',
    descUk: 'Успішно знешкодити перший пристрій за допомогою мультиметра.',
    skin: null,
  },
  {
    id: 'circuit_pro',
    icon: '🔌',
    en: 'Circuit Pro', uk: 'Схемотехнік',
    descEn: 'Defuse a Tier 3+ multimeter device (Circuit Analysis or Advanced).',
    descUk: 'Знешкодити пристрій мультиметром 3+ рівня (Аналіз ланцюга або Поглиблений).',
    skin: null,
  },
  {
    id: 'under_pressure',
    icon: '⏱️',
    en: 'Under Pressure', uk: 'Під тиском',
    descEn: 'Defuse a Tier 4 Expert multimeter device before the 90s timer expires.',
    descUk: 'Знешкодити пристрій Tier 4 Експерт до спливання таймера 90 секунд.',
    skin: null,
  },
  {
    id: 'megamap',
    icon: '🌍',
    en: 'Big Game', uk: 'Велика гра',
    descEn: 'Clear the 40×38 mega-map (level 30).',
    descUk: 'Пройти мегакарту 40×38 (рівень 30).',
    skin: null,
  },
  {
    id: 'full_stash',
    icon: '📦',
    en: 'Collector', uk: 'Колекціонер',
    descEn: 'Have at least one of every artifact type in your stash.',
    descUk: 'Зібрати хоча б по одному артефакту кожного типу.',
    skin: null,
  },
  {
    id: 'rich',
    icon: '💰',
    en: 'Well-Stocked', uk: 'Затарений',
    descEn: 'Have 20 or more artifacts in your stash at once.',
    descUk: 'Мати 20+ артефактів у схованці одночасно.',
    skin: null,
  },
  {
    id: 'timed_ace',
    icon: '⏰',
    en: 'Timekeeper', uk: 'Хронометрист',
    descEn: 'Complete all timed operations (levels 7, 8, 9, 22, 27).',
    descUk: 'Пройти всі операції з лімітом часу (рівні 7, 8, 9, 22, 27).',
    skin: null,
  },
  {
    id: 'marathon',
    icon: '🏅',
    en: 'Marathon Runner', uk: 'Марафонець',
    descEn: 'Clear 30 operations.',
    descUk: 'Пройти 30 операцій.',
    skin: null,
  },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'miner_achievements';
const STREAK_KEY  = 'miner_clean_streak';
const FLAGS_KEY   = 'miner_correct_flags';
const VEST_KEY    = 'miner_vest_hits';
const ARM_KEY     = 'miner_arm_uses';

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

export function getVestHits() {
  return parseInt(localStorage.getItem(VEST_KEY) || '0', 10);
}
export function addVestHit() {
  const n = getVestHits() + 1;
  localStorage.setItem(VEST_KEY, String(n));
  return n;
}

export function getArmUses() {
  return parseInt(localStorage.getItem(ARM_KEY) || '0', 10);
}
export function addArmUse() {
  const n = getArmUses() + 1;
  localStorage.setItem(ARM_KEY, String(n));
  return n;
}

const DEFUSE_KEY = 'miner_defuse_count';

export function getDefuseCount() {
  return parseInt(localStorage.getItem(DEFUSE_KEY) || '0', 10);
}
export function addDefuse() {
  const n = getDefuseCount() + 1;
  localStorage.setItem(DEFUSE_KEY, String(n));
  return n;
}

const MM_DEFUSE_KEY = 'miner_mm_defuse';

export function getMMDefuseCount() {
  return parseInt(localStorage.getItem(MM_DEFUSE_KEY) || '0', 10);
}
export function addMMDefuse(tier) {
  const n = getMMDefuseCount() + 1;
  localStorage.setItem(MM_DEFUSE_KEY, String(n));
  const prevMax = parseInt(localStorage.getItem(MM_DEFUSE_KEY + '_maxTier') || '0', 10);
  if (tier > prevMax) localStorage.setItem(MM_DEFUSE_KEY + '_maxTier', String(tier));
  return n;
}
export function getMMMaxTier() {
  return parseInt(localStorage.getItem(MM_DEFUSE_KEY + '_maxTier') || '0', 10);
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
