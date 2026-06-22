"""
Static file server with a visitor counter API.

Usage:
    python serve.py            # http://localhost:8099
    python serve.py --port 80  # custom port
"""

import argparse
import json
import pathlib
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# ── counter storage ───────────────────────────────────────────────────────────

COUNTER_FILE = pathlib.Path(__file__).parent / "data" / "counter.json"
COUNTER_FILE.parent.mkdir(exist_ok=True)
_lock = threading.Lock()


def _read() -> int:
    try:
        return json.loads(COUNTER_FILE.read_text()).get("count", 0)
    except Exception:
        return 0


def _write(n: int) -> None:
    COUNTER_FILE.write_text(json.dumps({"count": n}))


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/counter")
def counter(up: int = 0):
    """Return current visitor count. Pass ?up=1 to increment first."""
    with _lock:
        n = _read()
        if up:
            n += 1
            _write(n)
    return JSONResponse({"count": n})


# Mount static files AFTER the API route so /api/* is matched first
app.mount("/", StaticFiles(directory=str(pathlib.Path(__file__).parent / "public"), html=True), name="static")

# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    print(f"Serving http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
