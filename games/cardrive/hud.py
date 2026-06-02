import math

import pygame

from constants import (
    SCREEN_W, SCREEN_H, TILE, FPS,
    MAX_SPEED,
    C_CAR_CRASH, C_WHITE, C_BLACK, C_MARKER_B, C_GAS,
    MODE_TAXI,
    S_WAITING, S_RACING, S_FINISHED, S_GAME_OVER,
)
from utils import fmt_time


class HUD:
    """Renders all on-screen overlay elements."""

    def __init__(self, font, big_font):
        self.font = font
        self.big_font = big_font

    # ------------------------------------------------------------------
    # Main draw
    # ------------------------------------------------------------------

    def draw(self, surf, car, state: int, race_ms: int,
             best_ms: int | None, target_pos: tuple | None, tick: int,
             level_num: int, total_score: int, violations: int,
             countdown_s: int | None, notifications: list,
             *, mode: str = "race", has_passenger: bool = False,
             fuel: float | None = None, max_fuel: float | None = None,
             level_title: str = ""):

        self._draw_speed_bar(surf, car)
        if fuel is not None and max_fuel:
            self._draw_fuel_gauge(surf, fuel, max_fuel)
        self._draw_level_score(surf, level_num, total_score, violations, level_title)
        self._draw_timer(surf, state, race_ms, countdown_s)
        self._draw_best_time(surf, best_ms)

        if state in (S_WAITING, S_RACING) and target_pos is not None:
            self._draw_compass(surf, car, target_pos)

        self._draw_controls_hint(surf)
        self._draw_notifications(surf, notifications, tick)
        self._draw_messages(surf, car, state, race_ms, countdown_s,
                            mode, has_passenger)

    # ------------------------------------------------------------------
    # Elements
    # ------------------------------------------------------------------

    def _draw_speed_bar(self, surf, car):
        bx, by, bw, bh = 14, 14, 160, 18
        pygame.draw.rect(surf, (30, 30, 30),
                         (bx - 2, by - 2, bw + 4, bh + 4), border_radius=4)
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

    def _draw_fuel_gauge(self, surf, fuel: float, max_fuel: float):
        bx, by, bw, bh = 14, 36, 160, 14
        pygame.draw.rect(surf, (30, 30, 30),
                         (bx - 2, by - 2, bw + 4, bh + 4), border_radius=4)
        frac = max(0.0, min(1.0, fuel / max_fuel))
        fill = int(bw * frac)
        col = (220, 40, 40) if frac < 0.2 else (220, 160, 20) if frac < 0.45 else C_GAS
        if fill > 0:
            pygame.draw.rect(surf, col, (bx, by, fill, bh), border_radius=3)
        surf.blit(self.font.render(f"Fuel {int(frac*100)}%", True, C_BLACK),
                  (bx + 6, by - 2))

    def _draw_level_score(self, surf, level_num: int, total_score: int,
                          violations: int, level_title: str = ""):
        # Shift down when a fuel gauge occupies the usual row
        y = 38 if not level_title else 38
        name = f"Level {level_num}" + (f": {level_title}" if level_title else "")
        txt = self.font.render(f"{name}   Score: {total_score}", True, C_WHITE)
        surf.blit(txt, (14, 56))
        if violations:
            v = self.font.render(f"Violations: {violations}", True, (255, 120, 50))
            surf.blit(v, (14, 74))

    def _draw_timer(self, surf, state: int, race_ms: int,
                    countdown_s: int | None):
        if state == S_WAITING:
            text = "Press UP to start"
            col  = C_WHITE
        elif countdown_s is not None and state == S_RACING:
            remaining_ms = max(0, countdown_s * 1000 - race_ms)
            text = fmt_time(remaining_ms)
            frac = remaining_ms / (countdown_s * 1000)
            col  = (220, 40, 40) if frac < 0.25 else (220, 160, 20) if frac < 0.5 else C_WHITE
        else:
            text = fmt_time(race_ms)
            col  = C_WHITE
        t = self.font.render(text, True, col)
        surf.blit(t, t.get_rect(centerx=SCREEN_W // 2, top=10))

    def _draw_best_time(self, surf, best_ms: int | None):
        if best_ms is not None:
            s = self.font.render(f"Best: {fmt_time(best_ms)}", True,
                                 (180, 180, 180))
            surf.blit(s, s.get_rect(centerx=SCREEN_W // 2, top=30))

    def _draw_compass(self, surf, car, goal_pos: tuple):
        dx = goal_pos[0] - car.x
        dy = goal_pos[1] - car.y
        cx, cy = SCREEN_W - 55, 55
        pygame.draw.circle(surf, (30, 30, 30), (cx, cy), 34)
        pygame.draw.circle(surf, C_MARKER_B,   (cx, cy), 34, 2)
        ang = math.atan2(dy, dx)
        tip_x = cx + int(math.cos(ang) * 22)
        tip_y = cy + int(math.sin(ang) * 22)
        pygame.draw.line(surf, C_MARKER_B, (cx, cy), (tip_x, tip_y), 3)
        perp = ang + math.pi / 2
        a1 = (tip_x - int(math.cos(ang) * 8 - math.cos(perp) * 5),
              tip_y - int(math.sin(ang) * 8 - math.sin(perp) * 5))
        a2 = (tip_x - int(math.cos(ang) * 8 + math.cos(perp) * 5),
              tip_y - int(math.sin(ang) * 8 + math.sin(perp) * 5))
        pygame.draw.polygon(surf, C_MARKER_B, [(tip_x, tip_y), a1, a2])
        dist_tiles = int(math.hypot(dx, dy) / TILE)
        dt = self.font.render(str(dist_tiles), True, C_WHITE)
        surf.blit(dt, dt.get_rect(center=(cx, cy + 48)))

    def _draw_controls_hint(self, surf):
        hint = self.font.render(
            "Arrows: drive   ESC: quit   R: restart",
            True, (180, 180, 180),
        )
        surf.blit(hint, (10, SCREEN_H - 28))

    def _draw_notifications(self, surf, notifications: list, tick: int):
        """Floating score notifications (fade out over 2 s)."""
        y = SCREEN_H // 2 - 80
        for text, color, expire in notifications:
            remaining = expire - tick
            if remaining <= 0:
                continue
            alpha = min(255, remaining // 3)
            s = self.font.render(text, True, color)
            s.set_alpha(alpha)
            surf.blit(s, s.get_rect(centerx=SCREEN_W // 2, top=y))
            y += 26

    def _draw_messages(self, surf, car, state: int, race_ms: int,
                       countdown_s: int | None,
                       mode: str = "race", has_passenger: bool = False):
        if car.crashed and state not in (S_FINISHED, S_GAME_OVER):
            self._center_msg(surf, "CRASHED!  Press R to respawn", C_CAR_CRASH)

        if state == S_FINISHED:
            self._center_msg(surf, f"LEVEL COMPLETE!  {fmt_time(race_ms)}", C_MARKER_B)
            sub = self.font.render(
                "SPACE: next level     R: replay     H: home", True, C_WHITE
            )
            surf.blit(sub, sub.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2 + 52)))

        if state == S_GAME_OVER:
            self._center_msg(surf, "GAME OVER", C_CAR_CRASH)
            sub = self.font.render("Press R or H for the menu  (resume with a level code)",
                                   True, C_WHITE)
            surf.blit(sub, sub.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2 + 52)))

        if state == S_WAITING:
            if mode == MODE_TAXI:
                txt = "Pick up the passenger at  P,  then deliver to  B !"
            else:
                txt = "Drive from  A  to  B  as fast as possible!"
            msg = self.font.render(txt, True, C_WHITE)
            surf.blit(msg, msg.get_rect(center=(SCREEN_W // 2, SCREEN_H - 56)))

        # Persistent objective banner while racing a taxi fare
        if state == S_RACING and mode == MODE_TAXI:
            banner = ("Passenger aboard → deliver to  B" if has_passenger
                      else "Head to  P  to pick up your passenger")
            col = C_MARKER_B if has_passenger else (255, 160, 60)
            b = self.font.render(banner, True, col)
            surf.blit(b, b.get_rect(center=(SCREEN_W // 2, SCREEN_H - 30)))

    def _center_msg(self, surf, text: str, color: tuple):
        shadow = self.big_font.render(text, True, C_BLACK)
        msg    = self.big_font.render(text, True, color)
        cx, cy = SCREEN_W // 2, SCREEN_H // 2
        surf.blit(shadow, shadow.get_rect(center=(cx + 2, cy + 2)))
        surf.blit(msg,    msg.get_rect(center=(cx, cy)))
