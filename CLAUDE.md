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
