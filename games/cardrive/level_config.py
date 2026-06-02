from dataclasses import dataclass
from typing import Optional


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


LEVELS: list[LevelConfig] = [
    LevelConfig(1, 5, 4,  6,  None, 0.35, 0.20, 1),
    LevelConfig(2, 6, 5, 10,  120,  0.28, 0.35, 2),
    LevelConfig(3, 7, 6, 14,   90,  0.20, 0.50, 2),
    LevelConfig(4, 8, 7, 18,   70,  0.12, 0.60, 3),
    LevelConfig(5, 9, 8, 22,   55,  0.06, 0.70, 3),
]
