import { redirect, useParams } from "react-router-dom";
import { QuizPage } from "./quiz-page";
import { useUser } from "@/lib/Auth";

export const QuizPageRouteWrapper = () => {
  const { quizId } = useParams<{ quizId: string }>();

  const { data: user } = useUser();
  const currentPath = window.location.pathname;
  const userId = user?.id;

  // 3. Add some simple validation.
  if (!quizId) {
    // This can happen if the route is misconfigured.
    return <div>Error: Quiz ID is missing from the URL.</div>;
  }

  if (!userId) {
    return redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
  }

  return <QuizPage quizId={parseInt(quizId, 10)} userId={userId} />;
};
