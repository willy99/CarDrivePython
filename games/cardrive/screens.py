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
import i18n
from i18n import t


# Clickable language flag — top, between the speed bar and the timer
# (a zone that is free on every screen, gameplay included).
FLAG_RECT = pygame.Rect(80, 60, 52, 30)


def draw_flag(surf, font):
    """Draw the CURRENT language's flag + 2-letter code; returns FLAG_RECT."""
    r = FLAG_RECT
    fw = 30
    flag = pygame.Rect(r.x, r.y + 3, fw, r.h - 8)
    lang = i18n.get_lang()
    if lang == "uk":
        half = flag.h // 2
        pygame.draw.rect(surf, (0, 87, 183), (flag.x, flag.y, flag.w, half))
        pygame.draw.rect(surf, (255, 215, 0),
                         (flag.x, flag.y + half, flag.w, flag.h - half))
        code = "UA"
    else:
        pygame.draw.rect(surf, (240, 240, 245), flag)             # St George
        pygame.draw.rect(surf, (200, 30, 40),
                         (flag.x, flag.centery - 2, flag.w, 4))
        pygame.draw.rect(surf, (200, 30, 40),
                         (flag.centerx - 2, flag.y, 4, flag.h))
        code = "EN"
    pygame.draw.rect(surf, C_BLACK, flag, 1)
    surf.blit(font.render(code, True, C_WHITE), (flag.right + 6, r.y + 6))


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

        # Title (brand — not translated)
        title = self.title.render("CARDRIVE", True, C_MARKER_B)
        surf.blit(title, title.get_rect(centerx=SCREEN_W // 2, top=54))
        sub = self.font.render(t("home.subtitle"), True, (150, 160, 175))
        surf.blit(sub, sub.get_rect(centerx=SCREEN_W // 2, top=120))

        # Two info columns (kept clear of each other)
        left_x  = 80
        right_x = 560
        y0 = 175

        self._heading(surf, t("home.howto"), left_x, y0)
        rows = [
            (t("home.k.arrows"),  t("home.v.arrows")),
            (t("home.k.lr"),      t("home.v.lr")),
            (t("home.k.honk"),    t("home.v.honk")),
            (t("home.k.goal"),    t("home.v.goal")),
            (t("home.k.red"),     t("home.v.red")),
            (t("home.k.people"),  t("home.v.people")),
            (t("home.k.restart"), t("home.v.restart")),
        ]
        y = y0 + 38
        for k, v in rows:
            self._kv(surf, k, v, left_x, y)
            y += 32

        self._heading(surf, t("home.modes"), right_x, y0)
        modes = [
            (C_MARKER_P,    t("home.m.taxi"),  t("home.mv.taxi")),
            (C_GAS,         t("home.m.fuel"),  t("home.mv.fuel")),
            ((110,130,180), t("home.m.night"), t("home.mv.night")),
            ((150,170,210), t("home.m.rain"),  t("home.mv.rain")),
        ]
        y = y0 + 38
        for col, k, v in modes:
            pygame.draw.circle(surf, col, (right_x + 6, y + 8), 6)
            self._kv(surf, k, v, right_x + 22, y)
            y += 32

        # Start + passcode box
        box_y = SCREEN_H - 150
        start = self.big.render(t("home.start"), True, C_WHITE)
        surf.blit(start, start.get_rect(centerx=SCREEN_W // 2, top=box_y))

        cursor = "_" if (tick // 400) % 2 == 0 else " "
        code_label = self.font.render(t("home.code_prompt"), True, (170, 180, 195))
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

        draw_flag(surf, self.font)

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
        from constants import DRIVETRAIN_RWD
        surf.fill((18, 22, 30))
        head = self.title.render(t("garage.title"), True, C_MARKER_B)
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

            prev = self._car_preview(ct, 92)
            surf.blit(prev, prev.get_rect(center=(rect.centerx, rect.top + 52)))
            nm = self.big.render(ct.name, True, C_WHITE if sel else (175, 182, 195))
            surf.blit(nm, nm.get_rect(centerx=rect.centerx, top=rect.top + 98))

            # Drivetrain badge (matters on ice)
            dt_key = "garage.rwd" if ct.drivetrain == DRIVETRAIN_RWD else "garage.fwd"
            dt = self.font.render(t(dt_key), True, (150, 170, 200))
            surf.blit(dt, dt.get_rect(centerx=rect.centerx, top=rect.top + 128))

            bx = rect.left + 16
            self._stat_bar(surf, bx, rect.top + 152, t("garage.spd"), ct.bar_speed)
            self._stat_bar(surf, bx, rect.top + 174, t("garage.acc"), ct.bar_accel)
            self._stat_bar(surf, bx, rect.top + 196, t("garage.hnd"), ct.bar_handling)

        hint = self.big.render(t("garage.hint"), True, C_WHITE)
        surf.blit(hint, hint.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 64))
        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Level intro screen
    # ------------------------------------------------------------------

    def draw_intro(self, surf, cfg, tick: int):
        from constants import MODE_CHASE
        surf.fill((18, 22, 30))

        head = self.title.render(t("intro.level", n=cfg.level_num), True, C_MARKER_B)
        surf.blit(head, head.get_rect(centerx=SCREEN_W // 2, top=70))
        if cfg.title:
            tsurf = self.big.render(cfg.title, True, C_WHITE)   # title = brand name
            surf.blit(tsurf, tsurf.get_rect(centerx=SCREEN_W // 2, top=140))

        # Optional narrative line — localised dispatcher voice
        narrative_y = 205
        line = i18n.narrative(cfg.title) or getattr(cfg, "narrative", "")
        if line:
            nr = self.font.render(f'“{line}”', True, (215, 200, 140))
            surf.blit(nr, nr.get_rect(centerx=SCREEN_W // 2, top=narrative_y))
            narrative_y += 30

        # Goal line
        if cfg.mode == MODE_TAXI:
            goal = t("intro.goal.taxi")
        elif cfg.mode == MODE_CHASE:
            goal = t("intro.goal.chase")
        else:
            goal = t("intro.goal.race")
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
            tip1 = self.font.render(t("intro.tip1"), True, (210, 220, 240))
            tip2 = self.font.render(t("intro.tip2"), True, (200, 200, 220))
            surf.blit(tip1, tip1.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 175))
            surf.blit(tip2, tip2.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 152))

        # Passcode
        pc = self.font.render(t("intro.code", code=cfg.passcode),
                              True, (150, 200, 150))
        surf.blit(pc, pc.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 120))

        go = self.big.render(t("intro.begin"), True, C_WHITE)
        if (tick // 500) % 2 == 0:
            surf.blit(go, go.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 76))

        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _difficulty_chips(self, cfg):
        size = t("chip.rooms", w=cfg.mx, h=cfg.my)
        street_key = {1: "street.very_narrow", 2: "street.narrow",
                      3: "street.wide"}.get(cfg.road, "street.narrow")
        traffic_key = ("traffic.light" if cfg.npc_count <= 8 else
                       "traffic.moderate" if cfg.npc_count <= 16 else "traffic.heavy")
        traffic = t("traffic.cars", lvl=t(traffic_key), n=cfg.npc_count)
        time_val = (t("time.nolimit") if cfg.countdown_s is None
                    else t("time.secs", n=cfg.countdown_s))
        chips = [
            (t("chip.map"),     size,    (90, 140, 200)),
            (t("chip.streets"), t(street_key), (200, 160, 60)),
            (t("chip.traffic"), traffic, (200, 110, 70)),
            (t("chip.time"),    time_val, (180, 80, 80)),
        ]
        weather = []
        if cfg.night: weather.append(t("hazard.night"))
        if cfg.rain:  weather.append(t("hazard.rain"))
        if getattr(cfg, "winter", False): weather.append(t("hazard.winter"))
        if cfg.fuel is not None: weather.append(t("hazard.fuel"))
        if weather:
            chips.append((t("chip.hazards"), ", ".join(weather), (150, 120, 210)))
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
