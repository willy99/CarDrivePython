import math
import sys

import pygame

from constants import (
    SCREEN_W, SCREEN_H, FPS, TILE,
    CRASH_THRESH, GOAL_RADIUS,
    C_GRASS,
    SCORE_LEVEL_BASE, SCORE_TIME_PENALTY_MS,
    SCORE_VIOLATION, SCORE_TIME_SURPLUS,
    S_WAITING, S_RACING, S_FINISHED, S_GAME_OVER,
)
from level_config import LEVELS, LevelConfig
from car import Car
from npc_car import NPCCar
from game_map import GameMap
from pedestrian import Pedestrian
from hud import HUD
from utils import sat_overlap, rect_poly, fmt_time


class Game:
    """
    Top-level game object: owns the window, map, all entities, and race state.
    Handles level progression, scoring, traffic-light violations, and game-over
    conditions.

    States:
        S_WAITING   – waiting for player to press UP
        S_RACING    – timer running
        S_FINISHED  – reached goal B  (press SPACE → next level, R → retry)
        S_GAME_OVER – hit pedestrian or countdown expired  (R → restart level 1)
    """

    def __init__(self):
        pygame.init()
        pygame.font.init()
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
        pygame.display.set_caption("CarDrive")
        self.clock = pygame.time.Clock()

        font     = pygame.font.Font(None, 22)
        big_font = pygame.font.Font(None, 54)
        self.hud = HUD(font, big_font)

        self.level_idx   = 0
        self.total_score = 0
        self.best_ms: int | None = None

        self._notifications: list[tuple[str, tuple, int]] = []
        self._gameover_reason = ""

        self._init_level()

    # ------------------------------------------------------------------
    # Level management
    # ------------------------------------------------------------------

    def _init_level(self):
        cfg = LEVELS[self.level_idx]
        self.game_map    = GameMap(cfg)
        self.car         = Car(*self.game_map.start_pos)
        self.npcs        = [NPCCar(self.game_map) for _ in range(cfg.npc_count)]
        self.pedestrians = [
            Pedestrian(light, light.walk_start, light.walk_end)
            for light in self.game_map.traffic_lights
        ]

        self.state        = S_WAITING
        self.race_start   = 0
        self.race_ms      = 0
        self.violations   = 0
        self._notifications.clear()
        self._gameover_reason = ""

        self.cam_x = float(self.car.x - SCREEN_W // 2)
        self.cam_y = float(self.car.y - SCREEN_H // 2)

    def _next_level(self):
        cfg = LEVELS[self.level_idx]
        # Compute level score
        time_pen   = self.race_ms // SCORE_TIME_PENALTY_MS
        viol_pen   = self.violations * SCORE_VIOLATION
        surplus    = 0
        if cfg.countdown_s is not None:
            remaining_ms = max(0, cfg.countdown_s * 1000 - self.race_ms)
            surplus = (remaining_ms // 1000) * SCORE_TIME_SURPLUS
        level_score = max(0, SCORE_LEVEL_BASE - time_pen - viol_pen + surplus)
        self.total_score += level_score
        if self.best_ms is None or self.race_ms < self.best_ms:
            self.best_ms = self.race_ms

        self.level_idx = min(self.level_idx + 1, len(LEVELS) - 1)
        self._init_level()

    def _restart_from_level1(self):
        self.level_idx   = 0
        self.total_score = 0
        self.best_ms     = None
        self._init_level()

    def _retry_level(self):
        self._init_level()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self):
        while True:
            tick = pygame.time.get_ticks()
            self._handle_events(tick)
            keys = pygame.key.get_pressed()
            self._update(keys, tick)
            self._draw(tick)
            self.clock.tick(FPS)

    # ------------------------------------------------------------------
    # Per-frame update
    # ------------------------------------------------------------------

    def _update(self, keys, tick: int):
        cfg = LEVELS[self.level_idx]

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

        # Update traffic lights and pedestrians
        for light in self.game_map.traffic_lights:
            light.update()
        for ped in self.pedestrians:
            ped.update()

        for npc in self.npcs:
            npc.update()

        old_x, old_y = self.car.x, self.car.y
        if self.state not in (S_FINISHED, S_GAME_OVER):
            self.car.update(keys)

        self._resolve_collisions(old_x, old_y)
        if self.state == S_RACING:
            self._check_red_light(old_x, old_y)
        self._check_pedestrian_collision()
        self._check_goal()
        self._clamp_car()
        self._update_camera()

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
                        self._restart_from_level1()
                    else:
                        self._retry_level()
                if event.key == pygame.K_SPACE and self.state == S_FINISHED:
                    self._next_level()

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
            # Only trigger when entering from OUTSIDE this light's zone
            if tile_map.get(old_key) is not light and light.is_red:
                self.violations  += 1
                self.total_score  = max(0, self.total_score - SCORE_VIOLATION)
                tick = pygame.time.get_ticks()
                self._notifications.append(
                    (f"RED LIGHT  -{SCORE_VIOLATION} pts", (255, 80, 80),
                     tick + 2000)
                )

    # ------------------------------------------------------------------
    # Pedestrian collision (any speed = game over)
    # ------------------------------------------------------------------

    def _check_pedestrian_collision(self):
        if self.state in (S_FINISHED, S_GAME_OVER):
            return
        car_pts = self.car.corners()
        for ped in self.pedestrians:
            for cx, cy in car_pts:
                if math.hypot(cx - ped.x, cy - ped.y) < Pedestrian.RADIUS + 4:
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
        dist = math.hypot(
            self.car.x - self.game_map.end_pos[0],
            self.car.y - self.game_map.end_pos[1],
        )
        if dist < GOAL_RADIUS:
            self.state = S_FINISHED

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
        for npc in self.npcs:
            npc.draw(self.screen, self.cam_x, self.cam_y)
        for ped in self.pedestrians:
            ped.draw(self.screen, self.cam_x, self.cam_y)
        self.car.draw(self.screen, self.cam_x, self.cam_y)

        cfg = LEVELS[self.level_idx]
        self.hud.draw(
            self.screen, self.car, self.state,
            self.race_ms, self.best_ms,
            self.game_map.end_pos, tick,
            cfg.level_num, self.total_score, self.violations,
            cfg.countdown_s, self._notifications,
        )
        pygame.display.flip()
