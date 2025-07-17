import { useParams } from "react-router-dom";
import { QuizPage } from "./quiz-page";
import { useUser } from "@/lib/Auth";

export const QuizPageRouteWrapper = () => {
  const { quizId } = useParams<{ quizId: string }>();

  const { data: user } = useUser();
  const userId = user?.id;

  // 3. Add some simple validation.
  if (!quizId) {
    // This can happen if the route is misconfigured.
    return <div>Error: Quiz ID is missing from the URL.</div>;
  }

  if (!userId) {
    return <div>Error: You must be logged in to play a quiz.</div>;
  }

  return <QuizPage quizId={parseInt(quizId, 10)} userId={userId} />;
};
