import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AnyQuestion } from "@/types/ApiTypes";

export interface QuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

interface BaseQuestionCardProps extends QuestionCardProps {
  borderColor: string;
  backgroundColor?: string;
  children: React.ReactNode;
}

export const BaseQuestionCard: React.FC<BaseQuestionCardProps> = ({
//   question,
  onRemove,
  onClick,
  borderColor,
  backgroundColor,
  children,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  return (
    <Card
      className={`font-header rounded-lg border ${borderColor} ${backgroundColor} border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg dark:bg-muted/30`}
      onClick={handleClick}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-red-500"
              onClick={onRemove}
              title="Remove question"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">{children}</CardContent>
    </Card>
  );
};
