import { useState, useEffect, useRef } from "react";
import { DrawerFilled } from "./Custom-Drawer/DrawerFilled";
import { NavLink } from "react-router-dom";
import { HeaderComponent } from "./HeaderComponent";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Divider } from "./Divider";
import HoverEffect from "./HoverEffect";
import { cn } from "@/utils/cn";
import { useUser } from "@/lib/Auth";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getAppScrollContainer } from "@/lib/app-scroll";
import { CreateQuizMethodDialog } from "@/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog";

interface HeaderProps {
  BackgroundColor?: boolean;
}

const Header = ({ BackgroundColor }: HeaderProps) => {
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { data: currentUser } = useUser();

  // Update CSS custom property when header height changes
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--header-height",
          `${height}px`
        );
      }
    };

    updateHeaderHeight();

    // Create ResizeObserver to watch for header size changes
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    // Update on window resize as well
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  // Hide-on-scroll-down / show-on-scroll-up. The window never scrolls in this
  // app (app-shell model, docs/RESPONSIVE.md) — the layout's scroll container
  // does — so we must listen there, not on window. Especially valuable on
  // phones, where the header is a big slice of the viewport.
  useEffect(() => {
    const container = getAppScrollContainer();
    if (!container) return;

    let lastScrollY = container.scrollTop;

    const handleScroll = () => {
      const y = container.scrollTop;
      // Ignore rubber-band overscroll (iOS reports negative/overshoot values),
      // and only hide once the header is actually out of the way of content.
      if (y <= 0) {
        setHidden(false);
      } else if (y > lastScrollY && y > 64) {
        setHidden(true);
      } else if (y < lastScrollY) {
        setHidden(false);
      }
      lastScrollY = y;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    // Responsive header (docs/RESPONSIVE.md): a flex row — nav left, actions
    // right — with the wordmark absolutely centered so it never squeezes the
    // sides. The old rigid grid-cols-5 gave the side zones ~1/5 of the width,
    // which wrapped the nav and collided with the wordmark on phones. The
    // wordmark hides below sm (no room between nav + actions); safe-area
    // padding keeps content clear of notches since the header is fixed and
    // sits outside the app shell's padded scroll container.
    <HeaderComponent
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-30 text-sm sm:text-lg shadow-md border-b border-border h-12 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 transition-transform duration-400 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${BackgroundColor ? "bg-background" : "bg-transparent"}`}
      style={{
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
      }}
    >
      <nav aria-label="Main">
        <ul className="flex items-center gap-2.5 sm:gap-4 font-bold font-quiz whitespace-nowrap">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-foreground" : "hover:text-foreground/80"
            }
          >
            {({ isActive }) => (
              <HoverEffect isActive={isActive}>
                <li className="text-foreground cursor-pointer">Home</li>
              </HoverEffect>
            )}
          </NavLink>

          {/* The one way back into a game from anywhere: /choose-mode covers both singleplayer
              and multiplayer. Deliberately one item, not "choose mode" + "select quiz" — those
              are two steps of the same flow, and the header is tight on phones. */}
          <NavLink
            to="/choose-mode"
            className={({ isActive }) =>
              isActive ? "text-foreground" : "hover:text-foreground/80"
            }
          >
            {({ isActive }) => (
              <HoverEffect isActive={isActive}>
                <li className="text-foreground cursor-pointer">Play</li>
              </HoverEffect>
            )}
          </NavLink>

          {/* Creating, from anywhere — until this, only the dashboards and the landing hero
              led to it. A link like Home and Play, not a button: the header is on every page,
              mid-quiz included, and a coloured button there would compete with each page's
              own primary action. It opens the same how-to-create chooser as the hero's
              "Create a quiz", with the user dashboard's routes; a signed-out visitor is sent
              to /login by the route's loader and comes back to the step they picked. It
              never shows as active — it opens a dialog, it isn't a place.

              Its hover sets it apart from the two links beside it, which only underline: the
              word fills with the primary colour from left to right, with its underline drawn
              in primary the same way. The fill is a two-colour gradient (primary | foreground)
              clipped to the text at twice the word's width, slid from showing its right half
              to its left half; the underline is a scale-x from the left edge. It stays filled
              while the chooser is open (`data-state=open`, from Radix's trigger) and on
              keyboard focus. Reduced motion: the colour changes without the sweep. */}
          <li>
            <CreateQuizMethodDialog
              trigger={
                <button
                  type="button"
                  className="group cursor-pointer rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "relative inline-block bg-[linear-gradient(to_right,hsl(var(--primary))_50%,hsl(var(--foreground))_50%)] bg-[length:200%_100%] bg-right bg-clip-text text-transparent transition-[background-position] duration-300 ease-out motion-reduce:transition-none",
                      "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-out after:content-[''] motion-reduce:after:transition-none",
                      "group-hover:bg-left group-hover:after:scale-x-100 group-focus-visible:bg-left group-focus-visible:after:scale-x-100 group-data-[state=open]:bg-left group-data-[state=open]:after:scale-x-100",
                    )}
                  >
                    Create
                  </span>
                  <span className="sr-only">, a quiz by hand or with AI</span>
                </button>
              }
              manualPath="/my-dashboard/quizzes/create"
              aiTopicPath="/my-dashboard/quizzes/create/ai/topic"
              aiMaterialPath="/my-dashboard/quizzes/create/ai/material"
              associationsPath="/my-dashboard/quizzes/create/associations"
            />
          </li>
        </ul>
      </nav>

      {/* Centered wordmark — absolute so left/right zones keep their natural
          width. Hidden on phones: nav + actions own that space. */}
      <p className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none text-2xl md:text-3xl font-bold text-foreground font-quiz sm:block">
        OXYGEN
      </p>

      <div className="flex items-center justify-end gap-1.5 sm:gap-3">
        {currentUser && <NotificationBell />}
        {/* Sound is controlled from user settings — the header toggle was
            removed on purpose; don't re-add it. */}
        <ModeToggle className="rounded-[2rem] h-8 px-1.5 sm:h-10 sm:px-2" />
        <div className="hidden sm:block">
          <Divider orientation="vertical" thickness="1px" length="24px" />
        </div>
        <DrawerFilled />
      </div>
    </HeaderComponent>
  );
};

export default Header;
