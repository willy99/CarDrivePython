# CarDrive — Porting Guide

## Web (easiest — shareable link, runs in any browser)

**Tool:** [Pygbag](https://pygame-web.github.io/) — compiles Python + pygame to WebAssembly.  
Works on desktop browsers and mobile browsers (Chrome, Safari).

### Code change required

The main loop must be `async` so the browser event loop can breathe:

```python
# main.py (web version)
import asyncio
from game import Game

async def main():
    game = Game()
    while True:
        game.tick()           # one frame — move clock.tick() here too
        await asyncio.sleep(0)

asyncio.run(main())
```

`Game.run()` becomes `Game.tick()` — same body, but no inner `while True`.

### Build & deploy

```bash
pip install pygbag
pygbag --build .
# → dist/web/   upload this folder anywhere
```

**Hosting options (all free):**
- [itch.io](https://itch.io) — most popular for pygame-web games, one-click upload
- GitHub Pages — commit `dist/web/` to a `gh-pages` branch
- Netlify / Vercel — drag-and-drop the folder

### Touch controls (needed for phones)

Add a virtual D-pad overlay in `hud.py` that maps touch events to the same
`pygame.K_UP / K_DOWN / K_LEFT / K_RIGHT` state the car physics already reads.

---

## Desktop — standalone executable (no Python needed)

```bash
pip install pyinstaller
pyinstaller --onefile --windowed main.py
# Windows → dist/main.exe
# macOS   → dist/main  (or .app with --windowed)
# Linux   → dist/main
```

Send the single file, double-click, done.

---

## Mobile — native app

| Option | Notes |
|--------|-------|
| **Web version on mobile browser** | Free if Pygbag web is done; add touch D-pad |
| **[Kivy](https://kivy.org/) rewrite** | Requires rewriting rendering layer; full iOS/Android |
| **Godot 4 port** | GDScript ≈ Python; best native result; export to iOS/Android/Web |

---

## Full rewrite for best cross-platform support

| Engine | Language | Web | Mobile | Effort |
|--------|----------|-----|--------|--------|
| **Godot 4** | GDScript / C# | ✅ | ✅ | Medium |
| Unity | C# | ✅ | ✅ | Large |
| Phaser.js | TypeScript | ✅ | ✅ | Large |
| Pyxel | Python (retro) | ✅ | ❌ | Small |

Godot maps naturally to this codebase: `Car`, `GameMap`, `NPCCar` → Nodes/Scenes.

---

## Recommended path

1. **Pygbag web build** (~2 h) → host on itch.io → shareable link today
2. **Add touch D-pad** for mobile browser play
3. If it gains traction → **Godot port** for App Store / Play Store distribution
