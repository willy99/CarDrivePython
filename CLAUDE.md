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

Browser-native brain-training game with four independent modes. **Zero build step for the game itself** — everything lives in a single self-contained HTML file.

---

## File locations

```
public/games/memorize/index.html   ← entire game (HTML + inline CSS + inline JS, ~2600 lines)
worker/GameServer.js               ← Cloudflare Durable Object: Pairs Battle WebSocket server
worker/index.js                    ← Cloudflare Worker entry point (routes /ws + static assets)
src/pages/HomePage.jsx             ← React home screen card (title "MemBrain", route id "memorize")
src/pages/GamePage.jsx             ← React wrapper that iframes the game
```

The game is served as a plain static file. The React wrapper just iframes it; there is no React code inside the game. To edit the game, edit only `public/games/memorize/index.html`.

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

WebSocket URL auto-detection (line ~2055 in index.html):
- `localhost` → `ws://localhost:8080`
- Production → `wss://<hostname>/ws`

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

## Architecture: four game modes

All modes live inside `public/games/memorize/index.html`. Screen routing uses `showScreen(id)` which sets `.active` on the target `<div class="screen">`.

Screen IDs:
```
screen-menu       Main menu (4 mode cards)
screen-word       Word Sequence (level select → memorize → recall → results)
screen-spot       Object Spotting (level select → round → results)
screen-pairs      Pairs Battle (lobby → game → results)
screen-math       Math Drills (level select → task → results)
```

---

## Mode 1 — Word Sequence

**Goal**: memorize a sequence of words flashed briefly, then recall them.

### Levels (12 total, defined in `WM_LEVELS` array, line ~770)

| Levels | Words | Flash time | Mechanic |
|--------|-------|-----------|---------|
| 1–6 | 3–10 | 3500–1900 ms | Click words from a pool |
| 7–12 | 4–10 | 3000–1400 ms | **Type** words from memory (no pool) |

Levels 7, 9, 11 have an `intro` banner for the mechanic change.

### Word banks (`WORD_BANKS`, line ~757)

8 categories: `animals`, `colors`, `food`, `nature`, `objects`, `space`, `music`, `body`. Each level uses a subset (`cats` array in its config). `wmStart()` de-duplicates with `new Set(...)`.

### Key functions

| Function | Line | Purpose |
|----------|------|---------|
| `showWordMenu()` | ~1313 | Level select + daily stats |
| `wmStart(lvIdx)` | ~1339 | Initializes round, calls countdown |
| `wmCountdown(done)` | ~1361 | 3·2·1·GO! animation with tones |
| `wmRunMemorize(idx, lv)` | ~1382 | Flashes each word with per-word tone |
| `wmShowRecall()` | ~1408 | Switches to pool-click or typed-input UI |
| `renderWmTypeRows()` | called by wmShowRecall | Renders one `<input>` per word; Enter advances |
| `wmSubmit()` | ~1488 | Scores recall, saves stats, shows results |
| `wmNextLevel()` | ~1571 | Advances to next level without going to menu |
| `setWordAlign(center)` | ~1312 | Sets `#screen-word` justify-content; call `false` for lists, `true` for flash phase |
| `wmLoadStats()` / `wmSaveStats()` | ~1574 | localStorage key: `membrain_word_v1` |
| `wmStreak(stats)` | ~1576 | Counts consecutive days with activity |
| `renderWmStats()` | ~1589 | 7-day bar chart + streak in level select |

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

| Function | Line | Purpose |
|----------|------|---------|
| `showSpotMenu()` | ~1615 | Level select |
| `spotStart(lvIdx)` | ~1630 | Initializes round |
| `spotRunRound()` | ~1639 | Shows grid, runs blackout, shows find phase |
| `spotStartBlackout(canvas, …)` | ~1703 | Covers grid for memorization period |
| `spotStartFind(canvas, …)` | ~1725 | Player clicks the changed object |
| `spotGuess(id)` | ~1762 | Checks guess, scores |

Uses the same `OBJECTS` array and `drawObject()` canvas function as Pairs Battle classic mode.

---

## Mode 3 — Pairs Battle (multiplayer)

**Goal**: flip card pairs faster than your opponent. Real-time 2-player via WebSocket.

### Client state (`pairsState`, line ~1818)

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
- `public/games/memorize/index.html` (line ~827) — array of `{id, name, kind, pool}`
- `worker/GameServer.js` (line ~7) — plain `{id: [tokens]}` object

14 collections: `classic` (canvas-drawn token IDs), then 13 emoji packs. `classic` pool has 24 tokens; `cats` has 16 (minimum for the 2x4 grid with 4 pairs). All others have 24.

If you add a collection, add it to **both files**. Run a Node.js cross-check if unsure:
```bash
node -e "
const a = require('./public/games/memorize/index.html'); // grep manually
const b = require('./worker/GameServer.js');              // then compare pools
"
```

### Canvas drawing

`drawObject(ctx, id, cx, cy, size)` — switch on `id` string, 24 objects. Called for `kind:'canvas'` cards.

Emoji cards rendered via:
```javascript
ctx.font = `${Math.floor(s*0.74)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
ctx.fillText(emoji, s/2, s*0.54); // 0.54 not 0.5 — compensates for emoji visual center
```

### Capacity-aware grid selector

`refreshGridOptions()` (line ~2040): disables grid sizes that need more pairs than the collection has tokens. If `selectedGrid` is disabled, it auto-snaps down.

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

### Levels (12 total, `MATH_LEVELS`, line ~2252)

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

### Expression builder (`mBuildExpr`, line ~2415 region)

- Left-to-right evaluation (no PEMDAS — result is `((a op b) op c)`)
- Division: `b` is chosen to divide `cur` evenly; result stays integer
- Subtraction: `b` capped at `cur` (never goes below 0), and if `cur < 1` the op flips to `+`
- Equation mode: picks a random operand position as X, generates the question from the filled-in result

### Key functions

| Function | Line | Purpose |
|----------|------|---------|
| `showMathMenu()` | ~2355 | Level select, op-preset grid, daily stats |
| `mathStartLevel(idx)` | ~2401 | Initializes round; falls back to `+-` if ops null |
| `mathNextTask()` | ~2415 | Generates task; choice or input mode |
| `mathAnswer(value, btnEl)` | ~2468 | Scores answer, advances |
| `mathKey(k)` | ~2496 | Keyboard input handler |
| `mathFinish()` | ~2515 | Round summary + daily stats update |
| `mathTodayKey()` | ~2539 | Returns `"YYYY-MM-DD"` for today |
| `mathDayKey(d)` | ~2540 | Same for any Date object (shared with Word mode) |
| `mathLoadStats()` / `mathSaveStats()` | ~2541 | localStorage key: `membrain_stats_v1` |
| `mathRecordSession(tasks, correct, score)` | ~2543 | Merges today's session into stats |
| `mathStreak(s)` | ~2549 | Day-streak count |

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
