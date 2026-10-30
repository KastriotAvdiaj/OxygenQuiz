import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

/**
 * A grey placeholder block in the shape of content that hasn't arrived yet.
 *
 * `bg-muted` on a dashboard card (`bg-card`) reads as "something goes here" in both themes; the
 * pulse is the only movement, and it stops under `prefers-reduced-motion`.
 *
 * Use a skeleton for a page's OWN data wait, where the shape of what is coming is known (a table,
 * a filter panel). Not for a route transition — see docs/development/loading-states.md §2.1 and
 * ADR 0029.
 */
export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden="true"
    className={cn("rounded-md bg-muted animate-pulse motion-reduce:animate-none", className)}
    {...props}
  />
);

/**
 * Wraps a group of skeletons with the app's 140ms appearance delay (`PageLoading`,
 * `RouteProgressBar`): a wait that resolves faster than that shows nothing instead of a grey
 * flash. The group is laid out from the first frame at `opacity: 0`, so the delay costs no
 * layout shift — the real content lands in the space the skeleton already took.
 *
 * Announces itself once to assistive tech (`role="status"` + `label`); the blocks inside are
 * `aria-hidden`.
 */
export const SkeletonGroup = ({
  label = "Loading",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label?: string }) => (
  <div
    role="status"
    aria-label={label}
    className={cn(
      "animate-in fade-in-0 duration-300 delay-150 fill-mode-both motion-reduce:animate-none",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
