// Curated, user-selectable fonts. Each `value` is the CSS font-family name and
// MUST be preloaded in index.html (keep the two in sync).

export type FontOption = { label: string; value: string };

export const FONT_OPTIONS: FontOption[] = [
  { label: "System Default", value: "system-ui" },
  { label: "Noto Sans", value: "Noto Sans" },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Nunito", value: "Nunito" },
  { label: "Titillium Web", value: "Titillium Web" },
  { label: "DynaPuff", value: "DynaPuff" },
  { label: "Fredoka", value: "Fredoka" },
  { label: "Baloo 2", value: "Baloo 2" },
  { label: "Barriecito", value: "Barriecito" },
];

export const DEFAULT_APP_FONT = "Noto Sans";
export const DEFAULT_QUIZ_FONT = "DynaPuff";

// Coalesce an unknown/empty stored value (e.g. an old row backfilled with "")
// to a sensible default so the Select always shows a valid option.
export const normalizeFont = (
  font: string | null | undefined,
  fallback: string
) => (FONT_OPTIONS.some((f) => f.value === font) ? (font as string) : fallback);

// The CSS variables the Tailwind `app` / `quiz` families resolve through.
export const FONT_VARS = {
  app: "--font-app",
  quiz: "--font-quiz",
} as const;

export type FontZone = keyof typeof FONT_VARS;

// Quote multi-word family names; leave generic keywords (e.g. system-ui) bare.
const toCssValue = (font: string) => (/\s/.test(font) ? `"${font}"` : font);

// Apply a font to a zone by setting its CSS variable on the document root.
export const applyFont = (zone: FontZone, font: string) => {
  document.documentElement.style.setProperty(FONT_VARS[zone], toCssValue(font));
};
