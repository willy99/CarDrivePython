# ---------------------------------------------------------------------------
# Screen
# ---------------------------------------------------------------------------
SCREEN_W = 1024
SCREEN_H = 768
FPS      = 60
TILE     = 80          # pixels per map tile

# ---------------------------------------------------------------------------
# Map geometry  (MX, MY, MAP_W, MAP_H are level-dependent; live in GameMap)
# ---------------------------------------------------------------------------
CELL   = 4             # room size in tiles
ROAD   = 2             # corridor width in tiles
STEP   = CELL + ROAD   # tiles per macro-cell = 6
OX, OY = 1, 1          # border offset in tiles

GOAL_RADIUS = TILE * 1.8   # pixels – how close to B triggers level finish

# ---------------------------------------------------------------------------
# Vehicle dimensions (shared between car.py and game_map.py house-placement)
# ---------------------------------------------------------------------------
CAR_W = 30
CAR_H = 16
NPC_W = 28
NPC_H = 14

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
C_ASPHALT      = (55,  55,  60)
C_GRASS        = (60, 140,  50)
C_GRASS_DARK   = (45, 115,  40)
C_HOUSE_WALL   = (195,155, 100)
C_HOUSE_ROOF   = (160, 80,  50)
C_HOUSE_BORDER = (80,  50,  30)
C_PAVEMENT     = (160,155, 145)
C_CAR_BODY     = (30, 100, 220)
C_CAR_CRASH    = (220, 40,  40)
C_CAR_WINDOW   = (170,210, 240)
C_HEADLIGHT    = (255,245, 180)
C_BRAKE        = (255, 55,  40)   # rear brake lights
C_LANE         = (210,200,  80)   # road lane markings
C_WHITE        = (255,255, 255)
C_BLACK        = (0,   0,   0)
C_MARKER_A     = (50, 210,  80)   # green  – start
C_MARKER_B     = (240,200,   0)   # gold   – finish / dropoff
C_MARKER_P     = (255,140,   0)   # orange – taxi pickup
C_GAS          = (40, 210, 235)   # cyan   – gas station
C_PASSENGER    = (250,225,  95)   # passenger figure

# ---------------------------------------------------------------------------
# Car physics
# ---------------------------------------------------------------------------
MAX_SPEED    = 7.0
REVERSE_MAX  = 2.5
ACCEL        = 0.14
BRAKE        = 0.28
FRICTION     = 0.025
STEER_BASE   = 2.8
CRASH_THRESH = 2.8

# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
SCORE_LEVEL_BASE       = 1000   # base points for completing a level
SCORE_TIME_PENALTY_MS  =   10   # points lost per 100 ms (= 100 pts/s)
SCORE_VIOLATION        =  100   # penalty per red-light crossing
SCORE_TIME_SURPLUS     =    2   # bonus points per second remaining (countdown levels)
SCORE_CLEAN_BONUS      =  200   # extra bonus for zero violations on a level

# ---------------------------------------------------------------------------
# Skid marks
# ---------------------------------------------------------------------------
SKID_MIN_SPEED = 2.5   # minimum car speed to leave marks
SKID_MAX_AGE   = 300   # frames before a mark fades completely (~5 s at 60 fps)
SKID_INTERVAL  =   3   # generate a mark every N frames while braking

# ---------------------------------------------------------------------------
# NPC traffic AI
# ---------------------------------------------------------------------------
NPC_CRUISE_MIN = 1.5     # slowest preferred speed
NPC_CRUISE_MAX = 2.6     # fastest preferred speed
NPC_ACCEL      = 0.07    # speed ramp-up per frame
NPC_BRAKE      = 0.22    # speed ramp-down per frame
NPC_TURN_EASE  = 0.22    # heading easing factor (smooth cornering)
NPC_LANE_FRAC  = 0.20    # lane offset (fraction of TILE) per extra road tile
NPC_REACT      = 52      # px: pedestrian look-ahead distance
NPC_GAP        = 48      # px: car-following gap (queue spacing)
NPC_TURN_PROB  = 0.30    # chance to turn (vs. go straight) at a junction
NPC_STUCK_LIMIT   = 45   # frames blocked (oncoming) before backing out & rerouting
NPC_REVERSE_FRAMES = 12  # frames spent backing up during a reroute
NPC_REVERSE_SPEED  = 0.9 # px/frame while backing up

# ---------------------------------------------------------------------------
# Game modes
# ---------------------------------------------------------------------------
MODE_RACE = 'race'   # drive A → B
MODE_TAXI = 'taxi'   # drive A → pickup → dropoff

# ---------------------------------------------------------------------------
# Taxi scoring
# ---------------------------------------------------------------------------
SCORE_FARE_BASE    = 600   # base fare for completing a delivery
SCORE_SMOOTH_BONUS = 300   # bonus for delivering with zero crashes

# Taxi pickup: must come to a near-full stop close to the waiting passenger
PICKUP_RADIUS     = TILE * 1.5
PICKUP_STOP_SPEED = 0.5    # |speed| below this counts as "stopped"

# ---------------------------------------------------------------------------
# Fuel (only levels whose cfg.fuel is not None)
# ---------------------------------------------------------------------------
FUEL_MAX         = 100.0   # full tank
FUEL_DRAIN       = 0.013   # consumed per unit-speed per frame (gentler)
FUEL_IDLE_DRAIN  = 0.002   # consumed per frame while engine on but still
FUEL_REFILL_RATE = 1.6     # refilled per frame while parked on a gas station
GAS_RADIUS       = TILE * 0.9    # how close to a pump counts as refuelling

# ---------------------------------------------------------------------------
# Night mode
# ---------------------------------------------------------------------------
NIGHT_DARKNESS   = 222     # alpha of the darkness layer (0-255)
HEADLIGHT_RADIUS = 200     # radius of the lit area (px)
HEADLIGHT_FWD    = 0.55    # push the lit area forward by this fraction of radius

# ---------------------------------------------------------------------------
# Rain (reduced grip)
# ---------------------------------------------------------------------------
RAIN_STEER_MULT    = 0.60  # steering authority in the wet
RAIN_FRICTION_MULT = 0.45  # less friction → longer slides / braking
RAIN_ACCEL_MULT    = 0.85  # slight traction loss on acceleration

# ---------------------------------------------------------------------------
# Race / game states
# ---------------------------------------------------------------------------
S_WAITING   = 0   # before first throttle press
S_RACING    = 1   # timer running
S_FINISHED  = 2   # reached final goal of a (non-last) level
S_GAME_OVER = 3   # hit pedestrian, ran out of time, or out of fuel
S_GAME_WON  = 4   # completed the final level — celebration!
