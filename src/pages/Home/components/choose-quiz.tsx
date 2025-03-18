import { Button } from "@/components/ui";
import { ChooseQuizDialog } from "./choose-quiz-dialog";

export const ChooseQuiz = () => {
  return (
    <ChooseQuizDialog
      title="What do you want?"
      triggerButton={
        <Button
          variant={"fancy"}
          className={`text-5xl px-9 py-7 font-secondary`}
        >
          Play
        </Button>
      }
      randomQuizButton={
        // <Button variant="lift" className="px-0">
        //   <span className="button_top font-header">Random Quiz</span>
        // </Button>
        <Button variant={"fancy"}>Random Quiz</Button>
      }
      chooseQuizButton={
        // <Button variant="lift" className="px-0">
        //   <span className="button_top font-header">Choose a Quiz</span>
        // </Button>
        <Button variant={"fancy"}> Choose a Quiz</Button>
      }
    />
  );
};
