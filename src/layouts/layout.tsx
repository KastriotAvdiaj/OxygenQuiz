import Squares from "@/common/Effect-Related/background-squares";
import Lightning from "@/common/Effect-Related/lightning-background";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";

interface LayoutProps {
  children: React.ReactNode;
  headerColor?: boolean;
  squares?: boolean;
  lightning?: boolean;
}

export const HomeLayout = ({
  children,
  squares = false,
  lightning = false,
  headerColor = true,
}: LayoutProps) => {
  const { theme } = useTheme();
  const colors = {
    borderColor: theme === "dark" ? "#626262" : "#b4b4b4",
    hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  };

  return (
    <>
      <Header BackgroundColor={headerColor} />
      <div
        className={`bg-background text-foreground ${
          squares ? "overflow-hidden" : "overflow-y-auto"
        }`}
        style={{
          paddingTop: 'var(--header-height, 4rem)',
          minHeight: 'calc(100vh - var(--header-height, 4rem))',
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
        {children}
      </div>
    </>
  );
};