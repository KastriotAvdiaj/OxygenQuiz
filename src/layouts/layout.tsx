import Squares from "@/common/Effect-Related/background-squares";
import Lightning from "@/common/Effect-Related/lightning-background";
import PrismaticBurst from "@/common/Effect-Related/PrismaticBurst";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";

type EffectType = "squares" | "lightning" | "prismatic" | "none";

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

// FIX: Define static objects outside the component to ensure referential stability.
// This prevents the PrismaticBurst from re-initializing its canvas on every render.
const PRISMATIC_COLORS = ["#ff007a", "#1602faff", "#ffffff"];
const PRISMATIC_OFFSET = { x: 0, y: 0 };

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
            speed={0.5}
            squareSize={40}
            direction="diagonal"
            borderColor={colors.borderColor}
            hoverFillColor={colors.hoverFillColor}
          />
        );
      case "lightning":
        return (
          <Lightning hue={220} xOffset={0} speed={1} intensity={1} size={1} />
        );
      case "prismatic":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0, // Ensure it anchors to top-left
              left: 0, // Ensure it anchors to top-left
              zIndex: 0, // Ensure it stays behind content if content is relative/z-indexed
              pointerEvents: "none", // Critical: prevents effect from blocking scroll/clicks
            }}>
            <PrismaticBurst
              animationType="rotate3d"
              intensity={2}
              speed={0.5}
              distort={1.0}
              paused={false}
              offset={PRISMATIC_OFFSET} // Uses stable reference
              hoverDampness={0.25}
              rayCount={2}
              // mixBlendMode="lighten"
              colors={PRISMATIC_COLORS} // Uses stable reference
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
        className={`bg-background text-foreground ${
          finalEffect !== "none" ? "overflow-hidden" : "overflow-y-auto"
        }`}
        style={{
          paddingTop: shouldAddPadding ? "var(--header-height, 4rem)" : "0",
          minHeight: isOverlay
            ? "100vh"
            : shouldAddPadding
            ? "calc(100vh - var(--header-height, 4rem))"
            : "100vh",
          position: "relative", // Ensure this container is the anchor for absolute children
        }}>
        {renderEffect()}

        {/* 
          Ensure children have relative positioning so they sit above 
          the absolute positioned background effect if z-indexing is tricky 
        */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {shouldWrapContent ? <div>{children}</div> : children}
        </div>
      </div>
    </>
  );
};
