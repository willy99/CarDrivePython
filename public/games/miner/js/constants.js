// ─── Miner / Бабум — Phase 1 constants ──────────────────────────────────────

export const TOP_BAR = 54;

// Cell types on the topological map.
export const T = {
  VOID:     'void',     // outside the map (asymmetric shapes) — not drawn
  LAND:     'land',     // normal minefield cell
  TREE:     'tree',     // forest — impassable, no mine, harder to clear around
  WATER:    'water',    // river / lake / sea — impassable, no mine
  MOUNTAIN: 'mountain', // rock — impassable, no mine
  BRIDGE:   'bridge',   // passable crossing over water — never a mine, always "open"
  PATH:     'path',     // dirt track — walkable, can hold mines, moves faster
};

// Cells the sapper can stand on / walk through (once revealed where relevant).
export const WALKABLE = new Set([T.LAND, T.BRIDGE, T.PATH]);
// Cells that can hold a mine and a number.
export const MINEABLE = new Set([T.LAND]);

// Palette for the topographic look.
export const COLORS = {
  bg:           '#0d1f17',
  hidden:       '#3f6b4a',   // un-cleared land (dark grass)
  hiddenEdge:   '#2c4d35',
  revealed:     '#d9c9a3',   // cleared ground (sand/dirt)
  revealedEdge: '#c7b488',
  water:        '#2b6ea8',
  waterDeep:    '#1d4f7d',
  mountain:     '#7c7468',
  mountainTop:  '#a59b8c',
  bridge:       '#9a6b3f',
  bridgePlank:  '#7a5230',
  tree:         '#2f7d4f',
  treeDark:     '#1f5a38',
  num: ['', '#1e6fff', '#1f8a3b', '#e23b3b', '#7b2fd6',
        '#d98a00', '#0aa3a3', '#444444', '#888888'],
};

// Number of levels open before the rest unlock.
export const FREE_LEVELS = 10;
export const PROGRESS_KEY = 'miner_progress_v1';
export const LANG_KEY = 'pashka-lang';

// Sapper movement speed, cells per second.
export const SAPPER_SPEED = 6.5;
