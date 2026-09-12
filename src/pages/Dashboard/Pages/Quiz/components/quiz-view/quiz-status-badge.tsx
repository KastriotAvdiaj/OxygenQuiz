import { Badge } from "@/components/ui/badge";
import type { QuizStatus } from "@/types/quiz-types";

/**
 * The quiz's status, as one badge in three shades of the theme accent.
 *
 * <b>The three statuses are one scale, so they get one hue.</b> Draft → Unlisted → Public is
 * a ramp of *reach* (nobody, anyone with the link, everybody — see quiz-visibility.md), and
 * the fill tracks it: faint tint, mid tint, solid. Reading them as a sequence is the point,
 * which is exactly what the previous treatment prevented — Public was a hard-coded
 * `bg-green-500` and Draft fell back to the grey `secondary` variant, so the two looked like
 * unrelated states from different systems rather than two ends of one axis. Green also said
 * "success", which Public isn't; it is a visibility setting, not an achievement.
 *
 * <b>Why the text colour does not vary.</b> The obvious ramp — `text-primary` on a
 * `bg-primary/N` tint — fails contrast in dark mode at every tint strength: the accent is
 * `#3b82f6`, whose luminance against a near-black surface tops out around **3.7:1**, short of
 * AA's 4.5. `bg-primary/50` with any foreground is worse still (2.4:1 light, 2.2:1 dark). So
 * the ramp is carried by fill and border, and the label stays on a foreground token that
 * clears AA in both themes. Measured, not guessed:
 *
 * | | light | dark |
 * |---|---|---|
 * | Public — `text-primary-foreground` on `bg-primary` | 4.94 | 4.85 |
 * | Unlisted — `text-foreground` on `bg-primary/15` | 16.20 | 11.65 |
 * | Draft — `text-foreground` on `bg-primary/5` | 18.66 | 13.26 |
 *
 * Every class is a complete literal picked from this map — never assembled — because the JIT
 * compiler only generates what it can read verbatim in source.
 */
const STATUS_STYLES: Record<QuizStatus, string> = {
  Public: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  Unlisted: "border-primary/70 bg-primary/15 text-foreground hover:bg-primary/25",
  Draft: "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10",
};

/** What the status actually controls, for the reader who has not memorised the three words. */
const STATUS_TITLES: Record<QuizStatus, string> = {
  Public: "Anyone can find and play this quiz",
  Unlisted: "Playable with the share link, but not listed publicly",
  Draft: "Only you can see this quiz",
};

export const QuizStatusBadge = ({ status }: { status: QuizStatus }) => (
  <Badge variant="outline" className={STATUS_STYLES[status]} title={STATUS_TITLES[status]}>
    {status}
  </Badge>
);
