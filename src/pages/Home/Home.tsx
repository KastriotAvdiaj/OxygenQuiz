// import BackgroundPaths from "@/common/background-path";
import Squares from "@/common/background-squares";
import { useTheme } from "@/components/ui";

export const Home = () => {
  const { theme } = useTheme();
  const colors = {
    borderColor: theme === "dark" ? "#626262" : "#5b5959",
    hoverFillColor: theme === "dark" ? "#ffffff" : "#000000",
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-background">
      {/* <BackgroundPaths title="Oxygen Quiz" />
       */}
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal" // up, down, left, right, diagonal
        borderColor={colors.borderColor}
        hoverFillColor={colors.hoverFillColor}
      />
    </div>
  );
};
