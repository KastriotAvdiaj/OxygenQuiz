import { 
  MultipleChoiceQuestion, 
  TrueFalseQuestion, 
  TypeTheAnswerQuestion 
} from "@/types/ApiTypes";
import { SimpleMultipleChoiceQuestionCard } from "./user-multiple_choice-question-card";
import { SimpleTrueFalseQuestionCard } from "./user-true_false-question-card";
import { SimpleTypeTheAnswerQuestionCard } from "./user-type_the_answer-question-card";

// Simple Multiple Choice Question List
interface SimpleMultipleChoiceQuestionListProps {
  questions: MultipleChoiceQuestion[];
  selectedQuestionIds?: Set<number>;
  onSelectionChange?: (questionId: number, selected: boolean) => void;
  maxSelections?: number;
}

export const SimpleMultipleChoiceQuestionList = ({
  questions,
  selectedQuestionIds = new Set(),
  onSelectionChange,
  maxSelections,
}: SimpleMultipleChoiceQuestionListProps) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No multiple choice questions found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((question) => {
        const isSelected = selectedQuestionIds.has(question.id);
        const selectionDisabled = Boolean(
          maxSelections && 
          !isSelected && 
          selectedQuestionIds.size >= maxSelections
        );

        return (
          <SimpleMultipleChoiceQuestionCard
            key={question.id}
            question={question}
            isSelected={isSelected}
            onSelectionChange={onSelectionChange}
            selectionDisabled={selectionDisabled}
          />
        );
      })}
    </div>
  );
};

// Simple True/False Question List
interface SimpleTrueFalseQuestionListProps {
  questions: TrueFalseQuestion[];
  selectedQuestionIds?: Set<number>;
  onSelectionChange?: (questionId: number, selected: boolean) => void;
  maxSelections?: number;
}

export const SimpleTrueFalseQuestionList = ({
  questions,
  selectedQuestionIds = new Set(),
  onSelectionChange,
  maxSelections,
}: SimpleTrueFalseQuestionListProps) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No true/false questions found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((question) => {
        const isSelected = selectedQuestionIds.has(question.id);
        const selectionDisabled = Boolean(
          maxSelections && 
          !isSelected && 
          selectedQuestionIds.size >= maxSelections
        );

        return (
          <SimpleTrueFalseQuestionCard
            key={question.id}
            question={question}
            isSelected={isSelected}
            onSelectionChange={onSelectionChange}
            selectionDisabled={selectionDisabled}
          />
        );
      })}
    </div>
  );
};

// Simple Type The Answer Question List
interface SimpleTypeTheAnswerQuestionListProps {
  questions: TypeTheAnswerQuestion[];
  selectedQuestionIds?: Set<number>;
  onSelectionChange?: (questionId: number, selected: boolean) => void;
  maxSelections?: number;
}

export const SimpleTypeTheAnswerQuestionList = ({
  questions,
  selectedQuestionIds = new Set(),
  onSelectionChange,
  maxSelections,
}: SimpleTypeTheAnswerQuestionListProps) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No type-the-answer questions found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((question) => {
        const isSelected = selectedQuestionIds.has(question.id);
        const selectionDisabled = Boolean(
          maxSelections && 
          !isSelected && 
          selectedQuestionIds.size >= maxSelections
        );

        return (
          <SimpleTypeTheAnswerQuestionCard
            key={question.id}
            question={question}
            isSelected={isSelected}
            onSelectionChange={onSelectionChange}
            selectionDisabled={selectionDisabled}
          />
        );
      })}
    </div>
  );
};