import { TypeTheAnswerQuestion } from "@/types/ApiTypes";
import { TypeTheAnswerQuestionCard } from "./type-the-asnwer-question-card";

interface TypeTheAnswerQuestionListProps {
  questions: TypeTheAnswerQuestion[];
}

export const TypeTheAnswerQuestionList = ({
  questions,
}: TypeTheAnswerQuestionListProps) => {
  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No "Type the Answer" questions found matching your criteria.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <TypeTheAnswerQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};