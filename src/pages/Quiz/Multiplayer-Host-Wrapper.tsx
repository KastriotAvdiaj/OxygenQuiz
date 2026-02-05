import { useLoaderData } from "react-router-dom";
import { MultiplayerLobby } from "./components/multiplayer-lobby";
import { Quiz } from "@/types/quiz-types";

export const MultiplayerHostWrapper = () => {
  const { quiz } = useLoaderData() as { quiz: Quiz };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MultiplayerLobby 
        quizId={quiz.id.toString()} 
        quizTitle={quiz.title}
        questionCount={quiz.questionCount}
        difficulty={quiz.difficulty.level}
        category={quiz.category.name}
        mode="create"
      />
    </div>
  );
};
