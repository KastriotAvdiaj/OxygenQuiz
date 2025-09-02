import { Navigate, useParams } from "react-router-dom";
import { QuizPage } from "./quiz-page";
import { useUser } from "@/lib/Auth";

export const QuizPageRouteWrapper = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { data: user } = useUser();
  const currentPath = window.location.pathname;
  const userId = user?.id;

  // Add some simple validation.
  if (!quizId) {
    return <div>Error: Quiz ID is missing from the URL.</div>;
  }

  if (!userId) {
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(currentPath)}`} replace />;
  }

  return <QuizPage quizId={parseInt(quizId, 10)} userId={userId} />;
};