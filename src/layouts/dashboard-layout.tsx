import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/pages/Dashboard/Components/DashboardHeader";
import { DashboardNav } from "@/pages/Dashboard/Components/DashboardNav";
import { DashboardIsland } from "@/pages/Dashboard/Components/DashboardIsland";
import type { DashboardNavItem } from "@/pages/Dashboard/Components/dashboardNavConfig";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/utils/cn";

/**
 * The shell's height. `h-screen` is `100vh`, which on mobile is the viewport *without* the
 * browser chrome — so the shell runs under the URL bar and anything at its bottom edge is
 * unreachable. Keep 100vh as the first-line fallback and override where dvh is supported,
 * the pair docs/RESPONSIVE.md prescribes.
 *
 * This is not the deferred move onto `.app-shell-viewport`: `main` still owns the scrolling,
 * so which element scrolls is unchanged on every dashboard page.
 */
const SHELL_HEIGHT = "h-screen supports-[height:100dvh]:h-[100dvh]";

/**
 * Bottom clearance for the floating island, which is `fixed` and therefore paints OVER the
 * scroll area: 44px pill + 12px island padding + 12px float gap + the home indicator, rounded
 * up so the last card in a list clears it instead of living underneath it.
 *
 * **Why the `short:` copy exists.** `short:` is `max-height: 860px`, and a phone in portrait
 * matches it — an iPhone 12 Pro is 844px tall. Tailwind emits custom screens last, so a
 * `short:p-*` shorthand anywhere on this element wins over a base `pb-*` and silently takes
 * the clearance away on exactly the devices that need it. Restating it under `short:` is what
 * keeps the two from fighting. Delete one and the bug comes back invisibly on desktop.
 */
const ISLAND_CLEARANCE =
  "pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] short:pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] lg:pb-10 lg:short:pb-10";

interface DashboardLayoutProps {
  children: React.ReactNode;
  basePath: string; // "/dashboard" | "/my-dashboard"
  navItems: DashboardNavItem[];
  fullWidthPaths?: string[]; // paths that hide the nav (e.g. quiz creator)
  /**
   * Paths that additionally render with **no header** — see
   * docs/adr/0002-quiz-creation-routes-hide-the-dashboard-header.md.
   *
   * The header is 77px on a 730px laptop viewport, and on the AI wizard those 77px are
   * the difference between the Generate button being on screen and being below the fold.
   *
   * **A route may only enter focus mode if it has its own in-page way back.** Removing
   * the header removes Back, Home, the theme toggle and the account button at once; a
   * page with no escape of its own is left with the browser's Back button and nothing
   * else. Both AI routes carry their own Back control, which is why they qualify — and
   * why the manual creator and the edit form (which do not) are deliberately absent from
   * this list even though they share the full-width branch.
   *
   * Prefix-matched, like `fullWidthPaths`.
   */
  focusPaths?: string[];
}

export const DashboardLayout = ({
  children,
  basePath,
  navItems,
  fullWidthPaths = [],
  focusPaths = [],
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  // The island's overflow drawer. Phones only — the rail is the navigation from `lg` up.
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Responsive: collapse to an icon rail on narrower viewports, expand back on
  // wide ones. Users can still toggle manually within a breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = (matches: boolean) => setIsNavCollapsed(matches);
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setActivePage = (page: string) => {
    navigate(`${basePath}/${page}`);
  };

  // Navigating from inside the drawer has to close it: the sheet is a layer over the page it
  // just navigated to, so leaving it open hides the result of the tap behind its own overlay.
  const setActivePageFromDrawer = (page: string) => {
    setIsMobileNavOpen(false);
    setActivePage(page);
  };

  const activePage = location.pathname.split("/").pop() || "";
  // Exact match, or prefix match for parameterised paths (e.g. .../edit-quiz/:quizId).
  const matchesPath = (paths: string[]) =>
    paths.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const isFullWidth = matchesPath(fullWidthPaths);
  // Focus mode is a stricter case of full width: no nav *and* no header. It never
  // applies on its own, so a path listed here must also be full width.
  const isFocusMode = isFullWidth && matchesPath(focusPaths);

  // No island here either, and deliberately: these are the creator and editor, whose whole
  // point is that the surrounding navigation is gone. They carry their own way back.
  if (isFullWidth) {
    return (
      <div className={cn("text-foreground flex flex-col", SHELL_HEIGHT)}>
        {/* No header in focus mode. The page owns the whole viewport and provides its
            own way back — see the `focusPaths` doc comment and ADR 0002. */}
        {!isFocusMode && (
          <header className="flex-none">
            <DashboardHeader />
          </header>
        )}

        {/* `short:p-4` halves the vertical gutter on a short viewport. This padding had
            width steps only, so a laptop that is wide but short paid the full 64px —
            and none of the `short:` work done on the wizard itself could reach it
            (docs/RESPONSIVE.md, "Short viewports"). */}
        <main className="flex-1 overflow-y-auto bg-muted p-4 sm:p-6 lg:p-8 short:p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={cn("text-foreground flex flex-col", SHELL_HEIGHT)}>
      <header className="flex-none">
        <DashboardHeader />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* `hidden lg:block`: below lg the navigation is the floating island, not a rail.
            A 76px icon column is 20% of a 390px screen spent on unlabelled icons — the
            convention this app already applies to every other sidebar (docs/RESPONSIVE.md,
            "Sidebars → drawers"), which this layout had simply never picked up.

            CSS hides it rather than a JS breakpoint check on purpose: DashboardNav is
            stateless, so the duplicate tree costs a few DOM nodes and nothing else. The
            matchMedia branch is only owed to a child that holds a live subscription. */}
        <aside
          className={cn(
            "bg-background relative hidden flex-none overflow-hidden border-r border-border transition-[width] duration-300 ease-in-out lg:block",
            isNavCollapsed ? "w-[76px]" : "w-64"
          )}
          aria-label="Dashboard navigation">
          <DashboardNav
            navItems={navItems}
            setActivePage={setActivePage}
            activePage={activePage}
            isCollapsed={isNavCollapsed}
            setIsCollapsed={setIsNavCollapsed}
          />
        </aside>

        {/* Gutters step with width, like the full-width branch above. This was a flat `p-10`
            with no steps at all, which on a 390px phone spent 80px of 390 on padding — with
            the 76px rail beside it, pages were laid out in 234px. `lg:p-10` keeps the desktop
            gutter exactly as it was; only sm and below change.

            `min-w-0`: a flex item's default `min-width: auto` floors it at its content width,
            so one wide child (a tab strip, a table) widens `main` instead of scrolling inside
            it, and the overflow lands on the page as a horizontal scrollbar. The same failure
            the `min-h-0` chain covers vertically — see docs/RESPONSIVE.md. */}
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto bg-muted p-4 sm:p-6 lg:p-10 short:p-4",
            ISLAND_CLEARANCE
          )}>
          {children}
        </main>
      </div>

      <DashboardIsland
        navItems={navItems}
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenMore={() => setIsMobileNavOpen(true)}
      />

      {/* The island's overflow: the same DashboardNav the rail renders, in a drawer. One
          component, two shells — never two implementations of the same navigation. */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 pt-12 sm:max-w-[280px]"
          // Radix warns when a dialog has no description. This one is a list of links, and a
          // description would be announced before every visit for no benefit.
          aria-describedby={undefined}>
          {/* Radix requires a title for the accessible name, and a screen reader genuinely
              wants it — but on screen the list speaks for itself, so it is visually hidden. */}
          <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
          <DashboardNav
            navItems={navItems}
            setActivePage={setActivePageFromDrawer}
            activePage={activePage}
            isCollapsed={false}
            hideCollapseToggle
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardLayout;
