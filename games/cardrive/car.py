import math

import pygame

from constants import (
    FRICTION, C_CAR_CRASH, C_CAR_WINDOW, C_HEADLIGHT, C_BLACK, C_BRAKE,
    DAMAGE_PER_CRASH, DAMAGE_HANDLING_THRESH, DAMAGE_FATAL,
    DAMAGE_HANDLING_MIN_MULT,
    LATERAL_GRIP_DRY, LATERAL_GRIP_RAIN, LATERAL_GRIP_WINTER,
    SKID_INJECT_FWD, SKID_INJECT_RWD, COUNTER_STEER_BONUS,
    DRIVETRAIN_RWD,
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
        self.speed = 0.0            # forward (body-x) velocity
        self.lat_vel = 0.0          # body-y velocity (positive = body-left)
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
        self.drivetrain  = ctype.drivetrain

        # Grip multipliers (1.0 = dry; rain/winter lower them)
        self.steer_mult    = 1.0
        self.friction_mult = 1.0
        self.accel_mult    = 1.0
        self.lat_grip      = LATERAL_GRIP_DRY    # fraction of vlat removed/frame

    def set_wet(self, rain_steer, rain_friction, rain_accel):
        """Apply wet-weather grip loss (rain)."""
        self.steer_mult    = rain_steer
        self.friction_mult = rain_friction
        self.accel_mult    = rain_accel
        self.lat_grip      = LATERAL_GRIP_RAIN

    def set_winter(self, w_steer, w_friction, w_accel):
        """Apply ice-grade grip loss — drift physics become very visible."""
        self.steer_mult    = w_steer
        self.friction_mult = w_friction
        self.accel_mult    = w_accel
        self.lat_grip      = LATERAL_GRIP_WINTER

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    def update(self, keys):
        if self.crashed:
            self._update_crashed()
            return
        self._steer(keys)
        self._throttle(keys)
        self._apply_grip(keys)

        rad = math.radians(self.angle)
        fx, fy = math.cos(rad), math.sin(rad)
        # body-y unit (left of heading): (-sin, cos)
        rx, ry = -math.sin(rad), math.cos(rad)
        self.x += self.speed * fx + self.lat_vel * rx
        self.y += self.speed * fy + self.lat_vel * ry

    def _update_crashed(self):
        self.crash_timer -= 1
        if self.crash_timer <= 0:
            self.crashed = False
            self.speed = 0.0
            self.lat_vel = 0.0
        self.speed *= 0.88
        self.lat_vel *= 0.85
        rad = math.radians(self.angle)
        self.x += self.speed * math.cos(rad) + self.lat_vel * -math.sin(rad)
        self.y += self.speed * math.sin(rad) + self.lat_vel * math.cos(rad)

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
        if abs(self.speed) <= 0.05 and abs(self.lat_vel) <= 0.05:
            return
        eff = min(abs(self.speed) / self.max_speed, 1.0)
        dmg = self._damage_mult()
        steer = self.base_steer * (0.3 + 0.7 * eff) * self.steer_mult * dmg
        sign = 1 if self.speed > 0 else -1
        delta = 0.0
        if keys[pygame.K_LEFT]:
            delta -= steer * sign
        if keys[pygame.K_RIGHT]:
            delta += steer * sign
        if delta == 0.0:
            return
        self.angle += delta

        # When the body rotates by Δθ, the WORLD velocity vector is unchanged,
        # so its components in the new body frame shift.  This is what gives
        # us drift: heading and motion diverge until lateral grip pulls them
        # back together (see _apply_grip).
        rad = math.radians(delta)
        cos_d, sin_d = math.cos(rad), math.sin(rad)
        new_fwd = self.speed * cos_d + self.lat_vel * sin_d
        new_lat = self.lat_vel * cos_d - self.speed * sin_d
        self.speed, self.lat_vel = new_fwd, new_lat

    def _throttle(self, keys):
        friction = self.base_fric * self.friction_mult
        self.braking = bool(keys[pygame.K_DOWN] or keys[pygame.K_SPACE]) and self.speed > 0.1
        dmg = self._damage_mult()
        # Damage degrades both acceleration rate AND top speed.
        speed_cap = self.max_speed * dmg
        if keys[pygame.K_UP]:
            self.speed = (self.speed + self.base_brake if self.speed < 0
                          else min(self.speed + self.base_accel * self.accel_mult * dmg,
                                   speed_cap))
        elif keys[pygame.K_DOWN]:
            if self.speed > 0:
                # Brakes apply LESS on ice (friction_mult is part of base_brake here)
                self.speed = max(self.speed - self.base_brake * self.friction_mult, 0.0)
            else:
                self.speed = max(self.speed - self.base_accel * 0.6, -self.reverse_max)
        elif keys[pygame.K_SPACE]:
            if self.speed > 0:
                # Brakes apply LESS on ice (friction_mult is part of base_brake here)
                self.speed = max(self.speed - self.base_brake * self.friction_mult, 0.0)
        else:
            if abs(self.speed) < friction:
                self.speed = 0.0
            elif self.speed > 0:
                self.speed -= friction
            else:
                self.speed += friction

    def _apply_grip(self, keys):
        """
        Pull lateral velocity back toward zero (the tires gripping the road).

        On dry roads `lat_grip` is 1.0 → lateral velocity vanishes every frame,
        so the car behaves exactly as before (no visible drift).

        On winter `lat_grip` is tiny → lateral velocity persists, the car
        slides.  Counter-steering (turning INTO the slide) combined with the
        correct pedal for your drivetrain temporarily restores extra grip:

          • FWD: PRESS GAS while counter-steering — front wheels pull straight
          • RWD: LIFT OFF the gas — weight shifts back, rear regains grip
        """
        if abs(self.lat_vel) < 0.05:
            self.lat_vel = 0.0
            return

        grip = self.lat_grip

        # Detect counter-steer + correct pedal for drivetrain
        skid_sign = 1 if self.lat_vel > 0 else -1
        steer_in = -1 if keys[pygame.K_LEFT] else 1 if keys[pygame.K_RIGHT] else 0
        is_counter = steer_in != 0 and steer_in == skid_sign
        if is_counter:
            gas_on = bool(keys[pygame.K_UP])
            if self.drivetrain == DRIVETRAIN_RWD and not gas_on:
                grip = min(1.0, grip * COUNTER_STEER_BONUS)
            elif self.drivetrain != DRIVETRAIN_RWD and gas_on:
                grip = min(1.0, grip * COUNTER_STEER_BONUS)

        # Decay lateral velocity
        self.lat_vel *= max(0.0, 1.0 - grip)

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
