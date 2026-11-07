#!/usr/bin/env python3
"""Regenerate public/favicon.svg — the O₂ brand mark used as the production favicon.

Why this script exists instead of a hand-written SVG with a <text> element:
a favicon is rendered by the browser chrome, outside the page, so it cannot load a
webfont. `<text font-family="DynaPuff">` would silently fall back to a system face and
the icon would stop matching the O₂ wordmark in src/common/O2Button.tsx. So we convert
the DynaPuff glyphs to outline paths once, here, and commit the result.

Run this only when the wordmark, its font, or the brand colour changes:

    pip install fonttools
    python scripts/generate-favicon.py

Requires network access (downloads DynaPuff from Google Fonts).
"""

from __future__ import annotations

import io
import re
import sys
import urllib.request
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# --- Keep in sync with src/common/O2Button.tsx and the brand palette ---------------
TEXT = "O₂"
FONT_FAMILY = "DynaPuff"
FONT_WEIGHT = 700  # matches the wordmark's `font-bold`

# A white mark on a brand-blue badge (since 2026-11-07; it was a bare blue mark on a
# transparent background). Google shows a site's favicon inside a circle in its results,
# where the bare mark came out small, thin and floating; a badge reads at 16px on any tab
# strip, light or dark, so it needs no prefers-color-scheme rule either.
BADGE_COLOR = "#2563EB"  # --primary, light: hsl(221.2 83.2% 53.3%)
GLYPH_COLOR = "#FFFFFF"

BOX = 64  # viewBox size
BADGE_RADIUS = 14  # rounded square in a tab; Google crops it to a circle
# The glyphs stay inside the circle Google crops to: a 64-box circle's inscribed square is
# ~45 wide, so 11 on each side keeps the "₂" clear of the crop.
PADDING = 11.0

OUTPUT = Path(__file__).resolve().parent.parent / "public" / "favicon.svg"

# Google's css2 endpoint tailors its response to the User-Agent. A bare "Mozilla/5.0" is
# treated as an ancient browser, which gets full static TTFs — exactly what we want.
# Modern UA strings get woff2 split into unicode-range subsets, and the subscript would
# land in a different file from the "O".
LEGACY_UA = "Mozilla/5.0"


def fetch_font() -> TTFont:
    css_url = f"https://fonts.googleapis.com/css2?family={FONT_FAMILY}:wght@400..700"
    req = urllib.request.Request(css_url, headers={"User-Agent": LEGACY_UA})
    css = urllib.request.urlopen(req).read().decode("utf-8")

    block = re.search(rf"font-weight:\s*{FONT_WEIGHT};.*?url\((https://[^)]+?\.ttf)\)", css, re.S)
    if not block:
        sys.exit(
            f"Could not find a weight-{FONT_WEIGHT} static TTF for {FONT_FAMILY}. "
            "Google Fonts may have changed how it responds to the User-Agent above."
        )

    return TTFont(io.BytesIO(urllib.request.urlopen(block.group(1)).read()))


def build_svg(font: TTFont) -> str:
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    advances = font["hmtx"].metrics

    missing = [c for c in TEXT if ord(c) not in cmap]
    if missing:
        sys.exit(f"{FONT_FAMILY} has no glyph for: {missing!r}")

    # Lay the glyphs out on a baseline, accumulating advance widths.
    placed: list[tuple[str, float]] = []
    pen_x = 0.0
    for char in TEXT:
        name = cmap[ord(char)]
        placed.append((name, pen_x))
        pen_x += advances[name][0]

    # Measure the combined ink bounds so we centre on the glyphs, not the advance box
    # (the subscript leaves a lot of empty advance to the right otherwise).
    bounds_pen = BoundsPen(glyph_set)
    for name, offset in placed:
        glyph_set[name].draw(TransformPen(bounds_pen, Transform().translate(offset, 0)))
    x_min, y_min, x_max, y_max = bounds_pen.bounds

    # Fit into the padded box. The y scale is negative: fonts are Y-up, SVG is Y-down.
    available = BOX - 2 * PADDING
    scale = min(available / (x_max - x_min), available / (y_max - y_min))
    tx = PADDING + (available - (x_max - x_min) * scale) / 2 - x_min * scale
    ty = PADDING + (available - (y_max - y_min) * scale) / 2 + y_max * scale

    paths = []
    for name, offset in placed:
        path_pen = SVGPathPen(glyph_set)
        transform = Transform(scale, 0, 0, -scale, tx, ty).translate(offset, 0)
        glyph_set[name].draw(TransformPen(path_pen, transform))
        if commands := path_pen.getCommands():
            paths.append(f'    <path d="{commands}"/>')

    glyph_markup = "\n".join(paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {BOX} {BOX}" role="img" aria-label="Oxygen Quiz">\n'
        f"  <title>Oxygen Quiz</title>\n"
        f"  <!-- GENERATED FILE — do not edit by hand. Run scripts/generate-favicon.py.\n"
        f"       The O₂ wordmark ({FONT_FAMILY} {FONT_WEIGHT}) converted to outlines, because a\n"
        f"       favicon renders outside the page and cannot load a webfont. -->\n"
        f'  <rect width="{BOX}" height="{BOX}" rx="{BADGE_RADIUS}" fill="{BADGE_COLOR}"/>\n'
        f'  <g fill="{GLYPH_COLOR}">\n'
        f"{glyph_markup}\n"
        f"  </g>\n"
        f"</svg>\n"
    )


def main() -> None:
    OUTPUT.write_text(build_svg(fetch_font()), encoding="utf-8", newline="\n")
    print(f"Wrote {OUTPUT.relative_to(Path.cwd())} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
