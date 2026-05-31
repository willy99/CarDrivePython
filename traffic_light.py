import pygame

from constants import SCREEN_W, SCREEN_H


class TrafficLight:
    """
    Timed traffic signal placed at a corridor entrance.

    Phase cycle:  RED (3 s) → YELLOW (1 s) → GREEN (3 s) → RED …
    `is_red` is True during RED and YELLOW (car must stop).

    The light also carries crosswalk geometry so GameMap can
    draw the striped crosswalk and Game can spawn Pedestrians.
    """

    DUR_RED    = 180   # frames at 60 FPS
    DUR_YELLOW =  60
    DUR_GREEN  = 180
    TOTAL      = DUR_RED + DUR_YELLOW + DUR_GREEN

    _C_HOUSING = (20,  20,  20)
    _C_OFF     = (45,  45,  45)
    _C_RED     = (220, 40,  40)
    _C_YELLOW  = (220, 200, 10)
    _C_GREEN   = (40,  200, 40)

    def __init__(self, wx: float, wy: float, phase_offset: int = 0):
        self.x = wx
        self.y = wy
        self._phase = phase_offset % self.TOTAL

        # Crosswalk endpoints (set by GameMap after construction)
        self.walk_start: tuple[float, float] = (wx, wy)
        self.walk_end:   tuple[float, float] = (wx, wy)

    # ------------------------------------------------------------------
    # State
    # ------------------------------------------------------------------

    def update(self):
        self._phase = (self._phase + 1) % self.TOTAL

    @property
    def state(self) -> str:
        if self._phase < self.DUR_RED:
            return 'RED'
        if self._phase < self.DUR_RED + self.DUR_YELLOW:
            return 'YELLOW'
        return 'GREEN'

    @property
    def is_red(self) -> bool:
        return self.state != 'GREEN'

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float):
        sx = self.x - cam_x
        sy = self.y - cam_y
        if not (-40 < sx < SCREEN_W + 40 and -40 < sy < SCREEN_H + 40):
            return

        ix, iy = int(sx), int(sy)
        bw, bh = 10, 28
        bx = ix - bw // 2
        by = iy - bh // 2

        # Pole
        pygame.draw.rect(surf, (70, 70, 70), (ix - 1, by + bh, 2, 10))
        # Housing
        pygame.draw.rect(surf, self._C_HOUSING, (bx, by, bw, bh), border_radius=3)

        # Three lamps: top=red, mid=yellow, bot=green
        for i, (name, col) in enumerate(
            [('RED', self._C_RED), ('YELLOW', self._C_YELLOW), ('GREEN', self._C_GREEN)]
        ):
            cy2 = by + 5 + i * 9
            active = name == self.state
            pygame.draw.circle(surf, col if active else self._C_OFF, (ix, cy2), 3)

    def draw_crosswalk(self, surf, cam_x: float, cam_y: float):
        """Draw zebra stripes between walk_start and walk_end."""
        import math
        sx0, sy0 = self.walk_start[0] - cam_x, self.walk_start[1] - cam_y
        sx1, sy1 = self.walk_end[0]   - cam_x, self.walk_end[1]   - cam_y

        dx = sx1 - sx0
        dy = sy1 - sy0
        total = math.hypot(dx, dy)
        if total < 1:
            return

        # Perpendicular unit vector (for stripe width)
        px, py = -dy / total, dx / total
        half_w = 6   # half stripe width in pixels

        stripes = 5
        for i in range(stripes):
            t0 = i       / stripes
            t1 = (i + 0.6) / stripes
            ax = sx0 + dx * t0;  ay = sy0 + dy * t0
            bx = sx0 + dx * t1;  by2 = sy0 + dy * t1
            pts = [
                (ax + px * half_w, ay + py * half_w),
                (ax - px * half_w, ay - py * half_w),
                (bx - px * half_w, by2 - py * half_w),
                (bx + px * half_w, by2 + py * half_w),
            ]
            pygame.draw.polygon(surf, (230, 230, 230), pts)
