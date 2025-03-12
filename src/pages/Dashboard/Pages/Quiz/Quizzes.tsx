import { Button, DataTable } from "@/components/ui";
import { useQuizData } from "./api/get-quizzes";
import { QuizList } from "./components/quiz-list";
import { Link } from "react-router-dom";
import { quizColumns } from "./components/columns";

export const Quizzes = () => {
  const quizData = useQuizData({});

  if (quizData.isLoading) {
    return <p>Loading...</p>;
  }
  if (quizData.isError) {
    return <p>Failed to load quizzes. Try again later.</p>;
  }

  return (
    <div className="grid gap-4">
      <QuizList quizzes={quizData.data ?? []} />
      <DataTable data={quizData.data ?? []} columns={quizColumns} />
      <Link to="/dashboard/quizzes/create-quiz">
        <Button variant="addSave">Create Quiz</Button>
      </Link>
    </div>
  );
};
