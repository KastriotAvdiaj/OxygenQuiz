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

/**
 * How much room the card has.
 *
 * `default` is the hub-page card: a full viewport column to itself, so it can afford a 3xl
 * title and 2rem of padding. `compact` is the same card inside a dialog — same shape, same
 * depth, same accents, stepped down so two of them fit a `sm:max-w-xl` overlay without
 * either one wrapping its title. A size variant rather than a second component: the whole
 * point of the create-quiz chooser using this card is that the two surfaces look like one
 * app, and that survives exactly as long as there is one implementation.
 */
const CARD_SIZES = {
  default: {
    frame: "gap-3 rounded-2xl p-4 sm:gap-4 sm:p-8",
    chip: "h-10 w-10 rounded-xl sm:h-12 sm:w-12",
    chipIcon: "h-5 w-5 sm:h-6 sm:w-6",
    title: "text-xl sm:text-3xl",
    description: "text-sm sm:text-base",
    meta: "text-xs",
    arrow: "h-5 w-5",
  },
  compact: {
    frame: "gap-2.5 rounded-xl p-4",
    chip: "h-9 w-9 rounded-lg",
    chipIcon: "h-4 w-4",
    title: "text-lg",
    description: "text-xs leading-snug",
    meta: "text-[11px]",
    arrow: "h-4 w-4",
  },
} as const;

export type CardSize = keyof typeof CARD_SIZES;

export interface ModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** One-line expectation hint shown at the card's foot (e.g. "Instant start"). */
  meta: string;
  metaIcon: LucideIcon;
  accent?: CardAccent;
  size?: CardSize;
  /**
   * Present but not yet choosable. Keeps the card in place — showing a coming-soon option
   * settles the shape of the choice now, so enabling it later doesn't move its siblings
   * under someone's cursor — while dropping every affordance that implies it will respond:
   * no lift, no arrow travel, no pointer. Say what it is in `meta` ("Coming soon"); the
   * card deliberately renders no badge of its own, because the foot row already has a slot
   * for exactly this kind of expectation-setting.
   */
  disabled?: boolean;
  onSelect: () => void;
  /** Entrance stagger, in seconds. */
  delay?: number;
}

/**
 * One selectable option on a hub page (game mode, multiplayer action…) or in a chooser
 * dialog (`size="compact"` — see create-quiz-method-dialog.tsx):
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
  size = "default",
  disabled = false,
  onSelect,
  delay = 0,
}: ModeCardProps) {
  const colors = CARD_ACCENTS[accent];
  const sizes = CARD_SIZES[size];

  // Every motion affordance in one string, so a disabled card can drop the whole set rather
  // than having each transform remember to check the flag.
  const pressable = disabled
    ? "cursor-not-allowed opacity-60"
    : "hover:-translate-y-1 hover:shadow-[0_7px_0_0_var(--edge)] active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--edge)] " +
      colors.hoverBorder;

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
        disabled={disabled}
        aria-disabled={disabled}
        className={`group relative flex h-full w-full flex-col border-2 border-border bg-card text-left font-app shadow-[0_4px_0_0_var(--edge)] transition-[transform,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${sizes.frame} ${pressable} ${colors.edge} ${colors.ring}`}
      >
        {/* Icon chip — a miniature of the pushable button (inherits --edge) */}
        <span
          className={`inline-flex items-center justify-center shadow-[0_3px_0_0_var(--edge)] transition-transform duration-200 ${disabled ? "" : "group-hover:-rotate-6"} ${sizes.chip} ${colors.chip}`}
        >
          <Icon className={sizes.chipIcon} />
        </span>

        <span className="space-y-1.5">
          <span
            className={`block font-quiz font-bold tracking-wider text-foreground ${sizes.title}`}
          >
            {title}
          </span>
          <span
            className={`block leading-relaxed text-muted-foreground ${sizes.description}`}
          >
            {description}
          </span>
        </span>

        {/* Foot row: expectation hint + affordance arrow */}
        <span className="mt-auto flex items-center justify-between pt-2">
          <span
            className={`inline-flex items-center gap-1.5 font-semibold ${sizes.meta} ${colors.text}`}
          >
            <MetaIcon className="h-3.5 w-3.5" />
            {meta}
          </span>
          {/* The arrow is an affordance, not decoration: no arrow on a card that won't go
              anywhere yet. */}
          {!disabled && (
            <ArrowRight
              className={`transition-transform duration-200 group-hover:translate-x-1.5 ${sizes.arrow} ${colors.text}`}
            />
          )}
        </span>
      </button>
    </motion.div>
  );
}
