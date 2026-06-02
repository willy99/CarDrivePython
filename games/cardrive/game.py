import math
import sys

import pygame

from constants import (
    SCREEN_W, SCREEN_H, FPS, TILE,
    CRASH_THRESH, GOAL_RADIUS,
    C_GRASS, C_ASPHALT, C_BLACK, C_PASSENGER,
    SCORE_LEVEL_BASE, SCORE_TIME_PENALTY_MS,
    SCORE_VIOLATION, SCORE_TIME_SURPLUS, SCORE_CLEAN_BONUS,
    SCORE_FARE_BASE, SCORE_SMOOTH_BONUS,
    PICKUP_RADIUS, PICKUP_STOP_SPEED,
    SKID_MIN_SPEED, SKID_MAX_AGE, SKID_INTERVAL,
    MODE_TAXI,
    FUEL_DRAIN, FUEL_IDLE_DRAIN, FUEL_REFILL_RATE, GAS_RADIUS,
    RAIN_STEER_MULT, RAIN_FRICTION_MULT, RAIN_ACCEL_MULT,
    S_WAITING, S_RACING, S_FINISHED, S_GAME_OVER,
)
from level_config import LEVELS, level_by_passcode
from screens import ScreenRenderer
from car import Car
from npc_car import NPCCar
from game_map import GameMap
from pedestrian import Pedestrian, TaxiPassenger
from hud import HUD
from mini_map import MiniMap
from effects import NightOverlay, Rain, ImpactBurst
from utils import sat_overlap, rect_poly

# SkidMark: (world_x, world_y, angle_deg, age_frames)
_SkidMark = tuple[float, float, float, int]


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

        self.level_idx   = 0
        self.total_score = 0
        self.best_ms: int | None = None

        self._notifications: list[tuple[str, tuple, int]] = []
        self._gameover_reason = ""

        # Front-end flow: 'home' -> 'intro' -> 'play'
        self.screen_mode = "home"
        self.code_input  = ""
        self.code_msg    = ""

    # ------------------------------------------------------------------
    # Level management
    # ------------------------------------------------------------------

    def _init_level(self):
        cfg = LEVELS[self.level_idx]
        self.game_map    = GameMap(cfg)
        self.car         = Car(*self.game_map.start_pos)
        self.npcs        = [NPCCar(self.game_map) for _ in range(cfg.npc_count)]
        self.pedestrians = self._spawn_all_pedestrians(cfg.peds_per_light)

        self.state      = S_WAITING
        self.race_start = 0
        self.race_ms    = 0
        self.violations = 0
        self.level_crashes = 0
        self._frame     = 0

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
        if cfg.rain:
            self.car.set_wet(RAIN_STEER_MULT, RAIN_FRICTION_MULT, RAIN_ACCEL_MULT)

        self.skid_marks: list[_SkidMark] = []
        self.impact = None          # ImpactBurst when a pedestrian is hit
        self.mini_map = MiniMap(self.game_map)

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

    def _next_level(self):
        cfg = LEVELS[self.level_idx]
        tick = pygame.time.get_ticks()

        # ---- score calculation ----
        time_pen = self.race_ms // SCORE_TIME_PENALTY_MS
        viol_pen = self.violations * SCORE_VIOLATION
        surplus  = 0
        if cfg.countdown_s is not None:
            remaining_ms = max(0, cfg.countdown_s * 1000 - self.race_ms)
            surplus = (remaining_ms // 1000) * SCORE_TIME_SURPLUS

        base = SCORE_FARE_BASE if self.mode == MODE_TAXI else SCORE_LEVEL_BASE
        level_score = max(0, base - time_pen - viol_pen + surplus)

        if self.violations == 0:
            level_score += SCORE_CLEAN_BONUS
            self._notifications.append(
                (f"Clean run!  +{SCORE_CLEAN_BONUS} pts", (80, 220, 80), tick + 3000)
            )
        # Taxi: extra bonus for a crash-free (comfortable) delivery
        if self.mode == MODE_TAXI and self.level_crashes == 0:
            level_score += SCORE_SMOOTH_BONUS
            self._notifications.append(
                (f"Smooth ride!  +{SCORE_SMOOTH_BONUS} pts", (250, 220, 90), tick + 3000)
            )

        self.total_score += level_score

        if self.best_ms is None or self.race_ms < self.best_ms:
            self.best_ms = self.race_ms

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
        self.screen_mode = "home"
        self.code_input  = ""
        self.code_msg    = ""

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def tick(self):
        """Advance one frame.  Called by both run() and the async web loop."""
        t = pygame.time.get_ticks()
        if self.screen_mode == "home":
            self._tick_home(t)
        elif self.screen_mode == "intro":
            self._tick_intro(t)
        else:
            self._handle_events(t)
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

    def _tick_home(self, t: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
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
            # Empty → start a fresh game at level 1
            self.total_score = 0
            self.best_ms = None
            self._goto_intro(0)
            return
        idx = level_by_passcode(self.code_input)
        if idx is None:
            self.code_msg = f'"{self.code_input}" is not a valid code'
        else:
            self.total_score = 0
            self.best_ms = None
            self._goto_intro(idx)

    def _tick_intro(self, t: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
                elif event.key == pygame.K_h:
                    self._go_home()
                elif event.key in (pygame.K_SPACE, pygame.K_RETURN,
                                   pygame.K_KP_ENTER, pygame.K_UP):
                    self._start_play()
        self.screens.draw_intro(self.screen, LEVELS[self.level_idx], t)
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

        # Start timer
        if self.state == S_WAITING and keys[pygame.K_UP]:
            self.state      = S_RACING
            self.race_start = tick

        if self.state == S_RACING:
            self.race_ms = tick - self.race_start

        # Countdown expiry
        if (self.state == S_RACING
                and cfg.countdown_s is not None
                and self.race_ms >= cfg.countdown_s * 1000):
            self._trigger_game_over("Time's up!")
            return

        # Weather animation
        if self.rain:
            self.rain.update()

        # Traffic lights + pedestrians
        for light in self.game_map.traffic_lights:
            light.update()
        for ped in self.pedestrians:
            ped.update()

        for npc in self.npcs:
            npc.update(self.pedestrians, self.npcs)

        old_x, old_y = self.car.x, self.car.y
        if self.state not in (S_FINISHED, S_GAME_OVER):
            self.car.update(keys)

        self._resolve_collisions(old_x, old_y)

        if self.state == S_RACING:
            self._check_red_light(old_x, old_y)

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

        # Prune expired notifications
        self._notifications = [n for n in self._notifications if n[2] > tick]

    def _handle_events(self, tick: int):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
                if event.key == pygame.K_r:
                    if self.state == S_GAME_OVER:
                        self._go_home()         # game over is final → back to menu
                    else:
                        self._retry_level()     # quick restart of the attempt
                if event.key == pygame.K_SPACE and self.state == S_FINISHED:
                    self._next_level()           # → next level's intro
                # Return to home (with passcode entry) from an end screen
                if event.key == pygame.K_h and self.state in (S_FINISHED, S_GAME_OVER):
                    self._go_home()

    # ------------------------------------------------------------------
    # Collision resolution
    # ------------------------------------------------------------------

    def _resolve_collisions(self, old_x: float, old_y: float):
        car = self.car
        if car.crashed or self.state in (S_FINISHED, S_GAME_OVER):
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
            if not car.crashed:
                self.level_crashes += 1
            car.crash()
        else:
            car.x, car.y = ox, oy
            car.speed *= bounce

    # ------------------------------------------------------------------
    # Red-light violation
    # ------------------------------------------------------------------

    def _check_red_light(self, old_x: float, old_y: float):
        old_tx = int(old_x) // TILE
        old_ty = int(old_y) // TILE
        new_tx = int(self.car.x) // TILE
        new_ty = int(self.car.y) // TILE
        if (old_tx, old_ty) == (new_tx, new_ty):
            return

        new_key = (new_tx, new_ty)
        old_key = (old_tx, old_ty)
        tile_map = self.game_map.tile_to_light

        if new_key in tile_map:
            light = tile_map[new_key]
            if tile_map.get(old_key) is not light and light.is_red:
                self.violations  += 1
                self.total_score  = max(0, self.total_score - SCORE_VIOLATION)
                tick = pygame.time.get_ticks()
                self._notifications.append(
                    (f"RED LIGHT  -{SCORE_VIOLATION} pts",
                     (255, 80, 80), tick + 2000)
                )

    # ------------------------------------------------------------------
    # Pedestrian collision (any speed = game over)
    # ------------------------------------------------------------------

    def _check_pedestrian_collision(self):
        if self.state in (S_FINISHED, S_GAME_OVER):
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
                self._trigger_game_over("Pedestrian hit!")
                return

    def _trigger_game_over(self, reason: str):
        self.state = S_GAME_OVER
        self._gameover_reason = reason
        tick = pygame.time.get_ticks()
        self._notifications.append(
            (f"GAME OVER – {reason}", (220, 40, 40), tick + 5000)
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

        # Taxi pickup: must STOP next to the waiting passenger; boarding then
        # plays out in _update and advances the objective when complete.
        if self.mode == MODE_TAXI and label == "P" and self.passenger is not None:
            p = self.passenger
            if p.state == "waiting":
                near = math.hypot(self.car.x - p.x, self.car.y - p.y) < PICKUP_RADIUS
                if near and abs(self.car.speed) < PICKUP_STOP_SPEED:
                    p.start_boarding()
                    self._notifications.append(
                        ("Passenger boarding…", (250, 220, 90),
                         pygame.time.get_ticks() + 1500))
            return

        # Race goal / taxi dropoff: reach the marker
        if math.hypot(self.car.x - tp[0], self.car.y - tp[1]) < GOAL_RADIUS:
            self.obj_idx += 1
            if self.obj_idx >= len(self.objectives):
                self.state = S_FINISHED

    def _advance_after_boarding(self):
        """Called when the fare finishes getting in: gain passenger, retarget B."""
        self.has_passenger = True
        self.obj_idx += 1
        self._notifications.append(
            ("Passenger aboard — go!", (80, 220, 80),
             pygame.time.get_ticks() + 2500))

    # ------------------------------------------------------------------
    # Fuel
    # ------------------------------------------------------------------

    def _update_fuel(self):
        if self.fuel is None or self.state != S_RACING:
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
            self._trigger_game_over("Out of fuel!")

    # ------------------------------------------------------------------
    # Skid marks
    # ------------------------------------------------------------------

    def _update_skid_marks(self, keys):
        car = self.car
        # Generate new marks when braking hard
        if (self.state == S_RACING
                and not car.crashed
                and abs(car.speed) > SKID_MIN_SPEED
                and keys[pygame.K_DOWN]
                and self._frame % SKID_INTERVAL == 0):
            rad = math.radians(car.angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)
            hw = Car.W / 2
            hh = Car.H / 2
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

    def _draw_skid_marks(self):
        """Draw tyre marks on the road surface (rendered before cars)."""
        for wx, wy, angle, age in self.skid_marks:
            sx = wx - self.cam_x
            sy = wy - self.cam_y
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
        self.screen.fill(C_GRASS)
        self.game_map.draw(self.screen, self.cam_x, self.cam_y,
                           self.hud.font, tick)
        self._draw_skid_marks()        # on road, under cars
        for npc in self.npcs:
            npc.draw(self.screen, self.cam_x, self.cam_y)
        for ped in self.pedestrians:
            ped.draw(self.screen, self.cam_x, self.cam_y)
        if self.passenger is not None:
            self.passenger.draw(self.screen, self.cam_x, self.cam_y)
        self.car.draw(self.screen, self.cam_x, self.cam_y)
        if self.has_passenger:
            self._draw_passenger()

        # Weather + darkness over the world (under HUD / mini-map)
        if self.rain:
            self.rain.draw(self.screen)
        if self.night:
            self.night.draw(self.screen,
                            self.car.x - self.cam_x,
                            self.car.y - self.cam_y)

        # Pedestrian-hit animation (over the world, under HUD)
        if self.impact:
            self.impact.draw(self.screen, self.cam_x, self.cam_y)

        self.mini_map.draw(self.screen, self.car, self.game_map,
                           self.npcs, self.cam_x, self.cam_y,
                           tick=tick, target_pos=self.target_pos)

        cfg = LEVELS[self.level_idx]
        self.hud.draw(
            self.screen, self.car, self.state,
            self.race_ms, self.best_ms,
            self.target_pos, tick,
            cfg.level_num, self.total_score, self.violations,
            cfg.countdown_s, self._notifications,
            mode=self.mode, has_passenger=self.has_passenger,
            fuel=self.fuel, max_fuel=self.max_fuel,
            level_title=cfg.title,
        )
        pygame.display.flip()

    def _draw_passenger(self):
        """Small passenger figure riding in the car."""
        sx = int(self.car.x - self.cam_x)
        sy = int(self.car.y - self.cam_y)
        pygame.draw.circle(self.screen, C_PASSENGER, (sx, sy), 5)
        pygame.draw.circle(self.screen, C_BLACK,     (sx, sy), 5, 1)
