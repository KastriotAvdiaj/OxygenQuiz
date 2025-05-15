import { MultipleChoiceQuestion } from "@/types/ApiTypes"; 
import { MultipleChoiceQuestionCard } from "./multiple-choice-question-card";

interface MultipleChoiceQuestionListProps {
  questions: MultipleChoiceQuestion[];
}

export const MultipleChoiceQuestionList = ({ questions }: MultipleChoiceQuestionListProps) => {
  if (questions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No multiple choice questions found matching your criteria.</p>;
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <MultipleChoiceQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};