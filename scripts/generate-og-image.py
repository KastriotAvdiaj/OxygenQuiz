#!/usr/bin/env python3
"""Regenerate public/og-image.png — the picture a shared oxygenquiz.com link shows.

WhatsApp, Discord, Slack, X and Facebook read `og:image` from the page's HTML and show it in the
link preview. This is the default for every page; the shared-link Worker swaps in a quiz's own
image when it has one (worker/index.js). 1200x630 is the size every one of them accepts without
cropping the middle.

Drawn from the brand, not a photo: the O₂ wordmark (DynaPuff 700, as in src/common/O2Button.tsx
and scripts/generate-favicon.py) on the primary blue. Run only when the brand changes:

    pip install pillow
    python scripts/generate-og-image.py

Requires network access (downloads DynaPuff and Nunito from Google Fonts).
"""

from __future__ import annotations

import io
import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1200, 630
TOP = (37, 99, 235)       # --primary, light: #2563EB
BOTTOM = (29, 78, 216)    # one step darker (#1D4ED8), so the card isn't a flat swatch
INK = (255, 255, 255)
SOFT_INK = (219, 234, 254)  # blue-100, for the tagline

TITLE = "Oxygen Quiz"
TAGLINE = "Play, create and host quizzes"

OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"


def google_font(family: str, weight: int) -> io.BytesIO:
    """A TTF from Google Fonts. An old User-Agent gets TTF instead of WOFF2, which PIL can read."""
    css_url = f"https://fonts.googleapis.com/css2?family={family.replace(' ', '+')}:wght@{weight}"
    req = urllib.request.Request(css_url, headers={"User-Agent": "Mozilla/4.0"})
    css = urllib.request.urlopen(req).read().decode()
    ttf_url = re.search(r"url\((https://fonts\.gstatic\.com[^)]+)\)", css).group(1)
    return io.BytesIO(urllib.request.urlopen(ttf_url).read())


def main() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):  # vertical gradient, top to bottom
        t = y / (HEIGHT - 1)
        draw.line([(0, y), (WIDTH, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))

    dyna = google_font("DynaPuff", 700)
    nunito = google_font("Nunito", 600)
    mark_font = ImageFont.truetype(dyna, 300)
    dyna.seek(0)
    title_font = ImageFont.truetype(dyna, 96)
    tagline_font = ImageFont.truetype(nunito, 44)

    # The mark on the left, the name and tagline beside it, the group centred as one block.
    mark = "O₂"
    gap = 56
    mark_box = draw.textbbox((0, 0), mark, font=mark_font)
    title_box = draw.textbbox((0, 0), TITLE, font=title_font)
    tagline_box = draw.textbbox((0, 0), TAGLINE, font=tagline_font)
    mark_w, mark_h = mark_box[2] - mark_box[0], mark_box[3] - mark_box[1]
    text_w = max(title_box[2] - title_box[0], tagline_box[2] - tagline_box[0])
    title_h = title_box[3] - title_box[1]
    tagline_h = tagline_box[3] - tagline_box[1]
    line_gap = 28
    text_h = title_h + line_gap + tagline_h

    left = (WIDTH - (mark_w + gap + text_w)) // 2
    draw.text((left - mark_box[0], (HEIGHT - mark_h) // 2 - mark_box[1]), mark, font=mark_font, fill=INK)

    text_x = left + mark_w + gap
    text_y = (HEIGHT - text_h) // 2
    draw.text((text_x - title_box[0], text_y - title_box[1]), TITLE, font=title_font, fill=INK)
    draw.text(
        (text_x - tagline_box[0], text_y + title_h + line_gap - tagline_box[1]),
        TAGLINE,
        font=tagline_font,
        fill=SOFT_INK,
    )

    image.save(OUT, optimize=True)
    print(f"Wrote {OUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
