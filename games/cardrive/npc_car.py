import math
import random

import pygame

from constants import (
    TILE, NPC_W, NPC_H,
    SCREEN_W, SCREEN_H,
    NPC_CRUISE_MIN, NPC_CRUISE_MAX, NPC_ACCEL, NPC_BRAKE,
    NPC_TURN_EASE, NPC_LANE_FRAC, NPC_REACT, NPC_GAP,
    NPC_TURN_PROB, NPC_STUCK_LIMIT, NPC_REVERSE_FRAMES, NPC_REVERSE_SPEED,
    C_CAR_WINDOW, C_HEADLIGHT, C_BLACK, C_BRAKE,
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
    Traffic car that drives like a real one:

    * keeps to its lane and drives STRAIGHT down a street; only turns at a
      genuine junction (a side-street opening), not mid-corridor
    * accelerates / brakes smoothly toward a cruise speed
    * stops at red lights, queues patiently behind the car in front,
      yields to pedestrians
    * when truly blocked (oncoming deadlock / obstacle) it backs up and
      steers toward the roomiest open direction instead of freezing
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
        self._was_junction = False
        self._stuck = 0
        self._reverse = 0
        self._spawn_dir()
        self.angle = math.degrees(math.atan2(self.dy, self.dx))

    # ------------------------------------------------------------------
    # Grid helpers
    # ------------------------------------------------------------------

    def _valid(self, tx, ty) -> bool:
        return (0 <= tx < self._map.map_w_tiles
                and 0 <= ty < self._map.map_h_tiles
                and self._map.grid[ty][tx] == 0)

    def _open_space(self, ddx, ddy, limit=6) -> int:
        """Number of consecutive road tiles ahead in a direction (capped)."""
        n, x, y = 0, self.tx, self.ty
        for _ in range(limit):
            x += ddx; y += ddy
            if self._valid(x, y):
                n += 1
            else:
                break
        return n

    def _roomiest(self, dirs):
        return max(dirs, key=lambda d: self._open_space(*d))

    def _real_turns(self):
        """
        Perpendicular directions that lead into an actual side street
        (open at least 2 tiles deep) — i.e. real junctions, not the
        parallel lane of the current corridor.
        """
        perps = [(0, 1), (0, -1)] if self.dx != 0 else [(1, 0), (-1, 0)]
        out = []
        for ddx, ddy in perps:
            if (self._valid(self.tx + ddx, self.ty + ddy)
                    and self._valid(self.tx + 2 * ddx, self.ty + 2 * ddy)):
                out.append((ddx, ddy))
        return out

    def _spawn_dir(self):
        opts = [(ddx, ddy) for ddx, ddy in _DIRS
                if self._valid(self.tx + ddx, self.ty + ddy)]
        if opts:
            self.dx, self.dy = random.choice(opts)

    # ------------------------------------------------------------------
    # Direction choice at each tile
    # ------------------------------------------------------------------

    def _choose_next_dir(self):
        straight_ok = self._valid(self.tx + self.dx, self.ty + self.dy)
        turns = self._real_turns()

        if not straight_ok:
            # Road ends ahead → must turn into the roomiest side street,
            # or U-turn at a dead end.
            if turns:
                self.dx, self.dy = self._roomiest(turns)
            else:
                self.dx, self.dy = -self.dx, -self.dy
            self._was_junction = bool(turns)
            return

        if turns:
            # Decide ONCE when first entering a junction (rising edge) so the
            # car doesn't wiggle while crossing it.
            if not self._was_junction and random.random() < NPC_TURN_PROB:
                self.dx, self.dy = random.choice(turns)
            self._was_junction = True
        else:
            self._was_junction = False
        # otherwise: keep going straight

    def _reroute(self):
        """Blocked for too long → pick the roomiest non-forward direction."""
        cands = [(ddx, ddy) for ddx, ddy in _DIRS
                 if (ddx, ddy) != (self.dx, self.dy)
                 and self._open_space(ddx, ddy) > 0]
        if cands:
            self.dx, self.dy = self._roomiest(cands)
        self._stuck = 0
        self._reverse = NPC_REVERSE_FRAMES
        self._was_junction = True   # don't immediately re-decide

    # ------------------------------------------------------------------
    # Why (if at all) must we hold position?
    # ------------------------------------------------------------------

    def _stop_reason(self, peds, others):
        nx, ny = self.tx + self.dx, self.ty + self.dy

        light = self._map.tile_to_light.get((nx, ny))
        if light is not None and light.is_red:
            if self._map.tile_to_light.get((self.tx, self.ty)) is not light:
                return "light"

        for ped in peds:
            dx, dy = ped.x - self.x, ped.y - self.y
            if (dx * self.dx + dy * self.dy) > 0 and math.hypot(dx, dy) < NPC_REACT:
                return "ped"

        for o in others:
            if o is self:
                continue
            dx, dy = o.x - self.x, o.y - self.y
            fwd = dx * self.dx + dy * self.dy
            lat = abs(dx * -self.dy + dy * self.dx)
            if 0 < fwd < NPC_GAP and lat < TILE * 0.5:
                # oncoming (facing us) → potential deadlock; same dir → queue
                if (o.dx * self.dx + o.dy * self.dy) < 0:
                    return "oncoming"
                return "queue"
        return None

    # ------------------------------------------------------------------
    # Per-frame update
    # ------------------------------------------------------------------

    def _target_point(self):
        nx, ny = self.tx + self.dx, self.ty + self.dy
        cx = nx * TILE + TILE // 2
        cy = ny * TILE + TILE // 2
        lane = NPC_LANE_FRAC * TILE * max(0, self._map.road - 1)
        rx, ry = -self.dy, self.dx
        return cx + rx * lane, cy + ry * lane

    def update(self, peds=(), others=()):
        # Backing-up phase of a reroute
        if self._reverse > 0:
            self._reverse -= 1
            rad = math.radians(self.angle)
            bx = self.x - math.cos(rad) * NPC_REVERSE_SPEED
            by = self.y - math.sin(rad) * NPC_REVERSE_SPEED
            if self._map.is_road(bx, by):
                self.x, self.y = bx, by
            self.speed = 0.0
            return

        reason = self._stop_reason(peds, others)
        target_speed = 0.0 if reason else self.cruise

        # Track genuine blockage (oncoming car / pedestrian) → reroute if it
        # persists. Red lights and orderly queues are NOT a reason to reroute.
        if reason in ("oncoming", "ped") and self.speed < 0.25:
            self._stuck += 1
            if self._stuck > NPC_STUCK_LIMIT:
                self._reroute()
                return
        else:
            self._stuck = 0

        if self.speed < target_speed:
            self.speed = min(target_speed, self.speed + NPC_ACCEL)
        else:
            self.speed = max(target_speed, self.speed - NPC_BRAKE)

        tx_w, ty_w = self._target_point()
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
            self._choose_next_dir()

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

        # Rear brake lights when slowing/stopped (e.g. queued at a red light)
        if self.speed < 0.7:
            for side in (-1, 1):
                bpx, bpy = l2s(-hw + 1, side * (hh - 3))
                pygame.draw.circle(surf, C_BRAKE, (int(bpx), int(bpy)), 2)
