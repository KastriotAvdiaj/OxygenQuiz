# Favicon

The production favicon is the **O₂ mark** in Nunito Black, white on a brand-blue badge. Since
2026-11-07 it is deliberately *not* the DynaPuff wordmark of
[`src/common/O2Button.tsx`](../../src/common/O2Button.tsx): at 16–48 px DynaPuff's O came out
small and lumpy, and a plain heavy face reads better at that size.
In development the app deliberately keeps a **generic icon** instead, so a dev tab and a
production tab are tellable apart at a glance when both are open.

| Mode | Icon | File |
|---|---|---|
| `production` (`npm run build`) | O₂ brand mark, white on a brand-blue rounded badge | `public/favicon.svg` |
| both | the same badge as a 180×180 PNG, for iOS home screens and search engines | `public/apple-touch-icon.png` |
| both | the same badge at 16, 32 and 48 px, for anything that asks for `/favicon.ico` unprompted | `public/favicon.ico` |
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

The script downloads Nunito 900 from Google Fonts, converts the `O` and an ordinary `2` to SVG
outline paths — the `2` shrunk and dropped below the baseline as a subscript, so its size is ours
to set rather than the font's `₂` — and centres them on their ink bounds.

**Why outlines instead of `<text>`.** A favicon is drawn by the browser chrome, outside
the page, so it cannot load a webfont. `<text font-family="DynaPuff">` would silently fall
back to a system face and the icon would change from one machine to the next. Converting to paths
makes the file self-contained.

**Why a badge (since 2026-11-07).** Until then the mark had no background: blue glyphs on
transparent, with a `prefers-color-scheme` rule for dark tab strips. Google shows a site's
favicon inside a circle in its results, and there the wide, thin mark came out small and
floating. A white mark on a brand-blue badge reads at 16 px on any background and needs no
colour-scheme rule. The glyphs sit inside the circle Google crops to (`PADDING`), so the `₂`
survives the crop; the rounded corners (`BADGE_RADIUS`) are what a browser tab shows.

Re-run the script when the wordmark, its font, or the brand colours change. The constants
at the top (`FONT_FAMILY`, `FONT_WEIGHT`, `SUB_SCALE`, `SUB_DROP`, `SUB_GAP`, `BADGE_COLOR`, `GLYPH_COLOR`,
`PADDING`) are the things worth editing; the badge colour is kept in sync with `src/global.css`.
Then regenerate the PNG from the SVG (any SVG rasteriser; with librsvg):

```bash
rsvg-convert -w 180 -h 180 public/favicon.svg -o public/apple-touch-icon.png
rsvg-convert -w 48 -h 48 public/favicon.svg -o /tmp/favicon-48.png
python -c "from PIL import Image; Image.open('/tmp/favicon-48.png').save('public/favicon.ico', sizes=[(16,16),(32,32),(48,48)])"
```

**A search result's icon changes on Google's schedule, not ours.** It is fetched when Google
recrawls the home page — days to weeks; *Request indexing* on the home page in Search Console
speeds it up. It must be square and at least 48 px, which both files are.

---

## Scope / not included

`rel="icon"` and `rel="apple-touch-icon"` are wired up. If the app later needs to be
installable, add a web app manifest with 192 and 512 PNGs. `favicon.ico` is not linked from `index.html` —
browsers use the SVG — but it exists because crawlers, feed readers and old browsers request
`/favicon.ico` without being told to. Until 2026-11-08 there was none, and the Worker's SPA
fallback answered that request with the app's HTML (status 200), which is worse than a 404.
