import { FREE_LEVELS, PROGRESS_KEY } from './constants.js';

// ─── Level catalogue ────────────────────────────────────────────────────────
// Difficulty ramps on three axes (per Phase 1 plan):
//   shape:   'rect' (classic square)  →  'blob' / 'island' (asymmetric map)
//   terrain: which features get carved into the land
//   density: mines as a fraction of playable land
//
// terrain flags:
//   trees:     count of single forest tiles
//   river:     true → carve a wandering water line (auto-bridged)
//   lake:      count of round water bodies
//   sea:       'none' | 'N' | 'E' | 'S' | 'W'  → flood one edge
//   mountains: count of rocky clusters

export const LEVELS = [
  null, // 1-based
  // ── 1-6 : intro — small grids, few mines, always solvable (no guessing) ──
  { id: 1,  cols: 7,  rows: 7,  shape: 'rect', density: 0.08, terrain: {}, noGuess: true },
  { id: 2,  cols: 8,  rows: 8,  shape: 'rect', density: 0.09, terrain: {}, noGuess: true },
  { id: 3,  cols: 9,  rows: 9,  shape: 'rect', density: 0.10, terrain: {}, noGuess: true },
  { id: 4,  cols: 11, rows: 10, shape: 'rect', density: 0.10, terrain: {}, noGuess: true },
  { id: 5,  cols: 13, rows: 12, shape: 'rect', density: 0.11, terrain: { trees: 4 }, noGuess: true },
  { id: 6,  cols: 14, rows: 13, shape: 'rect', density: 0.12, terrain: { trees: 6 }, noGuess: true },
  // ── 7-10 : squares, density starts climbing, first river ──
  { id: 7,  cols: 14, rows: 14, shape: 'rect', density: 0.14, terrain: { trees: 8 } },
  { id: 8,  cols: 15, rows: 14, shape: 'rect', density: 0.15, terrain: { trees: 7,  river: true } },
  { id: 9,  cols: 16, rows: 15, shape: 'rect', density: 0.15, terrain: { trees: 8,  lake: 1 } },
  { id: 10, cols: 17, rows: 15, shape: 'rect', density: 0.16, terrain: { trees: 8,  mountains: 2 } },
  // ── 11-16 : asymmetric map shapes + full terrain ──
  { id: 11, cols: 17, rows: 16, shape: 'rect',   density: 0.16, terrain: { trees: 10, river: true, mountains: 1 } },
  { id: 12, cols: 18, rows: 16, shape: 'blob',   density: 0.16, terrain: { trees: 10, river: true } },
  { id: 13, cols: 19, rows: 17, shape: 'island', density: 0.16, terrain: { trees: 9,  sea: 'all', lake: 1 } },
  { id: 14, cols: 19, rows: 17, shape: 'blob',   density: 0.17, terrain: { trees: 10, mountains: 3 } },
  { id: 15, cols: 20, rows: 18, shape: 'blob',   density: 0.17, terrain: { trees: 11, lake: 2, river: true } },
  { id: 16, cols: 21, rows: 17, shape: 'island', density: 0.17, terrain: { trees: 10, sea: 'all', mountains: 2 } },
  // ── 17-24 : advanced ops — paths, fog, night, timed ──
  { id: 17, cols: 21, rows: 19, shape: 'blob',   density: 0.18, terrain: { trees: 13, river: true, mountains: 3, lake: 1 } },
  { id: 18, cols: 22, rows: 19, shape: 'blob',   density: 0.17, terrain: { trees: 12, river: true, paths: 2 } },
  { id: 19, cols: 22, rows: 20, shape: 'rect',   density: 0.18, terrain: { trees: 8,  mountains: 2, paths: 3 }, timeLimit: 180 },
  { id: 20, cols: 23, rows: 20, shape: 'blob',   density: 0.18, terrain: { trees: 14, lake: 2, river: true, paths: 2 } },
  { id: 21, cols: 23, rows: 21, shape: 'island', density: 0.18, terrain: { trees: 12, sea: 'all', mountains: 2, paths: 2 } },
  { id: 22, cols: 24, rows: 21, shape: 'blob',   density: 0.19, terrain: { trees: 14, river: true, mountains: 3, paths: 3 }, fog: true },
  { id: 23, cols: 20, rows: 18, shape: 'rect',   density: 0.17, terrain: { trees: 6,  paths: 2 }, night: true },
  { id: 24, cols: 22, rows: 20, shape: 'island', density: 0.19, terrain: { trees: 12, sea: 'all', mountains: 2, paths: 2 }, night: true, timeLimit: 240 },
  // ── 25-27 : mega maps ──
  { id: 25, cols: 28, rows: 26, shape: 'blob',   density: 0.19, terrain: { trees: 16, river: true, mountains: 3, lake: 2, paths: 3 } },
  { id: 26, cols: 34, rows: 30, shape: 'island', density: 0.19, terrain: { trees: 20, sea: 'all', mountains: 4, lake: 2, paths: 4 } },
  { id: 27, cols: 40, rows: 38, shape: 'blob',   density: 0.20, terrain: { trees: 26, river: true, mountains: 5, lake: 3, paths: 4 }, fog: true },
];

export const LEVEL_COUNT = LEVELS.length - 1;

// ─── Progress (localStorage) ────────────────────────────────────────────────
export function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY)) || []);
  } catch {
    return new Set();
  }
}

export function markCompleted(id) {
  const done = loadProgress();
  done.add(id);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...done]));
}

// All levels are unlocked immediately.
export function isUnlocked(_id, _done) {
  return true;
}
