import Squares from "@/common/Effect-Related/background-squares";
import Header from "@/common/Header";
import { useTheme } from "@/components/ui";

interface LayoutProps {
  children: React.ReactNode;
  headerColor?: boolean;
  squares?: boolean;
}

export const HomeLayout = ({
  children,
  squares = false,
  headerColor = true,
}: LayoutProps) => {
  const { theme } = useTheme();
  const colors = {
    borderColor: theme === "dark" ? "#626262" : "#b4b4b4",
    hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  };

  console.log(squares);

  return (
    <>
      <Header BackgroundColor={headerColor} />
      <div
        className={` bg-background ${
          squares ? "overflow-hidden" : "overflow-y-auto"
        }`}
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
        {children}
      </div>
    </>
  );
};
