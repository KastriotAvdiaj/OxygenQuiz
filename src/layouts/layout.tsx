import Squares from "@/common/Effect-Related/background-squares";
import Prism from "@/common/Effect-Related/Prism";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";
import { EmailVerificationBanner } from "@/common/EmailVerificationBanner";
import { APP_SCROLL_CONTAINER_ID } from "@/lib/app-scroll";

type EffectType = "squares" | "lightning" | "prism" | "none";

interface LayoutProps {
  children: React.ReactNode;
  /** "hidden": no header at all — immersive routes like active quiz play,
      where every pixel of phone viewport belongs to the game
      (docs/RESPONSIVE.md). */
  headerBehavior?: "default" | "overlay-transparent" | "overlay-solid" | "hidden";
  contentPadding?: "auto" | "manual" | "none";
  effect?: EffectType;

  // Legacy props (deprecated but maintained for backward compatibility)
  /** @deprecated Use effect="squares" instead */
  squares?: boolean;
  /** @deprecated Use effect="lightning" instead */
  lightning?: boolean;
  /** @deprecated Use headerBehavior instead */
  headerColor?: boolean;
  /** @deprecated Use headerBehavior instead */
  overlay?: boolean;
}

export const HomeLayout = ({
  children,
  effect,
  headerBehavior,
  contentPadding = "auto",

  // Legacy props
  squares = false,
  lightning = false,
  headerColor = true,
  overlay = false,
}: LayoutProps) => {
  const { theme } = useTheme();
  const colors = {
    borderColor: theme === "dark" ? "#626262" : "#b4b4b4",
    hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  };

  // Determine final effect (new prop takes precedence over legacy props)
  const finalEffect: EffectType =
    effect || (squares ? "squares" : lightning ? "lightning" : "none");

  const finalHeaderBehavior =
    headerBehavior ||
    (overlay
      ? headerColor
        ? "overlay-solid"
        : "overlay-transparent"
      : "default");

  const isOverlay = finalHeaderBehavior.startsWith("overlay-");
  const isHeaderHidden = finalHeaderBehavior === "hidden";
  const hasHeaderBackground =
    finalHeaderBehavior === "default" ||
    finalHeaderBehavior === "overlay-solid";

  const shouldAddPadding =
    contentPadding === "auto" && !isOverlay && !isHeaderHidden;
  const shouldWrapContent = contentPadding === "auto" && isOverlay;

  // Render the selected effect
  const renderEffect = () => {
    switch (finalEffect) {
      case "squares":
        return (
          <Squares
            speed={1.5}
            squareSize={40}
            direction="diagonal"
            borderColor={colors.borderColor}
            hoverFillColor={colors.hoverFillColor}
          />
        );
      case "prism":
        // Absolute wrapper fills the container behind the content (Prism's own
        // root is w-full/h-full relative). Transparent canvas, so the app
        // background shows through and it works in both light and dark themes.
        return (
          <div className="absolute inset-0">
            <Prism
              animationType="rotate"
              timeScale={0.5}
              glow={1}
              bloom={1}
              noise={0.5}
              scale={3.6}
              suspendWhenOffscreen
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {!isHeaderHidden && <Header BackgroundColor={hasHeaderBackground} />}
      {/* THE app scroll container (see docs/RESPONSIVE.md — "Scrolling model").
          html/body never scroll; this div does. `.app-shell-viewport` sizes it to
          the *dynamic* viewport (100dvh) so nothing hides behind mobile browser
          chrome, and adds safe-area side padding for notched devices. The id is
          what src/lib/app-scroll.ts and the header's hide-on-scroll hook into. */}
      <div
        id={APP_SCROLL_CONTAINER_ID}
        className="app-shell-viewport relative bg-background font-quiz text-foreground"
        style={{
          paddingTop: shouldAddPadding ? "var(--header-height, 4rem)" : "0",
        }}
      >
        {renderEffect()}

        {/* Flex column that is AT LEAST one viewport tall but free to grow with
            its content (`height: 100%` here used to pin it to exactly one screen,
            which is what broke scrolling on pages taller than the viewport).
            Pages that want to fill the remaining screen height (hero/centered
            layouts) use `flex-1` on their root instead of h-screen/100vh — those
            units over-measure on mobile and double-count the header padding. */}
        <div className="relative z-[1] flex min-h-full flex-col">
          {/* Soft-gate nudge for unconfirmed users; self-hides otherwise. Skipped on overlay
              headers, where there's no normal-flow header to sit beneath. */}
          {!isOverlay && !isHeaderHidden && <EmailVerificationBanner />}
          {shouldWrapContent ? (
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  );
};
