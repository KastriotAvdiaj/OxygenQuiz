# Favicon

The production favicon is the **O₂ brand mark** — the same wordmark rendered by
[`src/common/O2Button.tsx`](../../src/common/O2Button.tsx) on the login and signup pages.
In development the app deliberately keeps a **generic icon** instead, so a dev tab and a
production tab are tellable apart at a glance when both are open.

| Mode | Icon | File |
|---|---|---|
| `production` (`npm run build`) | O₂ brand mark, brand blue on a transparent background | `public/favicon.svg` |
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

**Why the background is transparent, and what that costs.** The mark has no badge behind
it, so the glyphs carry the colour and have to work on both a light and a dark tab strip.
The generated SVG therefore ships a `prefers-color-scheme` rule that swaps the fill between
`--primary` light and `--primary` dark. The `fill` presentation attribute on the `<g>` is
the fallback for anywhere that CSS-in-favicon isn't honoured — without it the mark would
render black there, so don't remove it.

Re-run the script when the wordmark, its font, or the brand colours change. The constants
at the top (`TEXT`, `FONT_FAMILY`, `FONT_WEIGHT`, `GLYPH_COLOR`, `GLYPH_COLOR_DARK`) are
the things worth editing; they're kept in sync with `O2Button.tsx` and `src/global.css`.

---

## Scope / not included

Only `rel="icon"` is wired up. If the app later needs to be installable or pinned to an
iOS home screen, add `apple-touch-icon` (180×180 PNG) and a web app manifest — both would
follow the same `%VITE_*%` pattern. A legacy `favicon.ico` was skipped on purpose: SVG
favicons are supported by all current browsers, and older ones degrade to no icon rather
than a broken one.
