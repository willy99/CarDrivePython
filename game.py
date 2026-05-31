import math
import sys

import pygame

from constants import (
    SCREEN_W, SCREEN_H, FPS, TILE,
    CRASH_THRESH, GOAL_RADIUS,
    C_GRASS,
    S_WAITING, S_RACING, S_FINISHED,
)
from car import Car
from npc_car import NPCCar
from game_map import GameMap
from hud import HUD
from utils import sat_overlap, rect_poly

NPC_COUNT = 10


class Game:
    """
    Top-level game object.

    Owns the pygame window, the map, all cars, and the race state.
    Call run() to enter the main loop.
    """

    def __init__(self):
        pygame.init()
        pygame.font.init()
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
        pygame.display.set_caption("CarDrive")
        self.clock = pygame.time.Clock()

        font     = pygame.font.Font(None, 22)
        big_font = pygame.font.Font(None, 54)

        self.game_map = GameMap()
        self.hud      = HUD(font, big_font)

        self.state      = S_WAITING
        self.race_start = 0
        self.race_ms    = 0
        self.best_ms: int | None = None

        self.car  = Car(*self.game_map.start_pos)
        self.npcs = [NPCCar(self.game_map) for _ in range(NPC_COUNT)]

        self.cam_x = float(self.car.x - SCREEN_W // 2)
        self.cam_y = float(self.car.y - SCREEN_H // 2)

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self):
        while True:
            tick = pygame.time.get_ticks()

            self._handle_events()
            keys = pygame.key.get_pressed()

            self._update(keys, tick)
            self._draw(tick)

            self.clock.tick(FPS)

    # ------------------------------------------------------------------
    # Race management
    # ------------------------------------------------------------------

    def _new_race(self):
        self.car      = Car(*self.game_map.start_pos)
        self.npcs     = [NPCCar(self.game_map) for _ in range(NPC_COUNT)]
        self.state    = S_WAITING
        self.race_ms  = 0
        self.cam_x    = float(self.car.x - SCREEN_W // 2)
        self.cam_y    = float(self.car.y - SCREEN_H // 2)

    # ------------------------------------------------------------------
    # Per-frame update
    # ------------------------------------------------------------------

    def _update(self, keys, tick: int):
        # Start timer on first throttle press
        if self.state == S_WAITING and keys[pygame.K_UP]:
            self.state      = S_RACING
            self.race_start = tick
        if self.state == S_RACING:
            self.race_ms = tick - self.race_start

        for npc in self.npcs:
            npc.update()

        old_x, old_y = self.car.x, self.car.y
        if self.state != S_FINISHED:
            self.car.update(keys)

        self._resolve_collisions(old_x, old_y)
        self._check_goal()
        self._clamp_car()
        self._update_camera()

    def _handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                if event.key == pygame.K_r:
                    self._new_race()

    # ------------------------------------------------------------------
    # Collision resolution
    # ------------------------------------------------------------------

    def _resolve_collisions(self, old_x: float, old_y: float):
        car = self.car
        if car.crashed or self.state == S_FINISHED:
            return

        car_pts = car.corners()
        car_box = car.aabb()

        if self._check_house_collision(car, car_pts, car_box, old_x, old_y):
            return
        if self._check_npc_collision(car, car_pts, car_box, old_x, old_y):
            return
        self._check_offroad_collision(car, old_x, old_y)

    def _check_house_collision(self, car, car_pts, car_box, old_x, old_y) -> bool:
        for house in self.game_map.houses:
            if (car_box.colliderect(house.inflate(8, 8))
                    and sat_overlap(car_pts, rect_poly(house))):
                self._apply_collision(car, old_x, old_y, -0.35)
                return True
        return False

    def _check_npc_collision(self, car, car_pts, car_box, old_x, old_y) -> bool:
        for npc in self.npcs:
            if (car_box.colliderect(npc.aabb().inflate(6, 6))
                    and sat_overlap(car_pts, npc.corners())):
                self._apply_collision(car, old_x, old_y, -0.35)
                return True
        return False

    def _check_offroad_collision(self, car, old_x, old_y):
        if car.off_road_count(self.game_map) >= 3:
            self._apply_collision(car, old_x, old_y, -0.2)

    def _apply_collision(self, car, old_x: float, old_y: float,
                         bounce_factor: float):
        if abs(car.speed) >= CRASH_THRESH:
            car.crash()
        else:
            car.x, car.y = old_x, old_y
            car.speed *= bounce_factor

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
            if self.best_ms is None or self.race_ms < self.best_ms:
                self.best_ms = self.race_ms

    # ------------------------------------------------------------------
    # Camera & world clamping
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
    # Rendering
    # ------------------------------------------------------------------

    def _draw(self, tick: int):
        self.screen.fill(C_GRASS)
        self.game_map.draw(self.screen, self.cam_x, self.cam_y,
                           self.hud.font, tick)
        for npc in self.npcs:
            npc.draw(self.screen, self.cam_x, self.cam_y)
        self.car.draw(self.screen, self.cam_x, self.cam_y)
        self.hud.draw(self.screen, self.car, self.state,
                      self.race_ms, self.best_ms,
                      self.game_map.end_pos, tick)
        pygame.display.flip()
