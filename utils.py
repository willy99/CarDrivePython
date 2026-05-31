"""Stateless geometry helpers and formatting utilities."""

import math


def polygon_corners(cx, cy, w, h, angle_deg):
    """Return four corners of a rotated rectangle as (x, y) tuples."""
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    hw, hh = w / 2, h / 2
    return [
        (cx + px * cos_a - py * sin_a, cy + px * sin_a + py * cos_a)
        for px, py in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    ]


def sat_overlap(poly_a, poly_b) -> bool:
    """Separating Axis Theorem – True when two convex polygons overlap."""
    def axes(poly):
        n = len(poly)
        result = []
        for i in range(n):
            dx = poly[(i + 1) % n][0] - poly[i][0]
            dy = poly[(i + 1) % n][1] - poly[i][1]
            length = math.hypot(dx, dy)
            if length:
                result.append((-dy / length, dx / length))
        return result

    def project(poly, axis):
        dots = [p[0] * axis[0] + p[1] * axis[1] for p in poly]
        return min(dots), max(dots)

    for axis in axes(poly_a) + axes(poly_b):
        a1, a2 = project(poly_a, axis)
        b1, b2 = project(poly_b, axis)
        if a2 < b1 or b2 < a1:
            return False
    return True


def rect_poly(r):
    """Convert a pygame.Rect to a list of four corner tuples."""
    return [(r.x, r.y), (r.right, r.y), (r.right, r.bottom), (r.x, r.bottom)]


def fmt_time(ms: int) -> str:
    """Format milliseconds as  M:SS.mm"""
    s = ms / 1000.0
    m = int(s) // 60
    return f"{m}:{s % 60:05.2f}"
