import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { AnyQuestion, QuestionType } from "@/types/question-types";
import { useQuiz } from "../../../../Quiz-questions-context";
import { NewAnyQuestion } from "../../../../types";
import {
  getQuestionTypeTheme,
  questionErrorTheme,
} from "../../../../question-type-theme";

interface SmallBaseQuestionCardProps {
  question: AnyQuestion | NewAnyQuestion;
  /** Question type — drives the accent color via the shared theme. */
  type: QuestionType;
  /** New questions that fail validation render in the red error theme. */
  hasErrors?: boolean;
  children: React.ReactNode;
}

export const SmallBaseQuestionCard: React.FC<SmallBaseQuestionCardProps> = ({
  question,
  type,
  hasErrors = false,
  children,
}) => {
  const { setDisplayQuestion, displayQuestion } = useQuiz();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDisplayQuestion(question);
  };

  const isSelected = displayQuestion?.id === question.id;
  const theme = hasErrors ? questionErrorTheme : getQuestionTypeTheme(type);

  return (
    <Card
      className={cn(
        // Solid hairline + a 3px left accent bar; the theme supplies the colors.
        "font-header rounded-lg border border-l-[3px] p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md",
        isSelected
          ? cn(theme.cardSelected, theme.selectedTint)
          : cn(theme.cardBorder, "hover:bg-muted/40"),
      )}
      onClick={handleClick}
    >
      {children}
    </Card>
  );
};
