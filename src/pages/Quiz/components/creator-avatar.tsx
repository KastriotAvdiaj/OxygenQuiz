import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";
import { initialsFromName } from "./quiz-palette";

/**
 * Who made a quiz: a round avatar — their profile photo, or their initials when they have none —
 * that shows their name on hover. One component for the catalogue card's corner and the start
 * modal, so a creator looks the same in both (2026-10-27; it lived in the card's `card-parts.tsx`
 * before). Size it with `className` (`h-6 w-6` by default).
 *
 * The name pops up *below* the avatar, right-aligned: both places it sits are `overflow-hidden`
 * and it sits near their top-right, so a popup above or centred would be clipped. Decorative for
 * screen readers — the card's `aria-label` ends "by <name>", and the modal says the name itself.
 *
 * No fill of its own — just a muted hairline. A solid background would compete with the
 * palette stripe for attention, and it would box in photos that already have their own
 * backdrop. The ring is `border-border`, the same hairline as the card, so the avatar reads as
 * part of the surface rather than as a badge stuck on it.
 */
export function CreatorAvatar({
  name,
  imageUrl,
  className,
}: {
  name?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className="group/author relative shrink-0">
      <Avatar className={cn("h-6 w-6 rounded-full border border-border", className)}>
        <AvatarImage
          src={imageUrl ?? undefined}
          alt={name}
          className="rounded-full"
          loading="lazy"
          decoding="async"
        />
        <AvatarFallback className="rounded-full bg-transparent text-[10px] font-bold text-muted-foreground">
          {initialsFromName(name)}
        </AvatarFallback>
      </Avatar>
      {name && (
        <span className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-app text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-200 group-hover/author:opacity-100">
          {name}
        </span>
      )}
    </div>
  );
}
