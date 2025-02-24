import { useQuizData } from "./api/get-quizzes";
import { QuizList } from "./components/quiz-list";

export const Quizzes = () => {
  const quizData = useQuizData({});

  if (quizData.isLoading) {
    return <p>Loading...</p>;
  }
  if (quizData.isError) {
    return <p>Failed to load quizzes. Try again later.</p>;
  }

  return (
    <div className="grid gap-4 m-10">
      <QuizList quizzes={quizData.data?? []} />
    </div>
  );
};