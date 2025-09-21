import Squares from "@/common/Effect-Related/background-squares";
import Lightning from "@/common/Effect-Related/lightning-background";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";

interface LayoutProps {
  children: React.ReactNode;
  headerBehavior?: "default" | "overlay-transparent" | "overlay-solid";
  contentPadding?: "auto" | "manual" | "none";
  squares?: boolean;
  lightning?: boolean;

  // Legacy props (deprecated but maintained for backward compatibility)
  /** @deprecated Use headerBehavior instead */
  headerColor?: boolean;
  /** @deprecated Use headerBehavior instead */
  overlay?: boolean;
}

export const HomeLayout = ({
  children,
  squares = false,
  lightning = false,
  headerBehavior,
  contentPadding = "auto",

  // Legacy props
  headerColor = true,
  overlay = false,
}: LayoutProps) => {
  const { theme } = useTheme();
  const colors = {
    borderColor: theme === "dark" ? "#626262" : "#b4b4b4",
    hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  };

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

  console.log(shouldAddPadding);

  return (
    <>
      <Header BackgroundColor={hasHeaderBackground} />
      <div
        className={`bg-background text-foreground ${
          squares ? "overflow-hidden" : "overflow-y-auto"
        }`}
        style={{
          paddingTop: shouldAddPadding ? "var(--header-height, 4rem)" : "0",
          minHeight: isOverlay
            ? "100vh"
            : shouldAddPadding
            ? "calc(100vh - var(--header-height, 4rem))"
            : "100vh",
        }}
      >
        {squares && (
          <Squares
            speed={0.5}
            squareSize={40}
            direction="diagonal" // up, down, left, right, diagonal
            borderColor={colors.borderColor}
            hoverFillColor={colors.hoverFillColor}
          />
        )}
        {lightning && (
          <Lightning hue={220} xOffset={0} speed={1} intensity={1} size={1} />
        )}

        {/* Auto-manage content padding for overlay behavior */}
        {shouldWrapContent ? <div>{children}</div> : children}
      </div>
    </>
  );
};
