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

    # --- geometry (street narrows as levels progress) ---
    cell: int = 4                  # room size in tiles
    road: int = 2                  # corridor (street) width in tiles

    # --- extended gameplay (all optional, default off) ---
    mode:       str             = MODE_RACE
    night:      bool            = False
    rain:       bool            = False
    fuel:       Optional[float] = None
    gas_count:  int             = 0
    title:      str             = ""
    passcode:   str             = ""   # type this on the home screen to jump here


LEVELS: list[LevelConfig] = [
    # ── Race: streets & rooms get tighter, traffic heavier ─────────────
    LevelConfig(1, 4, 3,  4,  None, 0.40, 0.15, 1,
                cell=5, road=2, title="First Drive",  passcode="ROAD"),
    LevelConfig(2, 5, 4,  7,  None, 0.32, 0.25, 2,
                cell=4, road=2, title="City Blocks",  passcode="TURN"),
    LevelConfig(3, 6, 5, 11,  120,  0.24, 0.40, 2,
                cell=4, road=2, title="Rush",         passcode="HONK"),
    LevelConfig(4, 6, 5, 13,  105,  0.18, 0.50, 2,
                cell=3, road=2, title="Tight Corners", passcode="LANE"),
    LevelConfig(5, 7, 6, 15,   95,  0.12, 0.58, 3,
                cell=3, road=1, title="Narrow Lanes",  passcode="DASH"),
    LevelConfig(6, 8, 6, 18,   85,  0.08, 0.65, 3,
                cell=3, road=1, title="Gridlock",      passcode="ZOOM"),

    # ── Taxi fares (bonus + advanced) ──────────────────────────────────
    LevelConfig(7, 6, 5, 11, 120, 0.22, 0.45, 2,
                cell=4, road=2, mode=MODE_TAXI, title="Taxi!", passcode="FARE"),
    LevelConfig(8, 7, 6, 16, 130, 0.16, 0.55, 3,
                cell=4, road=2, mode=MODE_TAXI, rain=True,
                title="Rainy Fare", passcode="RAIN"),
    LevelConfig(9, 7, 6, 16, 130, 0.12, 0.58, 3,
                cell=3, road=2, mode=MODE_TAXI, night=True,
                title="Night Shift", passcode="DUSK"),
    LevelConfig(10, 8, 7, 20, 160, 0.09, 0.62, 3,
                cell=3, road=1, mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=3,
                title="Long Haul", passcode="GASS"),
    LevelConfig(11, 9, 7, 24, 185, 0.06, 0.68, 3,
                cell=3, road=1, mode=MODE_TAXI, night=True, rain=True,
                fuel=FUEL_MAX, gas_count=4, title="The Gauntlet", passcode="BOSS"),
]


def level_by_passcode(code: str) -> Optional[int]:
    """Return the 0-based level index for a passcode, or None."""
    code = code.strip().upper()
    for i, cfg in enumerate(LEVELS):
        if cfg.passcode.upper() == code:
            return i
    return None
