# Favicon

The production favicon is the **O₂ brand mark** — the same wordmark rendered by
[`src/common/O2Button.tsx`](../../src/common/O2Button.tsx) on the login and signup pages.
In development the app deliberately keeps a **generic icon** instead, so a dev tab and a
production tab are tellable apart at a glance when both are open.

| Mode | Icon | File |
|---|---|---|
| `production` (`npm run build`) | O₂ brand mark, white on a brand-blue rounded badge | `public/favicon.svg` |
| both | the same badge as a 180×180 PNG, for iOS home screens and search engines | `public/apple-touch-icon.png` |
| `development` (`npm run dev`, `npm run build:dev`) | generic Vite mark | `public/vite.svg` |

---

## How the switch works

`index.html` declares the icon once, with the path as a placeholder:

```html
<link rel="icon" type="image/svg+xml" href="%VITE_FAVICON%" />
```

`%VITE_FAVICON%` is [Vite HTML env replacement](https://vite.dev/guide/env-and-mode#html-env-replacement).
Vite substitutes any `%VITE_*%` token in `index.html` with the matching variable from the
`.env` file for the current mode — at dev-server time *and* at build time:

- [`.env.development`](../../.env.development) → `VITE_FAVICON=/vite.svg`
- [`.env.production`](../../.env.production) → `VITE_FAVICON=/favicon.svg`

Both `.env` files are committed (see the note in `.gitignore`), so CI reproduces the same
result without extra configuration.

This was chosen over the alternatives on purpose:

- **No extra plugin.** `vite-plugin-html` and friends add a dependency for something Vite
  already does natively.
- **No runtime cost.** The substitution happens in the HTML, before the bundle loads.
  Swapping the icon from JavaScript would ship dead code to production and make the
  correct icon depend on hydration.
- **No conditional markup.** One `<link>` tag, one source of truth for the path.

> If `VITE_FAVICON` is ever missing from an env file, Vite leaves the literal
> `%VITE_FAVICON%` in the HTML and logs a warning — a loud failure, not a silent one.

---

## Regenerating `public/favicon.svg`

`public/favicon.svg` is **generated — do not edit it by hand.** Run:

```bash
pip install fonttools
python scripts/generate-favicon.py
```

The script downloads DynaPuff 700 from Google Fonts, converts the `O` and `₂` glyphs to
SVG outline paths, and centres them on their ink bounds.

**Why outlines instead of `<text>`.** A favicon is drawn by the browser chrome, outside
the page, so it cannot load a webfont. `<text font-family="DynaPuff">` would silently fall
back to a system face and the icon would stop matching the wordmark. Converting to paths
makes the file self-contained.

**Why a badge (since 2026-11-07).** Until then the mark had no background: blue glyphs on
transparent, with a `prefers-color-scheme` rule for dark tab strips. Google shows a site's
favicon inside a circle in its results, and there the wide, thin mark came out small and
floating. A white mark on a brand-blue badge reads at 16 px on any background and needs no
colour-scheme rule. The glyphs sit inside the circle Google crops to (`PADDING`), so the `₂`
survives the crop; the rounded corners (`BADGE_RADIUS`) are what a browser tab shows.

Re-run the script when the wordmark, its font, or the brand colours change. The constants
at the top (`TEXT`, `FONT_FAMILY`, `FONT_WEIGHT`, `BADGE_COLOR`, `GLYPH_COLOR`, `PADDING`, and `GLYPH_SCALE`, which shrinks the `₂` so the `O` can be bigger)
are the things worth editing; they're kept in sync with `O2Button.tsx` and `src/global.css`.
Then regenerate the PNG from the SVG (any SVG rasteriser; with librsvg):

```bash
rsvg-convert -w 180 -h 180 public/favicon.svg -o public/apple-touch-icon.png
```

**A search result's icon changes on Google's schedule, not ours.** It is fetched when Google
recrawls the home page — days to weeks; *Request indexing* on the home page in Search Console
speeds it up. It must be square and at least 48 px, which both files are.

---

## Scope / not included

`rel="icon"` and `rel="apple-touch-icon"` are wired up. If the app later needs to be
installable, add a web app manifest with 192 and 512 PNGs. A legacy `favicon.ico` was skipped on purpose: SVG
favicons are supported by all current browsers, and older ones degrade to no icon rather
than a broken one.
