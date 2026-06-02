import math

import pygame

from constants import (
    SCREEN_W, SCREEN_H, TILE,
    C_MARKER_A, C_MARKER_B,
)

# Mini-map palette
_C_ROAD   = (75,  75,  82)
_C_BLOCK  = (45,  98,  42)
_C_HOUSE  = (130, 100, 65)
_C_NPC    = (210, 140, 50)
_C_PLAYER = (80,  165, 255)
_C_BORDER = (160, 160, 160)
_C_VIEW   = (220, 220, 220)   # camera viewport rectangle

MAX_DIM  = 210    # pixels – largest side of the mini-map
MARGIN   =  12    # screen-edge gap (bottom-right corner)
ALPHA_BG = 180    # background alpha


class MiniMap:
    """
    Renders a scaled-down overview of the entire map.

    The static layer (tiles + houses) is pre-rendered once at level start.
    Dynamic elements (player, NPCs, markers, viewport frame) are drawn
    on top every frame.
    """

    def __init__(self, game_map):
        self._build(game_map)

    # ------------------------------------------------------------------
    # Build (called once per level)
    # ------------------------------------------------------------------

    def _build(self, game_map):
        mw = game_map.map_w_tiles
        mh = game_map.map_h_tiles

        # Keep aspect ratio, fit within MAX_DIM × MAX_DIM
        if mw >= mh:
            self.w = MAX_DIM
            self.h = max(1, round(MAX_DIM * mh / mw))
        else:
            self.h = MAX_DIM
            self.w = max(1, round(MAX_DIM * mw / mh))

        # Scale: world-pixel → mini-pixel
        self.sx = self.w / (mw * TILE)
        self.sy = self.h / (mh * TILE)

        # Pre-render tiles
        self._base = pygame.Surface((self.w, self.h))
        self._render_tiles(game_map)
        self._render_houses(game_map)

    def _render_tiles(self, game_map):
        mw = game_map.map_w_tiles
        mh = game_map.map_h_tiles
        for ty in range(mh):
            for tx in range(mw):
                # Pixel boundaries for this tile (no gaps, no overlaps)
                x0 = round(tx       * TILE * self.sx)
                x1 = round((tx + 1) * TILE * self.sx)
                y0 = round(ty       * TILE * self.sy)
                y1 = round((ty + 1) * TILE * self.sy)
                col = _C_ROAD if game_map.grid[ty][tx] == 0 else _C_BLOCK
                pygame.draw.rect(self._base, col,
                                 (x0, y0, max(1, x1 - x0), max(1, y1 - y0)))

    def _render_houses(self, game_map):
        for h in game_map.houses:
            hx = round(h.x * self.sx)
            hy = round(h.y * self.sy)
            hw = max(1, round(h.width  * self.sx))
            hh = max(1, round(h.height * self.sy))
            pygame.draw.rect(self._base, _C_HOUSE, (hx, hy, hw, hh))

    # ------------------------------------------------------------------
    # Per-frame draw
    # ------------------------------------------------------------------

    def draw(self, surf, car, game_map, npcs, cam_x: float, cam_y: float,
             tick: int = 0, target_pos=None):
        ox = SCREEN_W - self.w - MARGIN
        oy = SCREEN_H - self.h - MARGIN

        # Semi-transparent background
        bg = pygame.Surface((self.w, self.h))
        bg.fill((0, 0, 0))
        bg.set_alpha(ALPHA_BG)
        surf.blit(bg, (ox, oy))

        # Static base (tiles + houses)
        surf.blit(self._base, (ox, oy))

        # Camera viewport rectangle
        vx = round(cam_x * self.sx)
        vy = round(cam_y * self.sy)
        vw = max(2, round(SCREEN_W * self.sx))
        vh = max(2, round(SCREEN_H * self.sy))
        pygame.draw.rect(surf, _C_VIEW, (ox + vx, oy + vy, vw, vh), 1)

        # Start marker (steady)
        self._dot(surf, ox, oy, *game_map.start_pos, C_MARKER_A, r=3)

        # NPC cars
        for npc in npcs:
            self._dot(surf, ox, oy, npc.x, npc.y, _C_NPC, r=2)

        # Objective markers (P / B) — blink like a lighthouse; the CURRENT
        # target blinks strongest so you always know where to navigate.
        for pos, _label, col in game_map.objectives:
            is_target = (target_pos is not None and pos == target_pos)
            self._blink_marker(surf, ox, oy, pos[0], pos[1], col, tick, is_target)

        # Player car — filled circle + direction tick
        px, py = self._m(car.x, car.y)
        pygame.draw.circle(surf, _C_PLAYER, (ox + px, oy + py), 3)
        rad = math.radians(car.angle)
        tx2 = ox + px + round(math.cos(rad) * 5)
        ty2 = oy + py + round(math.sin(rad) * 5)
        pygame.draw.line(surf, _C_PLAYER, (ox + px, oy + py), (tx2, ty2), 1)

        # Border
        pygame.draw.rect(surf, _C_BORDER,
                         (ox - 1, oy - 1, self.w + 2, self.h + 2), 1)

    def _blink_marker(self, surf, ox, oy, wx, wy, col, tick, strong):
        """Pulsing concentric rings — a lighthouse beacon on the minimap."""
        mx, my = self._m(wx, wy)
        cx, cy = ox + mx, oy + my
        speed = 0.010 if strong else 0.005
        glow = 0.5 + 0.5 * math.sin(tick * speed)   # 0..1

        # Expanding outer ring (the "beam")
        max_r = 11 if strong else 7
        ring_r = int(3 + glow * (max_r - 3))
        pygame.draw.circle(surf, col, (cx, cy), ring_r, 1)
        if strong and glow > 0.6:
            pygame.draw.circle(surf, col, (cx, cy), ring_r + 3, 1)

        # Solid core (brighter for the active target)
        core = tuple(min(255, int(c + (60 if strong else 0))) for c in col)
        pygame.draw.circle(surf, core, (cx, cy), 4 if strong else 3)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _m(self, wx: float, wy: float) -> tuple[int, int]:
        """World-pixel coords → mini-map pixel coords."""
        return round(wx * self.sx), round(wy * self.sy)

    def _dot(self, surf, ox, oy, wx, wy, col, r=2):
        mx, my = self._m(wx, wy)
        pygame.draw.circle(surf, col, (ox + mx, oy + my), r)
