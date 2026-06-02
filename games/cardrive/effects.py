"""
Visual weather/time-of-day effects: night darkness with a headlight cut-out,
and animated rain.  Kept separate from game.py to keep the game loop tidy.
"""

import math
import random

import pygame

from constants import (
    SCREEN_W, SCREEN_H,
    NIGHT_DARKNESS, HEADLIGHT_RADIUS,
)


class ImpactBurst:
    """
    Short collision animation played when the car hits a pedestrian:
    a white shock-ring expands, the pedestrian scatters into tumbling
    pieces, and the screen flashes red on impact.
    """

    DURATION = 95   # frames

    def __init__(self, wx: float, wy: float):
        self.x = wx
        self.y = wy
        self.frame = 0
        # Scattered pieces (comic "knocked flying")
        self.pieces = []
        for _ in range(14):
            ang = random.uniform(0, math.tau)
            spd = random.uniform(2.0, 6.5)
            self.pieces.append([
                wx, wy,
                math.cos(ang) * spd, math.sin(ang) * spd,
                random.uniform(0, 360),                 # rotation
                random.uniform(-18, 18),                # spin
                random.choice([(240, 200, 140), (210, 160, 100), (235, 90, 80)]),
            ])

    def update(self):
        self.frame += 1
        for p in self.pieces:
            p[0] += p[2]; p[1] += p[3]
            p[2] *= 0.92; p[3] *= 0.92
            p[4] += p[5]

    @property
    def done(self) -> bool:
        return self.frame >= self.DURATION

    def draw(self, surf, cam_x: float, cam_y: float):
        # Red impact flash (first few frames)
        if self.frame < 8:
            flash = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            flash.fill((220, 40, 40, int(150 * (1 - self.frame / 8))))
            surf.blit(flash, (0, 0))

        # Expanding shock ring
        if self.frame < 40:
            r = 6 + self.frame * 2
            cx = int(self.x - cam_x)
            cy = int(self.y - cam_y)
            ring = pygame.Surface((r * 2 + 4, r * 2 + 4), pygame.SRCALPHA)
            a = int(220 * (1 - self.frame / 40))
            pygame.draw.circle(ring, (255, 255, 255, a), (r + 2, r + 2), r, 2)
            surf.blit(ring, (cx - r - 2, cy - r - 2))

        # Tumbling pieces
        for px, py, _vx, _vy, rot, _spin, col in self.pieces:
            sx = int(px - cam_x)
            sy = int(py - cam_y)
            pts = []
            for k in range(4):
                a = math.radians(rot + k * 90)
                pts.append((sx + math.cos(a) * 4, sy + math.sin(a) * 4))
            pygame.draw.polygon(surf, col, pts)


class NightOverlay:
    """
    Draws a darkness layer over the whole screen with a soft circular
    'hole' (the headlights) around the car.

    Implementation:
      * a full-screen dark surface (per-pixel alpha)
      * a precomputed radial light mask whose alpha is HIGH at the centre
        and 0 at the edge
      * each frame the mask is subtracted (BLEND_RGBA_SUB) from the dark
        surface at the car's screen position, carving out a lit area.
    """

    def __init__(self):
        self._dark = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        self._mask = self._build_light_mask(HEADLIGHT_RADIUS)
        self._mask_off = HEADLIGHT_RADIUS  # half-size, for centering

    @staticmethod
    def _build_light_mask(radius: int) -> pygame.Surface:
        size = radius * 2
        mask = pygame.Surface((size, size), pygame.SRCALPHA)
        mask.fill((0, 0, 0, 0))
        # Draw concentric circles: alpha HIGH at centre, fading to 0 at edge.
        for r in range(radius, 0, -1):
            a = int(255 * (1.0 - r / radius) ** 1.4)
            pygame.draw.circle(mask, (0, 0, 0, a), (radius, radius), r)
        return mask

    def draw(self, surf, car_screen_x: float, car_screen_y: float):
        self._dark.fill((4, 6, 22, NIGHT_DARKNESS))
        self._dark.blit(
            self._mask,
            (int(car_screen_x) - self._mask_off,
             int(car_screen_y) - self._mask_off),
            special_flags=pygame.BLEND_RGBA_SUB,
        )
        surf.blit(self._dark, (0, 0))


class Rain:
    """Animated diagonal rain streaks plus a faint cool tint."""

    _COLOR = (170, 190, 230)

    def __init__(self, drops: int = 140):
        self._drops = [self._spawn() for _ in range(drops)]
        self._tint = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        self._tint.fill((30, 40, 70, 28))

    @staticmethod
    def _spawn():
        return [
            random.uniform(0, SCREEN_W),
            random.uniform(0, SCREEN_H),
            random.uniform(10, 18),    # length
            random.uniform(13, 20),    # fall speed
        ]

    def update(self):
        for d in self._drops:
            d[0] -= d[3] * 0.4   # drift left
            d[1] += d[3]
            if d[1] > SCREEN_H:
                d[0] = random.uniform(0, SCREEN_W)
                d[1] = -10

    def draw(self, surf):
        surf.blit(self._tint, (0, 0))
        for x, y, length, _ in self._drops:
            pygame.draw.line(
                surf, self._COLOR,
                (x, y), (x - length * 0.4, y + length), 1,
            )
