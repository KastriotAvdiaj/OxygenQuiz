// import BackgroundPaths from "@/common/background-path";
import RotatingText from "@/common/Effect-Related/word-switching";
export const Home = () => {
  return (
    <div className="relative z-10 min-h-screen w-screen flex items-center justify-center">
      <div className="flex items-center justify-center gap-2 text-3xl">
        <h1>Hello</h1>
        <RotatingText
          texts={["React", "Bits", "Is", "Cool!"]}
          mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          staggerFrom={"last"}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2000}
        />
      </div>
    </div>
  );
};
