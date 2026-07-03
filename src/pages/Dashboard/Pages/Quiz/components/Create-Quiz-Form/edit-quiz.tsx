import { useParams } from "react-router";
import { Brain } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useQuizData } from "../../api/get-quiz";
import { useQuizQuestionsData } from "../../api/get-quiz-questions";
import { QuizQuestionProvider } from "./Quiz-questions-context";
import CreateQuizForm from "./create-quiz";

/**
 * Edit-quiz route wrapper: loads the quiz (at its current version) and its live
 * questions, then renders the quiz form in edit mode with everything prefilled.
 *
 * The provider is keyed by quiz id + version so a refetch after someone else's
 * edit fully re-seeds the form instead of mixing stale question state.
 */
export const EditQuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);

  const quizQuery = useQuizData({ quizId });
  const questionsQuery = useQuizQuestionsData({ quizId });

  if (quizQuery.isLoading || questionsQuery.isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const quiz = quizQuery.data;
  const quizQuestions = questionsQuery.data;

  if (quizQuery.isError || questionsQuery.isError || !quiz || !quizQuestions) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto h-16 w-16 mb-4 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading the quiz. Please try again.</p>
      </div>
    );
  }

  const initialQuestions = [...quizQuestions]
    .sort((a, b) => a.orderInQuiz - b.orderInQuiz)
    .map((qq) => ({
      question: qq.question,
      settings: {
        timeLimitInSeconds: qq.timeLimitInSeconds,
        pointSystem: qq.pointSystem,
        orderInQuiz: qq.orderInQuiz,
      },
    }));

  return (
    <QuizQuestionProvider
      key={`${quiz.id}-v${quiz.version}`}
      initialQuestions={initialQuestions}>
      <CreateQuizForm editQuiz={quiz} />
    </QuizQuestionProvider>
  );
};
