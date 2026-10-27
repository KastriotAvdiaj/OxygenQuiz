import { PickHand } from "@/components/icons/solid-icons";
import { cn } from "@/utils/cn";

/**
 * The badge's text, in one place: the app's name may change (docs/media/moderation.md, "Picked and
 * community quizzes"). The code calls the concept "picked" everywhere else.
 */
export const PICK_BADGE_LABEL = "Oxygen Pick";

/** Shown on a picked *community* quiz — a house quiz is picked by definition and carries none. */
export const showsPickBadge = (quiz: { isPicked?: boolean; isHouse?: boolean }) => !!quiz.isPicked && !quiz.isHouse;

export function PickBadge({ className }: { className?: string }) {
  return (
    <span
      title="Picked by the Oxygen team for the main catalogue"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary",
        className,
      )}
    >
      <PickHand size={12} />
      {PICK_BADGE_LABEL}
    </span>
  );
}
