#!/usr/bin/env python3
"""
Generates the PWA icon set.

There is no image tooling assumed on the machine, so the icons are rasterised
here from signed distance fields and written as PNGs directly. Re-run after
changing the mark:

    python3 scripts/generate-icons.py

The mark is a productivity arc — the circle the app's percentages live on —
broken where a check mark crosses it. Ink background, off-white mark, matching
the product's monochrome palette.
"""

import math
import struct
import zlib
from pathlib import Path

INK = (14, 14, 16)
MARK = (250, 250, 249)

OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def _cover(d: float) -> float:
    """Coverage from a signed distance in pixels: 1 inside, 0 outside."""
    return _clamp01(0.5 - d)


def _rounded_rect(px, py, cx, cy, half, radius):
    dx = abs(px - cx) - (half - radius)
    dy = abs(py - cy) - (half - radius)
    ax, ay = max(dx, 0.0), max(dy, 0.0)
    return math.hypot(ax, ay) + min(max(dx, dy), 0.0) - radius


def _segment(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    denom = vx * vx + vy * vy
    t = 0.0 if denom == 0 else _clamp01((wx * vx + wy * vy) / denom)
    return math.hypot(wx - t * vx, wy - t * vy)


def _arc(px, py, cx, cy, radius, start, end):
    """Distance to an arc with round caps, angles in radians, CCW start->end."""
    ang = math.atan2(py - cy, px - cx) % math.tau
    span = (end - start) % math.tau
    rel = (ang - start) % math.tau
    if rel <= span:
        return abs(math.hypot(px - cx, py - cy) - radius)
    return min(
        math.hypot(px - (cx + radius * math.cos(start)), py - (cy + radius * math.sin(start))),
        math.hypot(px - (cx + radius * math.cos(end)), py - (cy + radius * math.sin(end))),
    )


def render(size: int, *, maskable: bool) -> bytes:
    s = float(size)
    cx = cy = s / 2.0

    # A maskable icon is cropped to the platform's shape, so it bleeds to the
    # edges and keeps its mark inside the inner 80% safe zone.
    bg_radius = 0.0 if maskable else s * 0.2237
    mark_scale = 0.78 if maskable else 1.0

    ring_r = s * 0.293 * mark_scale
    ring_t = s * 0.082 * mark_scale / 2.0
    stroke = s * 0.093 * mark_scale / 2.0

    # Check mark, in units of the icon, rotated into the ring's gap.
    def pt(u, v):
        return cx + (u - 0.5) * s * mark_scale, cy + (v - 0.5) * s * mark_scale

    a = pt(0.335, 0.512)
    b = pt(0.452, 0.632)
    c = pt(0.715, 0.352)

    # Gap in the arc where the check crosses the ring, plus breathing room.
    gap_centre = math.atan2(c[1] - cy, c[0] - cx)
    gap_half = math.radians(31.0)
    start = (gap_centre + gap_half) % math.tau
    end = (gap_centre - gap_half) % math.tau

    rows = []
    for y in range(size):
        py = y + 0.5
        row = bytearray()
        for x in range(size):
            px = x + 0.5

            bg_a = _cover(_rounded_rect(px, py, cx, cy, s / 2.0, bg_radius))

            d_ring = _arc(px, py, cx, cy, ring_r, start, end) - ring_t
            d_check = min(
                _segment(px, py, a[0], a[1], b[0], b[1]),
                _segment(px, py, b[0], b[1], c[0], c[1]),
            ) - stroke
            mark_a = max(_cover(d_ring), _cover(d_check))

            # Mark over ink, the whole thing masked by the background shape.
            r = INK[0] + (MARK[0] - INK[0]) * mark_a
            g = INK[1] + (MARK[1] - INK[1]) * mark_a
            bl = INK[2] + (MARK[2] - INK[2]) * mark_a
            row += bytes((int(r + 0.5), int(g + 0.5), int(bl + 0.5), int(bg_a * 255 + 0.5)))
        rows.append(bytes(row))

    raw = b''.join(b'\x00' + r for r in rows)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
        ('apple-touch-icon.png', 180, True),  # iOS applies its own mask
        ('icon-32.png', 32, False),
    ]
    for name, size, maskable in targets:
        (OUT / name).write_bytes(render(size, maskable=maskable))
        print(f'{name:26} {size}x{size}')


if __name__ == '__main__':
    main()
