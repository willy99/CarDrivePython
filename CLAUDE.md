# CarDrive — Developer Reference

Top-down 2D driving game built with **Python + Pygame**, compiled to WebAssembly via **pygbag** and embedded in a React host app.

---

## Project layout

```
games/cardrive/       Python game source (all gameplay)
public/games/cardrive/ Compiled WASM bundle (served statically)
src/                  React wrapper / host
scripts/build-cardrive.sh  Build pipeline (pygame → pygbag → public/)
```

---

## Architecture

| File | Responsibility |
|------|---------------|
| `game.py` | Game loop (`tick()`), state machine, collision, scoring, screen routing |
| `car.py` | Player physics: speed, lateral velocity, drift, damage |
| `npc_car.py` | NPC traffic: Q-learning navigation, traffic-rule obedience, deadlock escape |
| `police_car.py` | Police pursuit: greedy BFS toward player |
| `pedestrian.py` | Crosswalk walkers + taxi boarding animation |
| `game_map.py` | Procedural DFS maze, house placement, objective placement |
| `traffic_light.py` | 7-state FSM (420-frame cycle: RED→GREEN→BLINK→YELLOW) |
| `traffic_ai.py` | Shared Q-learning brain (`BRAIN`) for all NPC cars |
| `effects.py` | Night overlay, rain, snow, fireworks, impact burst |
| `hud.py` | Speed bar, fuel gauge, compass, damage meter, notifications |
| `mini_map.py` | Scaled top-right radar |
| `screens.py` | Home, garage (car select), level intro, **level map** |
| `storage.py` | localStorage / JSON save: progress, stats, driver portrait |
| `constants.py` | All tuning knobs (physics, scoring, colors) |
| `car_types.py` | 8 selectable cars with `unlock_req` progression |
| `level_config.py` | 24 hardcoded levels with passcodes |
| `i18n.py` | EN/UK string table |

---

## Game modes

| Mode | Objective |
|------|-----------|
| `MODE_RACE` | Drive A → B |
| `MODE_TAXI` | Drive A → pickup P (stop near fare) → dropoff B |
| `MODE_CHASE` | Reach B before police cars catch you |

---

## Screen flow

```
"home" ──TAB──► "levelmap"
  │                │ ENTER (completed level)
  │ ENTER/code     │
  └───────────────► "garage" ──ENTER (unlocked car)──► "intro" ──SPACE──► "play"
```

Game states inside "play": `S_WAITING → S_RACING → S_FINISHED / S_GAME_OVER / S_GAME_WON`

---

## Car physics

Coordinate frame: body-aligned (x = forward, y = left).

```
position += speed  * (cos θ, sin θ)   # forward motion
position += lat_vel * (−sin θ, cos θ)  # lateral (sideways)
```

**Steering** rotates heading by Δθ and re-projects world velocity into the new body frame → drift.

**Grip recovery** each frame: `lat_vel *= (1 − lat_grip)`.
- Dry: `lat_grip = 1.0` (instant snap)
- Rain: `0.65`
- Winter/ice: `0.10` (pronounced drift)

**Counter-steer bonus** (×3.5 grip) when steering INTO the slide + correct pedal:
- FWD: press gas while counter-steering
- RWD: lift off gas while counter-steering

**Damage model** (`damage` 0–100):
- Accumulated via `DAMAGE_PER_CRASH = 28` per collision
- Below `DAMAGE_HANDLING_THRESH = 45`: no effect
- Above threshold: `damage_mult` falls linearly to `0.55` at 100
- `damage_mult` reduces: steering rate, acceleration rate, **and top speed** (capped at `max_speed × damage_mult`)
- At `damage = 100` (fatal): game over ("car totalled")
- Visual: dent splotches appear (one per 15 pts of damage); windshield cracks above 55

---

## Collision system

**SAT (Separating Axis Theorem)** for car ↔ house and car ↔ NPC.

Three collision checks per frame:
1. Car corners vs house rects (inflated 8 px)
2. Car AABB vs NPC AABB (inflated 6 px) → SAT confirmation
3. Off-road: ≥ 3 corners outside road grid

On collision:
- Speed < `CRASH_THRESH (1.3)` → soft push-back, no crash
- Speed ≥ threshold → `car.crash()` (80-frame stun, speed ×0.25, damage added, **camera shake triggered**)

**Camera shake**: on every crash, `_shake_timer = SHAKE_DURATION (25)` and `_shake_mag = SHAKE_MAGNITUDE (8) × speed_frac`. The camera offset decays linearly: `offset = random(−mag, mag) × (timer / SHAKE_DURATION)`.

---

## Pedestrian collision

Any speed = immediate game over. Detection uses oriented-box (car) vs point (pedestrian): transform each ped to the car's local frame and check `|lx| ≤ hw` and `|ly| ≤ hh`.

---

## Scoring

```
base       = 600  (taxi)  or  1000  (race)
time_pen   = race_ms / 10           (10 pts per 10 ms)
viol_pen   = violations × 100
surplus    = remaining_countdown_s × 2
clean_bonus = +200 if violations == 0
smooth_bonus= +300 if taxi AND crashes == 0

level_score = max(0, base − time_pen − viol_pen + surplus + bonuses)
```

Speed camera: −150 pts; fires above 55 % of car's max speed, 90-frame cooldown.

---

## NPC traffic AI

Single **shared QBrain** (Q-learning + softmax action selection):
- State: `(fwd_open, left_space, right_space, back_open, in_conflict)` — each 0–2
- Actions: straight / left / right / back
- α=0.35, γ=0.85, ε=0.12, softmax temperature=0.35
- Hard rules always override: stop at red lights, queue behind cars, yield to peds
- Deadlock escape: reverse + reroute after 45 (oncoming) or 120 (queue) stall frames
- Player teaching: when player drives through traffic, their moves are fed as demonstrations

---

## Traffic lights

FSM with 420-frame cycle:
- RED 180 → GREEN 120 → BLINK_GREEN 60 → YELLOW 60 → RED …
- Pedestrians walk during RED, rush to edge at 4× speed on GREEN

---

## Weather

| Condition | Steer mult | Friction mult | Accel mult | lat_grip |
|-----------|-----------|--------------|------------|---------|
| Dry       | 1.0       | 1.0          | 1.0        | 1.00    |
| Rain      | 0.60      | 0.45         | 0.85       | 0.65    |
| Winter    | 0.55      | 0.30         | 0.55       | 0.10    |

Winter triggers FWD/RWD counter-steer mechanics.

Night mode: full-screen dark surface with a radial light mask subtracted (BLEND_RGBA_SUB) at the car's heading-offset position.

---

## Levels (24 total)

Progressive difficulty across five themes:
1. Race (1–8): open streets → narrow timed corridors + cameras + police
2. Taxi (9–19): fare pickup/drop-off, rain, night, fuel management
3. Winter (20–22): ice physics, drift recovery
4. Chase (23): outrun 2 police cars
5. Boss (24): all hazards combined

Each level has a **passcode** (e.g. `ROAD`, `SNOW`, `BOSS`) — type on home screen to jump directly.

---

## Car progression (unlock system)

| Car | unlock_req | Note |
|-----|-----------|------|
| Comet | 0 | Always |
| Falcon | 0 | Always |
| Veteran | 0 | Always |
| Viper | 3 | Complete 3 levels |
| Hauler | 6 | Complete 6 levels |
| Pixie | 10 | Complete 10 levels |
| Brute | 16 | Complete 16 levels |
| Phantom | 24 | Complete all 24 levels |

Locked cars are shown greyed-out in the garage with a padlock and unlock requirement. `storage.is_car_unlocked(data, idx, CARS)` is the gating check. A notification fires when a car first becomes available after level completion.

---

## Save system (`storage.py`)

Key: `cardrive_save_v2` in `window.localStorage` (browser) or `.cardrive_save.json` (desktop).

Schema:
```json
{
  "lang": "en",
  "car": 0,
  "best": { "0": 45230, "3": 72100 },
  "done": [0, 1, 2, 3],
  "stats": {
    "levels": 10,
    "violations": 3,
    "crashes": 4,
    "speeding": 2,
    "honks": 8,
    "clean": 5,
    "smooth": 3,
    "peds": 0
  }
}
```

`storage.save()` is called from `_award_level_score()` (game.py) after each level completion.

---

## Driver portrait (8-point scale)

`storage.driving_style(stats)` → i18n key. Scale worst→best:

| Key | EN name | Trigger |
|-----|---------|---------|
| `style.jerk` | Road Menace | crashes/lv ≥ 1.5 AND (violations+speeding)/lv ≥ 1.5 |
| `style.violator` | Rule Breaker | violations/lv ≥ 1.0 |
| `style.weaver` | Lane Weaver | honks/lv ≥ 2.0 |
| `style.speeder` | Speed Freak | speeding/lv ≥ 0.9 |
| `style.normal` | Average Driver | any mild infraction |
| `style.gentleman` | Gentleman | low infractions, moderate clean rate |
| `style.careful` | Careful Driver | high clean rate, most taxi runs smooth |
| `style.ace` | The Ace | almost perfect: clean ≥ 80 %, smooth ≥ 65 % |

Shown in the garage when ≥ 3 levels have been completed.

---

## Level map (`screen_mode = "levelmap"`)

Accessed from home screen via **TAB**. 6 × 4 grid of all 24 levels.

- Completed levels (in `done` list): green tint, shows best time, ENTER re-plays via garage
- Not-yet-completed: grey, shows level passcode for reference; ENTER shows "use code on home screen" message
- Navigation: arrow keys move cursor; ESC returns to home

---

## Drifting skill system

`lat_vel` is tracked every frame in `Game._update_drift()`.

- **Active drift**: `|lat_vel| > DRIFT_THRESHOLD (0.9)` and not crashed and `|speed| > 0.8`
- **Min duration**: `DRIFT_MIN_FRAMES (18)` frames before it scores (~0.3 s)
- **Score**: `DRIFT_SCORE_PER_S × seconds × (1 + combo × DRIFT_COMBO_MULT)`
- **Combo chain**: consecutive scored drifts; resets after 3 s of not drifting
- **Crash mid-drift**: `−DRIFT_CRASH_PEN (60)` pts, combo reset
- **Visual**: while `drift_frames ≥ DRIFT_MIN_FRAMES`, a pulsing gold overlay bar appears centre-top showing elapsed drift time; notification on completion

---

## Near-miss / red-light threading

Called from `_check_red_light()` whenever a violation fires (`_check_near_miss()`).

Measures the closest pedestrian within `NEAR_MISS_RADIUS (1.7 × TILE)`:

| Condition | Effect |
|-----------|--------|
| `speed ≥ 2.2` and gap < 60 % of radius | **+bonus** scaled to speed (up to +80 pts) |
| `speed < ~1.2` and gap < 45 % of radius | **extra penalty** −40 pts |
| No ped within radius | no extra effect |

---

## Dynamic traffic density

`_update_traffic_density()` runs every 150 frames (≈2.5 s) during a live race.

```
target = max(base // 2, int(base × (1 + 0.28 × sin(2π × t / 70))))
```

If `len(npcs) < target`, one NPC is spawned far (> 0.75 × SCREEN_W) from the player.
Natural despawn (idle > 300 frames + off-screen) handles excess NPCs.

---

## Police roadblocks (MODE_CHASE)

`_update_roadblocks()` + `_try_spawn_roadblock()` in `game.py`.

- First block spawns after **22 s** (`ROADBLOCK_SPAWN_DELAY`)
- Cooldown between blocks: **35 s** (`ROADBLOCK_COOLDOWN`)
- Scans 6–15 tiles ahead in the player's travel direction
- Measures road width; leaves one random tile gap for the player to rush through
- Rendered as navy police cars with flashing red/blue lights (`_Roadblock.draw`)
- Hitting a blocker: same as NPC collision (crash + damage)
- Auto-despawns after **900 frames (~15 s)**

---

## Persistent road hazards

`GameMap._place_potholes()` and `Game._check_road_hazards()`.

| Type | Trigger | `lat_vel` kick | Colour |
|------|---------|----------------|--------|
| Pothole | Any level | ±`POTHOLE_KICK (0.40)` × speed_frac | Dark grey ellipse |
| Puddle | Rain levels (45 % of hazards) | ±`PUDDLE_KICK (0.70)` × speed_frac | Blue ellipse |

- Count scales: `max(2, level_num // 3)` per level
- Cooldown per hazard: `HAZARD_COOLDOWN (72)` frames before it can fire again
- Preferred placement on corridor (one-way) tiles

---

## One-way streets

`GameMap._place_one_ways()` post-processes recorded corridors after DFS generation.

- Applied from **level 5** onwards
- Each corridor tagged with probability `ONE_WAY_PROB (0.30)` and a random direction
- Data: `game_map.one_way: dict[(tx,ty) → (dx,dy)]`
- **NPCs** filter out moves against the allowed direction in `_valid_actions()`
- **Player** wrong-way detection in `_check_wrong_way()`:
  - Counts frames where `dot(car_dir, allowed_dir) < −0.3`
  - After `ONE_WAY_VIOLATION_F (40)` frames: violation fires (−100 pts), re-arms
  - Red overlay tint grows during wrong-way travel
- **Visual**: golden triangle arrows drawn on each one-way tile

---

## Roundabouts

`GameMap._place_roundabouts()` converts room centres to mini roundabouts.

- Applied from **level 4** onwards, requires `cell ≥ 3`
- Probability: `ROUNDABOUT_PROB (0.18)` per room
- Diamond layout: centre tile becomes a **non-road island** (`grid = 1`)
- 4 cardinal ring tiles get clockwise flow: N→E→S→W→N
- Data: `roundabout_tiles: set`, `roundabout_dir: dict[(tx,ty)→(dx,dy)]`, `roundabout_centers: set`
- **NPCs**: on ring tiles, `_choose_next_dir()` follows the ring flow; 40 % chance to take an exit when one is available
- **Player wrong-way**: `_check_wrong_way()` also checks `roundabout_dir`
- **Visual**: centre drawn as a decorative grass/snow island with pavement ring and coloured dot

---

## Known cheat

Type `godmode` during play to toggle god mode: no damage, no violations, fuel stays full. Badge pulses on screen.

---

## Build

```bash
./scripts/build-cardrive.sh   # pygame → pygbag → public/games/cardrive/
```

WASM bundle is self-contained; requires a browser with SharedArrayBuffer (served with COOP/COEP headers).

---

---

# MemBrain — Developer Reference

Browser-native brain-training game with seven independent subgames. **Zero build step for the game itself** — split across plain CSS + JS files (no bundler, no modules) loaded via `<link>`/`<script src>` tags.

---

## File locations

```
public/games/memorize/
  index.html        ← markup only (HTML) + <link>/<script src> tags. ~785 lines
  css/  base.css        ← :root vars, reset, screens, particles, menu, buttons, card, LM/diamond menu
        components.css   ← level select, word, results, spot, lobby, invite, pairs, gameover, animations
        games.css        ← math, lang, achievements, share, opts, colombo, info, xp, radar, workout, ai, mobile
  js/   i18n.js          ← STRINGS (en/uk) + t / setLang / toggleLang        [loads 1st]
        constants.js     ← WM_LEVELS, MATH_LEVELS, COLLECTIONS, GRID_OPTS… + background particles (auto-starts)
        objects.js       ← drawObject() canvas art (24 objects) + emoji draw
        core.js          ← showScreen, goMenu, toggleOpts/restoreOpts, backFromGame, info popup
        word.js spot.js pairs.js math.js diamond.js longmemory.js   ← one subgame each
        systems.js       ← achievements, XP/level, brain radar, daily workout
        pairs-ai.js      ← Pairs vs AI (startAiGame)
        math-extra.js    ← math estimation, trick mastery, daily ladder, share card
        colombo.js       ← Colombo detective subgame (procedural SVG scenes)
        init.js          ← applyLang() + bootstrap (showWordMenu/showSpotMenu/applyLang)  [loads LAST]
worker/GameServer.js               ← Cloudflare Durable Object: Pairs Battle WebSocket server
worker/index.js                    ← Cloudflare Worker entry point (routes /ws + static assets)
src/pages/HomePage.jsx             ← React home screen card (title "MemBrain", route id "memorize")
src/pages/GamePage.jsx             ← React wrapper that iframes the game
```

The game is served as plain static files; the React wrapper just iframes it; there is no React code inside the game.

**CRITICAL — the split uses classic (non-module) scripts, NOT ES modules:**
- All JS files share ONE global scope. Every function and top-level `let`/`const` is global to every other file. This is *why* inline `onclick="showColomboMenu()"` handlers in index.html work — do NOT convert to `<script type="module">` or you break every handler.
- **Load order matters** (set by the `<script src>` order in index.html): `i18n.js` first (STRINGS/t used everywhere), `init.js` LAST (its bootstrap calls into every subgame). A file's *top-level immediate code* may only call functions defined in an earlier-loaded file. The only auto-running top-level code is the particle init in `constants.js` (self-contained) and the bootstrap in `init.js` (last). Everything else runs on user interaction, after all files are loaded.
- To add a new subgame: drop a `js/<game>.js`, add its `<script src>` BEFORE `init.js`, add styles to `games.css`, wire it into `applyLang()` (init.js) and `backFromGame()` (core.js).
- CSS is split by source position (cascade order = `<link>` order); the base/components/games names are loose groupings, not strict layers.
- `COLLECTIONS` lives in `js/constants.js` and must still stay identical to `worker/GameServer.js` (see Pairs section).

---

## Local development / preview

The game can be previewed without any build step:

```bash
python3 -m http.server 8099 --directory /Users/pzhelnov/work/CarDrivePython/public
# then open http://localhost:8099/games/memorize/index.html
```

For the **full stack** (React home + Cloudflare Worker multiplayer):

```bash
npm run dev          # Vite dev server at http://localhost:5173
# WebSocket server requires wrangler (see deploy section)
```

WebSocket URL auto-detection (`wsUrl()` in `js/pairs.js`):
- `localhost` → `ws://localhost:8080`
- Production → `wss://<hostname>/ws`

> **Note:** the function tables below list the `js/` file each function lives in (one file per subgame). They no longer carry line numbers — grep within the named file to locate a function.

---

## Build & deploy

### Frontend (React + static game)

```bash
npm run build        # Vite → dist/
```

Deploy targets (pick one):

| Platform | Command | Config file |
|----------|---------|-------------|
| **Cloudflare** | `npx wrangler deploy` | `wrangler.toml` |
| Netlify | push to git | `netlify.toml` |
| Vercel | push to git | `vercel.json` |

Cloudflare is the **primary** deploy target because it also runs the Durable Object WebSocket server for Pairs Battle multiplayer.

### Cloudflare Worker + Durable Object

```bash
npm run build && npx wrangler deploy
```

`wrangler.toml` key points:
- `main = "worker/index.js"` — Worker entry
- `[assets] directory = "./dist"` — serves Vite build output
- `new_sqlite_classes = ["GameServer"]` — **must be `new_sqlite_classes`**, not `new_classes` (free plan requirement)

`worker/index.js` routes:
- `GET /ws` (with `Upgrade: websocket`) → forwards to `GameServer` Durable Object instance `"global-lobby"`
- Everything else → static asset from `dist/`, injected with COOP/COEP headers

---

## Architecture: seven subgames

Screen markup lives in `index.html`; each subgame's logic lives in its own `js/<subgame>.js` file (see File locations). Screen routing uses `showScreen(id)` (in `js/core.js`) which sets `.active` on the target `<div class="screen">`.

Screen IDs:
```
screen-menu       Main menu (7 mode cards)
screen-word       Word Sequence    (js/word.js)        level select → memorize → recall → results
screen-spot       Object Spotting  (js/spot.js)        level select → round → results
screen-lobby      Pairs Battle lobby (js/pairs.js, js/pairs-ai.js)
screen-pairs      Pairs Battle game  (js/pairs.js)     lobby → game → results
screen-math       Math Drills      (js/math.js)        level select → task → results
screen-diamond    Diamond          (js/diamond.js)     gesture memorize → trace
screen-lm         Long Memory      (js/longmemory.js)  encode → recall after delay
screen-colombo    Colombo          (js/colombo.js)     study scene → quiz → verdict
```

---

## Mode 1 — Word Sequence

**Goal**: memorize a sequence of words flashed briefly, then recall them.

### Levels (12 total, defined in `WM_LEVELS`, `js/constants.js`)

| Levels | Words | Flash time | Mechanic |
|--------|-------|-----------|---------|
| 1–6 | 3–10 | 3500–1900 ms | Click words from a pool |
| 7–12 | 4–10 | 3000–1400 ms | **Type** words from memory (no pool) |

Levels 7, 9, 11 have an `intro` banner for the mechanic change.

### Word banks (`WORD_BANKS`, `js/constants.js`)

8 categories: `animals`, `colors`, `food`, `nature`, `objects`, `space`, `music`, `body`. Each level uses a subset (`cats` array in its config). `wmStart()` de-duplicates with `new Set(...)`.

### Key functions

| Function | File | Purpose |
|----------|------|---------|
| `showWordMenu()` | `js/word.js` | Level select + daily stats |
| `wmStart(lvIdx)` | `js/word.js` | Initializes round, calls countdown |
| `wmCountdown(done)` | `js/word.js` | 3·2·1·GO! animation with tones |
| `wmRunMemorize(idx, lv)` | `js/word.js` | Flashes each word with per-word tone |
| `wmShowRecall()` | `js/word.js` | Switches to pool-click or typed-input UI |
| `renderWmTypeRows()` | `js/word.js` | Renders one `<input>` per word (called by `wmShowRecall`); Enter advances |
| `wmSubmit()` | `js/word.js` | Scores recall, saves stats, shows results |
| `wmNextLevel()` | `js/word.js` | Advances to next level without going to menu |
| `setWordAlign(center)` | `js/word.js` | Sets `#screen-word` justify-content; call `false` for lists, `true` for flash phase |
| `wmLoadStats()` / `wmSaveStats()` | `js/word.js` | localStorage key: `membrain_word_v1` |
| `wmStreak(stats)` | `js/word.js` | Counts consecutive days with activity |
| `renderWmStats()` | `js/word.js` | 7-day bar chart + streak in level select |

### Scoring formula

```
score = (recall×0.5 + precision×0.2 + order×0.3) × 100
```
- `recall` = fraction of target words the player identified
- `precision` = fraction of player's answers that were correct (no wrong words)
- `order` = longest in-order prefix ÷ total words
- Type mode gets ×1.05 bonus (harder mechanic)
- Stars: ≥90 → ⭐⭐⭐, ≥70 → ⭐⭐, ≥50 → ⭐, else 0

### localStorage schema

```json
{
  "days": {
    "2026-06-13": { "words": 5, "score": 87, "stars": 3 }
  },
  "stars": { "0": 3, "1": 2 }
}
```

---

## Mode 2 — Object Spotting

**Goal**: memorize a grid of canvas-drawn objects briefly, then spot the one that changed (or appeared/disappeared).

### Key functions

| Function | File | Purpose |
|----------|------|---------|
| `showSpotMenu()` | `js/spot.js` | Level select |
| `spotStart(lvIdx)` | `js/spot.js` | Initializes round |
| `spotRunRound()` | `js/spot.js` | Shows grid, runs blackout, shows find phase |
| `spotStartBlackout(canvas, …)` | `js/spot.js` | Covers grid for memorization period |
| `spotStartFind(canvas, …)` | `js/spot.js` | Player clicks the changed object |
| `spotGuess(id)` | `js/spot.js` | Checks guess, scores |

Uses the same `OBJECTS` array and `drawObject()` canvas function as Pairs Battle classic mode.

---

## Mode 3 — Pairs Battle (multiplayer)

**Goal**: flip card pairs faster than your opponent. Real-time 2-player via WebSocket.

### Client state (`pairsState`, `js/pairs.js`)

```javascript
let pairsState = {
  gridSize, cards, revealed[], matched[], holeCount[],
  scores, myName, partner, myTurn, waitingFlipBack
};
let selectedGrid = '2x4';        // active grid selection
let selectedCollection = 'classic'; // active card collection
let pendingFlip = false;          // prevents double-click race
let ws = null;                    // active WebSocket
```

### Grid convention — CRITICAL

**`"CxR"` = cols × rows (width × height)**. Both client and server parse:
```javascript
const [cols, rows] = gridSize.split('x').map(Number);
```
Getting this backwards flips the board 90°. Never change this.

Available grids and their pair counts:
```
2x4=4  3x4=6  4x4=8  4x6=12  6x6=18  6x8=24
```

### Card collections — CRITICAL SYNC INVARIANT

`COLLECTIONS` is defined in **both** files and **must be identical**:
- `public/games/memorize/js/constants.js` — array of `{id, name, kind, pool}`
- `worker/GameServer.js` (line ~7) — plain `{id: [tokens]}` object

14 collections: `classic` (canvas-drawn token IDs), then 13 emoji packs. `classic` pool has 24 tokens; `cats` has 16 (minimum for the 2x4 grid with 4 pairs). All others have 24.

If you add a collection, add it to **both files**: `js/constants.js` (client) and `worker/GameServer.js` (server). Cross-check the ids match:
```bash
grep -oE "id: *'[a-z]+'" public/games/memorize/js/constants.js   # client collection ids
grep -oE "^  [a-z]+:" worker/GameServer.js                        # server collection ids
```

### Canvas drawing

`drawObject(ctx, id, cx, cy, size)` — switch on `id` string, 24 objects. Called for `kind:'canvas'` cards.

Emoji cards rendered via:
```javascript
ctx.font = `${Math.floor(s*0.74)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
ctx.fillText(emoji, s/2, s*0.54); // 0.54 not 0.5 — compensates for emoji visual center
```

### Capacity-aware grid selector

`refreshGridOptions()` (`js/pairs.js`): all grid sizes are always enabled; `startAiGame` cycles the pool when a grid needs more pairs than the collection has (see Colombo-era fix).

### WebSocket protocol (client ↔ server)

**Client → server:**
```
{ type: 'join',            name }
{ type: 'invite',          to, gridSize, collection }
{ type: 'invite_response', accepted, to, gridSize, collection }
{ type: 'flip',            index }
{ type: 'hide_cards' }
{ type: 'rematch' }
{ type: 'leave_room' }
```

**Server → client:**
```
{ type: 'game_start',   partner, gridSize, collection, cards[], yourTurn }
{ type: 'card_revealed', index, object, by }    ← sent BEFORE pair_found/no_match
{ type: 'pair_found',   indices[], by, scores, nextTurn, gameOver }
{ type: 'no_match',     indices[], by, scores }
{ type: 'game_over',    scores, winner }
{ type: 'rematch_ready', gridSize, collection, cards[], yourTurn }
```

**Important**: server broadcasts `card_revealed` first so both players see the second card before the match/no-match result.

### Server architecture (`GameServer.js`)

One global Durable Object instance (`"global-lobby"`) handles all rooms in memory.

```
GameServer (DO)
├── players: Map<name, WebSocket>
├── pendingInvites: Map<from, {to, gridSize, collection}>
└── rooms: Map<roomId, GameRoom>
    └── GameRoom
        ├── players[p1, p2]
        ├── gridSize, collection
        ├── cards[] (dealt from shuffled COLLECTIONS[collection])
        ├── revealed[], matched[], holeCount[]
        ├── scores { pairs, holes, holePenalty }
        ├── currentTurn
        ├── flipBuffer (max 2 indices)
        └── rematchVotes Set
```

`flipCard(by, index)` returns the result object; `GameServer.fetch()` broadcasts it to both players.

---

## Mode 4 — Math Drills

**Goal**: solve arithmetic problems as fast as possible. 10 tasks per round.

### Levels (12 total, `MATH_LEVELS`, `js/math.js`)

| Levels | Operands | Max value | Time | Mode | Kind |
|--------|---------|-----------|------|------|------|
| 1–3 | 2 | 100–999 | 25–22s | choice (4 options) | plain |
| 4–5 | 2 | 999 | 26–18s | input (keyboard) | plain |
| 6 | 2 | 99 | 28s | input | equation (solve X) |
| 7 | 2 | 300 | 18s | input | equation |
| 8–10 | 3 | 50–999 | 30–16s | input | plain |
| 11 | 3 | 99 | 30s | input | equation |
| 12 | 3 | 300 | 15s | input | equation |

Levels 4, 6, 8, 11 have `intro` banners for mechanic changes.

### Operation presets (8, shown on setup screen)

`+-`, `+×`, `-÷`, `×÷`, `+-×`, `+-÷`, `+-×÷`, `×` — user selects one before starting a level.

### Expression builder (`mBuildExpr`, `js/math.js`)

- Left-to-right evaluation (no PEMDAS — result is `((a op b) op c)`)
- Division: `b` is chosen to divide `cur` evenly; result stays integer
- Subtraction: `b` capped at `cur` (never goes below 0), and if `cur < 1` the op flips to `+`
- Equation mode: picks a random operand position as X, generates the question from the filled-in result

### Key functions

| Function | File | Purpose |
|----------|------|---------|
| `showMathMenu()` | `js/math.js` | Level select, op-preset grid, daily stats |
| `mathStartLevel(idx)` | `js/math.js` | Initializes round; falls back to `+-` if ops null |
| `mathNextTask()` | `js/math.js` | Generates task; choice or input mode |
| `mathAnswer(value, btnEl)` | `js/math.js` | Scores answer, advances |
| `mathKey(k)` | `js/math.js` | Keyboard input handler |
| `mathFinish()` | `js/math.js` | Round summary + daily stats update |
| `mathTodayKey()` | `js/math.js` | Returns `"YYYY-MM-DD"` for today |
| `mathDayKey(d)` | `js/math.js` | Same for any Date object (shared with Word mode) |
| `mathLoadStats()` / `mathSaveStats()` | `js/math.js` | localStorage key: `membrain_stats_v1` |
| `mathRecordSession(tasks, correct, score)` | `js/math.js` | Merges today's session into stats |
| `mathStreak(s)` | `js/math.js` | Day-streak count |

### localStorage schema

```json
{
  "days": {
    "2026-06-13": { "tasks": 10, "correct": 8, "score": 74 }
  }
}
```

---

## Shared utilities

### Sound (Web Audio API, no external files)

```javascript
playTone(freq, type, gain, dur, delay=0)  // base oscillator
soundCardFlip()    // single soft sine
soundPairFound()   // ascending triangle arpeggio
soundNoMatch()     // falling sawtooth
soundWin()         // 5-note ascending chime
soundLose()        // descending sawtooth
```

AudioContext is created lazily on first user gesture to satisfy browser autoplay policy.

### Background particles

`#bg-canvas` is a `<canvas>` running a floating-particle animation loop. Drawn at z-index 0; all screen content sits at z-index 1.

### Responsive breakpoints

```css
@media (max-width:600px) { /* mobile layout adjustments */ }
@media (max-width:380px) { /* small phone overrides */ }
```

Key mobile fixes applied:
- `#screen-menu { justify-content: flex-start }` — prevents top cards being hidden on long lists
- `#lobby-header { margin-top: 44px }` — clears the fixed ← Menu button
- `#math-play { padding-top: 50px }` — clears HUD behind back button
- `setWordAlign(false)` called for level select, recall, results (only `true` during flash phase)

---

## Known invariants / gotchas

1. **Grid string is CxR (cols × rows)**, not RxC. Parse with `[cols, rows] = gridSize.split('x').map(Number)`.
2. **COLLECTIONS must be identical in both files.** If they drift, the server deals cards the client doesn't know how to render.
3. **`mathDayKey` is reused by Word mode** (`wmStreak` calls it). If you rename it, update both callers.
4. **`mathStartLevel()` guards null ops**: `if(!mathState.ops) selectMathOps('+-')` — needed when jumping directly to a level without going through the setup screen.
5. **Emoji canvas baseline**: use `s*0.54` not `s*0.5` for `fillText` y-coordinate — emoji glyphs sit visually above their mathematical center.
6. **DO free-plan**: `wrangler.toml` must use `new_sqlite_classes`, not `new_classes`.
7. **COOP/COEP headers are required** for CarDrive WASM (SharedArrayBuffer). The Cloudflare Worker injects them on every response; Netlify/Vercel configs mirror this.
8. **i18n uses `introKey:` not `intro:`** in `WM_LEVELS`, `SPOT_LEVELS`, `MATH_LEVELS`. The value is a key into `STRINGS` (e.g. `introKey:'spot_intro_two'`). Never put raw English strings in `intro:` — those are gone.
9. **`MATH_PRESETS` use `key:` not `lbl:`**. Each entry has `key:'math_op_add'` etc. pointing to `STRINGS`. `renderMathOps()` calls `t(p.key)`.

---

## i18n system

Language is stored in `localStorage.membrain_lang` (`'en'` default, `'uk'` for Ukrainian).

```javascript
// Core API
let lang = 'en';
const STRINGS = { en: {...}, uk: {...} };  // 100+ keys; function values for templates
function t(key, ...args) { ... }           // lookup + call if function
function setLang(l) { ... }               // set + persist + applyLang()
function toggleLang() { ... }             // en ↔ uk
function applyLang() { ... }              // updates all DOM, re-renders grids, calls goMenu()
```

**Language toggle button** is in the main menu hero (`id="lang-toggle"`). Shows `🇺🇦 УКР` in English mode, `🇬🇧 ENG` in Ukrainian mode.

**MEMBRAIN → БОТАНІК** when Ukrainian is active.

**Word banks**: `WORD_BANKS` (English) and `WORD_BANKS_UK` (Ukrainian). `wmStart()` picks based on `lang === 'uk'`.

**Template strings** in STRINGS are function values:
```javascript
wm_word_n_of: (i, n) => `WORD ${i} OF ${n}`,  // en
wm_word_n_of: (i, n) => `СЛОВО ${i} З ${n}`,  // uk
```
Call via `t('wm_word_n_of', 2, 5)` → `"WORD 2 OF 5"` or `"СЛОВО 2 З 5"`.

**Ukrainian plural forms** for streak: `n===1 ? 'день' : n<5 ? 'дні' : 'днів'`.

---

---

# Colombo — Subgame (IMPLEMENTED)

**Status**: ✅ Shipped. The "Eyewitness" concept below was implemented as **Colombo** (detective theme, named after the TV detective). Logic in `public/games/memorize/js/colombo.js`; screen markup in `index.html`. Screen id `screen-colombo`; menu card class `mode-card amber`.

**What shipped (differs from / extends the original spec):**
- Detective framing: study a **crime scene**, then "crack the case from memory". Results read as a verdict ("Case Solved", "Flawless detective work!").
- Detailed layered-SVG scenes (viewBox `0 0 800 500`) — not flat figures. Room with wall/floor, window (moon/tree/rain/city/**watcher**), framed painting, wall clock, mirror, door (open/closed), table with drawn objects, detailed people (hair styles, glasses, mustache, tie, held objects), rug, plant, floor lamp with warm glow, cat/dog, night/dusk overlays.
- **Detective twists** (the "secret" mechanic, toggleable via Options → "Detective Twists"): a **mirror** reflects a hidden suspect / object / clock not otherwise visible; a **watcher** silhouette lurks outside the window (asks coat colour); floor **clues** (footprints / spill / dropped object). Twist questions are flagged `secret:true`, styled gold, labelled "JUST ONE MORE THING", and shown last.
- 8 cases (`COL_LEVELS`), exposure 11s→3.2s, 4→8 questions. Answer style option: multiple-choice (default) or type-it-out. **Case of the Day** = worldwide shared seed (`colDailySeed()`), fixed mid-level config with twists on.
- Full EN/UK i18n. localStorage key `membrain_colombo_v1` (`{days, stars, daily}`); options `membrain_col_ans`, `membrain_col_secret`, panel state `membrain_opts_col-opts`.

**Key functions** (all prefixed `col`): `colBuild(seed,cfg)` (scene model), `colRender(model)` (SVG string), `colPerson`/`colObj`/`colWindowView` (draw helpers), `colQuestions(model,cfg)` (answer key + distractors), `showColomboMenu`, `colStart`, `colStartQuiz`, `colSubmit`, `colShowResults`, `colReplayReveal`, `colNextCase`, `colStartDaily`, `colLoadStats`/`colSaveStats`/`colStreak`/`renderColStats`. RNG: `colMulberry`. Colour helper: `colShade`. `'col'` is wired into `backFromGame`.

**TODO — Crypto / Number Shapes subgame** (deferred, not built): the Major-System number↔image cipher game (encode / decode-puzzle / crypto-challenge modes). No menu button exists for it yet — intentionally left out until built.

---

# Eyewitness — original design spec (kept for reference; implemented as Colombo above)

**Concept**: A procedurally generated scene flashes for a few seconds. It disappears. You answer questions about what you saw — from memory. Nothing is pre-drawn or hardcoded. Every scene is built fresh from a seed integer, so the answer key is a byproduct of the same object that rendered the scene.

---

## Core principle: scene graph → SVG + answer key

```
seed (int32)
  └─► build(seed) → SceneModel { people[], cups, clockH, clockM, sign, plant, setting }
        ├─► renderScene(model) → SVG string   (displayed to player)
        └─► makeQuestions(model) → Question[] (generated from same facts; shown after scene hides)
```

The player never sees the questions until the scene is gone. Correct answers are read directly from the model — no image recognition, no hardcoded Q&A pairs.

---

## SceneModel schema

```javascript
{
  seed: Number,         // uint32 — the whole scene in one integer
  setting: String,      // 'cafe' | 'street' | 'office' | 'park' | 'kitchen'
  people: [             // 1–4 people
    {
      skin: String,     // hex color
      hair: [name, hex],// e.g. ['black','#2b2b2b']
      hairStyle: 0|1|2, // 0=short, 1=long, 2=bald
      shirt: [name, hex],
      hat: Boolean,
      hatColor: [name, hex],
      glasses: Boolean,
      position: Number  // 0..n-1, left to right
    }
  ],
  cups: Number,         // 0–5 (on counter/table)
  clockH: Number,       // 1–12
  clockM: Number,       // 0, 15, 30, or 45
  sign: String,         // random word from SIGN_WORDS
  plant: Boolean,       // potted plant present?
  animal: String|null,  // 'cat'|'dog'|null (appears ~30% of scenes)
  weather: String,      // 'clear'|'rain'|'night' (outdoor settings only)
  vehicleColor: [name,hex]|null, // parked car (street setting only)
}
```

---

## Random number generator

Use `mulberry32` (same as the demo widget — already proven):

```javascript
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

`build(seed)` creates one RNG from the seed and calls it in a fixed order. Same seed → identical scene every time.

---

## Settings vocabulary (expand over time)

```javascript
const EW_SETTINGS = ['cafe', 'street', 'office', 'park', 'kitchen'];

const EW_SHIRTS  = [['red','#d8453f'],['blue','#3f6fd8'],['green','#3aa657'],
                    ['yellow','#e8c33a'],['purple','#8a4fd8'],['orange','#e0822f'],
                    ['teal','#2fb3a8'],['pink','#e06fa0'],['white','#f0ede8'],['black','#2b2b2b']];

const EW_HAIR    = [['black','#2b2b2b'],['brown','#6b4326'],['blonde','#d9b25a'],
                    ['red','#b5552f'],['gray','#9a9a9a'],['white','#e8e8e8']];

const EW_SKIN    = ['#f1c9a5','#e0a878','#c68642','#8d5524','#4a2e1a'];

const EW_HAT_COLORS = EW_SHIRTS;  // reuse shirt palette

const EW_SIGN_WORDS = ['OPEN','EXIT','CAFE','SALE','MENU','WIFI','FRESH','COLD',
                        'HOT','STOP','SLOW','INFO','HELP','WAIT','PUSH','PULL'];

const EW_VEHICLE_COLORS = [['red','#c0392b'],['blue','#2980b9'],['white','#ecf0f1'],
                            ['black','#2c3e50'],['yellow','#f1c40f'],['green','#27ae60'],
                            ['silver','#bdc3c7']];
```

---

## SVG rendering

**Viewport**: `viewBox="0 0 680 360"`, `width="100%"`.

**Layer order** (back to front):
1. Background fill (wall/sky color per setting)
2. Setting-specific props (counter, desks, trees, appliances) — simple rects/ellipses
3. Clock on wall (circle + computed hour/minute hands)
4. Sign rectangle + text
5. People (z-ordered: further back = drawn first if needed; for now all at same depth)
6. Counter/ground surface
7. Cups (rects + handles)
8. Plant / animal / vehicle (per flags)

**People rendering** (per person, centered at computed x):
```
hat (rect × 2, if hat)
hair cap (arc path, fill hair color)
head (circle, fill skin)
body/shirt (rounded rect)
glasses (two small circles + bridge line, if glasses)
```

Person x-positions: distribute evenly across x=150..530 for the number of people present.

**Clock rendering**:
```javascript
// hour hand
const ha = ((clockH % 12) / 12 + clockM / 720) * 2 * Math.PI - Math.PI / 2;
// minute hand
const ma = (clockM / 60) * 2 * Math.PI - Math.PI / 2;
```
Draw at fixed position top-left of scene (cx=92, cy=72, r=40).

**Setting backgrounds** (phase 1 — start with café; add others later):

| Setting | Wall fill | Floor fill | Notable prop |
|---------|-----------|------------|-------------|
| cafe    | `#cbb89a` | `#7a6048`  | counter rect + stools |
| street  | `#87CEEB` | `#808080`  | pavement + parked car |
| office  | `#d0d8e0` | `#b0a090`  | desk grid |
| park    | `#87CEEB` | `#5a8a3a`  | bench + path |
| kitchen | `#e8ddd0` | `#c0b090`  | counter + stove outline |

---

## Question generation

`makeQuestions(model)` returns an array of `{q: String, a: String|Number}` objects. Pull **6 questions** per scene (or fewer if the scene lacks the entity — skip rather than ask about absent things).

**Core question bank** (select 6 that apply to this model):

| Question template | Answer source | Always asked? |
|------------------|--------------|---------------|
| "How many people were in the scene?" | `people.length` | Yes |
| "What time did the clock show?" | `clockH + ':' + padded(clockM)` | Yes |
| "What did the sign say?" | `sign` | Yes |
| "How many cups were on the counter/table?" | `cups` | Yes |
| "What color shirt was the [left-most / right-most / only] person wearing?" | `people[0].shirt[0]` | Yes (adapt label to count) |
| "Was there a plant in the scene?" | `plant ? 'yes' : 'no'` | Yes |
| "How many people had a hat?" | count of `people[i].hat` | If ≥1 person |
| "Was anyone wearing glasses?" | any `.glasses` | If ≥2 people |
| "What color was the [left/right] person's hair?" | `people[i].hair[0]` | If ≥2 people |
| "Was there an animal? What kind?" | `animal \|\| 'none'` | If animal present |
| "What color was the parked car?" | `vehicleColor[0]` | Street setting only |
| "What was the weather like?" | `weather` | Outdoor settings |

For **relational questions** (harder difficulty): "What color was the shirt of the person standing next to the plant?" — only generate when `people.length >= 2` and `plant === true`.

---

## Difficulty levels

10 levels. Each level is a config object:

```javascript
const EW_LEVELS = [
  // {len: exposure seconds, people: max people, questions: how many, relational: bool, settings: [...allowed]}
  { len: 8,  people:[1,2], questions:4, relational:false, settings:['cafe'] },           // 1
  { len: 7,  people:[1,2], questions:4, relational:false, settings:['cafe'] },           // 2
  { len: 6,  people:[1,3], questions:5, relational:false, settings:['cafe','kitchen'] }, // 3
  { len: 5,  people:[1,3], questions:5, relational:false, settings:['cafe','kitchen'] }, // 4
  { len: 5,  people:[2,3], questions:6, relational:false, settings:['cafe','office'] },  // 5
  { len: 4,  people:[2,3], questions:6, relational:false, settings:['cafe','office'] },  // 6
  { len: 4,  people:[2,4], questions:6, relational:true,  settings:['cafe','office','park'] }, // 7
  { len: 3,  people:[2,4], questions:6, relational:true,  settings:EW_SETTINGS },        // 8
  { len: 3,  people:[3,4], questions:6, relational:true,  settings:EW_SETTINGS },        // 9
  { len: 2,  people:[3,4], questions:6, relational:true,  settings:EW_SETTINGS },        // 10
];
```

`people` is a `[min, max]` range; pick randomly within it per scene.

---

## Screen flow

```
screen-ew (new screen ID)
  └─ #ew-select     level select + stats + options panel
  └─ #ew-study      scene display (SVG, countdown timer bar)
  └─ #ew-quiz       blank/cover + question list + answer inputs
  └─ #ew-results    score, correct answers revealed, streak
```

HTML structure mirrors Word Sequence (`screen-word`) and Object Spotting (`screen-spot`):
- Title row: `section-title` + `info-btn` + `close-btn` (✕ → `goMenu()`)
- `level-grid` for level selection
- Options collapsible panel (`opts-toggle` / `opts-panel`) — contains: scene duration override (off by default), setting filter

---

## Key JS functions to implement

| Function | Purpose |
|----------|---------|
| `ewBuild(seed)` | Generate SceneModel from seed |
| `ewRenderScene(model)` → String | Return SVG string |
| `ewMakeQuestions(model, level)` → Array | Return filtered question list |
| `showEwMenu()` | Populate level grid, restore opts, render stats |
| `ewStart(lvIdx)` | Init round: build model, render SVG, start countdown |
| `ewStartQuiz()` | Hide scene, show questions (text inputs or buttons) |
| `ewSubmit()` | Score answers, save stats, show results |
| `ewLoadStats()` / `ewSaveStats()` | localStorage |
| `ewStreak(stats)` → Number | Day streak count |
| `renderEwStats()` | 7-day bar + streak display in level select |
| `ewDailyScene()` | Build scene from `ewDailySeed()` for Daily Eyewitness mode |
| `ewDailySeed()` | `Math.floor(new Date('YYYY-MM-DD').getTime() / 86400000)` — one seed per calendar day |

---

## Scoring

```javascript
// Per question: 1 point if correct (case-insensitive, trimmed)
// Numeric answers: exact match OR within ±0 (counts only)
// Color/word answers: normalized lowercase compare

score = (correctAnswers / totalQuestions) * 100;  // 0–100
stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
```

Show each question's result with green ✓ or red ✗ and the correct answer revealed.

---

## Daily Eyewitness mode

One shared scene per day (same seed worldwide). Button on the level select screen (same pattern as Math's "Today's Challenge").

```javascript
function ewDailySeed() {
  // Days since Unix epoch → unique daily int
  return Math.floor(Date.now() / 86400000);
}
function ewStartDaily() {
  const seed = ewDailySeed();
  const todayKey = new Date().toISOString().slice(0, 10);
  // check if already played today → show results instead of starting
  ewStart(null, seed);  // null lvIdx = use max difficulty (level 10 config)
}
```

Badge shows "Done" if played today (same pattern as Math daily badge).

---

## localStorage schema

Key: `membrain_ew_v1`

```json
{
  "stars": { "0": 3, "2": 2 },
  "days": {
    "2026-06-15": { "scenes": 3, "score": 84, "stars": 3 }
  },
  "daily": {
    "2026-06-15": { "score": 91, "correct": 5, "total": 6 }
  }
}
```

---

## i18n keys needed

Add to both `STRINGS.en` and `STRINGS.uk`:

```javascript
// Section
ew_title: 'Eyewitness',
ew_sub: 'Study the scene — answer from memory',

// Level select
ew_select_lbl: 'SELECT LEVEL',
ew_daily_btn: "Today's Scene",
ew_daily_done: 'Done today',

// Study phase
ew_study_lbl: (s) => `Memorize… ${s}s`,
ew_study_ready: "I'm ready",

// Quiz phase
ew_quiz_lbl: 'Answer from memory',
ew_quiz_submit: 'Check answers',

// Results
ew_result_correct: (n, t) => `${n} / ${t} correct`,
ew_result_scene_seed: (s) => `Scene #${s}`,

// Questions (templates)
ew_q_people_count: 'How many people were in the scene?',
ew_q_clock: 'What time did the clock show?',
ew_q_sign: 'What did the sign say?',
ew_q_cups: 'How many cups were on the counter?',
ew_q_shirt_only: "What color was the person's shirt?",
ew_q_shirt_left: "What color was the left-most person's shirt?",
ew_q_shirt_right: "What color was the right-most person's shirt?",
ew_q_plant: 'Was there a plant in the scene? (yes/no)',
ew_q_hats: 'How many people were wearing a hat?',
ew_q_glasses: 'Was anyone wearing glasses? (yes/no)',
ew_q_hair_left: "What color was the left person's hair?",
ew_q_hair_right: "What color was the right person's hair?",
ew_q_animal: 'Was there an animal, and if so, what kind?',
ew_q_car_color: 'What color was the parked car?',
ew_q_weather: 'What was the weather like?',

// Info popup key
ew_info: 'ew',
```

Ukrainian translations follow the same keys with `_uk` values.

---

## Implementation order (for the coding session)

1. **`ewBuild(seed)`** + **`ewRenderScene(model)`** — café setting only, 1–3 people. Verify in browser.
2. **`ewMakeQuestions(model, lvCfg)`** — core 6 questions (no relational yet).
3. **Screen HTML** — `#ew-select`, `#ew-study`, `#ew-quiz`, `#ew-results` following existing patterns.
4. **`showEwMenu()` + `ewStart()` + `ewStartQuiz()` + `ewSubmit()`** — full game loop.
5. **Stats + streak** — `ewLoadStats()`, `ewSaveStats()`, `renderEwStats()`.
6. **Daily Eyewitness** — `ewDailySeed()`, `ewStartDaily()`, daily badge.
7. **i18n** — all keys in both languages.
8. **Wire into main menu** — add Eyewitness card to `#screen-menu` grid.
9. **Additional settings** — street, office, park, kitchen backgrounds.
10. **Relational questions** — "person next to the plant" etc. (levels 7–10).

**Start with step 1.** Get a scene generating and rendering in isolation before wiring UI. Use the demo widget's `build()`/`render()` as a starting skeleton — it's already proven.

---

## Gotchas to watch

- **Seed is the source of truth.** Never store the SVG or the scene object in localStorage — regenerate from seed when needed (e.g. to show the answer key after the fact). Seed fits in a JS integer safely up to 2^31.
- **Question order must be deterministic per seed** so Daily Eyewitness is consistent for all players. Sort/filter questions in fixed order, not by random selection.
- **Color names must be i18n-translated.** The answer for "shirt color" is a string like `'red'` — when comparing player input, normalize to lowercase and compare to the i18n-translated color name too (e.g. Ukrainian player types 'червоний'). Store answers in the model as `[en_name, hex]` so you can look up the localized name at quiz time.
- **Clock display**: `clockM` is always 0/15/30/45. Display as `"4:30"` not `"4:30:00"`. Accept `"4:30"` and `"4h30"` and `"4.30"` as correct (normalize before comparing).
- **`close-btn` (✕)** must be placed next to `ℹ` in the title row, same as WM/Spot/Math/Diamond. `onclick="goMenu()"` — no leave-confirmation needed (player hasn't started a round yet from level select). During study/quiz phase, use `backFromGame('ew')` to show the leave popup.
- **`backFromGame`** needs `'ew'` added to its `inGame` map: active when `#ew-study` or `#ew-quiz` is visible.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
