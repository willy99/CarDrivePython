// ─── Artifacts: found on the field, kept in a stash, carried ≤2 per op ──────
// active:'self'  → used immediately on the sapper (echo)
// active:'target'→ arms a tap target (drone, probe)
// active:false   → passive, triggers automatically (detector)
export const ARTIFACTS = {
  echo: {
    id: 'echo', icon: '📡', active: 'self', radius: 2,
    en: 'Echo sounder', uk: 'Ехолокатор',
    descEn: 'Reveals mines within 2 cells of your sapper for a moment.',
    descUk: 'На кілька секунд показує міни в радіусі 2 клітинок від сапера.',
  },
  drone: {
    id: 'drone', icon: '🚁', active: 'target',
    en: 'Recon drone', uk: 'Розвідувальний дрон',
    descEn: 'Tap a spot — scans 3×3 and flags every mine it finds.',
    descUk: 'Тицьни місце — сканує 3×3 і позначає всі знайдені міни.',
  },
  probe: {
    id: 'probe', icon: '🎯', active: 'target',
    en: 'Safe probe', uk: 'Щуп',
    descEn: 'Tap one cell to open it safely — a mine there is flagged, not triggered.',
    descUk: 'Тицьни клітинку, щоб безпечно відкрити — міну там позначить, а не підірве.',
  },
  detector: {
    id: 'detector', icon: '🔍', active: false,
    en: 'Metal detector', uk: 'Металодетектор',
    descEn: 'Passive — saves you from the first mine you step on this op.',
    descUk: 'Пасивний — рятує від першого підриву за цю операцію.',
  },
  arm: {
    id: 'arm', icon: '🦾', active: 'target', range: 2,
    en: 'Manipulator arm', uk: 'Маніпулятор',
    descEn: 'Telescoping arm reaches up to 2 cells (over a mine) and opens it safely.',
    descUk: 'Висувна штанга дотягується на 2 клітинки (через міну) і безпечно відкриває клітину.',
  },
  ugv: {
    id: 'ugv', icon: '🛻', active: 'target',
    en: 'High-clearance UGV', uk: 'НРК на платформі',
    descEn: 'Ride the platform across mines to a cut-off cell — mines pass under you.',
    descUk: 'Переїдь на платформі через міни до відрізаної клітинки — міни проходять під тобою.',
  },
  dronex: {
    id: 'dronex', icon: '🛸', active: 'target',
    en: 'Defuser drone', uk: 'Дрон-розмінувач',
    descEn: 'Flies to any cell on the field and defuses or opens it remotely.',
    descUk: 'Летить до будь-якої клітинки на полі й дистанційно знешкоджує або відкриває її.',
  },
};
export const ARTIFACT_IDS = Object.keys(ARTIFACTS);

export function artifactName(id, lang) { const a = ARTIFACTS[id]; return a ? (a[lang] || a.en) : id; }
export function artifactDesc(id, lang) { const a = ARTIFACTS[id]; return a ? (lang === 'uk' ? a.descUk : a.descEn) : ''; }

const STASH_KEY = 'miner_stash_v1';
const EQUIP_KEY = 'miner_equip_v1';

export function loadStash() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STASH_KEY)) || {}; } catch { s = {}; }
  for (const id of ARTIFACT_IDS) s[id] = Math.max(0, s[id] | 0);
  return s;
}
export function saveStash(s) { localStorage.setItem(STASH_KEY, JSON.stringify(s)); }
export function addArtifact(id, n = 1) { const s = loadStash(); s[id] = (s[id] | 0) + n; saveStash(s); return s; }
export function consumeArtifact(id) {
  const s = loadStash();
  if ((s[id] | 0) > 0) { s[id]--; saveStash(s); return true; }
  return false;
}
export function stashTotal() { const s = loadStash(); return ARTIFACT_IDS.reduce((a, id) => a + s[id], 0); }

// Equip (loadout) is an array of ≤2 artifact ids — duplicates allowed if owned.
export function loadEquip() {
  let e = [];
  try { e = JSON.parse(localStorage.getItem(EQUIP_KEY)) || []; } catch { e = []; }
  const s = loadStash(), used = {}, out = [];
  for (const id of e) {
    if (!ARTIFACTS[id] || out.length >= 2) continue;
    used[id] = (used[id] | 0) + 1;
    if (used[id] <= s[id]) out.push(id);
  }
  return out;
}
export function saveEquip(e) { localStorage.setItem(EQUIP_KEY, JSON.stringify(e.slice(0, 2))); }

// Toggle an id in the loadout for the level picker: add a copy if there's room
// and we own enough, else remove one copy. Returns the new loadout.
export function toggleEquip(id) {
  const e = loadEquip();
  const have = loadStash()[id] | 0;
  const inLoadout = e.filter(x => x === id).length;
  if (inLoadout > 0 && (e.length >= 2 || inLoadout >= have)) {
    e.splice(e.indexOf(id), 1);            // remove one copy
  } else if (e.length < 2 && inLoadout < have) {
    e.push(id);                            // add one copy
  }
  saveEquip(e);
  return e;
}
