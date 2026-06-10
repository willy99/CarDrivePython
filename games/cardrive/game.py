import math
import random
import sys

import pygame

import storage

from constants import (
    SCREEN_W, SCREEN_H, FPS, TILE,
    CRASH_THRESH, GOAL_RADIUS,
    C_GRASS, C_ASPHALT, C_BLACK, C_PASSENGER, C_WHITE,
    SCORE_LEVEL_BASE, SCORE_TIME_PENALTY_MS,
    SCORE_VIOLATION, SCORE_TIME_SURPLUS, SCORE_CLEAN_BONUS,
    SCORE_FARE_BASE, SCORE_SMOOTH_BONUS,
    PICKUP_RADIUS, PICKUP_STOP_SPEED,
    SKID_MIN_SPEED, SKID_MAX_AGE, SKID_INTERVAL,
    MODE_TAXI,
    FUEL_DRAIN, FUEL_IDLE_DRAIN, FUEL_REFILL_RATE, GAS_RADIUS,
    RAIN_STEER_MULT, RAIN_FRICTION_MULT, RAIN_ACCEL_MULT,
    WINTER_STEER_MULT, WINTER_FRICTION_MULT, WINTER_ACCEL_MULT,
    MODE_CHASE,
    HONK_RADIUS, HONK_NUDGE, HONK_NUDGE_FRAMES, HONK_COOLDOWN,
    SCORE_SPEEDING, CAMERA_LIMIT_FRAC, CAMERA_RADIUS, CAMERA_COOLDOWN,
    CAMERA_FLASH_FRAMES,
    DAMAGE_PER_CRASH, DAMAGE_FATAL,
    SHAKE_DURATION, SHAKE_MAGNITUDE,
    S_WAITING, S_RACING, S_FINISHED, S_GAME_OVER, S_GAME_WON,
    # New features
    DRIFT_THRESHOLD, DRIFT_MIN_FRAMES, DRIFT_SCORE_PER_S,
    DRIFT_CRASH_PEN, DRIFT_COMBO_MULT,
    NEAR_MISS_RADIUS, NEAR_MISS_BONUS, NEAR_MISS_PENALTY, NEAR_MISS_SPD_MIN,
    TRAFFIC_WAVE_PERIOD, TRAFFIC_WAVE_AMP,
    ROADBLOCK_SPAWN_DELAY, ROADBLOCK_COOLDOWN, ROADBLOCK_AHEAD_TILES, ROADBLOCK_LIFETIME,
    POTHOLE_KICK, PUDDLE_KICK, HAZARD_COOLDOWN,
    ONE_WAY_VIOLATION_F,
    NPC_W, NPC_H,
    MODE_DELIVERY, SCORE_DELIVERY_BASE,
)
from level_config import LEVELS, level_by_passcode
from screens import ScreenRenderer, FLAG_RECT, draw_flag
import i18n
from i18n import t
from car import Car
from car_types import CARS
from npc_car import NPCCar
from police_car import PoliceCar
from game_map import GameMap
from pedestrian import Pedestrian, TaxiPassenger
from hud import HUD
from mini_map import MiniMap
from effects import NightOverlay, Rain, Snow, ImpactBurst, Fireworks
from sounds import SoundFX
from traffic_ai import BRAIN, bucket
from utils import sat_overlap, rect_poly

# SkidMark: (world_x, world_y, angle_deg, age_frames)
_SkidMark = tuple[float, float, float, int]

from utils import polygon_corners as _poly_corners, sat_overlap as _sat


class _Roadblock:
    """A row of static police cars blocking a corridor with one narrow gap.

    Placed in MODE_CHASE after ROADBLOCK_SPAWN_DELAY seconds.
    """
    W, H = NPC_W + 4, NPC_H + 2

    def __init__(self, positions: list[tuple[float, float]], angle: float):
        self.positions = positions   # (wx, wy) for each blocking car
        self.angle = angle
        self.age = 0

    def update(self):
        self.age += 1

    @property
    def done(self) -> bool:
        return self.age > ROADBLOCK_LIFETIME

    def collides_with(self, car) -> bool:
        cpts = car.corners()
        for wx, wy in self.positions:
            if _sat(cpts, _poly_corners(wx, wy, self.W, self.H, self.angle)):
                return True
        return False

    def draw(self, surf, cam_x: float, cam_y: float, tick: int):
        for wx, wy in self.positions:
            sx, sy = wx - cam_x, wy - cam_y
            if not (-60 < sx < SCREEN_W + 60 and -60 < sy < SCREEN_H + 60):
                continue
            ix, iy = int(sx), int(sy)
            rad = math.radians(self.angle)
            cos_a, sin_a = math.cos(rad), math.sin(rad)

            def l2s(lx, ly):
                return (ix + lx * cos_a - ly * sin_a,
                        iy + lx * sin_a + ly * cos_a)

            hw, hh = self.W / 2, self.H / 2
            body = [l2s(-hw, -hh), l2s(hw, -hh), l2s(hw, hh), l2s(-hw, hh)]
            # Navy blue police body
            pygame.draw.polygon(surf, (30, 40, 130), body)
            pygame.draw.polygon(surf, (255, 255, 255), body, 1)
            # Flashing light bar (alternating red/blue every 15 frames)
            flash_col = (220, 30, 30) if (tick // 15) % 2 == 0 else (30, 100, 220)
            top = l2s(-hw * 0.3, 0)
            pygame.draw.circle(surf, flash_col, (int(top[0]), int(top[1])), 4)


class Game:
    """
    Top-level game object: owns the window, map, all entities, and race state.

    States
    ------
    S_WAITING   – waiting for player to press UP
    S_RACING    – timer running
    S_FINISHED  – reached goal B  (SPACE → next level, R → retry)
    S_GAME_OVER – hit pedestrian or countdown expired  (R → restart level 1)
    """

    def __init__(self):
        pygame.init()
        pygame.font.init()
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
        pygame.display.set_caption("CarDrive")
        self.clock = pygame.time.Clock()

        font       = pygame.font.Font(None, 22)
        big_font   = pygame.font.Font(None, 54)
        title_font = pygame.font.Font(None, 90)
        self.hud     = HUD(font, big_font)
        self.screens = ScreenRenderer(font, big_font, title_font)
        self.sfx     = SoundFX()

        self.level_idx   = 0
        self.total_score = 0
        self.best_ms: int | None = None

        self._notifications: list[tuple[str, tuple, int]] = []
        self._gameover_reason = ""

        # Front-end flow: 'home' -> 'garage' -> 'intro' -> 'play'
        self.screen_mode = "home"
        self.code_input  = ""
        self.code_msg    = ""
        self._pending_level = 0     # where to go after the garage

        # Player-as-teacher bookkeeping
        self._ptile = None
        self._pdir  = (0, 0)

        # Cheats — type GODMODE during play to toggle god mode
        self.god_mode   = False
        self._cheat_buf = ""

        # Persistent save data (loaded once; re-saved on level completion)
        self._save_data = storage.load()
        i18n.set_lang(self._save_data.get("lang", "en"))
        self.car_idx = self._save_data.get("car", 0)

        # Level map
        self._levelmap_idx        = 0          # currently highlighted cell
        self._levelmap_msg        = ""         # transient notification text
        self._levelmap_arrowrects = (None, None)  # (prev, next) from last draw

        # Garage
        self._garage_msg = ""

    # ------------------------------------------------------------------
    # Level management
    # ------------------------------------------------------------------

    def _init_level(self):
        cfg = LEVELS[self.level_idx]
        self.game_map    = GameMap(cfg)
        self.car         = Car(*self.game_map.start_pos, CARS[self.car_idx])
        self.npcs        = [NPCCar(self.game_map) for _ in range(cfg.npc_count)]
        self.pedestrians = self._spawn_all_pedestrians(cfg.peds_per_light)

        self.state         = S_WAITING
        self.race_start    = 0
        self.race_ms       = 0
        self.violations    = 0
        self.level_crashes = 0
        self.level_speeding = 0
        self.level_honks    = 0
        self._frame        = 0

        # Camera shake
        self._shake_timer = 0
        self._shake_mag   = 0.0

        # --- objective tracking (race = 1 goal, taxi = pickup then dropoff) ---
        self.mode          = cfg.mode
        self.objectives    = self.game_map.objectives
        self.obj_idx       = 0
        self.has_passenger = False

        # Taxi fare waiting on the pavement at the pickup point
        self.passenger = None
        if self.mode == MODE_TAXI and self.game_map.pickup_pos is not None:
            sx, sy = self._pickup_stand_spot(self.game_map.pickup_pos)
            self.passenger = TaxiPassenger(sx, sy)

        # --- fuel ---
        self.fuel     = cfg.fuel
        self.max_fuel = cfg.fuel

        # --- weather / time-of-day effects ---
        self.night = NightOverlay() if cfg.night else None
        self.rain  = Rain()         if cfg.rain  else None
        self.snow  = Snow()         if getattr(cfg, "winter", False) else None
        # Winter takes precedence over rain (you don't get both at once)
        if getattr(cfg, "winter", False):
            self.car.set_winter(WINTER_STEER_MULT, WINTER_FRICTION_MULT,
                                WINTER_ACCEL_MULT)
        elif cfg.rain:
            self.car.set_wet(RAIN_STEER_MULT, RAIN_FRICTION_MULT, RAIN_ACCEL_MULT)

        self.skid_marks: list[_SkidMark] = []
        self.impact = None          # ImpactBurst when a pedestrian is hit
        self.fireworks = None       # Fireworks on the victory screen
        self.mini_map = MiniMap(self.game_map)
        self._ptile = None
        self._pdir  = (0, 0)

        # Police chase
        self.police: list[PoliceCar] = []
        if cfg.police_count > 0:
            # Spawn far from the player's start
            tiles = sorted(self.game_map.road_tiles(),
                           key=lambda t: -((t[0] * TILE - self.car.x) ** 2 +
                                            (t[1] * TILE - self.car.y) ** 2))
            for sp in tiles[: cfg.police_count]:
                self.police.append(PoliceCar(self.game_map, sp, car=self.car))

        # Honk + camera flash + pause state
        self._honk_cd        = 0       # frames until honk available again
        self._honk_active    = 0       # frames remaining of the nudge effect
        self._camera_flash   = 0       # frames remaining of screen-flash
        self.paused          = False
        self._pause_start_ms = 0

        # Drifting skill system
        self._drift_frames   = 0       # consecutive drifting frames
        self._drift_combo    = 0       # number of consecutive scored drifts
        self._drift_idle     = 0       # frames since last drift
        self._was_drifting   = False

        # Green-light streak bonus
        self._green_streak   = 0       # consecutive green-light passes

        # Delivery Blitz progress
        self._deliveries_done = 0

        # Dynamic traffic density
        self._traffic_check_frame = 0

        # Roadblocks (chase mode)
        self.roadblocks: list[_Roadblock] = []
        self._roadblock_cd   = int(ROADBLOCK_SPAWN_DELAY * FPS)

        # Wrong-way tracking
        self._wrong_way_frames = 0

        self._notifications.clear()
        self._gameover_reason = ""

        self.cam_x = float(self.car.x - SCREEN_W // 2)
        self.cam_y = float(self.car.y - SCREEN_H // 2)

    @property
    def target_pos(self):
        """World position of the current objective, or None when done."""
        if 0 <= self.obj_idx < len(self.objectives):
            return self.objectives[self.obj_idx][0]
        return None

    def _pickup_stand_spot(self, pos):
        """A kerb-side spot near the pickup room where the fare waits."""
        gm = self.game_map
        cx, cy = int(pos[0]) // TILE, int(pos[1]) // TILE

        def is_road(tx, ty):
            return (0 <= tx < gm.map_w_tiles and 0 <= ty < gm.map_h_tiles
                    and gm.grid[ty][tx] == 0)

        best = None
        for ty in range(cy - 2, cy + 3):
            for tx in range(cx - 2, cx + 3):
                if not is_road(tx, ty):
                    continue
                for ddx, ddy in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                    if not is_road(tx + ddx, ty + ddy):     # block neighbour = kerb
                        wx = tx * TILE + TILE // 2 + ddx * (TILE * 0.30)
                        wy = ty * TILE + TILE // 2 + ddy * (TILE * 0.30)
                        d = abs(tx - cx) + abs(ty - cy)
                        if best is None or d < best[0]:
                            best = (d, wx, wy)
        if best:
            return best[1], best[2]
        return pos[0], pos[1] + TILE * 0.30

    def _spawn_all_pedestrians(self, peds_per_light: int) -> list[Pedestrian]:
        peds = []
        for light in self.game_map.traffic_lights:
            peds.extend(self._spawn_peds_for_light(light, peds_per_light))
        return peds

    @staticmethod
    def _spawn_peds_for_light(light, n: int) -> list[Pedestrian]:
        """
        Spawn *n* pedestrians side-by-side on the crosswalk.

        They are evenly spaced perpendicular to the walk direction so they
        form parallel zebra stripes.
        """
        sx0, sy0 = light.walk_start
        ex0, ey0 = light.walk_end
        ddx, ddy = ex0 - sx0, ey0 - sy0
        total = math.hypot(ddx, ddy)
        if total < 1:
            return []

        # Unit vector perpendicular to the walk direction
        px, py = -ddy / total, ddx / total

        spacing = 22  # pixels between side-by-side pedestrians
        offsets = [(i - (n - 1) / 2) * spacing for i in range(n)]

        return [
            Pedestrian(
                light,
                (sx0 + px * off, sy0 + py * off),
                (ex0 + px * off, ey0 + py * off),
            )
            for off in offsets
        ]

    def _award_level_score(self):
        """Tally the score for the level just completed (called once)."""
        cfg = LEVELS[self.level_idx]
        tick = pygame.time.get_ticks()

        time_pen = self.race_ms // SCORE_TIME_PENALTY_MS
        viol_pen = self.violations * SCORE_VIOLATION
        surplus  = 0
        if cfg.countdown_s is not None:
            remaining_ms = max(0, cfg.countdown_s * 1000 - self.race_ms)
            surplus = (remaining_ms // 1000) * SCORE_TIME_SURPLUS

        if self.mode == MODE_TAXI:
            base = SCORE_FARE_BASE
        elif self.mode == MODE_DELIVERY:
            base = 0        # per-delivery bonuses already added during play
        else:
            base = SCORE_LEVEL_BASE
        level_score = max(0, base - time_pen - viol_pen + surplus)

        smooth_ride = (self.mode == MODE_TAXI and self.level_crashes == 0)
        if self.violations == 0:
            level_score += SCORE_CLEAN_BONUS
            self._notifications.append(
                (t("note.clean", n=SCORE_CLEAN_BONUS), (80, 220, 80), tick + 3000))
        if smooth_ride:
            level_score += SCORE_SMOOTH_BONUS
            self._notifications.append(
                (t("note.smooth", n=SCORE_SMOOTH_BONUS), (250, 220, 90), tick + 3000))

        self.total_score += level_score
        if self.best_ms is None or self.race_ms < self.best_ms:
            self.best_ms = self.race_ms

        # Persist progress to localStorage / JSON
        sd = self._save_data
        key = str(self.level_idx)
        if key not in sd["best"] or self.race_ms < sd["best"][key]:
            sd["best"][key] = self.race_ms
        if self.level_idx not in sd["done"]:
            sd["done"].append(self.level_idx)
        sd["stats"]["levels"]    += 1
        sd["stats"]["violations"] += self.violations
        sd["stats"]["crashes"]    += self.level_crashes
        sd["stats"]["speeding"]   += self.level_speeding
        sd["stats"]["honks"]      += self.level_honks
        if self.violations == 0:
            sd["stats"]["clean"] += 1
        if smooth_ride:
            sd["stats"]["smooth"] = sd["stats"].get("smooth", 0) + 1
        sd["car"]  = self.car_idx
        sd["lang"] = i18n.get_lang()
        storage.save(sd)

        self._check_car_unlocks(tick)

    def _check_car_unlocks(self, tick: int):
        """Fire notifications for any cars that just became available."""
        done_count = storage.count_done(self._save_data)
        for ct in CARS:
            if ct.unlock_req == 0:
                continue
            if done_count == ct.unlock_req:
                self._notifications.append(
                    (t("note.car_unlocked", name=ct.name),
                     (255, 215, 60), tick + 5000))

    def _next_level(self):
        self._award_level_score()
        nxt = min(self.level_idx + 1, len(LEVELS) - 1)
        self._goto_intro(nxt)

    def _goto_intro(self, idx: int):
        """Build level `idx` and show its intro screen."""
        self.level_idx = idx
        self._init_level()
        self.screen_mode = "intro"

    def _start_play(self):
        self.screen_mode = "play"

    def _restart_from_level1(self):
        self.total_score = 0
        self.best_ms     = None
        self._goto_intro(0)

    def _retry_level(self):
        # Quick retry: straight back into play, no intro screen
        self._init_level()
        self.screen_mode = "play"

    def _go_home(self):
        self.screen_mode  = "home"
        self.code_input   = ""
        self.code_msg     = ""
        self.god_mode     = False        # cheats reset on returning to menu
        self._cheat_buf   = ""

    def _goto_levelmap(self):
        self.screen_mode   = "levelmap"
        self._levelmap_msg = ""

    def _toggle_god_mode(self):
        self.god_mode = not self.god_mode
        self.sfx.play("tick")
        msg = t("note.god_on") if self.god_mode else t("note.god_off")
        col = (255, 220, 60) if self.god_mode else (180, 180, 195)
        self._notifications.append(
            (msg, col, pygame.time.get_ticks() + 3500))

    # ------------------------------------------------------------------
    # Pause / Honk
    # ------------------------------------------------------------------

    def _toggle_pause(self, tick: int):
        if not self.paused:
            self.paused = True
            self._pause_start_ms = tick
        else:
            # Slide the race start forward by however long we were paused, so
            # the timer / countdown / fuel are unaffected by the break.
            paused_for = tick - self._pause_start_ms
            self.race_start += paused_for
            self.paused = False

    def _honk(self):
        self.sfx.play("honk")
        self._honk_cd = HONK_COOLDOWN
        self._honk_active = HONK_NUDGE_FRAMES
        self.level_honks += 1
        self._notifications.append(
            (t("note.beep"), (255, 235, 80), pygame.time.get_ticks() + 800))

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def tick(self):
        """Advance one frame.  Called by both run() and the async web loop."""
        t = pygame.time.get_ticks()
        if self.screen_mode == "home":
            self._tick_home(t)
        elif self.screen_mode == "garage":
            self._tick_garage(t)
        elif self.screen_mode == "intro":
            self._tick_intro(t)
        elif self.screen_mode == "levelmap":
            self._tick_levelmap(t)
        else:
            self._handle_events(t)
            if self.paused:
                # Render the world frozen + the pause overlay
                self._draw(t)
                self.hud.draw_pause(self.screen, t)
                pygame.display.flip()
            else:
                keys = pygame.key.get_pressed()
                self._update(keys, t)
                self._draw(t)
        self.clock.tick(FPS)

    def run(self):
        """Blocking desktop loop."""
        while True:
            self.tick()

    # ------------------------------------------------------------------
    # Home & intro screens
    # ------------------------------------------------------------------

    def _flag_event(self, event, allow_key=True) -> bool:
        """Toggle language on a click of the flag (or the L key). Returns True
        if it handled the event."""
        if event.type == pygame.MOUSEBUTTONDOWN and getattr(event, "button", 1) == 1:
            if FLAG_RECT.collidepoint(event.pos):
                i18n.toggle_lang()
                return True
        if allow_key and event.type == pygame.KEYDOWN and event.key == pygame.K_l:
            i18n.toggle_lang()
            return True
        return False

    def _tick_home(self, t: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            # Flag toggles language (mouse only on home — L is a code letter)
            if self._flag_event(event, allow_key=False):
                self._save_data["lang"] = i18n.get_lang()
                storage.save(self._save_data)
                continue
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.code_input = ""
                    self.code_msg = ""
                elif event.key == pygame.K_TAB:
                    self._goto_levelmap()
                elif event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                    self._submit_code()
                elif event.key == pygame.K_BACKSPACE:
                    self.code_input = self.code_input[:-1]
                    self.code_msg = ""
                elif event.unicode and event.unicode.isalnum() and len(self.code_input) < 6:
                    self.code_input += event.unicode.upper()
                    self.code_msg = ""
        self.screens.draw_home(self.screen, t, self.code_input, self.code_msg)
        pygame.display.flip()

    def _submit_code(self):
        if not self.code_input:
            self._goto_garage(0)            # fresh game at level 1
            return
        idx = level_by_passcode(self.code_input)
        if idx is None:
            self.code_msg = t("home.code_bad", code=self.code_input)
        else:
            self._goto_garage(idx)

    def _goto_garage(self, level_idx: int):
        self.total_score = 0
        self.best_ms = None
        self._pending_level = level_idx
        self.screen_mode = "garage"
        self._garage_msg = ""

    def _tick_garage(self, t: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if self._flag_event(event):
                self._save_data["lang"] = i18n.get_lang()
                storage.save(self._save_data)
                continue
            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_h):
                    self._go_home()
                elif event.key in (pygame.K_LEFT, pygame.K_UP):
                    self.car_idx = (self.car_idx - 1) % len(CARS)
                    self._garage_msg = ""
                elif event.key in (pygame.K_RIGHT, pygame.K_DOWN):
                    self.car_idx = (self.car_idx + 1) % len(CARS)
                    self._garage_msg = ""
                elif event.key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_KP_ENTER):
                    if storage.is_car_unlocked(self._save_data, self.car_idx, CARS):
                        self._goto_intro(self._pending_level)
                    else:
                        self._garage_msg = i18n.t("garage.locked_hint")
        self.screens.draw_garage(self.screen, t, self.car_idx, self._save_data,
                                 self._garage_msg)
        pygame.display.flip()

    def _tick_intro(self, t: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if self._flag_event(event):
                continue
            if event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_h):
                    self._go_home()
                elif event.key in (pygame.K_SPACE, pygame.K_RETURN,
                                   pygame.K_KP_ENTER, pygame.K_UP):
                    self._start_play()
        self.screens.draw_intro(self.screen, LEVELS[self.level_idx], t)
        pygame.display.flip()

    def _tick_levelmap(self, t: int):
        done_set = set(self._save_data.get("done", []))
        n   = len(LEVELS)
        PPP = 30        # levels per page (must match screens.py COLS × ROWS_PP)

        def _page_of(idx):
            return idx // PPP

        prev_rect, next_rect = self._levelmap_arrowrects

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if self._flag_event(event):
                self._save_data["lang"] = i18n.get_lang()
                storage.save(self._save_data)
                continue
            if event.type == pygame.KEYDOWN:
                key = event.key
                if key in (pygame.K_ESCAPE, pygame.K_h):
                    self._go_home()
                elif key == pygame.K_LEFT:
                    self._levelmap_idx = (self._levelmap_idx - 1) % n
                    self._levelmap_msg = ""
                elif key == pygame.K_RIGHT:
                    self._levelmap_idx = (self._levelmap_idx + 1) % n
                    self._levelmap_msg = ""
                elif key == pygame.K_UP:
                    self._levelmap_idx = (self._levelmap_idx - 6) % n
                    self._levelmap_msg = ""
                elif key == pygame.K_DOWN:
                    self._levelmap_idx = (self._levelmap_idx + 6) % n
                    self._levelmap_msg = ""
                elif key == pygame.K_PAGEUP:
                    pg = _page_of(self._levelmap_idx)
                    self._levelmap_idx = max(0, (pg - 1) * PPP)
                    self._levelmap_msg = ""
                elif key == pygame.K_PAGEDOWN:
                    pg = _page_of(self._levelmap_idx)
                    self._levelmap_idx = min(n - 1, (pg + 1) * PPP)
                    self._levelmap_msg = ""
                elif key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE):
                    idx = self._levelmap_idx
                    if idx in done_set:
                        self._goto_garage(idx)
                    else:
                        self._levelmap_msg = i18n.t("levelmap.locked_msg")
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                pg = _page_of(self._levelmap_idx)
                if prev_rect and prev_rect.collidepoint(mx, my):
                    self._levelmap_idx = max(0, (pg - 1) * PPP)
                    self._levelmap_msg = ""
                elif next_rect and next_rect.collidepoint(mx, my):
                    self._levelmap_idx = min(n - 1, (pg + 1) * PPP)
                    self._levelmap_msg = ""

        self._levelmap_arrowrects = self.screens.draw_levelmap(
            self.screen, LEVELS, done_set,
            self._save_data.get("best", {}),
            self._levelmap_idx, self._levelmap_msg, t)
        pygame.display.flip()

    # ------------------------------------------------------------------
    # Per-frame update
    # ------------------------------------------------------------------

    def _update(self, keys, tick: int):
        cfg = LEVELS[self.level_idx]
        self._frame += 1

        # Impact animation keeps playing even after game over
        if self.impact:
            self.impact.update()

        # Start the clock on ANY drive input (forward OR reverse) so the
        # timer and fuel can't be dodged by reversing.
        if self.state == S_WAITING and (keys[pygame.K_UP] or keys[pygame.K_DOWN]):
            self.state      = S_RACING
            self.race_start = tick

        if self.state == S_RACING:
            self.race_ms = tick - self.race_start

        # Countdown expiry (skipped in god mode)
        if (self.state == S_RACING
                and cfg.countdown_s is not None
                and not self.god_mode
                and self.race_ms >= cfg.countdown_s * 1000):
            self._trigger_game_over(t("reason.time"))
            return

        # Weather animation
        if self.rain:
            self.rain.update()
        if self.snow:
            self.snow.update()

        # Traffic lights + pedestrians
        for light in self.game_map.traffic_lights:
            light.update()
        for ped in self.pedestrians:
            ped.update()

        for npc in self.npcs:
            npc.update(self.pedestrians, self.npcs)
            if npc.idle > 300 and math.hypot(npc.x - self.car.x,
                                             npc.y - self.car.y) > SCREEN_W:
                npc.respawn()

        # Honk effect: nudge NPCs near the player to the side for a moment
        if self._honk_active > 0:
            self._honk_active -= 1
            for n in self.npcs:
                if math.hypot(n.x - self.car.x, n.y - self.car.y) < HONK_RADIUS:
                    # Push laterally away from the player's heading
                    rad = math.radians(self.car.angle)
                    perp_x, perp_y = -math.sin(rad), math.cos(rad)
                    side = 1 if (n.x - self.car.x) * perp_x + (n.y - self.car.y) * perp_y >= 0 else -1
                    nx = n.x + perp_x * HONK_NUDGE * 0.25 * side
                    ny = n.y + perp_y * HONK_NUDGE * 0.25 * side
                    if self.game_map.is_road(nx, ny):
                        n.x, n.y = nx, ny
        if self._honk_cd > 0:
            self._honk_cd -= 1

        # Police cars (chase mode)
        for cop in self.police:
            cop.update(self.car)

        if self.fireworks is not None:
            self.fireworks.update()

        old_x, old_y = self.car.x, self.car.y
        if self.state not in (S_FINISHED, S_GAME_OVER, S_GAME_WON):
            self.car.update(keys)

        self._resolve_collisions(old_x, old_y)

        if self.state == S_RACING:
            self._check_red_light(old_x, old_y)
            self._check_speed_cameras(tick)
            self._check_police_catch()
            self._teach_from_player()

        self._check_pedestrian_collision()
        self._check_goal()
        # Taxi boarding animation
        if self.passenger is not None and self.passenger.state != "aboard":
            if self.passenger.update(self.car):
                self._advance_after_boarding()
        self._update_fuel()
        self._clamp_car()
        self._update_camera()

        # Skid marks
        self._update_skid_marks(keys)

        # ---- New feature updates ----
        if self.state == S_RACING:
            self._update_drift(tick)
            self._update_traffic_density(tick)
            self._check_road_hazards(tick)
            self._check_wrong_way(tick)
            self._update_roadblocks(old_x, old_y, tick)

        # Prune expired notifications
        self._notifications = [n for n in self._notifications if n[2] > tick]

    def _handle_events(self, tick: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if self._flag_event(event, allow_key=False):   # click flag → lang
                continue
            if event.type != pygame.KEYDOWN:
                continue
            key = event.key

            # Cheat code: a rolling buffer of letters → GODMODE toggles God mode
            if event.unicode and event.unicode.isalpha():
                code = "godmode"
                self._cheat_buf = (self._cheat_buf + event.unicode.lower())[-len(code):]
                if self._cheat_buf == code:
                    self._cheat_buf = ""
                    self._toggle_god_mode()

            # ESC → menu (NOT quit: sys.exit() hangs the browser canvas)
            if key == pygame.K_ESCAPE:
                self._go_home()
                continue

            # Victory screen: any of these → menu
            if self.state == S_GAME_WON:
                if key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_r, pygame.K_h):
                    self._go_home()
                continue

            # P: toggle pause (only during a live race)
            if key == pygame.K_p and self.state == S_RACING:
                self._toggle_pause(tick)
                continue

            if key == pygame.K_r:
                if self.state == S_GAME_OVER:
                    self._go_home()          # game over is final → back to menu
                else:
                    self._retry_level()      # quick restart of the attempt
            if key == pygame.K_SPACE and self.state == S_FINISHED:
                self._next_level()           # → next level's intro
            # H: honk during play, but on end screens H still → home
            if key == pygame.K_h:
                if self.state in (S_FINISHED, S_GAME_OVER):
                    self._go_home()
                elif self.state == S_RACING and self._honk_cd <= 0:
                    self._honk()

    # ------------------------------------------------------------------
    # Collision resolution
    # ------------------------------------------------------------------

    def _resolve_collisions(self, old_x: float, old_y: float):
        car = self.car
        if car.crashed or self.state in (S_FINISHED, S_GAME_OVER, S_GAME_WON):
            return
        car_pts = car.corners()
        car_box = car.aabb()
        if self._check_house_collision(car, car_pts, car_box, old_x, old_y):
            return
        if self._check_npc_collision(car, car_pts, car_box, old_x, old_y):
            return
        self._check_offroad_collision(car, old_x, old_y)

    def _check_house_collision(self, car, pts, box, ox, oy) -> bool:
        for house in self.game_map.houses:
            if box.colliderect(house.inflate(8, 8)) and sat_overlap(pts, rect_poly(house)):
                self._apply_collision(car, ox, oy, -0.35)
                return True
        return False

    def _check_npc_collision(self, car, pts, box, ox, oy) -> bool:
        for npc in self.npcs:
            if box.colliderect(npc.aabb().inflate(6, 6)) and sat_overlap(pts, npc.corners()):
                self._apply_collision(car, ox, oy, -0.35)
                return True
        return False

    def _check_offroad_collision(self, car, ox, oy):
        if car.off_road_count(self.game_map) >= 3:
            self._apply_collision(car, ox, oy, -0.2)

    def _apply_collision(self, car, ox, oy, bounce: float):
        if abs(car.speed) >= CRASH_THRESH:
            # God mode: bounce off instead of crashing
            if self.god_mode:
                car.x, car.y = ox, oy
                car.speed *= bounce
                return
            if not car.crashed:
                self.level_crashes += 1
                self.sfx.play("crash")
                car.add_damage(DAMAGE_PER_CRASH)
                # Trigger camera shake — stronger the harder the hit
                speed_frac = min(1.0, abs(car.speed) / car.max_speed)
                self._shake_timer = SHAKE_DURATION
                self._shake_mag   = SHAKE_MAGNITUDE * (0.5 + 0.5 * speed_frac)
                if car.damage >= DAMAGE_FATAL:
                    self._trigger_game_over(t("reason.totalled"))
                    return
            car.crash()
        else:
            car.x, car.y = ox, oy
            car.speed *= bounce

    # ------------------------------------------------------------------
    # Red-light violation
    # ------------------------------------------------------------------

    def _check_red_light(self, old_x: float, old_y: float):
        if self.god_mode:
            return
        old_tx = int(old_x) // TILE
        old_ty = int(old_y) // TILE
        new_tx = int(self.car.x) // TILE
        new_ty = int(self.car.y) // TILE
        if (old_tx, old_ty) == (new_tx, new_ty):
            return

        new_key = (new_tx, new_ty)
        old_key = (old_tx, old_ty)
        tile_map = self.game_map.tile_to_light

        if new_key not in tile_map:
            return
        light = tile_map[new_key]
        if tile_map.get(old_key) is light:
            return          # still inside the same light zone, not a new entry

        tick = pygame.time.get_ticks()
        if light.is_red:
            # Violation
            self.violations  += 1
            self.total_score  = max(0, self.total_score - SCORE_VIOLATION)
            self._notifications.append(
                (t("note.redlight", n=SCORE_VIOLATION), (255, 80, 80), tick + 2000))
            self._check_near_miss(tick)
            self._green_streak = 0   # break the streak
        else:
            # Green or yellow — count the streak
            self._green_streak += 1
            if self._green_streak >= 2:
                bonus = 15 * self._green_streak   # ×2=30, ×3=45, ×4=60 …
                self.total_score += bonus
                self._notifications.append(
                    (t("note.green_streak", n=self._green_streak, b=bonus),
                     (60, 220, 100), tick + 1800))

    # ------------------------------------------------------------------
    # Speed cameras
    # ------------------------------------------------------------------

    def _check_speed_cameras(self, tick: int):
        if self.god_mode or not self.game_map.cameras:
            return
        car = self.car
        limit = car.max_speed * CAMERA_LIMIT_FRAC
        if abs(car.speed) < limit:
            return
        for cam in self.game_map.cameras:
            if tick < cam[2]:                 # still on cooldown
                continue
            if math.hypot(car.x - cam[0], car.y - cam[1]) < CAMERA_RADIUS:
                cam[2] = tick + CAMERA_COOLDOWN * (1000 // 60)
                self.total_score = max(0, self.total_score - SCORE_SPEEDING)
                self._camera_flash = CAMERA_FLASH_FRAMES
                self.level_speeding += 1
                self.sfx.play("flash")
                self._notifications.append(
                    (t("note.camera", n=SCORE_SPEEDING),
                     (255, 240, 120), tick + 2200))
                break

    # ------------------------------------------------------------------
    # Police chase: caught?
    # ------------------------------------------------------------------

    def _check_police_catch(self):
        if self.god_mode:
            return
        for cop in self.police:
            if cop.caught(self.car):
                self.car.speed = 0.0
                self.sfx.play("crash")
                self._trigger_game_over(t("reason.police"))
                return

    # ------------------------------------------------------------------
    # Teach the shared traffic brain from the player's good driving
    # ------------------------------------------------------------------

    def _open_space_at(self, tx, ty, ddx, ddy, limit=6):
        gm = self.game_map
        n, x, y = 0, tx, ty
        for _ in range(limit):
            x += ddx; y += ddy
            if 0 <= x < gm.map_w_tiles and 0 <= y < gm.map_h_tiles \
                    and gm.grid[y][x] == 0:
                n += 1
            else:
                break
        return n

    def _teach_from_player(self):
        """When the player drives through traffic, feed it as a demonstration."""
        gm = self.game_map
        tx, ty = int(self.car.x) // TILE, int(self.car.y) // TILE
        cur = (tx, ty)
        if cur == self._ptile:
            return
        prev = self._ptile
        self._ptile = cur
        if prev is None:
            return
        mdx, mdy = tx - prev[0], ty - prev[1]
        if abs(mdx) + abs(mdy) != 1:        # only clean single-tile steps
            self._pdir = (mdx, mdy)
            return
        gdx, gdy = self._pdir if self._pdir != (0, 0) else (mdx, mdy)
        self._pdir = (mdx, mdy)

        # Only teach when there is real traffic nearby (a genuine lesson)
        near = any(abs(n.x - self.car.x) < TILE * 2.5
                   and abs(n.y - self.car.y) < TILE * 2.5 for n in self.npcs)
        if not near:
            return

        # Encode the same state/action space the NPCs use
        dirs = [(gdx, gdy), (gdy, -gdx), (-gdy, gdx), (-gdx, -gdy)]
        action = next((i for i, d in enumerate(dirs) if d == (mdx, mdy)), None)
        if action is None:
            return
        px, py = prev
        fwd_open  = 1 if self._open_space_at(px, py, *dirs[0], 1) else 0
        left_sp   = bucket(self._open_space_at(px, py, *dirs[1]))
        right_sp  = bucket(self._open_space_at(px, py, *dirs[2]))
        back_open = 1 if self._open_space_at(px, py, *dirs[3], 1) else 0
        state = (fwd_open, left_sp, right_sp, back_open, 0)
        BRAIN.demonstrate(state, action)

    # ------------------------------------------------------------------
    # Pedestrian collision (any speed = game over)
    # ------------------------------------------------------------------

    def _check_pedestrian_collision(self):
        if self.state in (S_FINISHED, S_GAME_OVER, S_GAME_WON):
            return
        if self.god_mode:
            return
        # Oriented-box vs point (with the pedestrian's radius as padding):
        # transform each pedestrian into the car's local frame.
        rad = math.radians(self.car.angle)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        hw = self.car.W / 2 + Pedestrian.RADIUS
        hh = self.car.H / 2 + Pedestrian.RADIUS
        for ped in self.pedestrians:
            dx = ped.x - self.car.x
            dy = ped.y - self.car.y
            lx = dx * cos_a + dy * sin_a
            ly = -dx * sin_a + dy * cos_a
            if abs(lx) <= hw and abs(ly) <= hh:
                self.impact = ImpactBurst(ped.x, ped.y)
                self.car.speed = 0.0
                self.sfx.play("crash")
                self._trigger_game_over(t("reason.pedestrian"))
                return

    # ------------------------------------------------------------------
    # Near-miss / red-light threading bonus
    # ------------------------------------------------------------------

    def _check_near_miss(self, tick: int):
        """Called when the player runs a red light — score the pass quality."""
        if not self.pedestrians:
            return
        closest = min(
            math.hypot(self.car.x - p.x, self.car.y - p.y)
            for p in self.pedestrians
        )
        if closest > NEAR_MISS_RADIUS:
            return          # no pedestrians nearby at all
        speed = abs(self.car.speed)
        tight = closest < NEAR_MISS_RADIUS * 0.6
        # Professional: high speed, tight gap
        if speed >= NEAR_MISS_SPD_MIN and tight:
            bonus = int(NEAR_MISS_BONUS * min(1.0, speed / self.car.max_speed))
            self.total_score += bonus
            self._notifications.append(
                (t("note.near_miss_pro", n=bonus), (100, 220, 255), tick + 2200))
        # Clumsy: slow-crawl scare
        elif speed < NEAR_MISS_SPD_MIN * 0.55 and closest < NEAR_MISS_RADIUS * 0.45:
            self.total_score = max(0, self.total_score - NEAR_MISS_PENALTY)
            self._notifications.append(
                (t("note.near_miss_ugly", n=NEAR_MISS_PENALTY), (255, 140, 50), tick + 2000))

    # ------------------------------------------------------------------
    # Drifting skill system
    # ------------------------------------------------------------------

    def _update_drift(self, tick: int):
        """Track sustained lateral slides and award / penalise accordingly."""
        currently = (
            abs(self.car.lat_vel) > DRIFT_THRESHOLD
            and not self.car.crashed
            and abs(self.car.speed) > 0.8
        )

        if self._was_drifting and not currently:
            # Drift just ended — crashed mid-drift?
            if self.car.crashed and self._drift_frames >= DRIFT_MIN_FRAMES // 2:
                self.total_score = max(0, self.total_score - DRIFT_CRASH_PEN)
                self._drift_combo = 0
                self._drift_idle  = 999   # force combo reset
                self._notifications.append(
                    (t("note.drift_crash", n=DRIFT_CRASH_PEN), (220, 60, 60), tick + 1800))
            elif self._drift_frames >= DRIFT_MIN_FRAMES:
                # Clean completion — award score
                secs = self._drift_frames / FPS
                mult = 1.0 + self._drift_combo * DRIFT_COMBO_MULT
                score = int(DRIFT_SCORE_PER_S * secs * mult)
                self.total_score += score
                self._drift_combo += 1
                if self._drift_combo >= 3:
                    col = (255, 120, 20)
                elif self._drift_combo >= 2:
                    col = (255, 200, 50)
                else:
                    col = (200, 160, 60)
                if self._drift_combo > 1:
                    lbl = t("note.drift_combo", n=score, x=self._drift_combo)
                else:
                    lbl = t("note.drift_bonus", n=score)
                self._notifications.append((lbl, col, tick + 2000))
            self._drift_frames = 0

        if currently:
            self._drift_frames += 1
            self._drift_idle = 0
        else:
            # Reset combo after 3 seconds without drifting
            self._drift_idle += 1
            if self._drift_idle > 180:
                self._drift_combo = 0

        self._was_drifting = currently

    # ------------------------------------------------------------------
    # Dynamic traffic density
    # ------------------------------------------------------------------

    def _update_traffic_density(self, tick: int):
        """Oscillate NPC count with a slow sine wave to vary traffic flow."""
        if self._frame - self._traffic_check_frame < 150:   # check every 2.5 s
            return
        self._traffic_check_frame = self._frame
        cfg = LEVELS[self.level_idx]
        base = cfg.npc_count
        if base == 0:
            return
        phase = (self.race_ms / 1000.0) * (2 * math.pi / TRAFFIC_WAVE_PERIOD)
        target = max(base // 2,
                     int(base * (1.0 + TRAFFIC_WAVE_AMP * math.sin(phase))))
        if len(self.npcs) < target:
            # Spawn one NPC far from the player
            far = [tile for tile in self.game_map.road_tiles()
                   if math.hypot(tile[0] * TILE - self.car.x,
                                 tile[1] * TILE - self.car.y) > SCREEN_W * 0.75]
            if far:
                sp = random.choice(far[:20])
                npc = NPCCar(self.game_map)
                npc.tx, npc.ty = sp
                npc.x = float(sp[0] * TILE + TILE // 2)
                npc.y = float(sp[1] * TILE + TILE // 2)
                self.npcs.append(npc)

    # ------------------------------------------------------------------
    # Roadblocks (MODE_CHASE)
    # ------------------------------------------------------------------

    def _update_roadblocks(self, old_x: float, old_y: float, tick: int):
        """Spawn, age, and collide against police roadblocks."""
        if self.mode != MODE_CHASE:
            return
        if self._roadblock_cd > 0:
            self._roadblock_cd -= 1
        elif (self.race_ms / 1000 >= ROADBLOCK_SPAWN_DELAY
              and len(self.roadblocks) == 0):
            self._try_spawn_roadblock()

        for rb in list(self.roadblocks):
            rb.update()
            if rb.done:
                self.roadblocks.remove(rb)
                continue
            if not self.car.crashed and rb.collides_with(self.car):
                self._apply_collision(self.car, old_x, old_y, -0.35)
                if not self.car.crashed:    # soft bounce
                    self.roadblocks.remove(rb)

    def _try_spawn_roadblock(self):
        """Place a police roadblock ahead of the player in their lane."""
        car = self.car
        rad = math.radians(car.angle)
        cdx, cdy = math.cos(rad), math.sin(rad)
        # Snap to dominant axis
        if abs(cdx) >= abs(cdy):
            dx, dy = (1 if cdx >= 0 else -1), 0
        else:
            dx, dy = 0, (1 if cdy >= 0 else -1)
        rx, ry = -dy, dx     # perpendicular (road width direction)

        ptx = int(car.x) // TILE
        pty = int(car.y) // TILE
        gm  = self.game_map

        for skip in range(6, ROADBLOCK_AHEAD_TILES + 5):
            btx = ptx + dx * skip
            bty = pty + dy * skip
            if not (0 <= btx < gm.map_w_tiles and 0 <= bty < gm.map_h_tiles):
                continue
            if gm.grid[bty][btx] != 0:
                continue
            # Collect road tiles across the corridor
            road_tiles = []
            for w in range(-3, 4):
                tx = btx + rx * w
                ty = bty + ry * w
                if (0 <= tx < gm.map_w_tiles and 0 <= ty < gm.map_h_tiles
                        and gm.grid[ty][tx] == 0):
                    road_tiles.append((tx, ty))
            if len(road_tiles) < 2:
                continue
            # Leave one random gap
            gap_idx = random.randint(0, len(road_tiles) - 1)
            positions = [
                (tx * TILE + TILE // 2, ty * TILE + TILE // 2)
                for i, (tx, ty) in enumerate(road_tiles)
                if i != gap_idx
            ]
            if positions:
                angle = math.degrees(math.atan2(ry, rx))
                self.roadblocks.append(_Roadblock(positions, angle))
                self._roadblock_cd = int(ROADBLOCK_COOLDOWN * FPS)
                # Brief notification
                self._notifications.append(
                    (t("note.roadblock"), (255, 80, 255), pygame.time.get_ticks() + 2000))
            return

    # ------------------------------------------------------------------
    # Road hazards: potholes and puddles
    # ------------------------------------------------------------------

    def _check_road_hazards(self, tick: int):
        """Inject lateral velocity when the car hits a pothole or puddle."""
        if self.car.crashed or abs(self.car.speed) < 1.2:
            return
        for ph in self.game_map.potholes:
            wx, wy, r, ptype, last_frame = ph
            if self._frame - last_frame < HAZARD_COOLDOWN:
                continue
            if math.hypot(self.car.x - wx, self.car.y - wy) < r:
                ph[4] = self._frame
                spd_frac = min(1.0, abs(self.car.speed) / self.car.max_speed)
                if ptype == 'puddle':
                    kick = random.choice([-1, 1]) * PUDDLE_KICK * (0.6 + 0.4 * spd_frac)
                    self._notifications.append(
                        (t("note.puddle"), (80, 130, 200), tick + 1200))
                else:
                    kick = random.choice([-1, 1]) * POTHOLE_KICK * (0.5 + 0.5 * spd_frac)
                    self._notifications.append(
                        (t("note.pothole"), (140, 120, 80), tick + 1200))
                self.car.lat_vel += kick
                break

    # ------------------------------------------------------------------
    # Wrong-way detection
    # ------------------------------------------------------------------

    def _check_wrong_way(self, tick: int):
        """Fire a violation after ONE_WAY_VIOLATION_F frames of wrong-way travel."""
        if self.god_mode or self.car.crashed:
            self._wrong_way_frames = 0
            return
        tx = int(self.car.x) // TILE
        ty = int(self.car.y) // TILE

        # Check both one-way streets and roundabout ring directions
        one_way = self.game_map.one_way.get((tx, ty))
        rb_dir  = self.game_map.roundabout_dir.get((tx, ty))
        allowed = one_way or rb_dir

        if allowed is None:
            self._wrong_way_frames = 0
            return

        rad = math.radians(self.car.angle)
        cdx, cdy = math.cos(rad), math.sin(rad)
        dot = cdx * allowed[0] + cdy * allowed[1]

        if dot < -0.3 and abs(self.car.speed) > 0.5:
            self._wrong_way_frames += 1
            if self._wrong_way_frames == ONE_WAY_VIOLATION_F:
                self.violations += 1
                self.total_score = max(0, self.total_score - SCORE_VIOLATION)
                self._notifications.append(
                    (t("note.wrong_way", n=SCORE_VIOLATION), (255, 60, 60), tick + 2500))
                # Re-arm after another full window
                self._wrong_way_frames = 0
        else:
            self._wrong_way_frames = 0

    def _trigger_game_over(self, reason: str):
        self.state = S_GAME_OVER
        self._gameover_reason = reason
        tick = pygame.time.get_ticks()
        self._notifications.append(
            (t("note.gameover", reason=reason), (220, 40, 40), tick + 5000)
        )

    # ------------------------------------------------------------------
    # Goal check
    # ------------------------------------------------------------------

    def _check_goal(self):
        if self.state != S_RACING:
            return
        tp = self.target_pos
        if tp is None:
            return
        label = self.objectives[self.obj_idx][1]

        # ── Delivery Blitz: drive-through waypoints (no stop required) ──
        if self.mode == MODE_DELIVERY:
            if math.hypot(self.car.x - tp[0], self.car.y - tp[1]) < GOAL_RADIUS:
                tick = pygame.time.get_ticks()
                if label.startswith('D'):
                    self._deliveries_done += 1
                    self.total_score += SCORE_DELIVERY_BASE
                    self._notifications.append(
                        (t("note.delivery_done", n=self._deliveries_done,
                           b=SCORE_DELIVERY_BASE),
                         (255, 200, 80), tick + 2200))
                    self.sfx.play("door")
                else:
                    self._notifications.append(
                        (t("note.delivery_pickup"), (255, 160, 60), tick + 1200))
                self.obj_idx += 1
                if self.obj_idx >= len(self.objectives):
                    self.sfx.play("tick")
                    if self.level_idx >= len(LEVELS) - 1:
                        self._award_level_score()
                        self.state = S_GAME_WON
                        self.fireworks = Fireworks()
                    else:
                        self.state = S_FINISHED
            return

        # Taxi pickup: must STOP next to the waiting passenger; boarding then
        # plays out in _update and advances the objective when complete.
        if self.mode == MODE_TAXI and label == "P" and self.passenger is not None:
            p = self.passenger
            if p.state == "waiting":
                near = math.hypot(self.car.x - p.x, self.car.y - p.y) < PICKUP_RADIUS
                if near and abs(self.car.speed) < PICKUP_STOP_SPEED:
                    p.start_boarding()
                    self._notifications.append(
                        (t("note.boarding"), (250, 220, 90),
                         pygame.time.get_ticks() + 1500))
            return

        # Race goal / taxi dropoff: reach the marker
        if math.hypot(self.car.x - tp[0], self.car.y - tp[1]) < GOAL_RADIUS:
            self.obj_idx += 1
            if self.obj_idx >= len(self.objectives):
                self.sfx.play("tick")
                if self.level_idx >= len(LEVELS) - 1:
                    # Final level complete → victory!
                    self._award_level_score()
                    self.state = S_GAME_WON
                    self.fireworks = Fireworks()
                else:
                    self.state = S_FINISHED

    def _advance_after_boarding(self):
        """Called when the fare finishes getting in: gain passenger, retarget B."""
        self.has_passenger = True
        self.obj_idx += 1
        self.sfx.play("door")
        self._notifications.append(
            (t("note.aboard"), (80, 220, 80),
             pygame.time.get_ticks() + 2500))

    # ------------------------------------------------------------------
    # Fuel
    # ------------------------------------------------------------------

    def _update_fuel(self):
        if self.fuel is None or self.state != S_RACING:
            return
        # God mode: keep the tank topped up.
        if self.god_mode:
            self.fuel = self.max_fuel
            return
        # Drain proportional to speed, plus a small idle draw
        self.fuel -= FUEL_DRAIN * abs(self.car.speed) + FUEL_IDLE_DRAIN
        # Refuel when parked on a gas station
        for gx, gy in self.game_map.gas_stations:
            if math.hypot(self.car.x - gx, self.car.y - gy) < GAS_RADIUS:
                self.fuel = min(self.max_fuel, self.fuel + FUEL_REFILL_RATE)
                break
        if self.fuel <= 0:
            self.fuel = 0
            self._trigger_game_over(t("reason.fuel"))

    # ------------------------------------------------------------------
    # Skid marks
    # ------------------------------------------------------------------

    def _update_skid_marks(self, keys):
        car = self.car
        # Generate new marks when braking hard
        braking = keys[pygame.K_DOWN] or keys[pygame.K_SPACE]
        if (self.state == S_RACING
                and not car.crashed
                and abs(car.speed) > SKID_MIN_SPEED
                and braking
                and self._frame % SKID_INTERVAL == 0):
            rad = math.radians(car.angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)
            hw = car.W / 2
            hh = car.H / 2
            # Rear-left and rear-right wheel positions (local → world)
            for side in (-1, 1):
                lx = -(hw - 4)
                ly = side * (hh - 3)
                wx = car.x + lx * cos_a - ly * sin_a
                wy = car.y + lx * sin_a + ly * cos_a
                if self.game_map.is_road(wx, wy):
                    self.skid_marks.append((wx, wy, car.angle, 0))

        # Age marks and drop old ones
        self.skid_marks = [
            (x, y, a, age + 1)
            for x, y, a, age in self.skid_marks
            if age < SKID_MAX_AGE
        ]

    def _draw_skid_marks(self, cam_x: float, cam_y: float):
        """Draw tyre marks on the road surface (rendered before cars)."""
        for wx, wy, angle, age in self.skid_marks:
            sx = wx - cam_x
            sy = wy - cam_y
            if not (-12 < sx < SCREEN_W + 12 and -12 < sy < SCREEN_H + 12):
                continue

            # Fade from near-black to asphalt colour
            t = age / SKID_MAX_AGE
            r = int(20 + (55 - 20) * t)
            g = int(20 + (55 - 20) * t)
            b = int(20 + (60 - 20) * t)
            col = (r, g, b)

            rad = math.radians(angle)
            cos_a, sin_a = math.cos(rad), math.sin(rad)
            mw, mh = 4.0, 1.5   # half-dims of each tyre-mark rectangle

            pts = [
                (sx + (-mw) * cos_a - (-mh) * sin_a,
                 sy + (-mw) * sin_a + (-mh) * cos_a),
                (sx + mw * cos_a - (-mh) * sin_a,
                 sy + mw * sin_a + (-mh) * cos_a),
                (sx + mw * cos_a - mh * sin_a,
                 sy + mw * sin_a + mh * cos_a),
                (sx + (-mw) * cos_a - mh * sin_a,
                 sy + (-mw) * sin_a + mh * cos_a),
            ]
            pygame.draw.polygon(self.screen, col, pts)

    # ------------------------------------------------------------------
    # Camera & clamping
    # ------------------------------------------------------------------

    def _clamp_car(self):
        margin = 20
        self.car.x = max(margin, min(self.game_map.pw - margin, self.car.x))
        self.car.y = max(margin, min(self.game_map.ph - margin, self.car.y))

    def _update_camera(self):
        self.cam_x += (self.car.x - SCREEN_W / 2 - self.cam_x) * 0.12
        self.cam_y += (self.car.y - SCREEN_H / 2 - self.cam_y) * 0.12
        self.cam_x = max(0, min(self.game_map.pw - SCREEN_W, self.cam_x))
        self.cam_y = max(0, min(self.game_map.ph - SCREEN_H, self.cam_y))

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def _draw(self, tick: int):
        # Camera shake: compute a per-frame random offset that decays over time
        if self._shake_timer > 0:
            self._shake_timer -= 1
            decay = self._shake_timer / SHAKE_DURATION
            sx = random.uniform(-self._shake_mag, self._shake_mag) * decay
            sy = random.uniform(-self._shake_mag, self._shake_mag) * decay
        else:
            sx = sy = 0.0
        cam_x = self.cam_x + sx
        cam_y = self.cam_y + sy

        self.screen.fill(C_GRASS)
        self.game_map.draw(self.screen, cam_x, cam_y,
                           self.hud.font, tick)
        self._draw_skid_marks(cam_x, cam_y)
        for npc in self.npcs:
            npc.draw(self.screen, cam_x, cam_y)
        for ped in self.pedestrians:
            ped.draw(self.screen, cam_x, cam_y)
        if self.passenger is not None:
            self.passenger.draw(self.screen, cam_x, cam_y)
        self.car.draw(self.screen, cam_x, cam_y)
        if self.has_passenger:
            self._draw_passenger(cam_x, cam_y)
        for cop in self.police:
            cop.draw(self.screen, cam_x, cam_y, tick)
        for rb in self.roadblocks:
            rb.draw(self.screen, cam_x, cam_y, tick)

        # Wrong-way overlay strip
        if self._wrong_way_frames > 10:
            frac = min(1.0, self._wrong_way_frames / ONE_WAY_VIOLATION_F)
            alpha = int(80 * frac)
            ww = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            ww.fill((220, 30, 30, alpha))
            self.screen.blit(ww, (0, 0))
            if self._wrong_way_frames > ONE_WAY_VIOLATION_F // 2:
                lbl = self.hud.font.render(t("note.wrong_way_warn"), True, (255, 80, 80))
                self.screen.blit(lbl, lbl.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 55))

        # Drift indicator: pulse the speed-bar border gold when drifting
        if self._was_drifting and self._drift_frames >= DRIFT_MIN_FRAMES:
            pulse = 0.5 + 0.5 * math.sin(self._frame * 0.3)
            alpha = int(180 * pulse)
            drift_col = (255, 200, 40, alpha) if self._drift_combo <= 1 else (255, 130, 20, alpha)
            ds = pygame.Surface((SCREEN_W // 2, 26), pygame.SRCALPHA)
            ds.fill((0, 0, 0, 0))
            pygame.draw.rect(ds, drift_col, (0, 0, SCREEN_W // 2, 26), 3, border_radius=4)
            secs = self._drift_frames / FPS
            lbl = self.hud.font.render(t("note.drifting", s=f"{secs:.1f}"), True,
                                       (255, 200, 40) if self._drift_combo <= 1 else (255, 130, 20))
            ds.blit(lbl, (6, 5))
            self.screen.blit(ds, (SCREEN_W // 4, 8))

        # Weather + darkness over the world (under HUD / mini-map)
        if self.rain:
            self.rain.draw(self.screen)
        if self.snow:
            self.snow.draw(self.screen)
        if self.night:
            self.night.draw(self.screen,
                            self.car.x - cam_x,
                            self.car.y - cam_y,
                            self.car.angle)

        # Pedestrian-hit animation (over the world, under HUD)
        if self.impact:
            self.impact.draw(self.screen, cam_x, cam_y)

        # Victory fireworks
        if self.fireworks is not None:
            self.fireworks.draw(self.screen)

        # Speed-camera screen flash
        if self._camera_flash > 0:
            self._camera_flash -= 1
            alpha = int(190 * self._camera_flash / CAMERA_FLASH_FRAMES)
            flash = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            flash.fill((255, 255, 255, alpha))
            self.screen.blit(flash, (0, 0))

        self.mini_map.draw(self.screen, self.car, self.game_map,
                           self.npcs, self.cam_x, self.cam_y,
                           tick=tick, target_pos=self.target_pos)

        cfg = LEVELS[self.level_idx]
        # Build delivery progress string for the HUD banner
        delivery_info = ""
        if self.mode == MODE_DELIVERY and self.state == S_RACING:
            n_total = sum(1 for _, lbl, _ in self.objectives if lbl.startswith('D'))
            if self.obj_idx < len(self.objectives):
                next_lbl = self.objectives[self.obj_idx][1]
                delivery_info = t("hud.banner_delivery",
                                  done=self._deliveries_done,
                                  total=n_total, nxt=next_lbl)
            else:
                delivery_info = t("hud.banner_delivery_done", total=n_total)
        self.hud.draw(
            self.screen, self.car, self.state,
            self.race_ms, self.best_ms,
            self.target_pos, tick,
            cfg.level_num, self.total_score, self.violations,
            cfg.countdown_s, self._notifications,
            mode=self.mode, has_passenger=self.has_passenger,
            fuel=self.fuel, max_fuel=self.max_fuel,
            level_title=cfg.title,
            traffic_iq=BRAIN.skill, traffic_resolved=BRAIN.resolved,
            god_mode=self.god_mode,
            damage=self.car.damage,
            delivery_info=delivery_info,
        )
        draw_flag(self.screen, self.hud.font)
        pygame.display.flip()

    def _draw_passenger(self, cam_x: float, cam_y: float):
        """Small passenger figure riding in the car."""
        sx = int(self.car.x - cam_x)
        sy = int(self.car.y - cam_y)
        pygame.draw.circle(self.screen, C_PASSENGER, (sx, sy), 5)
        pygame.draw.circle(self.screen, C_BLACK,     (sx, sy), 5, 1)
