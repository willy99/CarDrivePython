import math
import random

import pygame

from constants import SCREEN_W, SCREEN_H


class Pedestrian:
    """
    Pedestrian that walks back and forth along a crosswalk.

    Behaviour:
    - Light RED   → walk from start to end and back
    - Light GREEN → return to start position and wait there
    Collision with the player car at ANY speed = game over.
    """

    RADIUS = 7    # pixels, used for collision detection

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

        # Spawn at a random point along the walk
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
            self._return_to_start()

    def _walk(self, dx: float, dy: float, total: float):
        direction = 1 if self._forward else -1
        self.x += dx / total * self.speed * direction
        self.y += dy / total * self.speed * direction
        # Reverse at path ends
        walked = math.hypot(self.x - self.start_x, self.y - self.start_y)
        if walked >= total or walked <= 0:
            self._forward = not self._forward

    def _return_to_start(self):
        to_x = self.start_x - self.x
        to_y = self.start_y - self.y
        dist = math.hypot(to_x, to_y)
        if dist > self.speed:
            self.x += to_x / dist * self.speed
            self.y += to_y / dist * self.speed
        else:
            self.x, self.y = self.start_x, self.start_y

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
        # Body
        pygame.draw.circle(surf, self._C_BODY,    (ix, iy),         r)
        pygame.draw.circle(surf, self._C_OUTLINE, (ix, iy),         r,  1)
        # Head
        pygame.draw.circle(surf, self._C_HEAD,    (ix, iy - r - 4), 4)
        pygame.draw.circle(surf, self._C_OUTLINE, (ix, iy - r - 4), 4,  1)
