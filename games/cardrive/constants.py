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
MAX_SPEED    = 5.0
REVERSE_MAX  = 2.0
ACCEL        = 0.05
BRAKE        = 0.25
FRICTION     = 0.025
STEER_BASE   = 2.8
CRASH_THRESH = 1.3

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
NPC_CRUISE_MAX = 3.0     # fastest preferred speed
NPC_ACCEL      = 0.07    # speed ramp-up per frame
NPC_BRAKE      = 0.22    # speed ramp-down per frame
NPC_TURN_EASE  = 0.22    # heading easing factor (smooth cornering)
NPC_LANE_FRAC  = 0.20    # lane offset (fraction of TILE) per extra road tile
NPC_REACT      = 32      # px: pedestrian look-ahead distance
NPC_GAP        = 58      # px: car-following gap (queue spacing)
NPC_TURN_PROB  = 0.30    # chance to turn (vs. go straight) at a junction
NPC_STUCK_LIMIT   = 45   # frames blocked (oncoming) before backing out & rerouting
NPC_QUEUE_LIMIT   = 120  # frames in a non-red queue before wiggling free of a jam
NPC_REVERSE_FRAMES = 12  # frames spent backing up during a reroute
NPC_REVERSE_SPEED  = 0.9 # px/frame while backing up

# ---------------------------------------------------------------------------
# Game modes
# ---------------------------------------------------------------------------
MODE_RACE     = 'race'      # drive A → B
MODE_TAXI     = 'taxi'      # drive A → pickup → dropoff
MODE_CHASE    = 'chase'     # police pursue you; reach B before they catch you
MODE_DELIVERY = 'delivery'  # chain 3 quick drop-offs in one run

# ---------------------------------------------------------------------------
# Honk (H key) — nudges NPCs that are blocking the player
# ---------------------------------------------------------------------------
HONK_RADIUS         = TILE * 3.2
HONK_NUDGE          = 7        # px lateral nudge per frame for nearby NPCs
HONK_NUDGE_FRAMES   = 20       # how long the nudge lingers
HONK_COOLDOWN       = 30       # frames between honks (anti-spam)

# ---------------------------------------------------------------------------
# Speed cameras
# ---------------------------------------------------------------------------
SCORE_SPEEDING       = 150     # penalty per speeding ticket
CAMERA_LIMIT_FRAC    = 0.55    # camera fires above 55% of the CAR's max speed
CAMERA_RADIUS        = TILE * 1.2
CAMERA_COOLDOWN      = 90      # frames a given camera waits before firing again
CAMERA_FLASH_FRAMES  = 14      # screen-flash duration

# ---------------------------------------------------------------------------
# Crash damage (visible dents + degraded handling)
# ---------------------------------------------------------------------------
DAMAGE_PER_CRASH         = 28.0
DAMAGE_HANDLING_THRESH   = 45.0   # above this, steering/accel start to suffer
DAMAGE_FATAL             = 100.0  # totalled
DAMAGE_HANDLING_MIN_MULT = 0.55   # worst-case handling/accel multiplier

# ---------------------------------------------------------------------------
# Camera shake on crash
# ---------------------------------------------------------------------------
SHAKE_DURATION  = 25   # frames the camera shakes after a crash
SHAKE_MAGNITUDE = 8    # peak pixel displacement

# ---------------------------------------------------------------------------
# Police chase
# ---------------------------------------------------------------------------
POLICE_CRUISE_MAX     = 3.5     # px/frame baseline pursuit speed
POLICE_CRUISE_MIN     = 2.2     # px/frame baseline pursuit speed
POLICE_CATCH_DIST = TILE * 0.65  # how close = caught

# ---------------------------------------------------------------------------
# Taxi scoring
# ---------------------------------------------------------------------------
SCORE_FARE_BASE      = 600   # base fare for completing a taxi delivery
SCORE_SMOOTH_BONUS   = 300   # bonus for delivering with zero crashes
SCORE_DELIVERY_BASE  = 250   # bonus per completed drop-off in Delivery Blitz

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
# Winter (snow + ice + actual drift physics)
# ---------------------------------------------------------------------------
# Visual palette (replaces the grass + roof colours)
C_SNOW_LIGHT   = (228, 232, 240)
C_SNOW_DARK    = (205, 212, 224)
C_SNOW_ROOF    = (240, 245, 250)
C_SNOW_PAVE    = (200, 205, 215)
C_ICE_ASPHALT  = (96,  100, 112)   # slushy grey-blue
# Physics multipliers (worse than rain — proper ice)
WINTER_STEER_MULT    = 0.55
WINTER_FRICTION_MULT = 0.30
WINTER_ACCEL_MULT    = 0.55
# Lateral grip — fraction of lateral velocity removed each frame.
# 1.0 = perfect grip (no drift); near 0 = pure ice (heading and motion diverge).
LATERAL_GRIP_DRY     = 1.00
LATERAL_GRIP_RAIN    = 0.65
LATERAL_GRIP_WINTER  = 0.10
# How sharply hard cornering injects lateral velocity (oversteer kick)
SKID_INJECT_RWD      = 1.25   # rear-wheel-drive: more oversteer with throttle
SKID_INJECT_FWD      = 0.85   # front-wheel-drive: less oversteer
# Counter-steer bonus: temporarily restores lateral grip when you steer INTO
# the slide and apply the correct pedal for your drivetrain (gas for FWD,
# off-throttle for RWD).
COUNTER_STEER_BONUS  = 3.5

# Drivetrain identifiers
DRIVETRAIN_FWD = "FWD"
DRIVETRAIN_RWD = "RWD"

# ---------------------------------------------------------------------------
# Race / game states
# ---------------------------------------------------------------------------
S_WAITING   = 0   # before first throttle press
S_RACING    = 1   # timer running
S_FINISHED  = 2   # reached final goal of a (non-last) level
S_GAME_OVER = 3   # hit pedestrian, ran out of time, or out of fuel
S_GAME_WON  = 4   # completed the final level — celebration!

# ---------------------------------------------------------------------------
# Drifting skill system
# ---------------------------------------------------------------------------
DRIFT_THRESHOLD    = 0.9   # |lat_vel| above this = drifting
DRIFT_MIN_FRAMES   = 18    # frames before a drift starts scoring
DRIFT_SCORE_PER_S  = 40    # base score per second of controlled drift
DRIFT_CRASH_PEN    = 60    # score penalty for crashing mid-drift
DRIFT_COMBO_MULT   = 0.30  # +30 % per consecutive drift in the chain

# ---------------------------------------------------------------------------
# Near-miss / red-light threading bonus
# ---------------------------------------------------------------------------
NEAR_MISS_RADIUS   = TILE * 1.7   # detection sphere around each ped
NEAR_MISS_BONUS    = 80            # max score for a slick thread
NEAR_MISS_PENALTY  = 40            # extra penalty for a clumsy scare
NEAR_MISS_SPD_MIN  = 2.2           # minimum speed to earn a bonus

# ---------------------------------------------------------------------------
# Dynamic traffic density
# ---------------------------------------------------------------------------
TRAFFIC_WAVE_PERIOD = 70.0   # seconds for one sine oscillation
TRAFFIC_WAVE_AMP    = 0.28   # ±28 % of base NPC count

# ---------------------------------------------------------------------------
# Police roadblocks (MODE_CHASE only)
# ---------------------------------------------------------------------------
ROADBLOCK_SPAWN_DELAY = 22   # seconds into the run before first block
ROADBLOCK_COOLDOWN    = 35   # seconds between blocks
ROADBLOCK_AHEAD_TILES = 11   # nominal tiles ahead of the player
ROADBLOCK_LIFETIME    = 900  # frames before auto-despawn (~15 s @ 60 fps)

# ---------------------------------------------------------------------------
# Persistent road hazards  (potholes + rain puddles)
# ---------------------------------------------------------------------------
POTHOLE_RADIUS     = 14     # world-px detection radius
POTHOLE_KICK       = 0.40   # |lat_vel| injected on hit
PUDDLE_KICK        = 0.70   # puddle kick (stronger, rain levels)
HAZARD_COOLDOWN    = 72     # frames before the same hazard can fire again

# ---------------------------------------------------------------------------
# One-way streets
# ---------------------------------------------------------------------------
ONE_WAY_PROB         = 0.30   # fraction of corridors tagged one-way
ONE_WAY_VIOLATION_F  = 40     # wrong-way frames before violation fires

# ---------------------------------------------------------------------------
# Roundabouts
# ---------------------------------------------------------------------------
ROUNDABOUT_PROB      = 0.18   # probability a room becomes a roundabout
