import { Button } from "@/components/ui";
import { ChooseQuizDialog } from "./quiz-confirmation-dialog";

export const ChooseQuiz = () => {
  return (
    <ChooseQuizDialog
      title="Choose Quiz Mode"
      triggerButton={
        <Button
          variant={"fancy"}
          className={`text-5xl px-9 py-7 font-secondary`}
        >
          Play
        </Button>
      }
      randomQuizButton={
        <Button variant={"fancy"}>Random Quiz</Button>
      }
      chooseQuizButton={
        <Button variant={"fancy"}> Choose a Quiz</Button>
      }
    />
  );
};
