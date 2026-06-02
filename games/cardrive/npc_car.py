import math
import random

import pygame

from constants import (
    TILE, NPC_W, NPC_H,
    SCREEN_W, SCREEN_H,
    NPC_CRUISE_MIN, NPC_CRUISE_MAX, NPC_ACCEL, NPC_BRAKE,
    NPC_TURN_EASE, NPC_LANE_FRAC, NPC_REACT, NPC_GAP,
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

_DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def _ang_delta(cur: float, target: float) -> float:
    """Shortest signed angular difference (degrees) from cur to target."""
    return (target - cur + 180) % 360 - 180


class NPCCar:
    """
    Traffic car with rule-following behaviour:

    * follows tile-to-tile paths, keeping to the right-hand side of the street
    * accelerates / brakes smoothly toward a cruise speed
    * stops at red lights (and queues behind the car in front)
    * yields to pedestrians crossing ahead
    * prefers to drive straight, turning at junctions only some of the time
    """

    W = NPC_W
    H = NPC_H

    def __init__(self, game_map):
        self._map = game_map
        self.color = random.choice(NPC_COLORS)
        self.cruise = random.uniform(NPC_CRUISE_MIN, NPC_CRUISE_MAX)
        self.speed = self.cruise

        tx, ty = random.choice(game_map.road_tiles())
        self.tx, self.ty = tx, ty
        self.x = float(tx * TILE + TILE // 2)
        self.y = float(ty * TILE + TILE // 2)
        self.dx, self.dy = 0, 0
        self._pick_dir(first=True)
        self.angle = math.degrees(math.atan2(self.dy, self.dx))

    # ------------------------------------------------------------------
    # Navigation helpers
    # ------------------------------------------------------------------

    def _valid(self, tx, ty) -> bool:
        return (0 <= tx < self._map.map_w_tiles
                and 0 <= ty < self._map.map_h_tiles
                and self._map.grid[ty][tx] == 0)

    def _pick_dir(self, first: bool = False):
        """Choose the next grid direction (no U-turn; prefer going straight)."""
        opts = []
        for ddx, ddy in _DIRS:
            if not first and (ddx, ddy) == (-self.dx, -self.dy):
                continue
            if self._valid(self.tx + ddx, self.ty + ddy):
                weight = 3 if (ddx, ddy) == (self.dx, self.dy) else 1
                opts += [(ddx, ddy)] * weight
        if not opts:  # dead-end → allow U-turn
            opts = [(ddx, ddy) for ddx, ddy in _DIRS
                    if self._valid(self.tx + ddx, self.ty + ddy)]
        if opts:
            self.dx, self.dy = random.choice(opts)

    def _target_point(self):
        """World position of the next tile centre, shifted to the right lane."""
        nx, ny = self.tx + self.dx, self.ty + self.dy
        cx = nx * TILE + TILE // 2
        cy = ny * TILE + TILE // 2
        lane = NPC_LANE_FRAC * TILE * max(0, self._map.road - 1)
        rx, ry = -self.dy, self.dx          # right-hand of travel direction
        return cx + rx * lane, cy + ry * lane

    # ------------------------------------------------------------------
    # Decision: should the car hold position?
    # ------------------------------------------------------------------

    def _must_stop(self, peds, others) -> bool:
        nx, ny = self.tx + self.dx, self.ty + self.dy

        # Red light: stop before entering a red-controlled tile from outside.
        light = self._map.tile_to_light.get((nx, ny))
        if light is not None and light.is_red:
            here = self._map.tile_to_light.get((self.tx, self.ty))
            if here is not light:          # not already clearing the crossing
                return True

        # Pedestrian crossing just ahead
        for ped in peds:
            dx, dy = ped.x - self.x, ped.y - self.y
            if (dx * self.dx + dy * self.dy) > 0 and math.hypot(dx, dy) < NPC_REACT:
                return True

        # Car ahead in the same lane → queue
        for o in others:
            if o is self:
                continue
            dx, dy = o.x - self.x, o.y - self.y
            fwd = dx * self.dx + dy * self.dy           # forward distance
            lat = abs(dx * -self.dy + dy * self.dx)     # lateral offset
            if 0 < fwd < NPC_GAP and lat < TILE * 0.5:
                return True

        return False

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, peds=(), others=()):
        target_speed = 0.0 if self._must_stop(peds, others) else self.cruise

        # Smooth speed ramp
        if self.speed < target_speed:
            self.speed = min(target_speed, self.speed + NPC_ACCEL)
        else:
            self.speed = max(target_speed, self.speed - NPC_BRAKE)

        tx_w, ty_w = self._target_point()
        vx, vy = tx_w - self.x, ty_w - self.y
        dist = math.hypot(vx, vy)

        # Smoothly ease heading toward the direction of travel
        if dist > 1e-3:
            desired = math.degrees(math.atan2(vy, vx))
            self.angle += _ang_delta(self.angle, desired) * NPC_TURN_EASE
            step = min(self.speed, dist)
            self.x += vx / dist * step
            self.y += vy / dist * step

        # Reached the waypoint → advance to the next tile
        if dist <= self.speed + 0.6:
            self.tx += self.dx
            self.ty += self.dy
            self._pick_dir()

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
