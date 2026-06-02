"""
CarDrive → NiceGUI integration
===============================
Drop this file next to your NiceGUI project and add one line to your app:

    from cardrive_embed import add_cardrive_page
    add_cardrive_page(game_build_dir='/absolute/path/to/CarDrive/build/web')

Then visit  http://localhost:<port>/cardrive

How it works
------------
* The built game files are mounted as static files at /game/.
* A lightweight middleware adds Cross-Origin-Opener-Policy (COOP) and
  Cross-Origin-Embedder-Policy (COEP) headers to /game/* responses.
  These headers are REQUIRED for WebAssembly SharedArrayBuffer (WASM
  threading) – without them the game loads but freezes immediately.
* A NiceGUI page at /cardrive embeds the game in a full-screen <iframe>.
  The parent NiceGUI app does NOT need any special headers.
"""

import mimetypes
import pathlib
import typing

from fastapi.staticfiles import StaticFiles
from nicegui import app, ui
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Make sure .whl files (Python wheels used by pygbag) are served correctly
mimetypes.add_type('application/zip',    '.whl')
mimetypes.add_type('application/wasm',   '.wasm')   # usually fine, but be explicit


# ---------------------------------------------------------------------------
# Middleware: add isolation headers only for the /game/ sub-tree
# ---------------------------------------------------------------------------

class _GameIsolationMiddleware(BaseHTTPMiddleware):
    """
    Adds the two headers that enable cross-origin isolation for the game iframe.

    COOP  – prevents the game's window from sharing a browsing-context group
             with the NiceGUI parent, keeping them isolated.
    COEP  – requires every sub-resource loaded by the game to opt-in to
             cross-origin sharing (the pygame CDN does this).

    Both are needed for SharedArrayBuffer, which pygbag uses internally.
    They are applied ONLY to /game/* so the rest of NiceGUI is unaffected.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.url.path.startswith('/game'):
            response.headers['Cross-Origin-Opener-Policy']   = 'same-origin'
            response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
            response.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
        return response


# ---------------------------------------------------------------------------
# Public setup function
# ---------------------------------------------------------------------------

def add_cardrive_page(
    game_build_dir: typing.Union[str, pathlib.Path] = 'build/web',
    route: str = '/cardrive',
    page_title: str = 'CarDrive',
) -> None:
    """
    Mount the game and register a NiceGUI page.

    Parameters
    ----------
    game_build_dir : path to CarDrive/build/web  (the pygbag build output)
    route          : URL of the NiceGUI page that shows the game
    page_title     : browser tab title for the game page
    """
    build_dir = pathlib.Path(game_build_dir).resolve()
    if not (build_dir / 'index.html').exists():
        raise FileNotFoundError(
            f'CarDrive build not found at {build_dir}. '
            'Run:  venv/bin/python -m pygbag '
            '--cdn "https://pygame-web.github.io/archives/0.9/" --build main.py'
        )

    # Mount static files at /game/ (separate from the NiceGUI app itself)
    app.mount('/game', StaticFiles(directory=str(build_dir), html=True),
              name='cardrive_static')

    # Apply isolation headers (must be added before the app starts)
    app.add_middleware(_GameIsolationMiddleware)

    # NiceGUI page that hosts the iframe
    @ui.page(route, title=page_title)
    def _game_page():
        # Remove NiceGUI's default body padding so the game fills the viewport
        ui.add_head_html('''
            <style>
                body, html { margin: 0; padding: 0; overflow: hidden; }
                nicegui-page { padding: 0 !important; }
            </style>
        ''')
        ui.html('''
            <iframe
                src="/game/"
                style="
                    position: fixed;
                    top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    border: none;
                    display: block;
                "
                allow="autoplay"
                title="CarDrive"
            ></iframe>
        ''')


# ---------------------------------------------------------------------------
# Standalone demo  (python nicegui_embed.py)
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import sys, os

    build = sys.argv[1] if len(sys.argv) > 1 else 'build/web'

    # Optional: a simple landing page at /
    @ui.page('/')
    def index():
        with ui.column().classes('items-center justify-center h-screen gap-6'):
            ui.label('🏎  CarDrive').classes('text-5xl font-bold')
            ui.button('Play now', on_click=lambda: ui.navigate.to('/cardrive')) \
              .classes('text-xl px-8 py-3')

    add_cardrive_page(game_build_dir=build)

    ui.run(
        title='CarDrive',
        port=8080,
        storage_secret='cardrive_secret',
        reload=False,
    )
