import { Button } from "@/components/ui";
import { ChooseQuizDialog } from "./choose-quiz-dialog";

export const ChooseQuiz = () => {
  return (
    <ChooseQuizDialog
      title="Choose a Quiz"
      triggerButton={
        <Button
          variant={"fancy"}
          className={`text-5xl px-9 py-7 font-secondary`}
        >
          Play
        </Button>
      }
      randomQuizButton={
        <Button variant="lift" className="px-0">
          <span className="button_top">Random Quiz</span>
        </Button>
      }
      chooseQuizButton={
        <Button variant="lift" className="px-0">
          <span className="button_top">Choose a Quiz</span>
        </Button>
      }
    />
  );
};
