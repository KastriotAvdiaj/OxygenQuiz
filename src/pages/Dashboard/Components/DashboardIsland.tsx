import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardNavItem } from "./dashboardNavConfig";
import { ROLES, useAuthorization } from "@/lib/authorization";
import { cn } from "@/utils/cn";

type DashboardIslandProps = {
  navItems: DashboardNavItem[];
  activePage: string;
  onNavigate: (page: string) => void;
  /** Opens the full nav in a drawer — the island's overflow. */
  onOpenMore: () => void;
};

/**
 * The phone navigation for both dashboards: a floating, fully-rounded island of icons,
 * detached from the bottom edge and sitting *over* the scrolling content.
 *
 * It is deliberately not the edge-to-edge bottom bar of the platform guidelines. That one is
 * attached, square, and owns a strip of the screen; this one is sized by its content, which is
 * what makes `rounded-full` read as an island rather than as a very large stadium button.
 * Three icons is the budget — see `island` in dashboardNavConfig.ts.
 *
 * **Because it floats, it covers content.** The scroll container has to reserve the island's
 * height plus the bottom safe area, or the last row of every list sits permanently underneath
 * it; `DashboardLayout`'s `main` carries that padding. This is the failure mode of every
 * floating nav and it is invisible on a desktop browser — check it on a phone-sized viewport
 * with a list long enough to scroll.
 *
 * Hidden from `lg` up, where the sidebar rail is the navigation.
 */
export const DashboardIsland: React.FC<DashboardIslandProps> = ({
  navItems,
  activePage,
  onNavigate,
  onOpenMore,
}) => {
  const { checkAccess } = useAuthorization();

  // Role-filter first, exactly as the sidebar does, so an item the viewer cannot reach never
  // occupies one of the three slots (and `hasMore` counts what they can actually see).
  const { islandItems, hasMore } = useMemo(() => {
    const visible = navItems.filter((item) =>
      checkAccess({ allowedRoles: (item.roles ?? []) as ROLES[] }),
    );
    const flagged = visible.filter((item) => item.island);

    return { islandItems: flagged, hasMore: visible.length > flagged.length };
  }, [navItems, checkAccess]);

  if (islandItems.length === 0) return null;

  // A page reached from the drawer (Categories, Audit Log, …) is not in the island, so no
  // trigger matches and Radix simply renders no active pill — which is correct: the pill
  // would otherwise lie about where you are. The More button picks the highlight up instead.
  const isIslandPage = islandItems.some((item) => item.id === activePage);

  return (
    // The full-width wrapper centres the island without a transform, and is click-through:
    // it spans the viewport, so `pointer-events-none` here is what stops it from swallowing
    // taps on the content to the left and right of the pill.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden"
      // The gap the island floats by. Written against the safe-area inset so it clears the
      // iOS home indicator instead of sitting on top of it.
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <nav
        aria-label="Dashboard"
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full p-1.5",
          // Translucent + blurred so the content scrolling underneath stays legible as
          // texture rather than as competing detail. The border keeps the edge defined on a
          // busy background, where the shadow alone disappears.
          "border border-border bg-background/80 shadow-lg backdrop-blur-md",
          "supports-[backdrop-filter]:bg-background/60",
        )}
      >
        <Tabs
          // Radix owns selection; the URL owns the truth. Feeding the resolved page in as a
          // controlled `value` keeps them from disagreeing after a back/forward navigation.
          value={isIslandPage ? activePage : ""}
          onValueChange={onNavigate}
          // Radix activates a tab as soon as an arrow key focuses it. For panels that is the
          // point; here each "tab" is a route, so the default would fire a navigation per
          // keypress while someone is still deciding. Manual = focus with arrows, commit with
          // Enter or Space.
          activationMode="manual"
        >
          {/* TabsList's own chrome is stripped here — the wrapper above is the island, and
              two stacked translucent surfaces read as a smudge rather than as one object. */}
          <TabsList className="h-auto gap-1 rounded-full border-0 bg-transparent p-0 shadow-none backdrop-blur-none">
            {islandItems.map((item) => {
              const Icon = item.icon;

              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  // Icon-only, so the label has to reach assistive tech some other way.
                  // Without this the control announces as an empty tab.
                  aria-label={item.label}
                  className={cn(
                    // 44px: the touch-target floor in docs/RESPONSIVE.md, and the width the
                    // pill animates between — keep them square or the pill wobbles.
                    "h-11 w-11 rounded-full px-0 py-0",
                    "data-[state=inactive]:bg-transparent",
                    "data-[state=inactive]:hover:bg-muted/60",
                  )}
                  activeClassName="rounded-full"
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {hasMore && (
          <>
            <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-border" />
            <button
              type="button"
              onClick={onOpenMore}
              aria-label="More sections"
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // Carries the "you are here" state for every page the island doesn't list,
                // so the bar is never left with nothing highlighted.
                isIslandPage
                  ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              <LayoutGrid size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default DashboardIsland;
