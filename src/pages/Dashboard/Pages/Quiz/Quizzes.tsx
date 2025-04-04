import { Button, DataTable } from "@/components/ui";
import { useQuizzesData } from "./api/get-quizzes";
// import { QuizList } from "./components/quiz-list";
import { Link } from "react-router-dom";
import { quizColumns } from "./components/Data-Table-Columns/columns";

export const Quizzes = () => {
  const quizData = useQuizzesData({});

  if (quizData.isLoading) {
    return <p>Loading...</p>;
  }
  if (quizData.isError) {
    return <p>Failed to load quizzes. Try again later.</p>;
  }

  return (
    <div className="grid gap-4 bg-background p-4">
      {/* <QuizList quizzes={quizData.data ?? []} /> */}
      <DataTable data={quizData.data ?? []} columns={quizColumns} />
      <Link to="/dashboard/quizzes/create-quiz" className="w-fit">
        <Button variant="addSave">Create Quiz</Button>
      </Link>
    </div>
  );
};
