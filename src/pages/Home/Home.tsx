import RotatingText from "@/common/Effect-Related/RotatingText";
import { ChooseQuiz } from "./components/choose-quiz-dialog";
export const Home = () => {
  return (
    <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center text-foreground gap-5">
      <div className="flex items-center justify-center gap-2 text-6xl text-foreground">
        <h1>Sharpen Your</h1>
        <RotatingText
          mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black font-header font-semibold italic overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          texts={["Thinking ", "Mind ", "Memory ", "Logic "]}
          staggerFrom={"last"}
          animatePresenceMode="wait"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-120%" }}
          staggerDuration={0.025}
          splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2500}
        />
      </div>
      <div className="flex items-center flex-col justify-center items-center">
        {/* <h1 className="text-7xl font-secondary text-center">
          Take part in the game and train your brain to think faster.
        </h1> */}
        <ChooseQuiz />
      </div>
    </div>
  );
};
