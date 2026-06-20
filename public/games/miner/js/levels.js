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
  // ── 1-4 : classic squares, no terrain ──
  { id: 1,  cols: 8,  rows: 8,  shape: 'rect', density: 0.12, terrain: {} },
  { id: 2,  cols: 9,  rows: 9,  shape: 'rect', density: 0.14, terrain: {} },
  { id: 3,  cols: 10, rows: 10, shape: 'rect', density: 0.15, terrain: {} },
  { id: 4,  cols: 13, rows: 13, shape: 'rect', density: 0.14, terrain: {} },
  // ── 5-7 : squares, first terrain (trees, then a river) ──
  { id: 5,  cols: 14, rows: 13, shape: 'rect', density: 0.14, terrain: { trees: 7 } },
  { id: 6,  cols: 14, rows: 14, shape: 'rect', density: 0.15, terrain: { trees: 10 } },
  { id: 7,  cols: 15, rows: 14, shape: 'rect', density: 0.15, terrain: { trees: 7, river: true } },
  // ── 8-10 : squares, mixed terrain ──
  { id: 8,  cols: 15, rows: 14, shape: 'rect', density: 0.15, terrain: { trees: 8, lake: 1 } },
  { id: 9,  cols: 16, rows: 15, shape: 'rect', density: 0.16, terrain: { trees: 8, mountains: 2 } },
  { id: 10, cols: 17, rows: 15, shape: 'rect', density: 0.16, terrain: { trees: 10, river: true, mountains: 1 } },
  // ── 11-16 : asymmetric map shapes + full terrain ──
  { id: 11, cols: 18, rows: 16, shape: 'blob',   density: 0.16, terrain: { trees: 10, river: true } },
  { id: 12, cols: 19, rows: 17, shape: 'island', density: 0.16, terrain: { trees: 9, sea: 'all', lake: 1 } },
  { id: 13, cols: 19, rows: 17, shape: 'blob',   density: 0.17, terrain: { trees: 10, mountains: 3 } },
  { id: 14, cols: 20, rows: 18, shape: 'blob',   density: 0.17, terrain: { trees: 11, lake: 2, river: true } },
  { id: 15, cols: 21, rows: 17, shape: 'island', density: 0.17, terrain: { trees: 10, sea: 'all', mountains: 2 } },
  { id: 16, cols: 21, rows: 19, shape: 'blob',   density: 0.18, terrain: { trees: 13, river: true, mountains: 3, lake: 1 } },
  // ── 17-24 : advanced ops — new terrain, fog, night, timed ──
  { id: 17, cols: 22, rows: 19, shape: 'blob',   density: 0.17, terrain: { trees: 12, river: true, paths: 2 } },
  { id: 18, cols: 22, rows: 20, shape: 'rect',   density: 0.18, terrain: { trees: 8,  mountains: 2, paths: 3 }, timeLimit: 180 },
  { id: 19, cols: 23, rows: 20, shape: 'blob',   density: 0.18, terrain: { trees: 14, lake: 2, river: true, paths: 2 } },
  { id: 20, cols: 23, rows: 21, shape: 'island', density: 0.18, terrain: { trees: 12, sea: 'all', mountains: 2, paths: 2 } },
  { id: 21, cols: 24, rows: 21, shape: 'blob',   density: 0.19, terrain: { trees: 14, river: true, mountains: 3, paths: 3 }, fog: true },
  { id: 22, cols: 20, rows: 18, shape: 'rect',   density: 0.17, terrain: { trees: 6,  paths: 2 }, night: true },
  { id: 23, cols: 21, rows: 19, shape: 'blob',   density: 0.18, terrain: { trees: 10, river: true, paths: 2 }, night: true },
  { id: 24, cols: 22, rows: 20, shape: 'island', density: 0.19, terrain: { trees: 12, sea: 'all', mountains: 2, paths: 2 }, night: true, timeLimit: 240 },
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
