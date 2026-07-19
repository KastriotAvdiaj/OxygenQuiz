/**
 * Shared styling for the "pushable" quiz form fields (Input / Textarea).
 *
 * Same design language as LiftedButton and the quiz Select trigger: a solid
 * theme-aware surface (readable in light and dark), a full-strength colored
 * border, and a solid darkened "edge" underneath that the field visually
 * presses into while focused.
 *
 * Composition model: SHELL (geometry + shadows) + PRESS (focus interaction)
 * + one THEME (palette). Each theme sets the `--edge` custom property that
 * the shell's shadows consume, so recoloring a field (e.g. per question
 * type) means swapping the theme string — no class-string surgery.
 */

/** Structural shell: geometry, typography, edge shadows, placeholder behaviour. */
export const FIELD_SHELL =
  "border-2 rounded-xl font-medium text-center text-lg sm:text-xl md:text-xl px-4 py-2 " +
  "shadow-[0_4px_0_0_var(--edge)] transition-all duration-200 " +
  "placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0";

/** Press-in interaction: mousedown sinks the field, focus keeps it slightly pressed. */
export const FIELD_PRESS =
  "active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--edge)] " +
  "focus-visible:translate-y-[2px] focus-visible:shadow-[0_2px_0_0_var(--edge)]";

/**
 * Color themes: border, surface tints, focus ring and the `--edge` color.
 * `primary` tracks the app theme via --primary-edge (global.css); the fixed
 * hues (orange = Type-the-Answer, green/red = answer feedback) derive their
 * edge the same way --primary-edge does: color-mix towards black.
 */
export const FIELD_THEMES = {
  primary:
    "[--edge:var(--primary-edge)] bg-background text-foreground " +
    "border-primary/60 dark:border-primary/70 hover:border-primary/80 " +
    "focus:border-primary focus:bg-primary/5 dark:focus:bg-primary/10 focus-visible:ring-primary",
  orange:
    "[--edge:color-mix(in_srgb,#f97316,black_30%)] bg-background text-foreground " +
    "border-orange-500/60 dark:border-orange-500/70 hover:border-orange-500/80 " +
    "focus:border-orange-500 focus:bg-orange-500/5 dark:focus:bg-orange-500/10 focus-visible:ring-orange-500",
  green:
    "[--edge:color-mix(in_srgb,#16a34a,black_25%)] bg-green-500/10 dark:bg-green-500/15 text-foreground " +
    "border-green-600/80 focus:border-green-600 focus-visible:ring-green-500",
  red:
    "[--edge:color-mix(in_srgb,#dc2626,black_20%)] bg-red-500/10 dark:bg-red-500/15 text-foreground " +
    "border-red-500/70 focus:border-red-500 focus-visible:ring-red-500",
} as const;

export type FieldTheme = keyof typeof FIELD_THEMES;

/**
 * Modern "settings" field — the quiet, premium counterpart to the pushable quiz fields.
 * For settings panels (title, description, etc.) where a big centered display-font control
 * feels out of place. Theme-aware via tokens (foreground / border / primary / muted), so it
 * reads correctly in light and dark with no per-theme class soup.
 *
 * Intent: clean sans-serif, normal weight, comfortable padding, a subtle neutral border by
 * default, and the primary color appearing only on focus (border + soft ring). Pairs with the
 * Select "minimal" variant, which already follows the same language.
 */
export const FIELD_MODERN =
  "flex w-full rounded-md border border-border bg-background dark:bg-white/[0.04] " +
  "px-3.5 py-2.5 font-sans text-[15px] font-normal leading-normal text-foreground shadow-sm " +
  "placeholder:font-normal placeholder:text-muted-foreground " +
  "outline-none transition-[color,background-color,border-color,box-shadow] duration-150 " +
  "hover:border-foreground/25 " +
  "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 " +
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 " +
  "disabled:cursor-not-allowed disabled:opacity-50";
