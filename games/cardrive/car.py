import math

import pygame

from constants import (
    FRICTION, C_CAR_CRASH, C_CAR_WINDOW, C_HEADLIGHT, C_BLACK, C_BRAKE,
    DAMAGE_PER_CRASH, DAMAGE_HANDLING_THRESH, DAMAGE_FATAL,
    DAMAGE_HANDLING_MIN_MULT,
)
from car_types import DEFAULT_CAR
from utils import polygon_corners


# ---------------------------------------------------------------------------
# Shared body renderer (used by the car on the road AND the garage preview)
# ---------------------------------------------------------------------------

def render_car(surf, sx, sy, angle, ctype, *, braking=False, crashed=False,
               damage=0.0):
    """Draw a car of `ctype` centred at screen (sx, sy) facing `angle` deg."""
    rad = math.radians(angle)
    cos_a, sin_a = math.cos(rad), math.sin(rad)

    def l2s(lx, ly):
        return (sx + lx * cos_a - ly * sin_a, sy + lx * sin_a + ly * cos_a)

    def poly(pts, col, border=1):
        scr = [l2s(px, py) for px, py in pts]
        pygame.draw.polygon(surf, col, scr)
        if border:
            pygame.draw.polygon(surf, C_BLACK, scr, border)

    hw, hh = ctype.w / 2, ctype.h / 2
    body = C_CAR_CRASH if crashed else ctype.color
    shape = ctype.shape

    if shape == "bolide":
        # F1: 4 exposed wheels, narrow nose, front & rear wings
        for wx in (-hw + 4, hw - 6):
            for wy in (-hh - 3, hh + 3):
                poly([(wx - 3, wy - 2), (wx + 3, wy - 2),
                      (wx + 3, wy + 2), (wx - 3, wy + 2)], (25, 25, 25))
        poly([(-hw, -2), (hw - 8, -hh + 1), (hw, 0),
              (hw - 8, hh - 1), (-hw, 2)], body)            # tapered chassis
        poly([(-hw, -hh - 1), (-hw + 4, -hh - 1),
              (-hw + 4, hh + 1), (-hw, hh + 1)], body)      # rear wing
        poly([(hw - 3, -hh + 2), (hw, -hh + 2),
              (hw, hh - 2), (hw - 3, hh - 2)], body)        # front wing
        pygame.draw.circle(surf, C_CAR_WINDOW, l2s(-2, 0), 3)  # cockpit

    elif shape == "van":
        poly([(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)], body)
        # big windshield + side windows
        poly([(hw - 7, -hh + 2), (hw - 2, -hh + 2),
              (hw - 2, hh - 2), (hw - 7, hh - 2)], C_CAR_WINDOW, 0)
        poly([(-hw + 3, -hh + 2), (hw - 9, -hh + 2),
              (hw - 9, hh - 2), (-hw + 3, hh - 2)], (150, 150, 160), 0)

    elif shape == "classic":
        poly([(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)], body)
        poly([(-hw + 2, -hh + 3), (hw - 4, -hh + 3),
              (hw - 4, hh - 3), (-hw + 2, hh - 3)], C_CAR_WINDOW, 0)  # cabin
        pygame.draw.line(surf, C_BLACK, l2s(3, -hh + 3), l2s(3, hh - 3), 1)

    elif shape == "sport":
        # sleek wedge
        poly([(-hw + 2, -hh), (hw, -hh + 3), (hw, hh - 3),
              (-hw + 2, hh), (-hw, 0)], body)
        poly([(-2, -hh + 3), (hw - 5, -hh + 4),
              (hw - 5, hh - 4), (-2, hh - 3)], C_CAR_WINDOW, 0)

    elif shape == "compact":
        poly([(-hw, -hh + 1), (hw, -hh + 1), (hw, hh - 1), (-hw, hh - 1)], body)
        poly([(-hw + 2, -hh + 3), (hw - 3, -hh + 3),
              (hw - 3, hh - 3), (-hw + 2, hh - 3)], C_CAR_WINDOW, 0)

    else:  # 'sedan'
        poly([(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)], body)
        poly([(2, -hh + 2), (hw - 2, -hh + 2),
              (hw - 2, hh - 2), (2, hh - 2)], C_CAR_WINDOW, 0)

    # Damage marks — dark dents + a windshield crack at heavy damage
    if damage > 0 and not crashed:
        # dark dent splotches; more appear with damage
        import random as _r
        _r.seed(int(damage) * 7 + ctype.w)        # stable across frames
        n_dents = int(damage / 15)
        for _ in range(n_dents):
            dx = _r.uniform(-hw + 2, hw - 2)
            dy = _r.uniform(-hh + 1, hh - 1)
            pygame.draw.circle(surf, (40, 35, 35), l2s(dx, dy), 2)
        # Windshield crack lines once damage is heavy
        if damage > 55:
            wsx, wsy = l2s(0, 0)
            for off in (-3, 0, 3):
                pygame.draw.line(surf, C_BLACK,
                                 l2s(2 + off, -hh + 2),
                                 l2s(hw - 3, off), 1)

    # Headlights (front = +x)
    for side in (-1, 1):
        hx, hy = l2s(hw - 1, side * (hh - 3))
        pygame.draw.circle(surf, C_HEADLIGHT, (int(hx), int(hy)), 2)
    # Brake lights (rear = -x)
    if braking and not crashed:
        for side in (-1, 1):
            bx, by = l2s(-hw + 1, side * (hh - 3))
            pygame.draw.circle(surf, C_BRAKE, (int(bx), int(by)), 2)


class Car:
    """Player-controlled car; handling comes from its CarType."""

    def __init__(self, x: float, y: float, ctype=DEFAULT_CAR):
        self.x = float(x)
        self.y = float(y)
        self.angle = 0.0
        self.speed = 0.0
        self.crashed = False
        self.crash_timer = 0
        self.braking = False
        self.damage = 0.0

        # Handling from the chosen car
        self.ctype       = ctype
        self.W           = ctype.w
        self.H           = ctype.h
        self.max_speed   = ctype.max_speed
        self.base_accel  = ctype.accel
        self.base_brake  = ctype.brake
        self.base_steer  = ctype.steer
        self.reverse_max = ctype.reverse_max
        self.base_fric   = ctype.friction

        # Grip multipliers (1.0 = dry; rain lowers them)
        self.steer_mult    = 1.0
        self.friction_mult = 1.0
        self.accel_mult    = 1.0

    def set_wet(self, rain_steer, rain_friction, rain_accel):
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

    def _damage_mult(self) -> float:
        """1.0 when undamaged; drops to DAMAGE_HANDLING_MIN_MULT at fatal."""
        if self.damage <= DAMAGE_HANDLING_THRESH:
            return 1.0
        span = max(1.0, DAMAGE_FATAL - DAMAGE_HANDLING_THRESH)
        t = min(1.0, (self.damage - DAMAGE_HANDLING_THRESH) / span)
        return 1.0 - t * (1.0 - DAMAGE_HANDLING_MIN_MULT)

    def add_damage(self, amount: float = DAMAGE_PER_CRASH):
        self.damage = min(DAMAGE_FATAL, self.damage + amount)

    def _steer(self, keys):
        if abs(self.speed) <= 0.05:
            return
        eff = min(abs(self.speed) / self.max_speed, 1.0)
        dmg = self._damage_mult()
        steer = self.base_steer * (0.3 + 0.7 * eff) * self.steer_mult * dmg
        sign = 1 if self.speed > 0 else -1
        if keys[pygame.K_LEFT]:
            self.angle -= steer * sign
        if keys[pygame.K_RIGHT]:
            self.angle += steer * sign

    def _throttle(self, keys):
        friction = self.base_fric * self.friction_mult
        self.braking = bool(keys[pygame.K_DOWN]) and self.speed > 0.1
        dmg = self._damage_mult()
        if keys[pygame.K_UP]:
            self.speed = (self.speed + self.base_brake if self.speed < 0
                          else min(self.speed + self.base_accel * self.accel_mult * dmg,
                                   self.max_speed))
        elif keys[pygame.K_DOWN] or keys[pygame.K_SPACE]:
            if self.speed > 0:
                self.speed = max(self.speed - self.base_brake, 0.0)
            else:
                self.speed = max(self.speed - self.base_accel * 0.6, -self.reverse_max)
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
        render_car(surf, self.x - cam_x, self.y - cam_y, self.angle, self.ctype,
                   braking=self.braking, crashed=self.crashed,
                   damage=self.damage)
