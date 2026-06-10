"""
Persistent save data.

In the browser (pygbag) it uses window.localStorage; on the desktop it falls
back to a JSON file next to the game.  Everything is wrapped defensively — if
storage is unavailable the game still runs, just without persistence.

Saved schema (all optional, merged over the default):
    lang   : "en" | "uk"
    car    : last chosen car index
    best   : { "<level_idx>": best_ms }
    done   : [completed level indices]
    stats  : { levels, violations, crashes, speeding, honks, clean, smooth, peds }
"""

import json
import os

_KEY = "cardrive_save_v2"


def default() -> dict:
    return {
        "lang": "en",
        "car": 0,
        "best": {},
        "done": [],
        "stats": {"levels": 0, "violations": 0, "crashes": 0,
                  "speeding": 0, "honks": 0, "clean": 0, "smooth": 0, "peds": 0},
    }


def _localstorage():
    try:
        import platform
        return platform.window.localStorage     # browser only
    except Exception:
        return None


def _file_path() -> str:
    return os.path.join(os.path.dirname(__file__), ".cardrive_save.json")


def load() -> dict:
    raw = None
    ls = _localstorage()
    if ls is not None:
        try:
            raw = ls.getItem(_KEY)
        except Exception:
            raw = None
    if raw is None:
        try:
            with open(_file_path(), "r", encoding="utf-8") as f:
                raw = f.read()
        except Exception:
            raw = None
    data = default()
    if raw:
        try:
            stored = json.loads(raw)
            data.update(stored)
            # keep nested stats complete
            s = default()["stats"]
            s.update(data.get("stats", {}))
            data["stats"] = s
        except Exception:
            pass
    return data


def save(data: dict):
    try:
        s = json.dumps(data)
    except Exception:
        return
    ls = _localstorage()
    if ls is not None:
        try:
            ls.setItem(_KEY, s)
            return
        except Exception:
            pass
    try:
        with open(_file_path(), "w", encoding="utf-8") as f:
            f.write(s)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Car unlock helper
# ---------------------------------------------------------------------------

def count_done(data: dict) -> int:
    """Number of unique completed levels."""
    return len(set(data.get("done", [])))


def is_car_unlocked(data: dict, car_idx: int, cars) -> bool:
    """Return True if the car at car_idx is available to the player."""
    req = cars[car_idx].unlock_req
    return req == 0 or count_done(data) >= req


# ---------------------------------------------------------------------------
# Driving-style classification from accumulated stats (8-point scale)
#
# Scale from most careful/skilled (index 0) to most reckless (index 7):
#   ace → careful → gentleman → normal → speeder → weaver → violator → jerk
# ---------------------------------------------------------------------------

def driving_style(stats: dict) -> str:
    """Return an i18n key describing the player's driving character."""
    lv  = max(1, stats.get("levels", 0))
    v   = stats.get("violations", 0) / lv       # red lights / level
    c   = stats.get("crashes", 0)   / lv         # crashes / level
    sp  = stats.get("speeding", 0)  / lv         # camera tickets / level
    hk  = stats.get("honks", 0)     / lv         # honks / level
    cl  = stats.get("clean", 0)     / lv         # fraction of levels without violations
    sm  = stats.get("smooth", 0)    / lv         # fraction of levels with 0 crashes

    # --- tier 8: total menace ---
    if c >= 1.5 and (v + sp) >= 1.5:
        return "style.jerk"

    # --- tier 7: rule-breaker ---
    if v >= 1.0 or (v >= 0.6 and sp >= 0.6):
        return "style.violator"

    # --- tier 6: lane-weaver / horn-blarer ---
    if hk >= 2.0:
        return "style.weaver"

    # --- tier 5: speed-demon ---
    if sp >= 0.9 or (sp >= 0.5 and c >= 0.7):
        return "style.speeder"

    # --- tier 4: average ---
    if v >= 0.3 or c >= 0.5 or sp >= 0.3:
        return "style.normal"

    # --- tier 3: gentleman driver ---
    if cl < 0.55 or sm < 0.40:
        return "style.gentleman"

    # --- tier 2: careful ---
    if cl < 0.80 or sm < 0.65:
        return "style.careful"

    # --- tier 1: the ace (almost never gets here) ---
    return "style.ace"
