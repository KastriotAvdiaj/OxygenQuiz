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
 * Pick black or white text for a given background colour so labels stay readable across
 * every category palette — a pale yellow category and a deep navy one both have to work.
 *
 * Uses the WCAG relative-luminance formula rather than a naive RGB average, because the
 * eye is far more sensitive to green than to blue and an average misjudges colours like
 * pure blue (looks dark, averages mid) and yellow (looks light, averages mid).
 *
 * Accepts `#rgb` and `#rrggbb`. Anything else falls back to white.
 */
export function readableTextColor(hex: string): string {
  let c = hex.trim().replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  if (!/^[0-9a-f]{6}$/i.test(c)) return "#ffffff";

  const toLinear = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);

  const r = toLinear(parseInt(c.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(c.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(c.slice(4, 6), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luminance > 0.5 ? "#0a0a0a" : "#ffffff";
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
