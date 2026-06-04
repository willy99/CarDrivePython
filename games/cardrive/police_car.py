"""
Police car for MODE_CHASE: pursues the player via a simple greedy BFS-step
(picks the neighbour tile closest to the player).  Catches the player when
within POLICE_CATCH_DIST.
"""

import math
import random

import pygame

from constants import (
    TILE, NPC_W, NPC_H,
    SCREEN_W, SCREEN_H,
    NPC_TURN_EASE, POLICE_CRUISE_MAX, POLICE_CRUISE_MIN,
    C_BLACK, C_CAR_WINDOW,
)
from utils import polygon_corners


_DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def _ang_delta(cur: float, target: float) -> float:
    return (target - cur + 180) % 360 - 180


class PoliceCar:
    W = NPC_W
    H = NPC_H
    COLOR = (30, 30, 60)        # dark navy body

    def __init__(self, game_map, spawn_pos=None, car=None):
        self._map = game_map
        self.cruise = random.uniform(POLICE_CRUISE_MIN, POLICE_CRUISE_MAX)
        self.speed = self.cruise
        if car:
            if self.speed >= car.speed:
                self.speed = self.speed * 0.90
        self.dx, self.dy = random.randint(0,1), random.randint(0,1)
        self.angle = 0.0

        if spawn_pos is None:
            tx, ty = random.choice(game_map.road_tiles())
        else:
            tx, ty = spawn_pos
        self.tx, self.ty = tx, ty
        self.x = float(tx * TILE + TILE // 2)
        self.y = float(ty * TILE + TILE // 2)

    # ------------------------------------------------------------------

    def _valid(self, tx, ty) -> bool:
        return (0 <= tx < self._map.map_w_tiles
                and 0 <= ty < self._map.map_h_tiles
                and self._map.grid[ty][tx] == 0)

    def _choose_next_dir(self, target_x: float, target_y: float):
        """Pick the neighbour tile that brings us closest to the target."""
        best = None
        best_d = float("inf")
        ttx, tty = int(target_x) // TILE, int(target_y) // TILE
        for ddx, ddy in _DIRS:
            if (ddx, ddy) == (-self.dx, -self.dy):
                continue                              # avoid pointless U-turns
            nx, ny = self.tx + ddx, self.ty + ddy
            if not self._valid(nx, ny):
                continue
            d = abs(nx - ttx) + abs(ny - tty)
            if d < best_d:
                best, best_d = (ddx, ddy), d
        if best is None:                              # corner: U-turn it is
            best = (-self.dx, -self.dy)
        self.dx, self.dy = best

    # ------------------------------------------------------------------

    def update(self, player):
        target_x = player.x + 4 * player.speed * math.cos(math.radians(player.angle))
        target_y = player.y + 4 * player.speed * math.sin(math.radians(player.angle))

        # Aim point: centre of next tile in current direction
        nx, ny = self.tx + self.dx, self.ty + self.dy
        tx_w = nx * TILE + TILE // 2
        ty_w = ny * TILE + TILE // 2

        vx, vy = tx_w - self.x, ty_w - self.y
        dist = math.hypot(vx, vy)
        if dist > 1e-3:
            desired = math.degrees(math.atan2(vy, vx))
            self.angle += _ang_delta(self.angle, desired) * NPC_TURN_EASE
            step = min(self.speed, dist)
            self.x += vx / dist * step
            self.y += vy / dist * step

        if dist <= self.speed + 0.6:
            self.tx += self.dx
            self.ty += self.dy
            self._choose_next_dir(target_x, target_y)

    # ------------------------------------------------------------------

    def corners(self):
        return polygon_corners(self.x, self.y, self.W, self.H, self.angle)

    def caught(self, player) -> bool:
        from constants import POLICE_CATCH_DIST
        return math.hypot(player.x - self.x, player.y - self.y) < POLICE_CATCH_DIST

    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float, tick: int):
        sx = self.x - cam_x
        sy = self.y - cam_y
        if not (-60 < sx < SCREEN_W + 60 and -60 < sy < SCREEN_H + 60):
            return
        rad = math.radians(self.angle)
        cos_a, sin_a = math.cos(rad), math.sin(rad)

        def l2s(lx, ly):
            return (sx + lx * cos_a - ly * sin_a,
                    sy + lx * sin_a + ly * cos_a)

        hw, hh = self.W / 2, self.H / 2
        # Body (dark navy) with a white roof stripe — classic cop look
        body = [l2s(-hw, -hh), l2s(hw, -hh), l2s(hw, hh), l2s(-hw, hh)]
        pygame.draw.polygon(surf, self.COLOR, body)
        pygame.draw.polygon(surf, C_BLACK, body, 1)
        pygame.draw.polygon(surf, (235, 235, 245),
                            [l2s(-hw + 4, -hh), l2s(hw - 4, -hh),
                             l2s(hw - 4, hh),  l2s(-hw + 4, hh)])
        # Windshield
        pygame.draw.polygon(surf, C_CAR_WINDOW,
                            [l2s(2, -hh + 2), l2s(hw - 2, -hh + 2),
                             l2s(hw - 2, hh - 2), l2s(2, hh - 2)])

        # Roof beacons — blinking red/blue
        on = (tick // 8) % 2 == 0
        red_col  = (255, 50, 50)  if on else (120, 30, 30)
        blue_col = (60,  90, 255) if not on else (30, 40, 110)
        for off, c in ((-3, red_col), (3, blue_col)):
            cx, cy = l2s(0, off)
            pygame.draw.circle(surf, c, (int(cx), int(cy)), 2)
