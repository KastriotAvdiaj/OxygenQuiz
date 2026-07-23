import RotatingText from "@/common/Effect-Related/RotatingText";
import { ChooseQuiz } from "./components/choose-quiz-dialog";
export const Home = () => {
  return (
    // flex-1 (not min-h-screen): fills the layout's dynamic-viewport column —
    // 100vh over-measures on mobile and pushed the CTA under the browser chrome
    // (docs/RESPONSIVE.md).
    <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center text-foreground gap-5 px-4">
      {/* Fluid type + flex-wrap: the headline row was a fixed text-6xl, which
          overflowed narrow phones; now it scales with breakpoints and the
          rotating word wraps below the static text when space runs out. */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground">
        <h1>Sharpen Your</h1>
        <RotatingText
          mainClassName="px-2 sm:px-2 md:px-3 bg-cyan-300 text-black font-header font-semibold italic overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
          texts={["Thinking ", "Mind ", "Memory ", "Logic "]}
          staggerFrom={"last"}
          animatePresenceMode="popLayout"
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
        <ChooseQuiz />
      </div>
    </div>
  );
};
