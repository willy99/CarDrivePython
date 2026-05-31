import math
import random

import pygame

from constants import (
    TILE, MAP_W, MAP_H, MX, MY, CELL, ROAD, STEP, OX, OY,
    CAR_W,
    SCREEN_W, SCREEN_H,
    C_ASPHALT, C_GRASS, C_GRASS_DARK,
    C_HOUSE_WALL, C_HOUSE_ROOF, C_HOUSE_BORDER,
    C_PAVEMENT, C_BLACK,
    C_MARKER_A, C_MARKER_B,
)


class GameMap:
    """
    Procedurally generated labyrinth map.

    Generation pipeline:
      1. DFS spanning tree  – guarantees every room is reachable
      2. ~30 % extra corridors – adds loops so it doesn't feel like a pure maze
      3. Flood-fill blocks  – places houses in non-road areas, validated not to
                              cover road tiles
    """

    def __init__(self):
        self.grid = [[1] * MAP_W for _ in range(MAP_H)]   # 1=block, 0=road
        self.houses: list[pygame.Rect] = []
        self.start_pos = (TILE, TILE)
        self.end_pos   = (TILE * 2, TILE * 2)
        self._generate()
        self._pick_start_end()

    # ------------------------------------------------------------------
    # Carving primitives
    # ------------------------------------------------------------------

    def _room(self, mx: int, my: int):
        rx, ry = OX + mx * STEP, OY + my * STEP
        for dy in range(CELL):
            for dx in range(CELL):
                self.grid[ry + dy][rx + dx] = 0

    def _h_corridor(self, mx: int, my: int):
        """Open the 2-tile gap east of room (mx, my)."""
        cx = OX + mx * STEP + CELL
        cy = OY + my * STEP
        for dy in range(CELL):
            for dx in range(ROAD):
                self.grid[cy + dy][cx + dx] = 0

    def _v_corridor(self, mx: int, my: int):
        """Open the 2-tile gap south of room (mx, my)."""
        cx = OX + mx * STEP
        cy = OY + my * STEP + CELL
        for dy in range(ROAD):
            for dx in range(CELL):
                self.grid[cy + dy][cx + dx] = 0

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    def _generate(self):
        rng = random.Random()
        visited = [[False] * MX for _ in range(MY)]

        def dfs(mx, my):
            visited[my][mx] = True
            self._room(mx, my)
            dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
            rng.shuffle(dirs)
            for ddx, ddy in dirs:
                nx, ny = mx + ddx, my + ddy
                if 0 <= nx < MX and 0 <= ny < MY and not visited[ny][nx]:
                    if   ddx ==  1: self._h_corridor(mx, my)
                    elif ddx == -1: self._h_corridor(nx, my)
                    elif ddy ==  1: self._v_corridor(mx, my)
                    elif ddy == -1: self._v_corridor(mx, ny)
                    dfs(nx, ny)

        dfs(rng.randint(0, MX - 1), rng.randint(0, MY - 1))

        # Extra connections to break the pure-maze feeling
        for mx in range(MX - 1):
            for my in range(MY):
                if rng.random() < 0.30:
                    self._h_corridor(mx, my)
        for mx in range(MX):
            for my in range(MY - 1):
                if rng.random() < 0.30:
                    self._v_corridor(mx, my)

        # Place houses in non-road blocks
        seen = [[False] * MAP_W for _ in range(MAP_H)]
        for sy in range(MAP_H):
            for sx in range(MAP_W):
                if self.grid[sy][sx] == 1 and not seen[sy][sx]:
                    cells = self._flood(sx, sy, seen)
                    self._place_houses(cells, rng)

    def _flood(self, sx: int, sy: int, seen: list) -> list:
        cells, stack = [], [(sx, sy)]
        while stack:
            x, y = stack.pop()
            if not (0 <= x < MAP_W and 0 <= y < MAP_H):
                continue
            if seen[y][x] or self.grid[y][x] != 1:
                continue
            seen[y][x] = True
            cells.append((x, y))
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        return cells

    def _near_road(self, rect: pygame.Rect) -> bool:
        """
        True if *rect* (expanded by one car-width) covers any road tile.
        Rejects houses that would block or be too close to a driveable path.
        """
        check = rect.inflate(CAR_W * 2, CAR_W * 2)
        tx0 = max(0, check.left   // TILE)
        ty0 = max(0, check.top    // TILE)
        tx1 = min(MAP_W - 1, check.right  // TILE)
        ty1 = min(MAP_H - 1, check.bottom // TILE)
        for ty in range(ty0, ty1 + 1):
            for tx in range(tx0, tx1 + 1):
                if self.grid[ty][tx] == 0:
                    return True
        return False

    def _place_houses(self, cells: list, rng: random.Random):
        if len(cells) < 2:
            return
        xs = [c[0] for c in cells]
        ys = [c[1] for c in cells]
        bx0 = min(xs) * TILE;  bx1 = (max(xs) + 1) * TILE
        by0 = min(ys) * TILE;  by1 = (max(ys) + 1) * TILE
        bw, bh = bx1 - bx0, by1 - by0
        pad = 8
        n = rng.randint(1, max(1, len(cells) // 4))
        placed: list[pygame.Rect] = []
        for _ in range(n * 20):
            if len(placed) >= n:
                break
            hw = rng.randint(30, max(30, bw - pad * 2))
            hh = rng.randint(30, max(30, bh - pad * 2))
            hx = bx0 + rng.randint(pad, max(pad, bw - hw - pad))
            hy = by0 + rng.randint(pad, max(pad, bh - hh - pad))
            rect = pygame.Rect(hx, hy, hw, hh)
            if (not any(rect.inflate(6, 6).colliderect(p) for p in placed)
                    and not self._near_road(rect)):
                placed.append(rect)
                self.houses.append(rect)

    def _pick_start_end(self):
        """Start = A, end = B: the two room centres farthest apart."""
        rooms = [
            (
                (OX + mx * STEP + CELL // 2) * TILE + TILE // 2,
                (OY + my * STEP + CELL // 2) * TILE + TILE // 2,
            )
            for my in range(MY)
            for mx in range(MX)
        ]
        best_d, a, b = 0.0, rooms[0], rooms[-1]
        for i in range(len(rooms)):
            for j in range(i + 1, len(rooms)):
                d = math.hypot(rooms[i][0] - rooms[j][0],
                               rooms[i][1] - rooms[j][1])
                if d > best_d:
                    best_d, a, b = d, rooms[i], rooms[j]
        self.start_pos, self.end_pos = a, b

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def is_road(self, wx: float, wy: float) -> bool:
        tx, ty = int(wx) // TILE, int(wy) // TILE
        if 0 <= tx < MAP_W and 0 <= ty < MAP_H:
            return self.grid[ty][tx] == 0
        return False

    def road_tiles(self) -> list[tuple[int, int]]:
        return [
            (x, y)
            for y in range(MAP_H)
            for x in range(MAP_W)
            if self.grid[y][x] == 0
        ]

    @property
    def pw(self) -> int:
        return MAP_W * TILE

    @property
    def ph(self) -> int:
        return MAP_H * TILE

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float, font, tick: int):
        tx0 = max(0, int(cam_x) // TILE)
        ty0 = max(0, int(cam_y) // TILE)
        tx1 = min(MAP_W, tx0 + SCREEN_W // TILE + 2)
        ty1 = min(MAP_H, ty0 + SCREEN_H // TILE + 2)

        for ty in range(ty0, ty1):
            for tx in range(tx0, tx1):
                px = tx * TILE - int(cam_x)
                py = ty * TILE - int(cam_y)
                if self.grid[ty][tx] == 0:
                    pygame.draw.rect(surf, C_ASPHALT, (px, py, TILE, TILE))
                    self._draw_pavement_edge(surf, tx, ty, px, py)
                else:
                    col = C_GRASS if (tx + ty) % 2 == 0 else C_GRASS_DARK
                    pygame.draw.rect(surf, col, (px, py, TILE, TILE))

        for h in self.houses:
            hx = h.x - int(cam_x)
            hy = h.y - int(cam_y)
            if -h.width < hx < SCREEN_W and -h.height < hy < SCREEN_H:
                pygame.draw.rect(surf, C_HOUSE_WALL,   (hx, hy, h.width, h.height))
                ri = 6
                pygame.draw.rect(surf, C_HOUSE_ROOF,
                                 (hx + ri, hy + ri, h.width - ri * 2, h.height - ri * 2))
                pygame.draw.rect(surf, C_HOUSE_BORDER, (hx, hy, h.width, h.height), 2)

        self._draw_marker(surf, cam_x, cam_y, self.start_pos, C_MARKER_A, "A", font, tick, False)
        self._draw_marker(surf, cam_x, cam_y, self.end_pos,   C_MARKER_B, "B", font, tick, True)

    def _draw_pavement_edge(self, surf, tx: int, ty: int, px: int, py: int):
        """Draw a kerb strip on road tiles that border a non-road tile."""
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = tx + ddx, ty + ddy
            if 0 <= nx < MAP_W and 0 <= ny < MAP_H and self.grid[ny][nx] == 1:
                if   ddx ==  1: brd = (px + TILE - 6, py, 6, TILE)
                elif ddx == -1: brd = (px, py, 6, TILE)
                elif ddy ==  1: brd = (px, py + TILE - 6, TILE, 6)
                else:           brd = (px, py, TILE, 6)
                pygame.draw.rect(surf, C_PAVEMENT, brd)

    def _draw_marker(self, surf, cam_x, cam_y, pos, color, label,
                     font, tick: int, pulse: bool):
        sx = pos[0] - cam_x
        sy = pos[1] - cam_y
        if not (-80 < sx < SCREEN_W + 80 and -80 < sy < SCREEN_H + 80):
            return
        r = 22 + (int(5 * math.sin(tick * 0.005)) if pulse else 0)
        pygame.draw.circle(surf, color,   (int(sx), int(sy)), r)
        pygame.draw.circle(surf, C_BLACK, (int(sx), int(sy)), r, 2)
        lbl = font.render(label, True, C_BLACK)
        surf.blit(lbl, lbl.get_rect(center=(int(sx), int(sy))))
