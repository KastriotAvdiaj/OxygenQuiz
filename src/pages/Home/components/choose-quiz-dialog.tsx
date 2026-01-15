import { Button } from "@/components/ui";
// import { ChooseQuizDialog } from "./quiz-conf    irmation-dialog";
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
    <Link to="/choose-quiz">
      <Button
        variant={"fancy"}
        className={`text-5xl p-9 font-secondary`}
        disabled={isLoading || isNavigating}
        onClick={handleQuizNavigation}
      >
        Explore
      </Button>
    </Link>
  );
};
