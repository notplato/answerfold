"""Render the PNG icons in src/icons/ (Firefox and AMO need PNG; assets/icon.svg is the source design).

Usage: python scripts/make-icons.py   (needs Pillow: pip install pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "src" / "icons"
BLUE, WHITE = (26, 115, 232, 255), (255, 255, 255, 255)
S = 1024  # draw large, then downsample for smooth edges


def scaled(v):
    return round(v * S / 96)


img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([scaled(4), scaled(4), scaled(92), scaled(92)], radius=scaled(22), fill=BLUE)
d.rounded_rectangle([scaled(20), scaled(22), scaled(76), scaled(34)], radius=scaled(6), fill=WHITE)
w = scaled(9)
pts = [(scaled(30), scaled(50)), (scaled(48), scaled(66)), (scaled(66), scaled(50))]
d.line(pts, fill=WHITE, width=w, joint="curve")
for x, y in (pts[0], pts[2]):
    d.ellipse([x - w // 2, y - w // 2, x + w // 2, y + w // 2], fill=WHITE)

for size in (48, 96, 128):
    img.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")
    print("wrote", OUT / f"icon-{size}.png")
