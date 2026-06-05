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
    stats  : { levels, violations, crashes, speeding, honks, clean, peds }
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
                  "speeding": 0, "honks": 0, "clean": 0, "peds": 0},
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
# Driving-style classification (from accumulated stats)
# ---------------------------------------------------------------------------

def driving_style(stats: dict) -> str:
    """Return an i18n key describing the player's style."""
    lv = max(1, stats.get("levels", 0))
    v  = stats.get("violations", 0) / lv      # red lights / level
    c  = stats.get("crashes", 0) / lv         # crashes / level
    sp = stats.get("speeding", 0) / lv        # tickets / level
    hk = stats.get("honks", 0) / lv           # honks / level
    rough = v + sp

    if c >= 1.5 and rough >= 1.5:
        return "style.jerk"        # повний гавнюк
    if rough >= 1.2:
        return "style.violator"    # порушечник
    if hk >= 2.2:
        return "style.weaver"      # шашечник
    if v < 0.3 and c < 0.4 and sp < 0.3:
        return "style.gentleman"   # обережний інтелігент
    return "style.normal"
