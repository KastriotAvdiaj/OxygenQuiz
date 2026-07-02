// import { ChooseQuizDialog } from "./quiz-conf    irmation-dialog";
import { Link, useNavigation } from "react-router-dom";
import { useState } from "react";
import { LiftedButton } from "@/common/LiftedButton";

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
    <Link to="/choose-mode">
      <LiftedButton
        // variant={"fancy"}
        outerClassName={`rounded-none p-2`}
        className={`text-5xl p-4 rounded-none -bottom-0 -right-0 inset-x-[0]`}
        disabled={isLoading || isNavigating}
        onClick={handleQuizNavigation}
      >
        Explore
      </LiftedButton>
    </Link>
  );
};
