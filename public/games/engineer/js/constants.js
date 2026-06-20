export const GRID       = 44;
export const GRAVITY    = 0.28;
export const DAMPING    = 0.985;
export const ITERATIONS = 25;
export const NODE_R     = 7;
export const TOP_BAR    = 56;
export const BOT_BAR    = 50;

export const MATERIALS = {
  wood: {
    id: 'wood', label: 'Дерево', emoji: '🪵',
    desc: 'Легке і дешеве, але слабке. Стиск і розтяг.',
    maxStress: 0.16, stiffness: 0.82, tensionOnly: false,
    lineWidth: 5,
    color: '#78350f', colorMid: '#b45309',
    costPerPx: 10 / 44,
  },
  steel: {
    id: 'steel', label: 'Сталь', emoji: '🔩',
    desc: 'Міцна і жорстка, але дорога. Стиск і розтяг.',
    maxStress: 0.38, stiffness: 1.0, tensionOnly: false,
    lineWidth: 6,
    color: '#475569', colorMid: '#94a3b8',
    costPerPx: 30 / 44,
  },
  cable: {
    id: 'cable', label: 'Трос', emoji: '〰️',
    desc: 'Тільки розтяг — стиску не витримує. Найдешевший.',
    maxStress: 0.32, stiffness: 0.72, tensionOnly: true,
    lineWidth: 2,
    color: '#b45309', colorMid: '#fbbf24',
    costPerPx: 5 / 44,
  },
};

export const VEHICLES = {
  car: {
    id: 'car', label: 'Легковик', emoji: '🚗',
    width: 66, height: 27, speed: 2.0, load: 1.2,
  },
  truck: {
    id: 'truck', label: 'Вантажівка', emoji: '🚚',
    width: 92, height: 38, speed: 1.4, load: 2.1,
  },
  bus: {
    id: 'bus', label: 'Автобус', emoji: '🚌',
    width: 128, height: 40, speed: 1.2, load: 2.7,
  },
};
