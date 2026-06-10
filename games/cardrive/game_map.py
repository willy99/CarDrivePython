import math
import random
from collections import deque

import pygame

from constants import (
    TILE, OX, OY,
    CAR_W,
    SCREEN_W, SCREEN_H,
    C_ASPHALT, C_GRASS, C_GRASS_DARK,
    C_HOUSE_WALL, C_HOUSE_ROOF, C_HOUSE_BORDER,
    C_PAVEMENT, C_BLACK, C_WHITE, C_LANE,
    C_MARKER_A, C_MARKER_B, C_MARKER_P, C_GAS,
    C_SNOW_LIGHT, C_SNOW_DARK, C_SNOW_ROOF, C_SNOW_PAVE, C_ICE_ASPHALT,
    MODE_TAXI, MODE_DELIVERY,
    ONE_WAY_PROB, ROUNDABOUT_PROB,
    POTHOLE_RADIUS, POTHOLE_KICK, PUDDLE_KICK,
)
from level_config import LevelConfig
from traffic_light import TrafficLight


class GameMap:
    """
    Procedurally generated labyrinth map sized according to the given LevelConfig.

    Public attributes consumed by other modules:
        grid          – 2-D list, 0 = road, 1 = block
        houses        – list[pygame.Rect]
        traffic_lights – list[TrafficLight]
        tile_to_light – dict[(tx,ty) -> TrafficLight]  (corridor tiles only)
        start_pos, end_pos – (world_px, world_py) for A and B
        map_w, map_h  – pixel-level map dimensions
        pw, ph        – same, as properties
    """

    def __init__(self, cfg: LevelConfig):
        self.mx = cfg.mx
        self.my = cfg.my
        self.cell = cfg.cell                 # room size (tiles)
        self.road = cfg.road                 # street width (tiles)
        self.step = self.cell + self.road    # tiles per macro-cell
        self.map_w_tiles = OX + self.mx * self.step + 1
        self.map_h_tiles = OY + self.my * self.step + 1

        self.grid = [[1] * self.map_w_tiles for _ in range(self.map_h_tiles)]
        self.houses: list[pygame.Rect] = []
        self.traffic_lights: list[TrafficLight] = []
        self.tile_to_light: dict[tuple[int, int], TrafficLight] = {}
        self.start_pos = (TILE, TILE)
        self.end_pos   = (TILE * 2, TILE * 2)
        self.pickup_pos: tuple | None = None
        # objectives: ordered list of (pos, label, color) the player must reach
        self.objectives: list[tuple[tuple, str, tuple]] = []
        self.gas_stations: list[tuple[float, float]] = []
        # Speed cameras: (world_x, world_y, fire_cooldown_frame_until)
        self.cameras: list[list] = []
        self.winter = bool(getattr(cfg, "winter", False))

        # ---- New feature data structures ----
        # one_way: (tx,ty) → (dx,dy) allowed travel direction
        self.one_way: dict[tuple[int, int], tuple[int, int]] = {}
        # roundabout ring tiles and their flow direction
        self.roundabout_tiles: set[tuple[int, int]] = set()
        self.roundabout_dir: dict[tuple[int, int], tuple[int, int]] = {}
        self.roundabout_centers: set[tuple[int, int]] = set()
        # potholes: [wx, wy, radius, type('pothole'|'puddle'), last_hit_frame]
        self.potholes: list[list] = []
        # Internal: corridor records for one-way tagging
        self._h_corr_list: list[tuple[int, int]] = []  # (cx, cy) starts
        self._v_corr_list: list[tuple[int, int]] = []

        self._generate(cfg)
        self._pick_objectives(cfg)
        # Fix one-way directions so all objectives remain reachable from start
        self._ensure_one_way_reachable()
        self._place_gas_stations(cfg)
        self._place_cameras(cfg)

    # ------------------------------------------------------------------
    # Carving primitives
    # ------------------------------------------------------------------

    def _room(self, mx: int, my: int):
        rx, ry = OX + mx * self.step, OY + my * self.step
        for dy in range(self.cell):
            for dx in range(self.cell):
                self.grid[ry + dy][rx + dx] = 0

    def _h_corridor(self, mx: int, my: int):
        cx = OX + mx * self.step + self.cell
        cy = OY + my * self.step
        for dy in range(self.cell):
            for dx in range(self.road):
                self.grid[cy + dy][cx + dx] = 0
        self._h_corr_list.append((cx, cy))

    def _v_corridor(self, mx: int, my: int):
        cx = OX + mx * self.step
        cy = OY + my * self.step + self.cell
        for dy in range(self.road):
            for dx in range(self.cell):
                self.grid[cy + dy][cx + dx] = 0
        self._v_corr_list.append((cx, cy))

    # ------------------------------------------------------------------
    # Generation pipeline
    # ------------------------------------------------------------------

    def _generate(self, cfg: LevelConfig):
        rng = random.Random()
        visited = [[False] * self.mx for _ in range(self.my)]

        def dfs(mx, my):
            visited[my][mx] = True
            self._room(mx, my)
            dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
            rng.shuffle(dirs)
            for ddx, ddy in dirs:
                nx, ny = mx + ddx, my + ddy
                if 0 <= nx < self.mx and 0 <= ny < self.my and not visited[ny][nx]:
                    if   ddx ==  1: self._h_corridor(mx, my)
                    elif ddx == -1: self._h_corridor(nx, my)
                    elif ddy ==  1: self._v_corridor(mx, my)
                    elif ddy == -1: self._v_corridor(mx, ny)
                    dfs(nx, ny)

        dfs(rng.randint(0, self.mx - 1), rng.randint(0, self.my - 1))

        # Extra connections (loops to reduce pure-maze frustration)
        for mx in range(self.mx - 1):
            for my in range(self.my):
                if rng.random() < cfg.loop_prob:
                    self._h_corridor(mx, my)
        for mx in range(self.mx):
            for my in range(self.my - 1):
                if rng.random() < cfg.loop_prob:
                    self._v_corridor(mx, my)

        # Houses in non-road blocks
        seen = [[False] * self.map_w_tiles for _ in range(self.map_h_tiles)]
        for sy in range(self.map_h_tiles):
            for sx in range(self.map_w_tiles):
                if self.grid[sy][sx] == 1 and not seen[sy][sx]:
                    cells = self._flood(sx, sy, seen)
                    self._place_houses(cells, rng)

        # Traffic lights on a fraction of carved corridors
        self._place_traffic_lights(rng, cfg.light_prob)

        # Post-process: one-way streets, roundabouts, potholes
        self._place_one_ways(rng, cfg)
        self._place_roundabouts(rng, cfg)
        self._place_potholes(rng, cfg)

    # ------------------------------------------------------------------
    # Flood fill + house placement
    # ------------------------------------------------------------------

    def _flood(self, sx: int, sy: int, seen: list) -> list:
        cells, stack = [], [(sx, sy)]
        while stack:
            x, y = stack.pop()
            if not (0 <= x < self.map_w_tiles and 0 <= y < self.map_h_tiles):
                continue
            if seen[y][x] or self.grid[y][x] != 1:
                continue
            seen[y][x] = True
            cells.append((x, y))
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        return cells

    def _near_road(self, rect: pygame.Rect) -> bool:
        check = rect.inflate(CAR_W * 2, CAR_W * 2)
        tx0 = max(0, check.left   // TILE)
        ty0 = max(0, check.top    // TILE)
        tx1 = min(self.map_w_tiles - 1, check.right  // TILE)
        ty1 = min(self.map_h_tiles - 1, check.bottom // TILE)
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

    # ------------------------------------------------------------------
    # Traffic light placement
    # ------------------------------------------------------------------

    def _place_traffic_lights(self, rng: random.Random, light_prob: float):
        phase = 0   # stagger phases so lights don't all sync

        # Horizontal corridors
        for mx in range(self.mx - 1):
            for my in range(self.my):
                cx = OX + mx * self.step + self.cell
                cy = OY + my * self.step
                if self.grid[cy][cx] == 0 and rng.random() < light_prob:
                    self._add_h_light(cx, cy, phase)
                    phase = (phase + TrafficLight.TOTAL // 7) % TrafficLight.TOTAL

        # Vertical corridors
        for mx in range(self.mx):
            for my in range(self.my - 1):
                cx = OX + mx * self.step
                cy = OY + my * self.step + self.cell
                if self.grid[cy][cx] == 0 and rng.random() < light_prob:
                    self._add_v_light(cx, cy, phase)
                    phase = (phase + TrafficLight.TOTAL // 7) % TrafficLight.TOTAL

    def _add_h_light(self, cx: int, cy: int, phase: int):
        """Traffic light for an H-corridor (tiles x=[cx,cx+road), y=[cy,cy+cell))."""
        wx = (cx + self.road / 2) * TILE     # x-centre of corridor
        wy = (cy + self.cell / 2) * TILE     # y-centre of corridor (light pole pos)
        light = TrafficLight(wx, wy, phase)

        # Crosswalk: pedestrian walks N→S, between tile centres (always road).
        light.walk_start = (wx, float(cy * TILE + TILE // 2))
        light.walk_end   = (wx, float((cy + self.cell - 1) * TILE + TILE // 2))

        for dy in range(self.cell):
            for dx in range(self.road):
                self.tile_to_light[(cx + dx, cy + dy)] = light

        self.traffic_lights.append(light)

    def _add_v_light(self, cx: int, cy: int, phase: int):
        """Traffic light for a V-corridor (tiles x=[cx,cx+cell), y=[cy,cy+road))."""
        wx = (cx + self.cell / 2) * TILE     # x-centre of corridor (light pole pos)
        wy = (cy + self.road / 2) * TILE     # y-centre of corridor
        light = TrafficLight(wx, wy, phase)

        # Crosswalk: pedestrian walks W→E, between tile centres (always road).
        light.walk_start = (float(cx * TILE + TILE // 2),                  wy)
        light.walk_end   = (float((cx + self.cell - 1) * TILE + TILE // 2), wy)

        for dy in range(self.road):
            for dx in range(self.cell):
                self.tile_to_light[(cx + dx, cy + dy)] = light

        self.traffic_lights.append(light)

    # ------------------------------------------------------------------
    # Start / end positions
    # ------------------------------------------------------------------

    def _room_centers(self) -> list[tuple[float, float]]:
        centers = []
        for my in range(self.my):
            for mx in range(self.mx):
                wx = (OX + mx * self.step + self.cell // 2) * TILE + TILE // 2
                wy = (OY + my * self.step + self.cell // 2) * TILE + TILE // 2
                tx, ty = wx // TILE, wy // TILE
                # If this centre is a roundabout island (non-road), step to the
                # nearest cardinal neighbour that is a road tile so the car / marker
                # never spawns on the impassable island.
                if (tx, ty) in self.roundabout_centers:
                    for ddx, ddy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
                        ntx, nty = tx + ddx, ty + ddy
                        if (0 <= ntx < self.map_w_tiles
                                and 0 <= nty < self.map_h_tiles
                                and self.grid[nty][ntx] == 0):
                            wx = ntx * TILE + TILE // 2
                            wy = nty * TILE + TILE // 2
                            break
                centers.append((wx, wy))
        return centers

    @staticmethod
    def _dist(a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])

    def _max_room_dist(self, rooms) -> float:
        d = 0.0
        for i in range(len(rooms)):
            for j in range(i + 1, len(rooms)):
                d = max(d, self._dist(rooms[i], rooms[j]))
        return d or 1.0

    def _pick_objectives(self, cfg: LevelConfig):
        """
        Choose start / (pickup) / dropoff at RANDOM positions that are still
        a decent distance apart — so the route varies every play rather than
        always running corner-to-corner.
        """
        rng = random.Random()
        rooms = self._room_centers()
        max_d = self._max_room_dist(rooms)

        if cfg.mode == MODE_DELIVERY:
            # 3 delivery pairs → need start + 6 rooms (fall back to 2 pairs if few rooms)
            pairs = 3 if len(rooms) >= 7 else 2
            need  = 1 + pairs * 2
            chosen = self._pick_spread_rooms(rng, rooms, need, max_d * 0.22)
            self.start_pos = chosen[0]
            self.objectives = []
            for i in range(pairs):
                p_room = chosen[1 + i * 2]
                d_room = chosen[2 + i * 2]
                num = str(i + 1)
                self.objectives.append((p_room, f"P{num}", C_MARKER_P))
                self.objectives.append((d_room, f"D{num}", C_MARKER_B))
            self.end_pos = self.objectives[-1][0]

        elif cfg.mode == MODE_TAXI and len(rooms) >= 3:
            # Need 3 distinct rooms, each pair reasonably far apart.
            need = 3
            min_sep = max_d * 0.45
            chosen = self._pick_spread_rooms(rng, rooms, need, min_sep)
            a, pickup, b = chosen[0], chosen[1], chosen[2]
            self.start_pos  = a
            self.pickup_pos = pickup
            self.end_pos    = b
            self.objectives = [(pickup, "P", C_MARKER_P), (b, "B", C_MARKER_B)]
        else:
            need = 2
            min_sep = max_d * 0.55
            chosen = self._pick_spread_rooms(rng, rooms, need, min_sep)
            a, b = chosen[0], chosen[1]
            self.start_pos = a
            self.end_pos   = b
            self.objectives = [(b, "B", C_MARKER_B)]

    @staticmethod
    def _pick_spread_rooms(rng, rooms, need, min_sep):
        """Randomly pick `need` rooms that are mutually >= min_sep apart."""
        for _ in range(200):
            sample = rng.sample(rooms, need)
            ok = all(
                math.hypot(sample[i][0] - sample[j][0],
                           sample[i][1] - sample[j][1]) >= min_sep
                for i in range(need) for j in range(i + 1, need)
            )
            if ok:
                rng.shuffle(sample)
                return sample
        # Fallback: relax the constraint
        return rng.sample(rooms, need)

    def _place_gas_stations(self, cfg: LevelConfig):
        if cfg.gas_count <= 0:
            return
        rooms = self._room_centers()
        taken = {self.start_pos} | {o[0] for o in self.objectives}
        candidates = [r for r in rooms if r not in taken]
        rng = random.Random()
        rng.shuffle(candidates)
        self.gas_stations = candidates[: cfg.gas_count]

    def _place_cameras(self, cfg: LevelConfig):
        """Place speed cameras on a sample of road tiles along straight runs."""
        if cfg.camera_count <= 0:
            return
        rng = random.Random()
        # Prefer mid-corridor tiles (axis-aligned road flow) — less annoying
        # than placing one right at a junction.
        candidates = []
        for ty in range(self.map_h_tiles):
            for tx in range(self.map_w_tiles):
                if self.grid[ty][tx] != 0:
                    continue
                h = (0 < tx < self.map_w_tiles - 1
                     and self.grid[ty][tx - 1] == 0 and self.grid[ty][tx + 1] == 0)
                v = (0 < ty < self.map_h_tiles - 1
                     and self.grid[ty - 1][tx] == 0 and self.grid[ty + 1][tx] == 0)
                if h ^ v:
                    candidates.append((tx, ty))
        rng.shuffle(candidates)
        for tx, ty in candidates[: cfg.camera_count * 6]:
            wx = tx * TILE + TILE // 2
            wy = ty * TILE + TILE // 2
            # don't crowd existing cameras
            if all(abs(c[0] - wx) + abs(c[1] - wy) > TILE * 4 for c in self.cameras):
                self.cameras.append([wx, wy, 0])     # [x, y, cooldown_until]
            if len(self.cameras) >= cfg.camera_count:
                break

    # ------------------------------------------------------------------
    # One-way streets
    # ------------------------------------------------------------------

    def _place_one_ways(self, rng: random.Random, cfg: LevelConfig):
        """Tag a fraction of corridor tiles as one-way streets.

        Only applied from level 5 onwards so beginners can learn the roads.
        """
        if getattr(cfg, 'level_num', 99) < 5:
            return
        for cx, cy in self._h_corr_list:
            if rng.random() < ONE_WAY_PROB:
                direction = (1, 0) if rng.random() < 0.5 else (-1, 0)
                for dy in range(self.cell):
                    for dx in range(self.road):
                        self.one_way[(cx + dx, cy + dy)] = direction

        for cx, cy in self._v_corr_list:
            if rng.random() < ONE_WAY_PROB:
                direction = (0, 1) if rng.random() < 0.5 else (0, -1)
                for dy in range(self.road):
                    for dx in range(self.cell):
                        self.one_way[(cx + dx, cy + dy)] = direction

    # ------------------------------------------------------------------
    # Roundabouts
    # ------------------------------------------------------------------

    def _place_roundabouts(self, rng: random.Random, cfg: LevelConfig):
        """Convert some room-centres into mini roundabouts (diamond style).

        Requires cell >= 3.  Only applied from level 4 onwards.
        The centre tile becomes a non-road island; the 4 cardinal neighbours
        form the ring with a clockwise flow.
        """
        if getattr(cfg, 'level_num', 99) < 4 or self.cell < 3:
            return
        # Clockwise flow: N→E→S→W→N
        # Ring tile at (cx, cy-1) → go EAST (+1,0)
        # Ring tile at (cx+1, cy) → go SOUTH (0,+1)
        # Ring tile at (cx, cy+1) → go WEST (-1,0)
        # Ring tile at (cx-1, cy) → go NORTH (0,-1)
        ring_dirs = {(0, -1): (1, 0), (1, 0): (0, 1),
                     (0, 1): (-1, 0), (-1, 0): (0, -1)}

        for my in range(self.my):
            for mx in range(self.mx):
                if rng.random() > ROUNDABOUT_PROB:
                    continue
                # Centre of this room
                rx = OX + mx * self.step
                ry = OY + my * self.step
                cx = rx + self.cell // 2
                cy = ry + self.cell // 2
                # The 4 cardinal ring tiles must all be road
                ring_tiles = [(cx + ddx, cy + ddy) for ddx, ddy in ring_dirs]
                if not all(
                    0 <= tx < self.map_w_tiles
                    and 0 <= ty < self.map_h_tiles
                    and self.grid[ty][tx] == 0
                    for tx, ty in ring_tiles
                ):
                    continue
                if self.grid[cy][cx] != 0:
                    continue
                # Mark centre as island (non-road)
                self.grid[cy][cx] = 1
                self.roundabout_centers.add((cx, cy))
                # Tag the ring
                for (ddx, ddy), flow in ring_dirs.items():
                    tile = (cx + ddx, cy + ddy)
                    self.roundabout_tiles.add(tile)
                    self.roundabout_dir[tile] = flow
                # Remove any one-way tags that landed on ring tiles
                # (roundabout flow takes precedence)
                for tile in ring_tiles:
                    self.one_way.pop(tile, None)

    # ------------------------------------------------------------------
    # Potholes & puddles
    # ------------------------------------------------------------------

    def _place_potholes(self, rng: random.Random, cfg: LevelConfig):
        """Scatter potholes (and puddles on rain levels) on road tiles."""
        n = max(2, getattr(cfg, 'level_num', 1) // 3)
        is_rain = bool(getattr(cfg, 'rain', False))

        # Prefer corridor tiles for more interesting encounters
        corridor_set = set(self.one_way.keys())
        candidates = list(corridor_set) if corridor_set else []
        # Fall back to any straight road tile
        if not candidates:
            for ty in range(self.map_h_tiles):
                for tx in range(self.map_w_tiles):
                    if self.grid[ty][tx] == 0 and (tx, ty) not in self.roundabout_tiles:
                        nh = (0 < tx < self.map_w_tiles - 1
                              and self.grid[ty][tx - 1] == 0
                              and self.grid[ty][tx + 1] == 0)
                        nv = (0 < ty < self.map_h_tiles - 1
                              and self.grid[ty - 1][tx] == 0
                              and self.grid[ty + 1][tx] == 0)
                        if nh ^ nv:
                            candidates.append((tx, ty))

        rng.shuffle(candidates)
        placed = 0
        for tx, ty in candidates:
            if placed >= n:
                break
            if (tx, ty) in self.roundabout_tiles or (tx, ty) in self.roundabout_centers:
                continue
            wx = tx * TILE + rng.randint(10, TILE - 10)
            wy = ty * TILE + rng.randint(10, TILE - 10)
            if all(math.hypot(wx - p[0], wy - p[1]) > TILE * 1.5
                   for p in self.potholes):
                ptype = 'puddle' if is_rain and rng.random() < 0.45 else 'pothole'
                r = POTHOLE_RADIUS * (1 if ptype == 'pothole' else 2)
                self.potholes.append([wx, wy, r, ptype, 0])
                placed += 1

    # ------------------------------------------------------------------
    # One-way reachability repair
    # ------------------------------------------------------------------

    def _bfs_one_way_reachable(self, start_tile: tuple) -> set:
        """BFS from start_tile honouring one-way constraints.

        A move from (tx,ty) → (ntx,nty) in direction (ddx,ddy) is blocked when
        the destination tile carries a one-way tag pointing in ANY other direction.
        """
        reachable: set = {start_tile}
        q: deque = deque([start_tile])
        while q:
            tx, ty = q.popleft()
            for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ntx, nty = tx + ddx, ty + ddy
                if not (0 <= ntx < self.map_w_tiles and 0 <= nty < self.map_h_tiles):
                    continue
                if self.grid[nty][ntx] != 0:
                    continue
                if (ntx, nty) in reachable:
                    continue
                ow = self.one_way.get((ntx, nty))
                if ow is not None and ow != (ddx, ddy):
                    continue          # one-way blocks this entry direction
                reachable.add((ntx, nty))
                q.append((ntx, nty))
        return reachable

    @staticmethod
    def _goal_reachable(goal_tile: tuple, reachable: set) -> bool:
        """True when the goal tile itself OR any cardinal neighbour is reachable.

        Objectives placed on roundabout-island centres (non-road, grid!=0) are
        invisible to the BFS, but the player only needs to arrive within
        GOAL_RADIUS (~1.8 TILE), so reaching any adjacent road tile is enough.
        """
        if goal_tile in reachable:
            return True
        tx, ty = goal_tile
        return any((tx + ddx, ty + ddy) in reachable
                   for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)))

    def _ensure_one_way_reachable(self):
        """Remove any one-way tags that make start → objectives unreachable.

        Must be called AFTER _pick_objectives so start_pos and objectives
        are already set.  Iteratively strips blocking tags until the whole
        route is passable, falling back to clearing all one-ways if needed.
        """
        if not self.one_way:
            return
        start_tile = (int(self.start_pos[0]) // TILE, int(self.start_pos[1]) // TILE)
        goal_tiles = [(int(pos[0]) // TILE, int(pos[1]) // TILE)
                      for pos, _, _ in self.objectives]
        if self.pickup_pos:
            goal_tiles.append((int(self.pickup_pos[0]) // TILE,
                                int(self.pickup_pos[1]) // TILE))

        for _pass in range(12):
            reachable = self._bfs_one_way_reachable(start_tile)
            still_blocked = [g for g in goal_tiles
                             if not self._goal_reachable(g, reachable)]
            if not still_blocked:
                return          # all goals reachable — we're done

            # Find one-way tiles that are unreachable yet adjacent to the
            # reachable frontier: they are the bottleneck, remove their tags.
            to_remove = set()
            for ntx, nty in list(self.one_way.keys()):
                if (ntx, nty) in reachable:
                    continue
                ow = self.one_way[(ntx, nty)]
                for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    from_tx, from_ty = ntx - ddx, nty - ddy
                    if (from_tx, from_ty) in reachable and ow != (ddx, ddy):
                        to_remove.add((ntx, nty))
                        break
            if not to_remove:
                # Can't resolve iteratively — wipe all one-ways as last resort
                self.one_way.clear()
                return
            for tile in to_remove:
                del self.one_way[tile]

        # Safety net after max passes
        reachable = self._bfs_one_way_reachable(start_tile)
        if any(not self._goal_reachable(g, reachable) for g in goal_tiles):
            self.one_way.clear()

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def is_road(self, wx: float, wy: float) -> bool:
        tx, ty = int(wx) // TILE, int(wy) // TILE
        if 0 <= tx < self.map_w_tiles and 0 <= ty < self.map_h_tiles:
            return self.grid[ty][tx] == 0
        return False

    def road_tiles(self) -> list[tuple[int, int]]:
        return [
            (x, y)
            for y in range(self.map_h_tiles)
            for x in range(self.map_w_tiles)
            if self.grid[y][x] == 0
        ]

    @property
    def pw(self) -> int:
        return self.map_w_tiles * TILE

    @property
    def ph(self) -> int:
        return self.map_h_tiles * TILE

    # ------------------------------------------------------------------
    # Draw
    # ------------------------------------------------------------------

    def draw(self, surf, cam_x: float, cam_y: float, font, tick: int):
        tx0 = max(0, int(cam_x) // TILE)
        ty0 = max(0, int(cam_y) // TILE)
        tx1 = min(self.map_w_tiles, tx0 + SCREEN_W // TILE + 2)
        ty1 = min(self.map_h_tiles, ty0 + SCREEN_H // TILE + 2)

        # Winter swaps grass → snow, asphalt → slushy grey
        asphalt_col = C_ICE_ASPHALT if self.winter else C_ASPHALT
        ground_a = C_SNOW_LIGHT if self.winter else C_GRASS
        ground_b = C_SNOW_DARK  if self.winter else C_GRASS_DARK

        for ty in range(ty0, ty1):
            for tx in range(tx0, tx1):
                px = tx * TILE - int(cam_x)
                py = ty * TILE - int(cam_y)
                if self.grid[ty][tx] == 0:
                    pygame.draw.rect(surf, asphalt_col, (px, py, TILE, TILE))
                    self._draw_pavement_edge(surf, tx, ty, px, py)
                else:
                    col = ground_a if (tx + ty) % 2 == 0 else ground_b
                    pygame.draw.rect(surf, col, (px, py, TILE, TILE))

        # Lane markings in a SECOND pass so dashes on tile boundaries aren't
        # painted over by the next tile's asphalt fill.
        for ty in range(ty0, ty1):
            for tx in range(tx0, tx1):
                if self.grid[ty][tx] == 0:
                    self._draw_lane(surf, tx,
                                    ty,
                                    tx * TILE - int(cam_x),
                                    ty * TILE - int(cam_y))

        # One-way arrows (drawn over lane markings)
        for ty in range(ty0, ty1):
            for tx in range(tx0, tx1):
                ow = self.one_way.get((tx, ty))
                if ow:
                    self._draw_oneway_arrow(surf,
                                            tx * TILE - int(cam_x),
                                            ty * TILE - int(cam_y), ow)

        # Roundabout centre islands (non-road tiles drawn specially)
        for cx, cy in self.roundabout_centers:
            px = cx * TILE - int(cam_x)
            py = cy * TILE - int(cam_y)
            if -TILE < px < SCREEN_W + TILE and -TILE < py < SCREEN_H + TILE:
                col_fill = C_SNOW_LIGHT if self.winter else C_GRASS
                # Already drawn as grass; add a decorative ring/circle
                csx, csy = px + TILE // 2, py + TILE // 2
                pygame.draw.circle(surf, C_PAVEMENT, (csx, csy), TILE // 2 - 2)
                pygame.draw.circle(surf, col_fill,   (csx, csy), TILE // 2 - 8)
                dot = (200, 205, 215) if self.winter else (80, 155, 65)
                pygame.draw.circle(surf, dot, (csx, csy), 5)

        # Potholes / puddles (drawn on road surface)
        for ph in self.potholes:
            wx, wy, r, ptype = ph[0], ph[1], ph[2], ph[3]
            sx = int(wx - cam_x)
            sy = int(wy - cam_y)
            if -r * 2 < sx < SCREEN_W + r * 2 and -r * 2 < sy < SCREEN_H + r * 2:
                if ptype == 'puddle':
                    pygame.draw.ellipse(surf, (60, 85, 125),
                                        (sx - r, sy - int(r * 0.65), r * 2, int(r * 1.3)))
                    pygame.draw.ellipse(surf, (90, 125, 180),
                                        (sx - r + 2, sy - int(r * 0.55), r * 2 - 4, int(r * 1.1)), 1)
                else:
                    pygame.draw.ellipse(surf, (30, 27, 22),
                                        (sx - r, sy - int(r * 0.65), r * 2, int(r * 1.3)))
                    pygame.draw.ellipse(surf, (22, 18, 14),
                                        (sx - r + 2, sy - int(r * 0.55), r * 2 - 4, int(r * 1.1)), 1)

        roof_col = C_SNOW_ROOF if self.winter else C_HOUSE_ROOF
        for h in self.houses:
            hx = h.x - int(cam_x)
            hy = h.y - int(cam_y)
            if -h.width < hx < SCREEN_W and -h.height < hy < SCREEN_H:
                pygame.draw.rect(surf, C_HOUSE_WALL,   (hx, hy, h.width, h.height))
                ri = 6
                pygame.draw.rect(surf, roof_col,
                                 (hx + ri, hy + ri, h.width - ri * 2, h.height - ri * 2))
                pygame.draw.rect(surf, C_HOUSE_BORDER, (hx, hy, h.width, h.height), 2)

        # Crosswalks (drawn under traffic lights)
        for light in self.traffic_lights:
            light.draw_crosswalk(surf, cam_x, cam_y)

        # Traffic lights
        for light in self.traffic_lights:
            light.draw(surf, cam_x, cam_y)

        # Gas stations
        for gx, gy in self.gas_stations:
            self._draw_gas_station(surf, cam_x, cam_y, gx, gy, font)

        # Speed cameras
        for cam in self.cameras:
            self._draw_camera(surf, cam_x, cam_y, cam[0], cam[1], cam[2], tick)

        # Start marker + objective markers (pickup / dropoff)
        self._draw_marker(surf, cam_x, cam_y, self.start_pos, C_MARKER_A, "A", font, tick, False)
        for pos, label, color in self.objectives:
            self._draw_marker(surf, cam_x, cam_y, pos, color, label, font, tick, True)

    def _draw_gas_station(self, surf, cam_x, cam_y, gx, gy, font):
        sx = gx - cam_x
        sy = gy - cam_y
        if not (-40 < sx < SCREEN_W + 40 and -40 < sy < SCREEN_H + 40):
            return
        ix, iy = int(sx), int(sy)
        pygame.draw.rect(surf, C_BLACK, (ix - 16, iy - 16, 32, 32), border_radius=5)
        pygame.draw.rect(surf, C_GAS,   (ix - 14, iy - 14, 28, 28), border_radius=4)
        g = font.render("FUEL", True, C_BLACK)
        surf.blit(g, g.get_rect(center=(ix, iy)))

    def _draw_camera(self, surf, cam_x, cam_y, gx, gy, cooldown_until, tick):
        sx = gx - cam_x
        sy = gy - cam_y
        if not (-40 < sx < SCREEN_W + 40 and -40 < sy < SCREEN_H + 40):
            return
        ix, iy = int(sx), int(sy)
        # Pole
        pygame.draw.rect(surf, (40, 40, 40), (ix - 1, iy + 4, 2, 12))
        # Box body
        pygame.draw.rect(surf, (30, 30, 35), (ix - 8, iy - 6, 16, 12), border_radius=2)
        pygame.draw.rect(surf, (80, 80, 90), (ix - 8, iy - 6, 16, 12), 1, border_radius=2)
        # Lens
        pygame.draw.circle(surf, (140, 140, 180), (ix, iy), 3)
        # If it recently fired, draw a flash
        frames_since = tick - (cooldown_until - 90)
        if 0 < frames_since < 12:
            pygame.draw.circle(surf, (255, 255, 220), (ix, iy), 6)

    def _draw_pavement_edge(self, surf, tx: int, ty: int, px: int, py: int):
        col = C_SNOW_PAVE if self.winter else C_PAVEMENT
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = tx + ddx, ty + ddy
            if 0 <= nx < self.map_w_tiles and 0 <= ny < self.map_h_tiles \
                    and self.grid[ny][nx] == 1:
                if   ddx ==  1: brd = (px + TILE - 6, py, 6, TILE)
                elif ddx == -1: brd = (px, py, 6, TILE)
                elif ddy ==  1: brd = (px, py + TILE - 6, TILE, 6)
                else:           brd = (px, py, TILE, 6)
                pygame.draw.rect(surf, col, brd)

    def _draw_lane(self, surf, tx: int, ty: int, px: int, py: int):
        """
        Dashed CENTRE line dividing the street into two halves.

        For each road tile we measure how far the road extends to each side
        (distance transform).  A tile sits on the centre line of a street
        when it is the middle of the narrow axis of that street; for
        even-width streets the line falls on the boundary between the two
        central tiles.  Plazas/intersections (equal extents) get no line.
        """
        cap = 8

        def reach(ddx, ddy):
            n, x, y = 0, tx, ty
            for _ in range(cap):
                x += ddx; y += ddy
                if 0 <= x < self.map_w_tiles and 0 <= y < self.map_h_tiles \
                        and self.grid[y][x] == 0:
                    n += 1
                else:
                    break
            return n

        dl, dr = reach(-1, 0), reach(1, 0)
        du, dd = reach(0, -1), reach(0, 1)
        h_ext, v_ext = dl + dr + 1, du + dd + 1

        if v_ext < h_ext:                 # horizontal street → horizontal line
            if du == dd:
                self._dash_h(surf, px, py + TILE // 2)
            elif du == dd - 1:            # even width → centre boundary
                self._dash_h(surf, px, py + TILE)
        elif h_ext < v_ext:               # vertical street → vertical line
            if dl == dr:
                self._dash_v(surf, px + TILE // 2, py)
            elif dl == dr - 1:
                self._dash_v(surf, px + TILE, py)

    def _dash_h(self, surf, px, y):
        x = px + 2
        while x < px + TILE - 2:
            pygame.draw.line(surf, C_LANE, (x, y), (min(x + 13, px + TILE - 2), y), 2)
            x += 22

    def _dash_v(self, surf, x, py):
        y = py + 2
        while y < py + TILE - 2:
            pygame.draw.line(surf, C_LANE, (x, y), (x, min(y + 13, py + TILE - 2)), 2)
            y += 22

    def _draw_oneway_arrow(self, surf, px: int, py: int, direction: tuple):
        """Small triangle arrow pointing in the allowed travel direction."""
        cx, cy = px + TILE // 2, py + TILE // 2
        dx, dy = direction
        length = 13
        tip   = (cx + dx * length,          cy + dy * length)
        base  = (cx - dx * length,          cy - dy * length)
        # perpendicular
        pdx, pdy = -dy, dx
        left  = (base[0] + pdx * 6,  base[1] + pdy * 6)
        right = (base[0] - pdx * 6,  base[1] - pdy * 6)
        col = (190, 175, 55) if not self.winter else (170, 180, 200)
        pygame.draw.polygon(surf, col, [tip, left, right])
        pygame.draw.polygon(surf, (40, 35, 10) if not self.winter else (90, 95, 110),
                            [tip, left, right], 1)

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
