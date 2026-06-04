"""
Front-end screens: the home/title screen (with instructions and a passcode
box) and the per-level intro screen (goal + difficulty + passcode).

Pure rendering — no game state is mutated here.
"""

import pygame

from constants import (
    SCREEN_W, SCREEN_H,
    C_WHITE, C_BLACK, C_MARKER_A, C_MARKER_B, C_MARKER_P, C_GAS,
    MODE_TAXI,
)
from car import render_car
from car_types import CARS


class ScreenRenderer:
    def __init__(self, font, big_font, title_font):
        self.font = font
        self.big = big_font
        self.title = title_font

    # ------------------------------------------------------------------
    # Home / title screen
    # ------------------------------------------------------------------

    def draw_home(self, surf, tick: int, code_input: str, code_msg: str):
        surf.fill((18, 22, 30))

        # Title
        title = self.title.render("CARDRIVE", True, C_MARKER_B)
        surf.blit(title, title.get_rect(centerx=SCREEN_W // 2, top=54))
        sub = self.font.render("a top-down driving challenge", True, (150, 160, 175))
        surf.blit(sub, sub.get_rect(centerx=SCREEN_W // 2, top=120))

        # Two info columns (kept clear of each other)
        left_x  = 80
        right_x = 560
        y0 = 175

        self._heading(surf, "HOW TO PLAY", left_x, y0)
        rows = [
            ("Arrows",    "drive (Up gas, Down brake)"),
            ("L / R",     "steer when moving"),
            ("H",         "honk, make others go away"),
            ("Goal",      "reach the gold B marker"),
            ("Red light", "stop — running it costs points"),
            ("People",    "never hit them — game over"),
            ("R / ESC",   "restart  /  quit"),
        ]
        y = y0 + 38
        for k, v in rows:
            self._kv(surf, k, v, left_x, y)
            y += 32

        self._heading(surf, "MODES & HAZARDS", right_x, y0)
        modes = [
            (C_MARKER_P,    "Taxi",  "carry a fare from P to B"),
            (C_GAS,         "Fuel",  "refuel at FUEL stations"),
            ((110,130,180), "Night", "headlights only"),
            ((150,170,210), "Rain",  "less grip, longer slides"),
        ]
        y = y0 + 38
        for col, k, v in modes:
            pygame.draw.circle(surf, col, (right_x + 6, y + 8), 6)
            self._kv(surf, k, v, right_x + 22, y)
            y += 32

        # Start + passcode box
        box_y = SCREEN_H - 150
        start = self.big.render("Press  ENTER  to start", True, C_WHITE)
        surf.blit(start, start.get_rect(centerx=SCREEN_W // 2, top=box_y))

        cursor = "_" if (tick // 400) % 2 == 0 else " "
        code_label = self.font.render("Have a level code?  Type it:", True, (170, 180, 195))
        surf.blit(code_label, code_label.get_rect(centerx=SCREEN_W // 2, top=box_y + 56))

        code_disp = (code_input + cursor) if len(code_input) < 6 else code_input
        box = self.big.render(code_disp or cursor, True, C_MARKER_A)
        rect = box.get_rect(centerx=SCREEN_W // 2, top=box_y + 80)
        pygame.draw.rect(surf, (40, 48, 60),
                         rect.inflate(40, 16), border_radius=6)
        surf.blit(box, rect)

        if code_msg:
            m = self.font.render(code_msg, True, (235, 110, 90))
            surf.blit(m, m.get_rect(centerx=SCREEN_W // 2, top=box_y + 124))

    # ------------------------------------------------------------------
    # Garage / car selection
    # ------------------------------------------------------------------

    def _car_preview(self, ctype, size):
        s = pygame.Surface((46, 46), pygame.SRCALPHA)
        render_car(s, 23, 23, -90, ctype)      # facing up, showroom style
        return pygame.transform.scale(s, (size, size))

    def _stat_bar(self, surf, x, y, label, frac):
        surf.blit(self.font.render(label, True, (150, 160, 175)), (x, y - 3))
        bx, bw, bh = x + 44, 110, 9
        pygame.draw.rect(surf, (30, 34, 42), (bx, y, bw, bh), border_radius=3)
        col = ((90, 200, 120) if frac > 0.66 else
               (220, 180, 60) if frac > 0.33 else (220, 90, 70))
        pygame.draw.rect(surf, col, (bx, y, int(bw * frac), bh), border_radius=3)

    def draw_garage(self, surf, tick: int, car_idx: int):
        surf.fill((18, 22, 30))
        head = self.title.render("CHOOSE YOUR CAR", True, C_MARKER_B)
        surf.blit(head, head.get_rect(centerx=SCREEN_W // 2, top=34))

        cols, tw, th = 4, 232, 250
        ox = (SCREEN_W - cols * tw) // 2
        oy = 120
        for i, ct in enumerate(CARS):
            tx = ox + (i % cols) * tw
            ty = oy + (i // cols) * th
            rect = pygame.Rect(tx + 8, ty + 8, tw - 16, th - 16)
            sel = (i == car_idx)
            pygame.draw.rect(surf, (44, 52, 66) if sel else (32, 38, 48),
                             rect, border_radius=10)
            if sel:
                pygame.draw.rect(surf, C_MARKER_A, rect, 3, border_radius=10)

            prev = self._car_preview(ct, 96)
            surf.blit(prev, prev.get_rect(center=(rect.centerx, rect.top + 58)))
            nm = self.big.render(ct.name, True, C_WHITE if sel else (175, 182, 195))
            surf.blit(nm, nm.get_rect(centerx=rect.centerx, top=rect.top + 108))

            bx = rect.left + 16
            self._stat_bar(surf, bx, rect.top + 150, "SPD", ct.bar_speed)
            self._stat_bar(surf, bx, rect.top + 172, "ACC", ct.bar_accel)
            self._stat_bar(surf, bx, rect.top + 194, "HND", ct.bar_handling)

        hint = self.big.render("LEFT / RIGHT: choose       ENTER: drive",
                               True, C_WHITE)
        surf.blit(hint, hint.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 64))

    # ------------------------------------------------------------------
    # Level intro screen
    # ------------------------------------------------------------------

    def draw_intro(self, surf, cfg, tick: int):
        surf.fill((18, 22, 30))

        head = self.title.render(f"LEVEL {cfg.level_num}", True, C_MARKER_B)
        surf.blit(head, head.get_rect(centerx=SCREEN_W // 2, top=70))
        if cfg.title:
            t = self.big.render(cfg.title, True, C_WHITE)
            surf.blit(t, t.get_rect(centerx=SCREEN_W // 2, top=140))

        # Optional narrative line — italic-feel, dispatcher-voice mood
        narrative_y = 205
        if getattr(cfg, "narrative", ""):
            nr = self.font.render(f'“{cfg.narrative}”',
                                  True, (215, 200, 140))
            surf.blit(nr, nr.get_rect(centerx=SCREEN_W // 2, top=narrative_y))
            narrative_y += 30

        # Goal line
        from constants import MODE_CHASE
        if cfg.mode == MODE_TAXI:
            goal = "Pick up your passenger at P, then deliver to B."
        elif cfg.mode == MODE_CHASE:
            goal = "Reach B before the police catch you."
        else:
            goal = "Drive from A to the gold B marker as fast as you can."
        g = self.font.render(goal, True, (190, 200, 215))
        surf.blit(g, g.get_rect(centerx=SCREEN_W // 2, top=narrative_y))

        # Difficulty chips
        chips = self._difficulty_chips(cfg)
        cy = narrative_y + 55
        for label, value, col in chips:
            self._chip(surf, label, value, col, cy)
            cy += 40

        # On winter levels, a short reminder about drift recovery
        if getattr(cfg, "winter", False):
            tip1 = self.font.render(
                "When the rear slides:  steer INTO the slide.",
                True, (210, 220, 240))
            tip2 = self.font.render(
                "FWD car: press GAS to recover.   RWD car: LIFT OFF gas.",
                True, (200, 200, 220))
            surf.blit(tip1, tip1.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 175))
            surf.blit(tip2, tip2.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 152))

        # Passcode
        pc = self.font.render(
            f"Level code:  {cfg.passcode}   (note it to resume here later)",
            True, (150, 200, 150),
        )
        surf.blit(pc, pc.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 120))

        go = self.big.render("Press  SPACE  to begin", True, C_WHITE)
        if (tick // 500) % 2 == 0:
            surf.blit(go, go.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 76))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _difficulty_chips(self, cfg):
        size = f"{cfg.mx}×{cfg.my} rooms"
        street = {1: "very narrow", 2: "narrow", 3: "wide"}.get(cfg.road, "narrow")
        traffic = ("light" if cfg.npc_count <= 8 else
                   "moderate" if cfg.npc_count <= 16 else "heavy")
        chips = [
            ("Map",     size,                         (90, 140, 200)),
            ("Streets", street,                       (200, 160, 60)),
            ("Traffic", f"{traffic} ({cfg.npc_count} cars)", (200, 110, 70)),
            ("Time",    "no limit" if cfg.countdown_s is None
                        else f"{cfg.countdown_s}s",   (180, 80, 80)),
        ]
        weather = []
        if cfg.night: weather.append("night")
        if cfg.rain:  weather.append("rain")
        if getattr(cfg, "winter", False): weather.append("ice + snow")
        if cfg.fuel is not None: weather.append("fuel limit")
        if weather:
            chips.append(("Hazards", ", ".join(weather), (150, 120, 210)))
        return chips

    def _chip(self, surf, label, value, col, y):
        cx = SCREEN_W // 2
        lab = self.font.render(label, True, (150, 160, 175))
        val = self.font.render(value, True, C_WHITE)
        surf.blit(lab, lab.get_rect(right=cx - 14, centery=y))
        pygame.draw.circle(surf, col, (cx, y), 5)
        surf.blit(val, val.get_rect(left=cx + 14, centery=y))

    def _heading(self, surf, text, x, y):
        h = self.big.render(text, True, C_MARKER_A)
        surf.blit(h, (x, y))

    def _kv(self, surf, key, val, x, y):
        k = self.font.render(key, True, C_WHITE)
        surf.blit(k, (x, y))
        v = self.font.render(val, True, (165, 175, 190))
        surf.blit(v, (x + 130, y))
