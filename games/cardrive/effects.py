"""
Visual weather/time-of-day effects: night darkness with a headlight cut-out,
and animated rain.  Kept separate from game.py to keep the game loop tidy.
"""

import random

import pygame

from constants import (
    SCREEN_W, SCREEN_H,
    NIGHT_DARKNESS, HEADLIGHT_RADIUS,
)


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
