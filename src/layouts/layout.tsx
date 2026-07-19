import Squares from "@/common/Effect-Related/background-squares";
import Prism from "@/common/Effect-Related/Prism";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";
import { EmailVerificationBanner } from "@/common/EmailVerificationBanner";

type EffectType = "squares" | "lightning" | "prism" | "none";

interface LayoutProps {
  children: React.ReactNode;
  headerBehavior?: "default" | "overlay-transparent" | "overlay-solid";
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
  const hasHeaderBackground =
    finalHeaderBehavior === "default" ||
    finalHeaderBehavior === "overlay-solid";

  const shouldAddPadding = contentPadding === "auto" && !isOverlay;
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
      <Header BackgroundColor={hasHeaderBackground} />
      <div
        className="bg-background font-quiz text-foreground overflow-y-auto"
        style={{
          paddingTop: shouldAddPadding ? "var(--header-height, 4rem)" : "0",
          height: "100vh",
          position: "relative",
        }}
      >
        {renderEffect()}

        <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
          {/* Soft-gate nudge for unconfirmed users; self-hides otherwise. Skipped on overlay
              headers, where there's no normal-flow header to sit beneath. */}
          {!isOverlay && <EmailVerificationBanner />}
          {shouldWrapContent ? <div>{children}</div> : children}
        </div>
      </div>
    </>
  );
};
