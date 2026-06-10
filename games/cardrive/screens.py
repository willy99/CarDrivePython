"""
Front-end screens: the home/title screen (with instructions and a passcode
box) and the per-level intro screen (goal + difficulty + passcode).

Pure rendering — no game state is mutated here.
"""

import math

import pygame

from constants import (
    SCREEN_W, SCREEN_H,
    C_WHITE, C_BLACK, C_MARKER_A, C_MARKER_B, C_MARKER_P, C_GAS,
    MODE_TAXI, MODE_CHASE, MODE_DELIVERY,
)
from car import render_car
from car_types import CARS
import storage
import i18n
from i18n import t
from utils import fmt_time


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
        box_y = SCREEN_H - 162
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

        map_hint = self.font.render(t("home.map_hint"), True, (140, 160, 185))
        surf.blit(map_hint, map_hint.get_rect(centerx=SCREEN_W // 2, top=box_y + 148))

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

    def draw_garage(self, surf, tick: int, car_idx: int, save_data: dict | None = None,
                    msg: str = ""):
        from constants import DRIVETRAIN_RWD
        surf.fill((18, 22, 30))
        head = self.title.render(t("garage.title"), True, C_MARKER_B)
        surf.blit(head, head.get_rect(centerx=SCREEN_W // 2, top=20))

        done_count = storage.count_done(save_data) if save_data else 0

        cols, tw, th = 4, 232, 210
        ox = (SCREEN_W - cols * tw) // 2
        oy = 90
        for i, ct in enumerate(CARS):
            tx = ox + (i % cols) * tw
            ty = oy + (i // cols) * th
            rect = pygame.Rect(tx + 8, ty + 8, tw - 16, th - 16)
            locked = ct.unlock_req > 0 and done_count < ct.unlock_req
            sel = (i == car_idx)

            bg_col = (44, 52, 66) if sel else (32, 38, 48)
            if locked:
                bg_col = (22, 24, 30)
            pygame.draw.rect(surf, bg_col, rect, border_radius=10)
            if sel:
                border_col = (160, 160, 160) if locked else C_MARKER_A
                pygame.draw.rect(surf, border_col, rect, 3, border_radius=10)

            if locked:
                # Dim car preview + padlock overlay
                prev = self._car_preview(ct, 80)
                prev.set_alpha(50)
                surf.blit(prev, prev.get_rect(center=(rect.centerx, rect.top + 44)))
                lk = self.big.render(t("garage.locked"), True, (140, 100, 60))
                surf.blit(lk, lk.get_rect(centerx=rect.centerx, top=rect.top + 82))
                req = self.font.render(t("garage.unlock_at", n=ct.unlock_req),
                                       True, (120, 130, 145))
                surf.blit(req, req.get_rect(centerx=rect.centerx, top=rect.top + 114))
            else:
                prev = self._car_preview(ct, 80)
                surf.blit(prev, prev.get_rect(center=(rect.centerx, rect.top + 44)))
                nm = self.big.render(ct.name, True, C_WHITE if sel else (175, 182, 195))
                surf.blit(nm, nm.get_rect(centerx=rect.centerx, top=rect.top + 82))

                dt_key = "garage.rwd" if ct.drivetrain == DRIVETRAIN_RWD else "garage.fwd"
                dt = self.font.render(t(dt_key), True, (150, 170, 200))
                surf.blit(dt, dt.get_rect(centerx=rect.centerx, top=rect.top + 106))

                bx = rect.left + 14
                self._stat_bar(surf, bx, rect.top + 130, t("garage.spd"), ct.bar_speed)
                self._stat_bar(surf, bx, rect.top + 150, t("garage.acc"), ct.bar_accel)
                self._stat_bar(surf, bx, rect.top + 170, t("garage.hnd"), ct.bar_handling)

        # Driver portrait
        if save_data and save_data["stats"].get("levels", 0) >= 3:
            style_key = storage.driving_style(save_data["stats"])
            style_name = t(style_key)
            portrait_y = oy + 2 * th + 8
            label = self.font.render(t("style.label"), True, (150, 160, 175))
            val   = self.big.render(style_name, True, C_MARKER_B)
            cx = SCREEN_W // 2
            surf.blit(label, label.get_rect(right=cx - 8, centery=portrait_y + 10))
            surf.blit(val,   val.get_rect(left=cx + 8,  centery=portrait_y + 10))

        if msg:
            ms = self.font.render(msg, True, (230, 140, 60))
            surf.blit(ms, ms.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 56))

        hint = self.font.render(t("garage.hint"), True, C_WHITE)
        surf.blit(hint, hint.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 36))
        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Level map
    # ------------------------------------------------------------------

    def draw_levelmap(self, surf, levels, done_set: set, best: dict,
                      selected_idx: int, notify_msg: str, tick: int):
        """Returns (prev_rect, next_rect) for optional mouse-click navigation
        (both are None when there is only one page)."""
        COLS   = 6
        ROWS_PP = 5          # rows per page
        PPP    = COLS * ROWS_PP   # 30 levels per page

        total       = len(levels)
        total_pages = max(1, (total + PPP - 1) // PPP)
        page        = selected_idx // PPP
        page_start  = page * PPP
        page_levels = levels[page_start: page_start + PPP]

        surf.fill((12, 15, 22))
        head = self.title.render(t("levelmap.title"), True, C_MARKER_B)
        surf.blit(head, head.get_rect(centerx=SCREEN_W // 2, top=18))

        cw, ch = 162, 100
        ox = (SCREEN_W - COLS * cw) // 2
        oy = 86

        for i, cfg in enumerate(page_levels):
            global_i = page_start + i
            col_i = i % COLS
            row_i = i // COLS
            cell_x = ox + col_i * cw
            cell_y = oy + row_i * ch
            cell = pygame.Rect(cell_x + 3, cell_y + 3, cw - 6, ch - 6)
            done = (global_i in done_set)
            sel  = (global_i == selected_idx)

            if done:
                bg = (30, 52, 34) if not sel else (40, 72, 46)
            else:
                bg = (28, 28, 36) if not sel else (38, 38, 50)
            pygame.draw.rect(surf, bg, cell, border_radius=7)
            if sel:
                pygame.draw.rect(surf, C_MARKER_B, cell, 2, border_radius=7)

            # Level number + mode tag
            num_col = C_MARKER_A if done else (130, 130, 145)
            num_s = self.font.render(str(cfg.level_num), True, num_col)
            surf.blit(num_s, (cell.left + 6, cell.top + 4))

            mode_tag = {"race": "R", "taxi": "T", "chase": "C",
                        "delivery": "D"}.get(cfg.mode, "R")
            mode_col = {"R": (120, 200, 120), "T": C_MARKER_P,
                        "C": (200, 100, 100), "D": (255, 200, 50)}[mode_tag]
            mt = self.font.render(mode_tag, True, mode_col)
            surf.blit(mt, (cell.right - 14, cell.top + 4))

            # Title (truncated) — shifted up slightly to make room for icons
            title_str = cfg.title[:14] + ("…" if len(cfg.title) > 14 else "")
            tc = (200, 210, 225) if done else (100, 108, 122)
            ts = self.font.render(title_str, True, tc)
            surf.blit(ts, ts.get_rect(centerx=cell.centerx, top=cell.top + 22))

            # Condition icons (weather / police / cameras / fuel)
            self._draw_level_icons(surf, cfg, cell, done, tick)

            # Done footer: best time + checkmark
            if done:
                key = str(global_i)
                if key in best:
                    bt = self.font.render(fmt_time(best[key]), True, (80, 200, 120))
                    surf.blit(bt, bt.get_rect(centerx=cell.centerx, top=cell.top + 62))
                done_s = self.font.render(t("levelmap.done"), True, (60, 180, 90))
                surf.blit(done_s,
                          done_s.get_rect(centerx=cell.centerx, bottom=cell.bottom - 4))

        # ------------------------------------------------------------------
        # Pagination arrows (only drawn when there is more than one page)
        # ------------------------------------------------------------------
        prev_rect = next_rect = None
        if total_pages > 1:
            rows_on_page = max(1, (len(page_levels) + COLS - 1) // COLS)
            arrow_cy = oy + rows_on_page * ch // 2

            if page > 0:
                prev_rect = pygame.Rect(ox - 42, arrow_cy - 18, 36, 36)
                pygame.draw.rect(surf, (50, 60, 80), prev_rect, border_radius=6)
                pts = [(prev_rect.right - 8, prev_rect.top + 8),
                       (prev_rect.right - 8, prev_rect.bottom - 8),
                       (prev_rect.left + 8,  prev_rect.centery)]
                pygame.draw.polygon(surf, C_MARKER_B, pts)

            if (page + 1) * PPP < total:
                next_rect = pygame.Rect(ox + COLS * cw + 6, arrow_cy - 18, 36, 36)
                pygame.draw.rect(surf, (50, 60, 80), next_rect, border_radius=6)
                pts = [(next_rect.left + 8,  next_rect.top + 8),
                       (next_rect.left + 8,  next_rect.bottom - 8),
                       (next_rect.right - 8, next_rect.centery)]
                pygame.draw.polygon(surf, C_MARKER_B, pts)

            pg_s = self.font.render(f"{page + 1} / {total_pages}", True, (110, 120, 145))
            surf.blit(pg_s, pg_s.get_rect(centerx=SCREEN_W // 2, bottom=SCREEN_H - 40))

        if notify_msg:
            rows_shown = max(1, (len(page_levels) + COLS - 1) // COLS)
            nm = self.font.render(notify_msg, True, (240, 180, 80))
            surf.blit(nm, nm.get_rect(centerx=SCREEN_W // 2, top=oy + rows_shown * ch + 6))

        hint = self.font.render(t("levelmap.hint"), True, (150, 160, 175))
        surf.blit(hint, hint.get_rect(centerx=SCREEN_W // 2, top=SCREEN_H - 26))
        draw_flag(surf, self.font)
        return prev_rect, next_rect

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
        elif cfg.mode == MODE_DELIVERY:
            goal = t("intro.goal.delivery")
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

    def _draw_level_icons(self, surf, cfg, cell: pygame.Rect,
                          done: bool, tick: int):
        """Tiny condition icons + street-width dots drawn inside a level card.

        Icons are centred horizontally between the title and the done row.
        Street-width indicator: three dots at card bottom (filled = road width).
        """
        # Collect which icons to draw
        icons: list[str] = []
        if cfg.night:                         icons.append("night")
        if cfg.rain:                          icons.append("rain")
        if getattr(cfg, "winter", False):     icons.append("winter")
        if cfg.police_count > 0:             icons.append("police")
        if cfg.camera_count > 0:            icons.append("camera")
        if cfg.fuel is not None:             icons.append("fuel")

        R   = 5       # icon radius in px
        GAP = R * 2 + 4
        total_w = len(icons) * GAP - (4 if icons else 0)
        x = cell.centerx - total_w // 2 + R
        y = cell.top + 50
        blink = (tick // 300) % 2

        for icon in icons:
            if icon == "night":
                # Crescent moon: full circle then overlay a bg-coloured offset circle
                pygame.draw.circle(surf, (120, 130, 220), (x, y), R)
                bg = (30, 52, 34) if done else (22, 26, 36)
                pygame.draw.circle(surf, bg, (x + 3, y - 2), R - 1)

            elif icon == "rain":
                pygame.draw.circle(surf, (60, 160, 220), (x, y), R - 1)
                pygame.draw.polygon(surf, (60, 160, 220),
                                    [(x - 3, y + 1), (x + 3, y + 1),
                                     (x,     y + R + 2)])

            elif icon == "winter":
                for ang_deg in (0, 60, 120):
                    ang = math.radians(ang_deg)
                    dx = int(math.cos(ang) * R)
                    dy = int(math.sin(ang) * R)
                    pygame.draw.line(surf, (190, 215, 255),
                                     (x - dx, y - dy), (x + dx, y + dy), 2)

            elif icon == "police":
                c_left  = (220, 55, 55) if blink     else (60, 80, 220)
                c_right = (60, 80, 220) if blink     else (220, 55, 55)
                pygame.draw.circle(surf, c_left,  (x - 3, y), R - 2)
                pygame.draw.circle(surf, c_right, (x + 3, y), R - 2)

            elif icon == "camera":
                pygame.draw.rect(surf, (200, 180, 50),
                                 (x - R + 1, y - R + 2, R * 2 - 2, R * 2 - 3),
                                 border_radius=1)
                pygame.draw.circle(surf, (22, 26, 36), (x, y), 2)

            elif icon == "fuel":
                pygame.draw.circle(surf, (55, 200, 100), (x, y), R - 1)

            x += GAP

        # Street-width dot indicator: 3 small circles, filled = cfg.road
        road = getattr(cfg, "road", 2)
        dr = 2                               # dot radius
        dot_spacing = dr * 2 + 5
        dot_y = cell.bottom - 9
        dot_x0 = cell.centerx - dot_spacing  # left dot of the three
        for di in range(3):
            col = ((80, 110, 180) if di < road else (38, 42, 56))
            pygame.draw.circle(surf, col,
                                (dot_x0 + di * dot_spacing, dot_y), dr)

    def _heading(self, surf, text, x, y):
        h = self.big.render(text, True, C_MARKER_A)
        surf.blit(h, (x, y))

    def _kv(self, surf, key, val, x, y):
        k = self.font.render(key, True, C_WHITE)
        surf.blit(k, (x, y))
        v = self.font.render(val, True, (165, 175, 190))
        surf.blit(v, (x + 130, y))
