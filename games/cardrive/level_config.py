from dataclasses import dataclass
from typing import Optional

from constants import MODE_RACE, MODE_TAXI, FUEL_MAX


@dataclass(frozen=True)
class LevelConfig:
    level_num:      int
    mx:             int            # macro-grid width  (rooms)
    my:             int            # macro-grid height (rooms)
    npc_count:      int
    countdown_s:    Optional[int]  # None = no time limit
    loop_prob:      float          # extra-corridor probability (lower = tighter maze)
    light_prob:     float          # fraction of carved corridors that get a traffic light
    peds_per_light: int            # pedestrians spawned side-by-side on each crosswalk

    # --- extended gameplay (all optional, default off) ---
    mode:       str             = MODE_RACE   # MODE_RACE or MODE_TAXI
    night:      bool            = False        # darkness + headlights
    rain:       bool            = False        # reduced grip + rain visuals
    fuel:       Optional[float] = None         # starting fuel (None = unlimited)
    gas_count:  int             = 0            # number of gas stations to place
    title:      str             = ""           # optional name shown on the level


LEVELS: list[LevelConfig] = [
    # ── Core race levels ───────────────────────────────────────────────
    LevelConfig(1, 5, 4,  6,  None, 0.35, 0.20, 1),
    LevelConfig(2, 6, 5, 10,  120,  0.28, 0.35, 2),
    LevelConfig(3, 7, 6, 14,   90,  0.20, 0.50, 2),
    LevelConfig(4, 8, 7, 18,   70,  0.12, 0.60, 3),
    LevelConfig(5, 9, 8, 22,   55,  0.06, 0.70, 3),

    # ── Bonus: Taxi mode ───────────────────────────────────────────────
    LevelConfig(6, 7, 6, 14, 110, 0.22, 0.45, 2,
                mode=MODE_TAXI, title="Taxi!"),

    # ── Advanced: bigger maps, weather, night, fuel ────────────────────
    LevelConfig(7, 9, 7, 20, 120, 0.14, 0.55, 3,
                mode=MODE_TAXI, rain=True, title="Rainy Fare"),

    LevelConfig(8, 9, 8, 22, 130, 0.10, 0.60, 3,
                mode=MODE_TAXI, night=True, title="Night Shift"),

    LevelConfig(9, 10, 8, 24, 150, 0.08, 0.62, 3,
                mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=3,
                title="Long Haul"),

    LevelConfig(10, 11, 9, 28, 170, 0.05, 0.68, 3,
                mode=MODE_TAXI, night=True, rain=True,
                fuel=FUEL_MAX, gas_count=4, title="The Gauntlet"),
]
