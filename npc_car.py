import math
import random

import pygame

from constants import (
    TILE, NPC_W, NPC_H,
    SCREEN_W, SCREEN_H,
    C_CAR_WINDOW, C_HEADLIGHT, C_BLACK,
)
from utils import polygon_corners


NPC_COLORS = [
    (220,  80,  30),
    (170,  30, 170),
    (30,  160, 160),
    (190, 170,  10),
    (60,  180,  60),
    (200,  60, 100),
]

_DIRS = [(1, 0, 0.0), (-1, 0, 180.0), (0, 1, 90.0), (0, -1, 270.0)]


class NPCCar:
    """Autonomously navigating traffic car that follows road tiles."""

    W = NPC_W
    H = NPC_H

    def __init__(self, game_map):
        self._map = game_map
        self.color = random.choice(NPC_COLORS)
        self.speed = random.uniform(1.4, 2.8)
        self.dx, self.dy = 1, 0
        self.angle = 0.0

        tiles = game_map.road_tiles()
        tx, ty = random.choice(tiles)
        self.x = float(tx * TILE + TILE // 2)
        self.y = float(ty * TILE + TILE // 2)
        self._target_x = self.x
        self._target_y = self.y
        self._advance(tx, ty, first=True)

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------

    @staticmethod
    def _tile_center(tx, ty):
        return float(tx * TILE + TILE // 2), float(ty * TILE + TILE // 2)

    def _advance(self, tx: int, ty: int, first: bool = False):
        mw = self._map.map_w_tiles
        mh = self._map.map_h_tiles
        cands = [
            (ddx, ddy, ang) for ddx, ddy, ang in _DIRS
            if (first or not (ddx == -self.dx and ddy == -self.dy))
            and 0 <= tx + ddx < mw and 0 <= ty + ddy < mh
            and self._map.grid[ty + ddy][tx + ddx] == 0
        ]
        if not cands:
            cands = [
                (ddx, ddy, ang) for ddx, ddy, ang in _DIRS
                if 0 <= tx + ddx < mw and 0 <= ty + ddy < mh
                and self._map.grid[ty + ddy][tx + ddx] == 0
            ]
        if cands:
            self.dx, self.dy, self.angle = random.choice(cands)
            self._target_x, self._target_y = self._tile_center(
                tx + self.dx, ty + self.dy
            )
        else:
            self._target_x, self._target_y = self.x, self.y

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self):
        tdx = self._target_x - self.x
        tdy = self._target_y - self.y
        dist = math.hypot(tdx, tdy)
        if dist <= self.speed:
            self.x, self.y = self._target_x, self._target_y
            tx = round(self.x - TILE // 2) // TILE
            ty = round(self.y - TILE // 2) // TILE
            self._advance(tx, ty)
        else:
            self.x += tdx / dist * self.speed
            self.y += tdy / dist * self.speed

    # ------------------------------------------------------------------
    # Collision helpers
    # ------------------------------------------------------------------

    def corners(self):
        return polygon_corners(self.x, self.y, self.W, self.H, self.angle)

    def aabb(self):
        pts = self.corners()
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return pygame.Rect(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float):
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
        body = [l2s(-hw, -hh), l2s(hw, -hh), l2s(hw, hh), l2s(-hw, hh)]
        pygame.draw.polygon(surf, self.color, body)
        pygame.draw.polygon(surf, C_BLACK, body, 1)
        win = [l2s(2, -hh + 2), l2s(hw - 2, -hh + 2),
               l2s(hw - 2, hh - 2), l2s(2, hh - 2)]
        pygame.draw.polygon(surf, C_CAR_WINDOW, win)
        for side in (-1, 1):
            hpx, hpy = l2s(hw - 1, side * (hh - 3))
            pygame.draw.circle(surf, C_HEADLIGHT, (int(hpx), int(hpy)), 2)
