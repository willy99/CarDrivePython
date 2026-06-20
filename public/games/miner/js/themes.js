// ─── Visual themes for the topographic map (switchable at runtime) ──────────
const THEME_KEY = 'miner_theme_v1';

export const THEMES = {
  paper: {
    id: 'paper',
    name: { en: 'Paper', uk: 'Папір' },
    bg: '#b3ab8c',
    paper: '#ded7bc', paperEdge: '#c7bd9b',
    contour: '#c0a06f', contourIndex: '#9a7843', contourAlpha: 0.7,
    grid: '#8a8666', gridAlpha: 0.55, gridText: '#5a5740',
    water: '#7fb3d4', waterDeep: '#5a93b8', shore: '#5a8aa8', beach: '#d8c79a',
    forest: '#6f9a55', forestDark: '#4f7d3a', trunk: '#6b4a2a', forestPatch: '#bcc79a',
    mountain: '#cdbfa6', mountainLine: '#9a7843', peakText: '#6b4f2a',
    bridge: '#9a6b3f', bridgePlank: '#6e4a26',
    fog: '#39402a', fogAlpha: 0.62, fogLine: '#2a3019',
    num: ['', '#1d4f7d', '#2f6b34', '#a8392f', '#5a3a8a', '#b06a00', '#0a7b7b', '#444444', '#777777'],
    numHalo: '#f6f0dc',
    flag: '#c0392b', mine: '#1a1a1a',
    sapperBody: '#4b5d31', sapperSkin: '#e3b48a', sapperHelmet: '#3a4a26',
  },
  tactical: {
    id: 'tactical',
    name: { en: 'Tactical', uk: 'Тактична' },
    bg: '#070f0b',
    paper: '#0f2017', paperEdge: '#16301f',
    contour: '#1f6b40', contourIndex: '#33a566', contourAlpha: 0.85,
    grid: '#1d4030', gridAlpha: 0.7, gridText: '#5fa37a',
    water: '#13455f', waterDeep: '#0b2c40', shore: '#2f7ea0', beach: '#1d3a2a',
    forest: '#1f7b42', forestDark: '#124a26', trunk: '#26331e', forestPatch: '#16361f',
    mountain: '#1c2a23', mountainLine: '#3f9f6a', peakText: '#7ee0a0',
    bridge: '#5a4a2a', bridgePlank: '#39301c',
    fog: '#030c07', fogAlpha: 0.74, fogLine: '#0c2417',
    num: ['', '#5fbdff', '#5fe08a', '#ff6b6b', '#c79bff', '#ffc05a', '#5fe0e0', '#cccccc', '#888888'],
    numHalo: '#03100a',
    flag: '#ff5b5b', mine: '#000000',
    sapperBody: '#4b5d31', sapperSkin: '#e3b48a', sapperHelmet: '#3a4a26',
  },
  terrain: {
    id: 'terrain',
    name: { en: 'Terrain', uk: 'Місцевість' },
    bg: '#1c2a1a',
    paper: '#7d8c57', paperEdge: '#6c7a48',
    contour: '#6a7a45', contourIndex: '#54632f', contourAlpha: 0.45,
    grid: '#e8f0d8', gridAlpha: 0.18, gridText: '#eef6e2',
    water: '#3d6f93', waterDeep: '#2a527a', shore: '#26496c', beach: '#c2b487',
    forest: '#3f6b34', forestDark: '#2c5026', trunk: '#3a2a1a', forestPatch: '#4f7838',
    mountain: '#8a8270', mountainLine: '#6a6250', peakText: '#ffffff',
    bridge: '#9a8a6a', bridgePlank: '#6a5a3a',
    fog: '#0a140a', fogAlpha: 0.6, fogLine: '#16241a',
    num: ['', '#cfe8ff', '#cdf5b0', '#ffb0a8', '#e0c4ff', '#ffd98a', '#a8f0f0', '#f0f0f0', '#cfcfcf'],
    numHalo: '#0c180c',
    flag: '#e23b2b', mine: '#101010',
    sapperBody: '#4b5d31', sapperSkin: '#e3b48a', sapperHelmet: '#2f3d22',
  },

  // ── Procedural pixel-art desert (Sega Dune look). pixel:true → tile renderer.
  dune: {
    id: 'dune',
    name: { en: 'Dune', uk: 'Дюна' },
    pixel: true,
    bg: '#2a2014',
    // sand bands, light → dark; height field picks the band, dithered.
    sand: ['#f0d595', '#e6c47e', '#d8b066', '#c39a4f', '#ad8440'],
    sandRipple: '#9c7233',
    spice: '#e08a22',
    rock: ['#b08a5e', '#8f6c44', '#6f5230'], rockTop: '#dcb98a', rockShadow: '#46300f',
    water: '#3f86b0', waterDeep: '#275b80', waterRipple: '#a6cfe2', shore: '#d8b066',
    veg: '#6f9a3f', vegDark: '#41611f',
    bridge: '#8a5a2f', bridgePlank: '#5a3819',
    fog: '#6b4a22', fogAlpha: 0.55, fogLine: '#e6c47e',
    grid: '#000000', gridAlpha: 0, gridText: '#7a5a2e',
    num: ['', '#1d6fff', '#1f8f33', '#ff4b32', '#9b5bff', '#ffb02a', '#0fb6b6', '#3a2a18', '#7a6a50'],
    numHalo: '#fff4d0',
    flag: '#d23b27', mine: '#141414',
    sapperBody: '#6f6336', sapperSkin: '#e3b48a', sapperHelmet: '#52481f',
  },
};

export const THEME_ORDER = ['paper', 'tactical', 'terrain', 'dune'];

export function loadTheme() {
  const id = localStorage.getItem(THEME_KEY);
  return THEMES[id] ? id : 'paper';
}

export function saveTheme(id) { localStorage.setItem(THEME_KEY, id); }

export function nextTheme(id) {
  const i = THEME_ORDER.indexOf(id);
  return THEME_ORDER[(i + 1) % THEME_ORDER.length];
}

// '#rrggbb' → 0xrrggbb for Pixi.
export function toInt(hex) { return parseInt(hex.slice(1), 16); }
