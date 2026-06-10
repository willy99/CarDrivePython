import pygame

from constants import SCREEN_W, SCREEN_H


class TrafficLight:
    """
    Timed traffic signal placed at a corridor entrance.

    Cycle (all durations in frames at 60 FPS):

        RED  →  GREEN  →  BLINK_GREEN  →  YELLOW  →  RED  →  …
        3 s       2 s         1 s            1 s

    `is_red` is True **only** during RED.
    During BLINK_GREEN the green lamp flickers — a visual warning that cars
    should slow down and pedestrians should clear the road.
    """

    DUR_RED         = 180   # 3 s
    DUR_GREEN       = 120   # 2 s
    DUR_BLINK_GREEN =  60   # 1 s  (green lamp blinks ~3 Hz)
    DUR_YELLOW      =  60   # 1 s
    TOTAL           = DUR_RED + DUR_GREEN + DUR_BLINK_GREEN + DUR_YELLOW  # 420

    # Phase boundaries (cumulative)
    _T_GREEN       = DUR_RED                                         # 180
    _T_BLINK_GREEN = DUR_RED + DUR_GREEN                             # 300
    _T_YELLOW      = DUR_RED + DUR_GREEN + DUR_BLINK_GREEN           # 360

    _C_HOUSING = (20,  20,  20)
    _C_OFF     = (45,  45,  45)
    _C_RED     = (220, 40,  40)
    _C_YELLOW  = (220, 200, 10)
    _C_GREEN   = (40,  200, 40)

    def __init__(self, wx: float, wy: float, phase_offset: int = 0):
        self.x = wx
        self.y = wy
        self._phase = phase_offset % self.TOTAL

        # Crosswalk endpoints — set by GameMap after construction
        self.walk_start: tuple[float, float] = (wx, wy)
        self.walk_end:   tuple[float, float] = (wx, wy)

    # ------------------------------------------------------------------
    # State machine
    # ------------------------------------------------------------------

    def update(self):
        self._phase = (self._phase + 1) % self.TOTAL

    @property
    def state(self) -> str:
        p = self._phase
        if p < self._T_GREEN:
            return 'RED'
        if p < self._T_BLINK_GREEN:
            return 'GREEN'
        if p < self._T_YELLOW:
            return 'BLINK_GREEN'
        return 'YELLOW'

    @property
    def is_red(self) -> bool:
        """True only when the light is fully RED (not yellow, not blinking)."""
        return self.state == 'RED'

    @property
    def is_green(self) -> bool:
        """True during GREEN or BLINK_GREEN (safe to drive through)."""
        return self.state in ('GREEN', 'BLINK_GREEN')

    @property
    def _green_lamp_on(self) -> bool:
        """Steady during GREEN; flickering during BLINK_GREEN."""
        s = self.state
        if s == 'GREEN':
            return True
        if s == 'BLINK_GREEN':
            # ~3 Hz blink: on for 10 frames, off for 10 frames
            return (self._phase // 10) % 2 == 0
        return False

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

        # Lamps: top = red, mid = yellow, bottom = green
        lamps = [
            ('RED',    self._C_RED,    self.state == 'RED'),
            ('YELLOW', self._C_YELLOW, self.state == 'YELLOW'),
            ('GREEN',  self._C_GREEN,  self._green_lamp_on),
        ]
        for i, (_, col, active) in enumerate(lamps):
            cy2 = by + 5 + i * 9
            pygame.draw.circle(surf, col if active else self._C_OFF, (ix, cy2), 3)

    def draw_crosswalk(self, surf, cam_x: float, cam_y: float):
        """Draw zebra stripes between walk_start and walk_end."""
        import math
        sx0 = self.walk_start[0] - cam_x
        sy0 = self.walk_start[1] - cam_y
        sx1 = self.walk_end[0]   - cam_x
        sy1 = self.walk_end[1]   - cam_y

        dx = sx1 - sx0
        dy = sy1 - sy0
        total = math.hypot(dx, dy)
        if total < 1:
            return

        # Perpendicular unit vector (for stripe half-width)
        px, py = -dy / total, dx / total
        half_w = 6

        stripes = 5
        for i in range(stripes):
            t0 = i         / stripes
            t1 = (i + 0.6) / stripes
            ax = sx0 + dx * t0;  ay = sy0 + dy * t0
            bx2 = sx0 + dx * t1; by2 = sy0 + dy * t1
            pts = [
                (ax  + px * half_w, ay  + py * half_w),
                (ax  - px * half_w, ay  - py * half_w),
                (bx2 - px * half_w, by2 - py * half_w),
                (bx2 + px * half_w, by2 + py * half_w),
            ]
            pygame.draw.polygon(surf, (230, 230, 230), pts)
