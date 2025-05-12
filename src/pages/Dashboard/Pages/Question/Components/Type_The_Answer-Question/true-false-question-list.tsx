import { TrueFalseQuestion } from "@/types/ApiTypes";
import { TrueFalseQuestionCard } from "./true-false-question-card";

interface TrueFalseQuestionListProps {
  questions: TrueFalseQuestion[];
}

export const TrueFalseQuestionList = ({ questions }: TrueFalseQuestionListProps) => {
  if (questions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No true/false questions found matching your criteria.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <TrueFalseQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};