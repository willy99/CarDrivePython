import math

import pygame

from constants import (
    MAX_SPEED, REVERSE_MAX, ACCEL, BRAKE, FRICTION, STEER_BASE,
    CAR_W, CAR_H,
    C_CAR_BODY, C_CAR_CRASH, C_CAR_WINDOW, C_HEADLIGHT, C_BLACK, C_BRAKE,
)
from utils import polygon_corners


class Car:
    """Player-controlled car with physics, collision helpers, and rendering."""

    W = CAR_W
    H = CAR_H

    def __init__(self, x: float, y: float):
        self.x = float(x)
        self.y = float(y)
        self.angle = 0.0      # degrees; 0 = right, 90 = down
        self.speed = 0.0
        self.crashed = False
        self.crash_timer = 0
        self.braking = False
        # Grip multipliers (1.0 = dry; rain lowers them — set via set_wet)
        self.steer_mult    = 1.0
        self.friction_mult = 1.0
        self.accel_mult    = 1.0

    def set_wet(self, rain_steer: float, rain_friction: float, rain_accel: float):
        """Apply wet-weather grip loss."""
        self.steer_mult    = rain_steer
        self.friction_mult = rain_friction
        self.accel_mult    = rain_accel

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, keys):
        if self.crashed:
            self._update_crashed()
            return
        self._steer(keys)
        self._throttle(keys)
        rad = math.radians(self.angle)
        self.x += self.speed * math.cos(rad)
        self.y += self.speed * math.sin(rad)

    def _update_crashed(self):
        self.crash_timer -= 1
        if self.crash_timer <= 0:
            self.crashed = False
            self.speed = 0.0
        self.speed *= 0.88
        rad = math.radians(self.angle)
        self.x += self.speed * math.cos(rad)
        self.y += self.speed * math.sin(rad)

    def _steer(self, keys):
        if abs(self.speed) <= 0.05:
            return
        eff = min(abs(self.speed) / MAX_SPEED, 1.0)
        steer = STEER_BASE * (0.3 + 0.7 * eff) * self.steer_mult
        sign = 1 if self.speed > 0 else -1
        if keys[pygame.K_LEFT]:
            self.angle -= steer * sign
        if keys[pygame.K_RIGHT]:
            self.angle += steer * sign

    def _throttle(self, keys):
        friction = FRICTION * self.friction_mult
        # Brake lights: pressing DOWN while moving forward
        self.braking = bool(keys[pygame.K_DOWN]) and self.speed > 0.1
        if keys[pygame.K_UP]:
            self.speed = (self.speed + BRAKE if self.speed < 0
                          else min(self.speed + ACCEL * self.accel_mult, MAX_SPEED))
        elif keys[pygame.K_DOWN]:
            if self.speed > 0:
                self.speed = max(self.speed - BRAKE, 0.0)
            else:
                self.speed = max(self.speed - ACCEL * 0.6, -REVERSE_MAX)
        elif keys[pygame.K_SPACE]:
            if self.speed > 0:
                self.speed = max(self.speed - BRAKE, 0.0)
        else:
            if abs(self.speed) < friction:
                self.speed = 0.0
            elif self.speed > 0:
                self.speed -= friction
            else:
                self.speed += friction

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

    def crash(self):
        if not self.crashed:
            self.crashed = True
            self.crash_timer = 80
            self.speed *= 0.25

    def off_road_count(self, game_map) -> int:
        return sum(1 for cx, cy in self.corners() if not game_map.is_road(cx, cy))

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float):
        sx = self.x - cam_x
        sy = self.y - cam_y
        rad = math.radians(self.angle)
        cos_a, sin_a = math.cos(rad), math.sin(rad)

        def l2s(lx, ly):
            return (sx + lx * cos_a - ly * sin_a,
                    sy + lx * sin_a + ly * cos_a)

        hw, hh = self.W / 2, self.H / 2
        body_col = C_CAR_CRASH if self.crashed else C_CAR_BODY

        body = [l2s(-hw, -hh), l2s(hw, -hh), l2s(hw, hh), l2s(-hw, hh)]
        pygame.draw.polygon(surf, body_col, body)
        pygame.draw.polygon(surf, C_BLACK, body, 1)

        win = [l2s(2, -hh + 2), l2s(hw - 2, -hh + 2),
               l2s(hw - 2, hh - 2), l2s(2, hh - 2)]
        pygame.draw.polygon(surf, C_CAR_WINDOW, win)

        for side in (-1, 1):
            hpx, hpy = l2s(hw - 1, side * (hh - 3))
            pygame.draw.circle(surf, C_HEADLIGHT, (int(hpx), int(hpy)), 3)

        # Rear brake lights (red) when braking
        if self.braking and not self.crashed:
            for side in (-1, 1):
                bpx, bpy = l2s(-hw + 1, side * (hh - 3))
                pygame.draw.circle(surf, C_BRAKE, (int(bpx), int(bpy)), 3)
