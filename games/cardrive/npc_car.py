import math
import random

import pygame

from constants import (
    TILE, NPC_W, NPC_H,
    SCREEN_W, SCREEN_H,
    NPC_CRUISE_MIN, NPC_CRUISE_MAX, NPC_ACCEL, NPC_BRAKE,
    NPC_TURN_EASE, NPC_LANE_FRAC, NPC_REACT, NPC_GAP,
    NPC_TURN_PROB, NPC_STUCK_LIMIT, NPC_QUEUE_LIMIT,
    NPC_REVERSE_FRAMES, NPC_REVERSE_SPEED,
    C_CAR_WINDOW, C_HEADLIGHT, C_BLACK, C_BRAKE,
)
from utils import polygon_corners
from traffic_ai import BRAIN, bucket


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
        self._oncoming = 0          # frames jammed by an oncoming car
        self._queue = 0             # frames stuck in a (non-red) queue
        self._reverse = 0
        # Q-learning decision bookkeeping
        self._dec_state = None
        self._dec_action = 0
        self._dec_pos = (self.x, self.y)
        self._stall = 0             # frames not moving since last decision
        self._was_blocked = False
        self.idle = 0               # frames continuously not moving (keep-alive)
        self._spawn_dir()
        self.angle = math.degrees(math.atan2(self.dy, self.dx))

    def respawn(self):
        """Relocate to a fresh road tile (used to recycle hopelessly stuck
        cars so traffic never permanently grid-locks)."""
        tx, ty = random.choice(self._map.road_tiles())
        self.tx, self.ty = tx, ty
        self.x = float(tx * TILE + TILE // 2)
        self.y = float(ty * TILE + TILE // 2)
        self.speed = self.cruise
        self._reverse = 0
        self._oncoming = 0
        self._queue = 0
        self.idle = 0
        self._dec_state = None
        self._was_junction = False
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

    # ------------------------------------------------------------------
    # Learned decisions (Q-brain)
    # ------------------------------------------------------------------

    def _action_dirs(self):
        """Directions for actions 0=straight 1=left 2=right 3=back."""
        dx, dy = self.dx, self.dy
        return [(dx, dy), (dy, -dx), (-dy, dx), (-dx, -dy)]

    def _encode_state(self, blocked: bool):
        d = self._action_dirs()
        fwd_open  = 1 if self._valid(self.tx + d[0][0], self.ty + d[0][1]) else 0
        left_sp   = bucket(self._open_space(*d[1]))
        right_sp  = bucket(self._open_space(*d[2]))
        back_open = 1 if self._valid(self.tx + d[3][0], self.ty + d[3][1]) else 0
        return (fwd_open, left_sp, right_sp, back_open, 1 if blocked else 0)

    def _valid_actions(self, blocked: bool):
        d = self._action_dirs()
        opts = [i for i in range(4)
                if self._valid(self.tx + d[i][0], self.ty + d[i][1])]
        # Respect one-way streets: don't move onto a tile against its allowed dir
        one_way = getattr(self._map, 'one_way', {})
        if one_way:
            ow_ok = []
            for i in opts:
                ntx = self.tx + d[i][0]
                nty = self.ty + d[i][1]
                ow = one_way.get((ntx, nty))
                if ow is None or (d[i][0] == ow[0] and d[i][1] == ow[1]):
                    ow_ok.append(i)
            if ow_ok:
                opts = ow_ok
        if not blocked:
            no_uturn = [i for i in opts if i != 3]
            if no_uturn:
                opts = no_uturn
        return opts or [3]

    @staticmethod
    def _prior(state):
        """Heuristic starting values so an unlearned state already drives
        sensibly: prefer straight, then the roomier turn, avoid U-turns."""
        fwd, ls, rs, bo, blocked = state
        return [
            0.6 if fwd else -1.0,          # straight
            0.15 + 0.12 * ls,              # left
            0.15 + 0.12 * rs,              # right
            0.10 if blocked else -0.4,     # back / U-turn
        ]

    def _decision(self, blocked: bool):
        """Pick a direction with the shared brain and learn from the last one."""
        dirs = self._action_dirs()
        new_state = self._encode_state(blocked)
        valid = self._valid_actions(blocked)
        BRAIN.ensure(new_state, self._prior(new_state))

        if self._dec_state is not None:
            moved = math.hypot(self.x - self._dec_pos[0], self.y - self._dec_pos[1])
            reward = moved / TILE - 0.03 * self._stall
            if self._was_blocked and moved > 0.5 * TILE:
                reward += 2.0
                BRAIN.resolved += 1
            BRAIN.learn(self._dec_state, self._dec_action, reward, new_state, valid)

        action = BRAIN.choose(new_state, valid)
        self.dx, self.dy = dirs[action]

        self._dec_state = new_state
        self._dec_action = action
        self._dec_pos = (self.x, self.y)
        self._stall = 0
        self._was_blocked = blocked

    def _choose_next_dir(self):
        """Called on each tile arrival: decide at junctions / forced corners."""
        # Roundabout ring: follow the prescribed circulation direction
        rb_tiles = getattr(self._map, 'roundabout_tiles', set())
        rb_dir   = getattr(self._map, 'roundabout_dir',   {})
        if (self.tx, self.ty) in rb_tiles:
            flow = rb_dir.get((self.tx, self.ty))
            if flow:
                # Look for exits (non-ring road tiles reachable from here)
                exits = [
                    (ddx, ddy) for ddx, ddy in _DIRS
                    if (ddx, ddy) != (-flow[0], -flow[1])          # not backward
                    and self._valid(self.tx + ddx, self.ty + ddy)
                    and (self.tx + ddx, self.ty + ddy) not in rb_tiles
                ]
                # 40 % chance to take an exit when one is available
                if exits and random.random() < 0.40:
                    self.dx, self.dy = random.choice(exits)
                elif self._valid(self.tx + flow[0], self.ty + flow[1]):
                    self.dx, self.dy = flow
                elif exits:
                    self.dx, self.dy = random.choice(exits)
                self._was_junction = True
                return

        straight_ok = self._valid(self.tx + self.dx, self.ty + self.dy)
        junction = bool(self._real_turns())
        # Decide on junction entry (rising edge) or whenever we can't go straight.
        if (junction and not self._was_junction) or (not straight_ok):
            self._decision(blocked=False)
        self._was_junction = junction

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
            fwd = dx * self.dx + dy * self.dy           # distance ahead
            lat = abs(dx * -self.dy + dy * self.dx)     # offset to the side
            # Only yield to a pedestrian genuinely IN our lane ahead — not one
            # standing on the pavement at the side of the road.
            if 0 < fwd < NPC_REACT and lat < TILE * 0.55:
                return "ped"

        for o in others:
            if o is self:
                continue
            dx, dy = o.x - self.x, o.y - self.y
            fwd = dx * self.dx + dy * self.dy
            if not (0 < fwd < NPC_GAP):
                continue
            lat = abs(dx * -self.dy + dy * self.dx)
            oncoming = (o.dx * self.dx + o.dy * self.dy) < 0
            # Oncoming cars only block if nearly head-on in our path — if
            # they're offset (the two cars are passing on a narrow street)
            # we keep going.  Same-direction cars use the normal queue band.
            band = TILE * 0.28 if oncoming else TILE * 0.5
            if lat < band:
                return "oncoming" if oncoming else "queue"
        return None

    def _red_ahead(self, depth=5) -> bool:
        """A red light controls a tile a few steps ahead → legitimate wait."""
        for k in range(1, depth + 1):
            tile = (self.tx + self.dx * k, self.ty + self.dy * k)
            light = self._map.tile_to_light.get(tile)
            if light is not None and light.is_red:
                return True
        return False

    def _escape(self):
        """Back up and ask the brain for a fresh direction to break a jam."""
        self._decision(blocked=True)
        self._oncoming = 0
        self._queue = 0
        self._reverse = NPC_REVERSE_FRAMES
        self._was_junction = True

    # ------------------------------------------------------------------
    # Per-frame update
    # ------------------------------------------------------------------

    def _target_point(self):
        nx, ny = self.tx + self.dx, self.ty + self.dy
        cx = nx * TILE + TILE // 2
        cy = ny * TILE + TILE // 2
        # Drive toward the CENTRE of the street (away from the kerb), with a
        # slight right bias so two-way traffic passes. Centre = roomier side.
        rx, ry = -self.dy, self.dx                 # right of travel
        sr = self._open_space(rx, ry, 4)
        sl = self._open_space(-rx, -ry, 4)
        off_tiles = max(-1.2, min(1.6, (sr - sl) * 0.5 + 0.4))
        off = off_tiles * (TILE * 0.5)
        return cx + rx * off, cy + ry * off

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

        # Time spent not moving since the last decision (used as a penalty so
        # the brain learns to avoid getting stuck).
        if self.speed < 0.2:
            self._stall += 1

        # Persistent blockage → back up and reroute (the brain learns which
        # way works).  A waiting-at-a-red queue is legitimate and is left
        # alone; a non-red queue (a real jam / circular deadlock) eventually
        # wiggles free so traffic never permanently locks.
        if self.speed < 0.25:
            if reason == "oncoming":
                self._oncoming += 1; self._queue = 0
                if self._oncoming > NPC_STUCK_LIMIT:
                    self._escape(); return
            elif reason == "queue" and not self._red_ahead():
                self._queue += 1; self._oncoming = 0
                if self._queue > NPC_QUEUE_LIMIT:
                    self._escape(); return
            else:
                self._oncoming = 0; self._queue = 0
        else:
            self._oncoming = 0; self._queue = 0

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

        # Keep-alive counter: how long we've been essentially motionless
        self.idle = self.idle + 1 if self.speed < 0.2 else 0

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
