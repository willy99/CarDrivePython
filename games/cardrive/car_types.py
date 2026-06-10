"""
Selectable cars.  Each has its own handling stats and body shape, so the
player trades off top speed against acceleration and steering response.
"""

from dataclasses import dataclass

from constants import DRIVETRAIN_FWD, DRIVETRAIN_RWD


@dataclass(frozen=True)
class CarType:
    name:  str
    color: tuple
    shape: str          # 'sedan' | 'bolide' | 'classic' | 'sport' | 'van' | 'compact'
    w:     int
    h:     int
    max_speed:   float
    accel:       float
    brake:       float
    steer:       float  # steering rate (higher = sharper/easier to control)
    reverse_max: float
    friction:    float
    drivetrain:  str = DRIVETRAIN_FWD   # which wheels are driven (matters on ice)
    unlock_req:  int = 0                # levels needed to unlock (0 = available from start)

    # --- display bars (0..1) for the garage UI ---
    @property
    def bar_speed(self):    return min(1.0, self.max_speed / 7.0)
    @property
    def bar_accel(self):    return min(1.0, self.accel / 0.09)
    @property
    def bar_handling(self): return min(1.0, self.steer / 3.6)


CARS: list[CarType] = [
    #         name        color            shape   w   h  spd  accel  brake steer rev  fric    drivetrain       unlock
    CarType("Comet",   (30, 100, 220), "sedan",   30, 16, 5.0, 0.050, 0.25, 2.8, 2.0, 0.025, DRIVETRAIN_FWD,  0),
    CarType("Falcon",  (220, 40,  40), "bolide",  36, 12, 7.0, 0.090, 0.30, 2.0, 1.6, 0.020, DRIVETRAIN_RWD,  0),
    CarType("Veteran", (70, 150,  60), "classic", 30, 17, 4.0, 0.045, 0.22, 3.2, 1.8, 0.030, DRIVETRAIN_RWD,  0),
    CarType("Viper",   (240,200,  30), "sport",   33, 14, 6.2, 0.075, 0.28, 2.5, 1.9, 0.022, DRIVETRAIN_FWD,  3),
    CarType("Hauler",  (220,130,  40), "van",     32, 18, 3.2, 0.025, 0.20, 3.0, 1.6, 0.035, DRIVETRAIN_RWD,  6),
    CarType("Pixie",   (40, 200, 210), "compact", 26, 15, 4.6, 0.060, 0.26, 3.4, 2.1, 0.028, DRIVETRAIN_FWD, 10),
    CarType("Brute",   (150, 60, 200), "classic", 32, 16, 4.5, 0.085, 0.26, 2.2, 2.0, 0.024, DRIVETRAIN_RWD, 16),
    CarType("Phantom", (235,235, 240), "sport",   32, 14, 5.6, 0.065, 0.24, 3.6, 2.0, 0.018, DRIVETRAIN_FWD, 24),
]

DEFAULT_CAR = CARS[0]
