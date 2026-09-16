/**
 * Per-quiz colour palette helpers.
 *
 * A quiz's colours are **not** hardcoded — they come from its category, stored as a JSON
 * array of hex strings in `QuizSummaryDTO.colorPaletteJson` and edited by admins in
 * `color-palette-input.tsx`. Anything that paints itself with a quiz's colour must go
 * through here so the parsing, the fallback and the contrast rule stay identical between
 * the card, the start modal and the category preview.
 */

/** Used when a quiz has no palette yet, or its stored JSON is unreadable. */
export const DEFAULT_QUIZ_PALETTE = ["#6366f1", "#3b82f6", "#06b6d4"] as const;

/**
 * Read a quiz's palette, falling back to the default on missing or malformed JSON.
 * Always returns at least one colour, so `parseQuizPalette(...)[0]` is safe.
 */
export function parseQuizPalette(colorPaletteJson?: string): string[] {
  if (!colorPaletteJson) return [...DEFAULT_QUIZ_PALETTE];

  try {
    const parsed = JSON.parse(colorPaletteJson);
    const colors = Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === "string" && c.length > 0)
      : [];
    return colors.length ? colors : [...DEFAULT_QUIZ_PALETTE];
  } catch {
    return [...DEFAULT_QUIZ_PALETTE];
  }
}

/**
 * `#rgb` / `#rrggbb` → `[r, g, b]` in 0–255, or `null` for anything else.
 *
 * Stored palettes are hex by contract (`PaletteColor.TryParseHex` gates writes), but this
 * reads what is *already stored*, so an unreadable value returns null and each caller
 * decides its own fallback rather than throwing on a row nobody can fix from the UI.
 */
function parseHexChannels(hex: string): [number, number, number] | null {
  let c = hex.trim().replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (!/^[0-9a-f]{6}$/i.test(c)) return null;

  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

/**
 * WCAG relative luminance (0 = black, 1 = white) for sRGB channels.
 *
 * Deliberately not a naive RGB average: the eye is far more sensitive to green than to
 * blue, and an average misjudges colours like pure blue (looks dark, averages mid) and
 * yellow (looks light, averages mid).
 */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel: number) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const toHex = (channel: number) =>
  Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");

/**
 * Pick black or white text for a given background colour so labels stay readable across
 * every category palette — a pale yellow category and a deep navy one both have to work.
 *
 * Accepts `#rgb` and `#rrggbb`. Anything else falls back to white.
 */
export function readableTextColor(hex: string): string {
  const channels = parseHexChannels(hex);
  if (!channels) return "#ffffff";

  return relativeLuminance(channels) > 0.5 ? "#0a0a0a" : "#ffffff";
}

/** Matches `--primary-edge` in global.css: the edge is the face, 30% of the way to black. */
const EDGE_DARKEN = 0.3;

/**
 * Below this luminance, darkening produces an edge nobody can see — near-black minus 30%
 * is still near-black, and on the dark theme it disappears into the surface entirely.
 * ~0.05 is roughly `#3a3a3a`: dark enough that the eye reads it as "black-ish" already.
 */
const TOO_DARK_TO_DARKEN = 0.05;

/** How far a too-dark face travels towards white instead, to get the same read. */
const EDGE_LIGHTEN = 0.35;

/**
 * The solid companion colour for the 3D "lifted" edge under a quiz-coloured surface —
 * the flat `0 4px 0 0` shadow on the start modal, and `liftColor` on its CTA.
 *
 * The app's edge rule is one line of CSS for theme colours (`--primary-edge` =
 * `color-mix(… black 30%)`), and a quiz colour cannot use it: the colour is a runtime
 * value from the category row, so it cannot be a Tailwind class (the JIT only generates
 * what it can read verbatim in source) and there is no token to point at. It is computed
 * here and handed to the element as an inline custom property instead.
 *
 * Darkening alone would be enough for every palette an admin is *likely* to pick, but not
 * for every one they *can* pick: a near-black face darkened by 30% has no visible edge, so
 * those go the other way and lighten. The face keeps its exact stored colour either way —
 * only the depth layer moves.
 *
 * Unparseable input falls back to the theme edge, so a broken palette row still draws a
 * button that looks deliberate. Returns a CSS colour, not necessarily hex.
 */
export function quizEdgeColor(hex: string): string {
  const channels = parseHexChannels(hex);
  if (!channels) return "var(--primary-edge)";

  const towardsWhite = relativeLuminance(channels) < TOO_DARK_TO_DARKEN;
  const mixed = channels.map((channel) =>
    towardsWhite
      ? channel + (255 - channel) * EDGE_LIGHTEN
      : channel * (1 - EDGE_DARKEN)
  );

  return `#${mixed.map(toHex).join("")}`;
}

/**
 * Up to two initials for a display name ("Ada Rose" → "AR", "kastriot" → "K").
 * Used by the avatar fallback on the quiz card.
 */
export function initialsFromName(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase();
}
