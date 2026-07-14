import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

/**
 * Per-card accent: same visual weight, different hue, so sibling choices are
 * distinguishable at a glance without one looking "recommended". Each accent
 * sets the `--edge` custom property consumed by the card/chip shadows.
 * Kept module-private — pages pick an accent by name via the `accent` prop.
 */
const CARD_ACCENTS = {
  /** Brand blue — the featured/primary choice. */
  primary: {
    edge: "[--edge:var(--primary-edge)]",
    chip: "bg-primary text-white",
    hoverBorder: "hover:border-primary/70",
    text: "text-primary",
    ring: "focus-visible:ring-primary",
  },
  /** Neutral — theme foreground, like LiftedButton's classic dark edge. */
  foreground: {
    edge: "[--edge:hsl(var(--foreground))]",
    chip: "bg-foreground text-background",
    hoverBorder: "hover:border-foreground/60",
    text: "text-foreground",
    ring: "focus-visible:ring-foreground",
  },
  /** Green — creation / "go" actions (e.g. hosting a lobby). */
  green: {
    edge: "[--edge:color-mix(in_srgb,#16a34a,black_25%)]",
    chip: "bg-green-600 text-white",
    hoverBorder: "hover:border-green-500/70",
    text: "text-green-600 dark:text-green-400",
    ring: "focus-visible:ring-green-500",
  },
} as const;

export type CardAccent = keyof typeof CARD_ACCENTS;

export interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** One-line expectation hint shown at the card's foot (e.g. "Instant start"). */
  meta: string;
  metaIcon: LucideIcon;
  accent?: CardAccent;
  onSelect: () => void;
  /** Entrance stagger, in seconds. */
  delay?: number;
}

/**
 * One selectable option on a hub page (game mode, multiplayer action…):
 * icon chip, title + description, expectation hint, pushable 3D depth.
 * The motion wrapper only handles the entrance — hover/press transforms live
 * on the inner button as CSS, because framer-motion leaves an inline
 * `transform` behind that would override them.
 */
export function ModeCard({
  icon: Icon,
  title,
  description,
  meta,
  metaIcon: MetaIcon,
  accent = "primary",
  onSelect,
  delay = 0,
}: ModeCardProps) {
  const colors = CARD_ACCENTS[accent];

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`group relative flex h-full w-full flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left sm:p-8 shadow-[0_4px_0_0_var(--edge)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-[0_7px_0_0_var(--edge)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--edge)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${colors.edge} ${colors.hoverBorder} ${colors.ring}`}
      >
        {/* Icon chip — a miniature of the pushable button (inherits --edge) */}
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-[0_3px_0_0_var(--edge)] transition-transform duration-200 group-hover:-rotate-6 ${colors.chip}`}
        >
          <Icon className="h-6 w-6" />
        </span>

        <span className="space-y-1.5">
          <span className="block font-quiz text-2xl font-bold tracking-wider text-foreground sm:text-3xl">
            {title}
          </span>
          <span className="block text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </span>
        </span>

        {/* Foot row: expectation hint + affordance arrow */}
        <span className="mt-auto flex items-center justify-between pt-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colors.text}`}
          >
            <MetaIcon className="h-3.5 w-3.5" />
            {meta}
          </span>
          <ArrowRight
            className={`h-5 w-5 transition-transform duration-200 group-hover:translate-x-1.5 ${colors.text}`}
          />
        </span>
      </button>
    </motion.div>
  );
}
