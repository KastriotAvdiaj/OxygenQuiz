import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { QuestionType } from "@/types/question-types";
import { useQuiz } from "../../../../Quiz-questions-context";
import {
  getQuestionTypeTheme,
  questionErrorTheme,
} from "../../../../question-type-theme";

interface SmallQuestionHeaderProps {
  /** Question type — drives the icon, label and accent color via the shared theme. */
  type: QuestionType;
  questionId: number;
  /** New questions that fail validation render the label in the red error theme. */
  hasErrors?: boolean;
}

export const SmallQuestionHeader: React.FC<SmallQuestionHeaderProps> = ({
  type,
  questionId,
  hasErrors = false,
}) => {
  const { removeQuestionFromQuiz, addedQuestions } = useQuiz();

  const questionIndex = addedQuestions.findIndex((q) => q.id === questionId);
  const questionNumber = questionIndex !== -1 ? questionIndex + 1 : null;

  const theme = getQuestionTypeTheme(type);
  const accentText = hasErrors ? questionErrorTheme.accentText : theme.accentText;
  const Icon = theme.Icon;

  return (
    <div className="px-4 py-2 flex justify-between items-center">
      <div className="flex items-center gap-2">
        {questionNumber && (
          <Badge variant="outline" className="h-5 px-2 text-xs font-semibold">
            #{questionNumber}
          </Badge>
        )}
        <span
          className={cn("flex items-center gap-1.5 text-xs font-medium", accentText)}
        >
          <Icon size={13} aria-hidden="true" />
          {theme.label}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-red-500"
        onClick={() => removeQuestionFromQuiz(questionId)}
        title="Remove question"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
};
