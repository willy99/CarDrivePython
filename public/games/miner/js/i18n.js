import { LANG_KEY } from './constants.js';

const STRINGS = {
  en: {
    title: '💥 Miner',
    pickLevel: 'Choose an operation',
    locked: 'Clear the first 10 to unlock',
    level: 'Op',
    mines: 'Mines',
    time: 'Time',
    flags: 'Flags',
    back: '← Map',
    restart: '↻ Retry',
    win: 'Area cleared!',
    winSub: 'No mines left. Well done, sapper.',
    lose: 'BOOM!',
    loseSub: 'You stepped on a mine. Try again.',
    next: 'Next op →',
    again: '↻ Try again',
    toMap: 'Back to map',
    hintFirst: 'Tap any cell to drop in your sapper.',
    hintMove: 'Tap a cell next to cleared ground. Long-press / right-click to flag.',
    cleared: 'cleared',
    completed: 'cleared',
    langBtn: '🇺🇦 UA',
    rankLabel: 'Rank',
    clearedFields: 'fields cleared',
    toNext: 'to next rank',
    maxRank: 'Top rank reached',
    gear: '🎒 Gear',
    classicMode: 'Classic',
    arcadeMode: 'Arcade',
    hintFirstClassic: 'Tap any cell to reveal it.',
    hintMoveClassic: 'Tap any unrevealed cell. Long-press / right-click to flag.',
    backpack: 'Backpack — pick up to 2',
    stashTitle: 'Collected gear',
    stashEmpty: 'No gear yet. Clear fields to find some on the ground.',
    found: 'Found',
    promoted: 'Promoted to',
    detectorSaved: 'Metal detector saved you!',
    needSapper: 'Drop your sapper first.',
    aimDrone: 'Tap a spot to scan with the drone.',
    aimProbe: 'Tap a cell to probe it safely.',
    aimArm: 'Tap a cell within 2 of your sapper for the manipulator.',
    aimUgv: 'Tap a cut-off cell to ride the platform to.',
    aimDroneX: 'Tap any cell — the drone will fly over and defuse it.',
    noUses: 'Nothing left to use.',
  },
  uk: {
    title: '💥 Бабах',
    pickLevel: 'Вибери операцію',
    locked: 'Пройди перші 10, щоб відкрити',
    level: 'Опер.',
    mines: 'Міни',
    time: 'Час',
    flags: 'Прапорці',
    back: '← Мапа',
    restart: '↻ Заново',
    win: 'Ділянку розміновано!',
    winSub: 'Мін не лишилось. Молодець, сапере.',
    lose: 'БАБАХ!',
    loseSub: 'Ти став на міну. Спробуй ще раз.',
    next: 'Далі →',
    again: '↻ Ще раз',
    toMap: 'До мапи',
    hintFirst: 'Тицьни будь-яку клітинку — туди десантуємо сапера.',
    hintMove: 'Тицяй клітинку біля розмінованого. Утримання / права кнопка — прапорець.',
    cleared: 'пройдено',
    completed: 'пройдено',
    langBtn: '🇬🇧 EN',
    rankLabel: 'Звання',
    clearedFields: 'полів розміновано',
    toNext: 'до наступного звання',
    maxRank: 'Найвище звання',
    gear: '🎒 Спорядження',
    classicMode: 'Класичний',
    arcadeMode: 'Аркада',
    hintFirstClassic: 'Тицьни будь-яку клітинку, щоб відкрити.',
    hintMoveClassic: 'Тицяй будь-яку нерозміновану клітинку. Утримання — прапорець.',
    backpack: 'Рюкзак — візьми до 2',
    stashTitle: 'Зібране спорядження',
    stashEmpty: 'Поки порожньо. Розміновуй поля — спорядження трапляється на землі.',
    found: 'Знайдено',
    promoted: 'Підвищення до',
    detectorSaved: 'Металодетектор тебе врятував!',
    needSapper: 'Спершу висади сапера.',
    aimDrone: 'Тицьни місце для сканування дроном.',
    aimProbe: 'Тицьни клітинку, щоб безпечно перевірити.',
    aimArm: 'Тицьни клітинку в радіусі 2 від сапера для маніпулятора.',
    aimUgv: 'Тицьни відрізану клітинку, куди переїхати на платформі.',
    aimDroneX: 'Тицьни будь-яку клітинку — дрон долетить і знешкодить.',
    noUses: 'Більше нічого використати.',
  },
};

export let lang = localStorage.getItem(LANG_KEY) || 'en';

export function setLang(l) {
  lang = l;
  localStorage.setItem(LANG_KEY, l);
}

export function toggleLang() {
  setLang(lang === 'en' ? 'uk' : 'en');
  return lang;
}

export function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
}

// Level display names — index 0 unused, levels are 1-based.
const LEVEL_NAMES = {
  en: ['',
    'Training ground', 'Old quarry', 'Field road', 'Checkpoint', 'River bank',
    'Forest edge', 'Hill pass', 'Lakeside', 'Border line', 'The harbor',
    'Broken bridge', 'Island delta', 'Mountain fort', 'Flooded valley', 'The peninsula',
    'No man\'s land'],
  uk: ['',
    'Полігон', 'Старий кар\'єр', 'Польова дорога', 'Блокпост', 'Берег річки',
    'Узлісся', 'Гірський перевал', 'Біля озера', 'Лінія кордону', 'Гавань',
    'Зламаний міст', 'Острівна дельта', 'Гірський форт', 'Затоплена долина', 'Півострів',
    'Нейтральна смуга'],
};

export function levelName(id) {
  const arr = LEVEL_NAMES[lang] || LEVEL_NAMES.en;
  return arr[id] || `#${id}`;
}
