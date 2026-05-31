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
C_WHITE        = (255,255, 255)
C_BLACK        = (0,   0,   0)
C_MARKER_A     = (50, 210,  80)   # green  – start
C_MARKER_B     = (240,200,   0)   # gold   – finish

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

# ---------------------------------------------------------------------------
# Race / game states
# ---------------------------------------------------------------------------
S_WAITING   = 0   # before first throttle press
S_RACING    = 1   # timer running
S_FINISHED  = 2   # reached goal B
S_GAME_OVER = 3   # hit pedestrian or countdown expired
