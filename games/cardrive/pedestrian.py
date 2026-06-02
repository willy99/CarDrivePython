import math
import random

import pygame

from constants import SCREEN_W, SCREEN_H, C_PASSENGER, C_BLACK


class TaxiPassenger:
    """
    The fare waiting at the pickup point.

    States:
      waiting  – stands on the pavement, waving
      boarding – walks toward the (stopped) taxi
      aboard   – has entered the car (no longer drawn here)
    """

    RADIUS    = 8
    WALK_SPEED = 2.2

    def __init__(self, x: float, y: float):
        self.x = float(x)
        self.y = float(y)
        self.state = "waiting"
        self.anim = 0

    def start_boarding(self):
        if self.state == "waiting":
            self.state = "boarding"

    def update(self, car) -> bool:
        """Advance; return True on the frame boarding completes."""
        self.anim += 1
        if self.state != "boarding":
            return False
        dx, dy = car.x - self.x, car.y - self.y
        d = math.hypot(dx, dy)
        if d > self.WALK_SPEED:
            self.x += dx / d * self.WALK_SPEED
            self.y += dy / d * self.WALK_SPEED
            return False
        self.state = "aboard"
        return True

    def draw(self, surf, cam_x: float, cam_y: float):
        if self.state == "aboard":
            return
        sx = int(self.x - cam_x)
        sy = int(self.y - cam_y)
        if not (-30 < sx < SCREEN_W + 30 and -30 < sy < SCREEN_H + 30):
            return
        r = self.RADIUS
        # body + head
        pygame.draw.circle(surf, C_PASSENGER, (sx, sy), r)
        pygame.draw.circle(surf, C_BLACK,     (sx, sy), r, 1)
        pygame.draw.circle(surf, (235, 205, 150), (sx, sy - r - 4), 4)
        pygame.draw.circle(surf, C_BLACK,         (sx, sy - r - 4), 4, 1)
        # waving arm while waiting
        if self.state == "waiting":
            wave = math.sin(self.anim * 0.18) * 6
            pygame.draw.line(surf, C_BLACK, (sx + r - 1, sy - 2),
                             (sx + r + 6, sy - 8 - int(wave)), 2)


class Pedestrian:
    """
    Pedestrian that walks back and forth along a crosswalk.

    Behaviour
    ---------
    Light RED    → walk normally between start and end (looping)
    Light GREEN  → rush to the nearest edge at 4× speed (clear the road fast)

    Hitting the player car at ANY speed = game over.
    """

    RADIUS    = 7      # pixels, used for collision detection
    RUSH_MULT = 4.0    # speed multiplier when clearing on green

    _C_BODY    = (240, 200, 140)
    _C_HEAD    = (210, 160, 100)
    _C_OUTLINE = (90,  55,  20)

    def __init__(self, traffic_light,
                 start: tuple[float, float],
                 end:   tuple[float, float]):
        self._light = traffic_light
        self.start_x, self.start_y = start
        self.end_x,   self.end_y   = end
        self.speed = random.uniform(0.55, 1.0)

        # Spawn at a random point along the walk path
        t = random.random()
        self.x = self.start_x + (self.end_x - self.start_x) * t
        self.y = self.start_y + (self.end_y - self.start_y) * t
        self._forward = random.choice([True, False])

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self):
        dx = self.end_x - self.start_x
        dy = self.end_y - self.start_y
        total = math.hypot(dx, dy)
        if total < 1:
            return

        if self._light.is_red:
            self._walk(dx, dy, total)
        else:
            self._rush_to_nearest_edge(total)

    def _walk(self, dx: float, dy: float, total: float):
        """Normal back-and-forth walking when light is red (cars stopped)."""
        direction = 1 if self._forward else -1
        self.x += dx / total * self.speed * direction
        self.y += dy / total * self.speed * direction

        # Projection of current position onto the path (t=0 at start, t=1 at end)
        t = ((self.x - self.start_x) * dx +
             (self.y - self.start_y) * dy) / (total * total)

        if t >= 1.0:
            # Reached end → clamp and turn around toward start
            self.x, self.y = self.end_x, self.end_y
            self._forward = False
        elif t <= 0.0:
            # Reached start → clamp and turn around toward end
            self.x, self.y = self.start_x, self.start_y
            self._forward = True

    def _rush_to_nearest_edge(self, total: float):
        """When light turns green, sprint to the nearest edge and wait there.

        Critically: set _forward so the *next* red-light crossing always goes
        INTO the road, never away from it.
        """
        dist_to_start = math.hypot(self.x - self.start_x, self.y - self.start_y)
        dist_to_end   = math.hypot(self.x - self.end_x,   self.y - self.end_y)

        if dist_to_start <= dist_to_end:
            tx, ty = self.start_x, self.start_y
            # Waiting at start → next crossing goes start→end (forward)
            next_forward = True
        else:
            tx, ty = self.end_x, self.end_y
            # Waiting at end → next crossing goes end→start (backward)
            next_forward = False

        to_x = tx - self.x
        to_y = ty - self.y
        dist = math.hypot(to_x, to_y)
        rush = self.speed * self.RUSH_MULT

        if dist > rush:
            self.x += to_x / dist * rush
            self.y += to_y / dist * rush
        else:
            # Snapped to edge: lock direction for the next crossing
            self.x, self.y = tx, ty
            self._forward = next_forward

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float):
        sx = self.x - cam_x
        sy = self.y - cam_y
        if not (-30 < sx < SCREEN_W + 30 and -30 < sy < SCREEN_H + 30):
            return
        ix, iy = int(sx), int(sy)
        r = self.RADIUS
        pygame.draw.circle(surf, self._C_BODY,    (ix, iy),         r)
        pygame.draw.circle(surf, self._C_OUTLINE, (ix, iy),         r, 1)
        pygame.draw.circle(surf, self._C_HEAD,    (ix, iy - r - 4), 4)
        pygame.draw.circle(surf, self._C_OUTLINE, (ix, iy - r - 4), 4, 1)
