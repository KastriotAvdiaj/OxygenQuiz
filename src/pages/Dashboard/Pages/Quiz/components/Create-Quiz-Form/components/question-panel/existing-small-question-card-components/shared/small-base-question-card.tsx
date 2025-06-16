import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { AnyQuestion } from "@/types/ApiTypes";
import { useQuiz } from "../../../../Quiz-questions-context";

interface SmallBaseQuestionCardProps {
  question: AnyQuestion;
  borderColor: string;
  gradientColor: string;
  children: React.ReactNode;
  onRemove?: () => void;
}

export const SmallBaseQuestionCard: React.FC<SmallBaseQuestionCardProps> = ({
  question,
  borderColor,
  gradientColor,
  children,
  //   onRemove
}) => {
  const { setDisplayQuestion, displayQuestion } = useQuiz();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDisplayQuestion(question);
  };

  const isSelected = displayQuestion?.id === question.id;

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-dashed p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:bg-muted/50",
        borderColor,
        isSelected && gradientColor
      )}
      onClick={handleClick}
    >
      {children}
    </Card>
  );
};
