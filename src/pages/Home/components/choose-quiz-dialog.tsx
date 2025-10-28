import { Button } from "@/components/ui";
import { ChooseQuizDialog } from "./quiz-confirmation-dialog";
import { Link, useNavigation } from "react-router-dom";
import { useState } from "react";

export const ChooseQuiz = () => {
  const navigation = useNavigation();
  const [isNavigating, setIsNavigating] = useState(false);

  // Check if we're navigating to a quiz route
  const isLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname?.includes("/choose-quiz/");

  const handleQuizNavigation = () => {
    setIsNavigating(true);
  };

  return (
    <ChooseQuizDialog
      title="Choose Quiz Mode"
      triggerButton={
        <Button
          variant={"fancy"}
          className={`text-5xl px-9 py-7 font-secondary`}
          disabled={isLoading || isNavigating}>
          Play
        </Button>
      }
      randomQuizButton={
        <Button
          variant={"fancy"}
          disabled={true}
          onClick={handleQuizNavigation}>
          Random Quiz
        </Button>
      }
      chooseQuizButton={
        <Link to="/choose-quiz" onClick={handleQuizNavigation}>
          <Button
            variant={"fancy"}
            disabled={isLoading || isNavigating}
            isPending={isLoading || isNavigating}>
            Choose a Quiz
          </Button>
        </Link>
      }
    />
  );
};
