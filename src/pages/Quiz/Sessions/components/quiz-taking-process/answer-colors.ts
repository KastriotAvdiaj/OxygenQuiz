/**
 * Colours for answer states during quiz taking.
 *
 * These are applied as inline styles rather than Tailwind classes because the state is
 * computed at render time and Tailwind can't generate a class per branch. Referencing the
 * theme tokens keeps them honest anyway: `--primary` differs between light and dark mode,
 * so a hardcoded hex (this used to be `#2540d9`) drifts from the rest of the app the moment
 * the palette changes, and reads wrong in one of the two modes.
 */

/** A picked-but-not-yet-submitted answer. */
export const ANSWER_SELECTED_BORDER = "hsl(var(--primary))";

/**
 * The same, as a wash behind the option. Deliberately faint — the border carries it.
 * 0.1 matches what the true/false question was already using, which is where these values
 * came from; the other question types had drifted onto a hardcoded hex.
 */
export const ANSWER_SELECTED_BACKGROUND = "hsl(var(--primary) / 0.1)";
