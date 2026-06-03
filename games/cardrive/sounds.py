"""
Procedurally-synthesised sound effects — no asset files required.

Sounds are generated at startup and played via pygame.mixer.  Everything is
wrapped defensively: if the mixer is unavailable (or blocked, e.g. before the
first user gesture on the web) the game simply runs silently.  The synthesis
adapts to whatever sample rate / channel count the mixer reports, so it works
on desktop and in the browser without forcing a re-init.
"""

import math
import random
import struct

import pygame


def _clamp16(v: float) -> int:
    return max(-32767, min(32767, int(v * 32767)))


def _sine(rate, freq, dur, amp=0.6, decay=True):
    n = int(rate * dur)
    out = []
    for i in range(n):
        env = (1 - i / n) if decay else 1.0
        out.append(amp * env * math.sin(2 * math.pi * freq * i / rate))
    return out


def _noise(rate, dur, amp=0.7):
    n = int(rate * dur)
    return [amp * ((1 - i / n) ** 1.5) * random.uniform(-1, 1) for i in range(n)]


def _silence(rate, dur):
    return [0.0] * int(rate * dur)


def _mix(a, b):
    n = max(len(a), len(b))
    a = a + [0.0] * (n - len(a))
    b = b + [0.0] * (n - len(b))
    return [a[i] + b[i] for i in range(n)]


class SoundFX:
    def __init__(self):
        self.enabled = False
        self._snd = {}
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init()
            info = pygame.mixer.get_init()
            if not info:
                return
            rate, size, channels = info
            if abs(size) != 16:          # only support 16-bit buffers
                return
            self._channels = channels

            crash = _mix(_noise(rate, 0.35, 0.85), _sine(rate, 85, 0.35, 0.55))
            tick = (_sine(rate, 720, 0.05, 0.5, decay=False)
                    + _silence(rate, 0.02)
                    + _sine(rate, 1080, 0.08, 0.5))
            door = _noise(rate, 0.04, 0.5) + _sine(rate, 150, 0.14, 0.6)

            self._snd = {
                "crash": self._make(crash),
                "tick":  self._make(tick),
                "door":  self._make(door),
            }
            self.enabled = True
        except Exception:
            self.enabled = False

    def _make(self, samples):
        if self._channels == 2:                      # interleave for stereo
            frames = []
            for s in samples:
                v = _clamp16(s)
                frames.append(v); frames.append(v)
        else:
            frames = [_clamp16(s) for s in samples]
        data = struct.pack("<%dh" % len(frames), *frames)
        return pygame.mixer.Sound(buffer=data)

    def play(self, name: str):
        if not self.enabled:
            return
        snd = self._snd.get(name)
        if snd is not None:
            try:
                snd.play()
            except Exception:
                pass
