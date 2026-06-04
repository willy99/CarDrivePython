from dataclasses import dataclass
from typing import Optional

from constants import MODE_RACE, MODE_TAXI, MODE_CHASE, FUEL_MAX


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
    winter:     bool            = False
    fuel:       Optional[float] = None
    gas_count:  int             = 0
    title:      str             = ""
    passcode:   str             = ""   # type this on the home screen to jump here

    # --- new world toys ---
    camera_count: int = 0              # speed cameras on this level
    police_count: int = 0              # police cars (used with MODE_CHASE too)
    narrative:    str = ""             # short atmospheric line on the intro screen


LEVELS: list[LevelConfig] = [
    # ── Race: learn to drive; streets & rooms gradually tighten ────────
    LevelConfig(1, 4, 3,  4,  None, 0.40, 0.15, 1,
                cell=5, road=2, title="First Drive",   passcode="ROAD",
                narrative="Перший день за кермом. Не поспішай — спершу відчуй машину."),
    LevelConfig(2, 5, 4,  7,  None, 0.32, 0.25, 2,
                cell=4, road=2, title="City Blocks",   passcode="TURN"),
    LevelConfig(3, 6, 5, 11,  120,  0.24, 0.40, 2,
                cell=4, road=2, title="Rush",          passcode="HONK",
                camera_count=2,
                narrative="Година пік. Усі кудись запізнюються — крім тебе. (тобі теж пора.)"),

    LevelConfig(4, 6, 5, 11,  120,  0.24, 0.40, 2,
                cell=4, road=2, title="Be carefull",  passcode="CARE",
                police_count=1,
                camera_count=5,
                narrative="На кожному кроці камери!"),

    LevelConfig(5, 6, 5, 13,  105,  0.18, 0.50, 2,
                cell=3, road=2, title="Tight Corners", passcode="LANE"),
    LevelConfig(6, 7, 6,  8,   95,  0.12, 0.58, 3,
                cell=3, road=1, title="Narrow Lanes",  passcode="DASH"),
    LevelConfig(7, 8, 6, 10,   85,  0.08, 0.65, 3,
                cell=3, road=1, title="Gridlock",      passcode="ZOOM"),
    LevelConfig(8, 12, 6, 10, 60, 0.08, 0.65, 3,
                cell=3, road=1, title="Out of time", passcode="UPUP",
                camera_count=3,
                police_count=2,
                narrative="Диспетчер дзвонить уже втретє. Поспішай — але дивись на камери."),

    # ── Taxi fares ─────────────────────────────────────────────────────
    LevelConfig(9, 6, 5, 11, 120, 0.22, 0.45, 2,
                cell=4, road=2, mode=MODE_TAXI, title="Taxi!", passcode="FARE"),

    LevelConfig(10, 12, 5, 20, 90, 0.22, 0.45, 2,
                cell=3, road=1, mode=MODE_TAXI, title="Downtown", passcode="TOWN",
                narrative="Старе місто. Тут диспетчер не любить, коли затримуються."),

    LevelConfig(11, 10, 10, 45, 100, 0.22, 0.45, 2,
                cell=4, road=1, mode=MODE_TAXI, title="Traffic jaammm", passcode="JAMM"),

    LevelConfig(12, 7, 6, 16, 100, 0.16, 0.55, 3,
                cell=4, road=2, mode=MODE_TAXI, rain=True,
                title="Rainy Fare", passcode="RAIN"),
    LevelConfig(13, 7, 6, 16, 100, 0.12, 0.58, 3,
                cell=3, road=2, mode=MODE_TAXI, night=True,
                title="Night Shift", passcode="DUSK",
                narrative="Вулиці тихі. Фари у фари — і нічого більше."),

    # ── Fuel training: gentle introduction, plenty of stations ─────────
    LevelConfig(14, 6, 5, 12, 180, 0.22, 0.45, 2,
                cell=4, road=2, mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=5,
                title="Long Haul", passcode="GASS"),
    LevelConfig(15, 7, 6, 16, 175, 0.16, 0.52, 3,
                cell=3, road=2, mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=4,
                title="Fuel Run", passcode="PUMP"),
    LevelConfig(16, 10, 6, 16, 125, 0.16, 0.52, 3,
                cell=3, road=2, mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=4,
                title="Eco mode", passcode="FUEL"),

    # ── Skill builders before the boss ─────────────────────────────────
    LevelConfig(17, 8, 6, 11, 120, 0.07, 0.62, 3,
                cell=3, road=1, mode=MODE_TAXI,
                title="Backstreets", passcode="MAZE"),
    LevelConfig(18, 8, 7, 18, 150, 0.10, 0.58, 3,
                cell=3, road=2, mode=MODE_TAXI, night=True, rain=True,
                title="Storm", passcode="STRM",
                narrative="Гроза прийшла з заходу. Не геройствуй — поверни додому."),
    LevelConfig(19, 8, 7, 11, 165, 0.06, 0.64, 3,
                cell=3, road=1, mode=MODE_TAXI, fuel=FUEL_MAX, gas_count=4,
                title="Last Tank", passcode="TANK"),

    # ── Winter: drift, counter-steer, FWD vs RWD ──────────────────────
    LevelConfig(20, 6, 5, 8, None, 0.30, 0.30, 2,
                cell=4, road=2, winter=True,
                title="First Snow", passcode="SNOW",
                narrative="Перший сніжок. Гальмуй заздалегідь — кермом виправляй заноси."),
    LevelConfig(21, 7, 6, 12, 130, 0.20, 0.45, 2,
                cell=4, road=2, mode=MODE_TAXI, winter=True,
                title="Frosty Fare", passcode="FRST",
                narrative="Сніг ліпиться до лобового. Пасажир хоче додому без сюрпризів."),
    LevelConfig(22, 8, 7, 16, 140, 0.10, 0.55, 3,
                cell=3, road=2, mode=MODE_TAXI, winter=True, night=True,
                title="Blizzard Night", passcode="BLIZ",
                narrative="Завірюха. Бачиш — фари, чуєш — серце. Решта — занос."),

    # ── Chase: get to B before the cops catch you ─────────────────────
    LevelConfig(23, 8, 7, 14, 110, 0.10, 0.55, 3,
                cell=3, road=2, mode=MODE_CHASE, police_count=2,
                title="Cop Chase", passcode="COPS",
                narrative="Сирени за спиною. Без причини — але це не врятує."),

    # ── BOSS ───────────────────────────────────────────────────────────
    LevelConfig(24, 9, 9, 13, 120, 0.05, 0.68, 3,
                cell=3, road=1, mode=MODE_TAXI, night=True, rain=True,
                police_count=1,
                fuel=FUEL_MAX, gas_count=5, title="The Gauntlet", passcode="BOSS",
                narrative="Остання зміна. Дощ, ніч, бак напівпорожній. Усе як завжди."),
]


def level_by_passcode(code: str) -> Optional[int]:
    """Return the 0-based level index for a passcode, or None."""
    code = code.strip().upper()
    for i, cfg in enumerate(LEVELS):
        if cfg.passcode.upper() == code:
            return i
    return None
