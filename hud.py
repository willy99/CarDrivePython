import math

import pygame

from constants import (
    SCREEN_W, SCREEN_H, TILE,
    MAX_SPEED,
    C_CAR_CRASH, C_WHITE, C_BLACK, C_MARKER_B,
    S_WAITING, S_RACING, S_FINISHED,
)
from utils import fmt_time


class HUD:
    """Renders all on-screen overlay elements: speed bar, timer, compass, messages."""

    def __init__(self, font, big_font):
        self.font = font
        self.big_font = big_font

    # ------------------------------------------------------------------
    # Main draw entry point
    # ------------------------------------------------------------------

    def draw(self, surf, car, state: int, race_ms: int,
             best_ms: int | None, goal_pos: tuple, tick: int):
        self._draw_speed_bar(surf, car)
        self._draw_timer(surf, state, race_ms)
        self._draw_best_time(surf, best_ms)
        if state in (S_WAITING, S_RACING):
            self._draw_compass(surf, car, goal_pos)
        self._draw_controls_hint(surf)
        self._draw_messages(surf, car, state, race_ms)

    # ------------------------------------------------------------------
    # Individual elements
    # ------------------------------------------------------------------

    def _draw_speed_bar(self, surf, car):
        bx, by, bw, bh = 14, 14, 160, 18
        pygame.draw.rect(surf, (30, 30, 30), (bx - 2, by - 2, bw + 4, bh + 4),
                         border_radius=4)
        fill = int(bw * abs(car.speed) / MAX_SPEED)
        if car.crashed:
            bar_col = C_CAR_CRASH
        elif abs(car.speed) > MAX_SPEED * 0.7:
            bar_col = (220, 160, 20)
        else:
            bar_col = (50, 200, 80)
        if fill > 0:
            pygame.draw.rect(surf, bar_col, (bx, by, fill, bh), border_radius=3)
        surf.blit(
            self.font.render(f"Speed: {abs(car.speed):.1f}", True, C_WHITE),
            (bx + 4, by + 1),
        )

    def _draw_timer(self, surf, state: int, race_ms: int):
        text = "Press UP to start" if state == S_WAITING else fmt_time(race_ms)
        t = self.font.render(text, True, C_WHITE)
        surf.blit(t, t.get_rect(centerx=SCREEN_W // 2, top=10))

    def _draw_best_time(self, surf, best_ms: int | None):
        if best_ms is not None:
            s = self.font.render(f"Best: {fmt_time(best_ms)}", True, (180, 180, 180))
            surf.blit(s, s.get_rect(centerx=SCREEN_W // 2, top=32))

    def _draw_compass(self, surf, car, goal_pos: tuple):
        """Compass circle in the top-right corner pointing toward B."""
        dx = goal_pos[0] - car.x
        dy = goal_pos[1] - car.y
        cx, cy = SCREEN_W - 55, 55
        pygame.draw.circle(surf, (30, 30, 30), (cx, cy), 34)
        pygame.draw.circle(surf, C_MARKER_B,   (cx, cy), 34, 2)

        ang = math.atan2(dy, dx)
        tip_x = cx + int(math.cos(ang) * 22)
        tip_y = cy + int(math.sin(ang) * 22)
        pygame.draw.line(surf, C_MARKER_B, (cx, cy), (tip_x, tip_y), 3)

        # Arrowhead
        perp = ang + math.pi / 2
        a1 = (tip_x - int(math.cos(ang) * 8 - math.cos(perp) * 5),
              tip_y - int(math.sin(ang) * 8 - math.sin(perp) * 5))
        a2 = (tip_x - int(math.cos(ang) * 8 + math.cos(perp) * 5),
              tip_y - int(math.sin(ang) * 8 + math.sin(perp) * 5))
        pygame.draw.polygon(surf, C_MARKER_B, [(tip_x, tip_y), a1, a2])

        dist_tiles = int(math.hypot(dx, dy) / TILE)
        dist_txt = self.font.render(str(dist_tiles), True, C_WHITE)
        surf.blit(dist_txt, dist_txt.get_rect(center=(cx, cy + 48)))

    def _draw_controls_hint(self, surf):
        hint = self.font.render(
            "Arrows: drive   ESC: quit   R: restart", True, (190, 190, 190)
        )
        surf.blit(hint, (10, SCREEN_H - 28))

    def _draw_messages(self, surf, car, state: int, race_ms: int):
        if car.crashed:
            self._center_msg(surf, "CRASHED!  Press R to respawn", C_CAR_CRASH)
        if state == S_FINISHED:
            self._center_msg(surf, f"GOAL!  {fmt_time(race_ms)}", C_MARKER_B)
            sub = self.font.render("Press R for a new race", True, C_WHITE)
            surf.blit(sub, sub.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2 + 50)))
        if state == S_WAITING:
            msg = self.font.render(
                "Drive from  A  to  B  as fast as possible!", True, C_WHITE
            )
            surf.blit(msg, msg.get_rect(center=(SCREEN_W // 2, SCREEN_H - 56)))

    def _center_msg(self, surf, text: str, color: tuple):
        shadow = self.big_font.render(text, True, C_BLACK)
        msg    = self.big_font.render(text, True, color)
        cx, cy = SCREEN_W // 2, SCREEN_H // 2
        surf.blit(shadow, shadow.get_rect(center=(cx + 2, cy + 2)))
        surf.blit(msg,    msg.get_rect(center=(cx, cy)))
