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
