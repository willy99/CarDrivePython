import pygame

from constants import (
    SCREEN_W, SCREEN_H,
    C_WHITE, C_BLACK, C_MARKER_A, C_MARKER_B, C_MARKER_P, C_GAS,
    MODE_TAXI, MODE_CHASE
)
from car import render_car
from car_types import CARS
import i18n
from i18n import t

# ------------------------------------------------------------------
# UI Config & Palette
# ------------------------------------------------------------------

class Palette:
    BG = (18, 22, 30)
    TEXT_DIM = (150, 160, 175)
    TEXT_MID = (170, 180, 195)
    TEXT_LIGHT = (190, 200, 215)
    TEXT_DANGER = (235, 110, 90)
    UI_DARK = (32, 38, 48)
    UI_ACTIVE = (44, 52, 66)
    BOX_BG = (40, 48, 60)
    SUCCESS = (90, 200, 120)
    WARNING = (220, 180, 60)
    DANGER = (220, 90, 70)
    # Mode colors
    NIGHT = (110, 130, 180)
    RAIN = (150, 170, 210)
    COPS = (150, 1, 1)

FLAG_RECT = pygame.Rect(75, 60, 52, 30)

def draw_flag(surf, font):
    """Draw the CURRENT language's flag + 2-letter code; returns FLAG_RECT."""
    fw = 30
    flag = pygame.Rect(FLAG_RECT.x, FLAG_RECT.y + 3, fw, FLAG_RECT.h - 8)
    lang = i18n.get_lang()
    
    if lang == "uk":
        half = flag.h // 2
        pygame.draw.rect(surf, (0, 87, 183), (flag.x, flag.y, flag.w, half))
        pygame.draw.rect(surf, (255, 215, 0), (flag.x, flag.y + half, flag.w, flag.h - half))
        code = "UA"
    else:
        pygame.draw.rect(surf, (240, 240, 245), flag) # St George
        pygame.draw.rect(surf, (200, 30, 40), (flag.x, flag.centery - 2, flag.w, 4))
        pygame.draw.rect(surf, (200, 30, 40), (flag.centerx - 2, flag.y, 4, flag.h))
        code = "EN"
        
    pygame.draw.rect(surf, C_BLACK, flag, 1)
    surf.blit(font.render(code, True, C_WHITE), (flag.right + 6, FLAG_RECT.y + 6))


class ScreenRenderer:
    def __init__(self, font, big_font, title_font):
        self.font = font
        self.big = big_font
        self.title = title_font

    # ------------------------------------------------------------------
    # Universal Helpers
    # ------------------------------------------------------------------

    def _draw_text(self, surf, text, font, color, **rect_kwargs):
        """Helper to render and blit text with given alignment (e.g., centerx=100, top=50)."""
        rendered = font.render(text, True, color)
        rect = rendered.get_rect(**rect_kwargs)
        surf.blit(rendered, rect)
        return rect

    # ------------------------------------------------------------------
    # Home / title screen
    # ------------------------------------------------------------------

    def draw_home(self, surf, tick: int, code_input: str, code_msg: str):
        surf.fill(Palette.BG)
        cx = SCREEN_W // 2

        # Titles
        self._draw_text(surf, "CARDRIVE", self.title, C_MARKER_B, centerx=cx, top=54)
        self._draw_text(surf, t("home.subtitle"), self.font, Palette.TEXT_DIM, centerx=cx, top=120)

        # Info Columns
        left_x, right_x, y0 = 80, 560, 175
        self._heading(surf, t("home.howto"), left_x, y0)
        self._heading(surf, t("home.modes"), right_x, y0)

        # Controls List
        rows = [
            (t("home.k.arrows"),  t("home.v.arrows")),
            (t("home.k.lr"),      t("home.v.lr")),
            (t("home.k.honk"),    t("home.v.honk")),
            (t("home.k.goal"),    t("home.v.goal")),
            (t("home.k.red"),     t("home.v.red")),
            (t("home.k.people"),  t("home.v.people")),
            (t("home.k.restart"), t("home.v.restart")),
        ]
        for i, (k, v) in enumerate(rows):
            self._kv(surf, k, v, left_x, y0 + 38 + (i * 32))

        # Modes List
        modes = [
            (C_MARKER_P,    t("home.m.taxi"),  t("home.mv.taxi")),
            (C_GAS,         t("home.m.fuel"),  t("home.mv.fuel")),
            (Palette.NIGHT, t("home.m.night"), t("home.mv.night")),
            (Palette.RAIN,  t("home.m.rain"),  t("home.mv.rain")),
            (Palette.COPS,  t("home.m.cops"),  t("home.mv.cops")),
        ]
        for i, (col, k, v) in enumerate(modes):
            y_pos = y0 + 38 + (i * 32)
            pygame.draw.circle(surf, col, (right_x + 6, y_pos + 8), 6)
            self._kv(surf, k, v, right_x + 22, y_pos)

        # Start & Passcode
        box_y = SCREEN_H - 150
        self._draw_text(surf, t("home.start"), self.big, C_WHITE, centerx=cx, top=box_y)
        self._draw_text(surf, t("home.code_prompt"), self.font, Palette.TEXT_MID, centerx=cx, top=box_y + 56)

        # Passcode Box
        cursor = "_" if (tick // 400) % 2 == 0 else " "
        code_disp = (code_input + cursor) if len(code_input) < 6 else code_input
        box_surf = self.big.render(code_disp or cursor, True, C_MARKER_A)
        box_rect = box_surf.get_rect(centerx=cx, top=box_y + 80)
        
        pygame.draw.rect(surf, Palette.BOX_BG, box_rect.inflate(40, 16), border_radius=6)
        surf.blit(box_surf, box_rect)

        if code_msg:
            self._draw_text(surf, code_msg, self.font, Palette.TEXT_DANGER, centerx=cx, top=box_y + 124)

        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Garage / car selection
    # ------------------------------------------------------------------

    def _car_preview(self, ctype, size):
        s = pygame.Surface((46, 46), pygame.SRCALPHA)
        render_car(s, 23, 23, -90, ctype) # facing up, showroom style
        return pygame.transform.scale(s, (size, size))

    def _stat_bar(self, surf, x, y, label, frac):
        self._draw_text(surf, label, self.font, Palette.TEXT_DIM, left=x, top=y - 3)
        bx, bw, bh = x + 44, 110, 9
        
        pygame.draw.rect(surf, Palette.UI_DARK, (bx, y, bw, bh), border_radius=3)
        
        col = Palette.SUCCESS if frac > 0.66 else Palette.WARNING if frac > 0.33 else Palette.DANGER
        pygame.draw.rect(surf, col, (bx, y, int(bw * frac), bh), border_radius=3)

    def draw_garage(self, surf, tick: int, car_idx: int):
        from constants import DRIVETRAIN_RWD
        surf.fill(Palette.BG)
        cx = SCREEN_W // 2

        self._draw_text(surf, t("garage.title"), self.title, C_MARKER_B, centerx=cx, top=34)

        # Grid Layout
        cols, tw, th = 4, 232, 250
        ox = (SCREEN_W - cols * tw) // 2
        oy = 120

        for i, ct in enumerate(CARS):
            tx = ox + (i % cols) * tw
            ty = oy + (i // cols) * th
            rect = pygame.Rect(tx + 8, ty + 8, tw - 16, th - 16)
            sel = (i == car_idx)
            
            # Card Background
            pygame.draw.rect(surf, Palette.UI_ACTIVE if sel else Palette.UI_DARK, rect, border_radius=10)
            if sel:
                pygame.draw.rect(surf, C_MARKER_A, rect, 3, border_radius=10)

            # Car Info
            prev = self._car_preview(ct, 92)
            surf.blit(prev, prev.get_rect(center=(rect.centerx, rect.top + 52)))
            self._draw_text(surf, ct.name, self.big, C_WHITE if sel else Palette.TEXT_MID, centerx=rect.centerx, top=rect.top + 98)

            dt_key = "garage.rwd" if ct.drivetrain == DRIVETRAIN_RWD else "garage.fwd"
            self._draw_text(surf, t(dt_key), self.font, Palette.TEXT_DIM, centerx=rect.centerx, top=rect.top + 128)

            # Stats
            bx = rect.left + 16
            self._stat_bar(surf, bx, rect.top + 152, t("garage.spd"), ct.bar_speed)
            self._stat_bar(surf, bx, rect.top + 174, t("garage.acc"), ct.bar_accel)
            self._stat_bar(surf, bx, rect.top + 196, t("garage.hnd"), ct.bar_handling)

        self._draw_text(surf, t("garage.hint"), self.big, C_WHITE, centerx=cx, top=SCREEN_H - 64)
        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Level intro screen
    # ------------------------------------------------------------------

    def draw_intro(self, surf, cfg, tick: int):
        surf.fill(Palette.BG)
        cx = SCREEN_W // 2

        self._draw_text(surf, t("intro.level", n=cfg.level_num), self.title, C_MARKER_B, centerx=cx, top=70)
        if cfg.title:
            self._draw_text(surf, cfg.title, self.big, C_WHITE, centerx=cx, top=140)

        narrative_y = 205
        line = i18n.narrative(cfg.title) or getattr(cfg, "narrative", "")
        if line:
            self._draw_text(surf, f'“{line}”', self.font, (215, 200, 140), centerx=cx, top=narrative_y)
            narrative_y += 30

        # Goal mapping
        goal_keys = {MODE_TAXI: "intro.goal.taxi", MODE_CHASE: "intro.goal.chase"}
        goal = t(goal_keys.get(cfg.mode, "intro.goal.race"))
        self._draw_text(surf, goal, self.font, Palette.TEXT_LIGHT, centerx=cx, top=narrative_y)

        # Chips
        for i, (label, value, col) in enumerate(self._difficulty_chips(cfg)):
            self._chip(surf, label, value, col, narrative_y + 55 + (i * 40))

        # Winter tips
        if getattr(cfg, "winter", False):
            self._draw_text(surf, t("intro.tip1"), self.font, (210, 220, 240), centerx=cx, top=SCREEN_H - 175)
            self._draw_text(surf, t("intro.tip2"), self.font, (200, 200, 220), centerx=cx, top=SCREEN_H - 152)

        self._draw_text(surf, t("intro.code", code=cfg.passcode), self.font, (150, 200, 150), centerx=cx, top=SCREEN_H - 120)

        if (tick // 500) % 2 == 0:
            self._draw_text(surf, t("intro.begin"), self.big, C_WHITE, centerx=cx, top=SCREEN_H - 76)

        draw_flag(surf, self.font)

    # ------------------------------------------------------------------
    # Component Helpers
    # ------------------------------------------------------------------

    def _difficulty_chips(self, cfg):
        size = t("chip.rooms", w=cfg.mx, h=cfg.my)
        street_key = {1: "street.very_narrow", 2: "street.narrow", 3: "street.wide"}.get(cfg.road, "street.narrow")
        
        traffic_key = "traffic.light" if cfg.npc_count <= 8 else "traffic.moderate" if cfg.npc_count <= 16 else "traffic.heavy"
        traffic = t("traffic.cars", lvl=t(traffic_key), n=cfg.npc_count)
        time_val = t("time.nolimit") if cfg.countdown_s is None else t("time.secs", n=cfg.countdown_s)
        
        chips = [
            (t("chip.map"),     size,           (90, 140, 200)),
            (t("chip.streets"), t(street_key),  (200, 160, 60)),
            (t("chip.traffic"), traffic,        (200, 110, 70)),
            (t("chip.time"),    time_val,       (180, 80, 80)),
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
        self._draw_text(surf, label, self.font, Palette.TEXT_DIM, right=cx - 14, centery=y)
        pygame.draw.circle(surf, col, (cx, y), 5)
        self._draw_text(surf, value, self.font, C_WHITE, left=cx + 14, centery=y)

    def _heading(self, surf, text, x, y):
        self._draw_text(surf, text, self.big, C_MARKER_A, left=x, top=y)

    def _kv(self, surf, key, val, x, y):
        self._draw_text(surf, key, self.font, C_WHITE, left=x, top=y)
        self._draw_text(surf, val, self.font, Palette.TEXT_DIM, left=x + 130, top=y)