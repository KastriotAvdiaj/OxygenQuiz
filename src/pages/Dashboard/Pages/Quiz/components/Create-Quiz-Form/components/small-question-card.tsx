import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag, Trash2, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/ApiTypes";

// Define the props interface for the question data
interface QuestionCardProps {
  //   question: {
  //     text: string;
  //     difficultyId?: number;
  //     categoryId?: number;
  //     score?: number;
  //     timeLimit?: number;
  //     answerOptions?: Array<{ text: string; isCorrect: boolean }>;
  //   };
  question: Question;
  isActive?: boolean;
  onClick: () => void;
  index: number;
  difficulty?: string;
  category?: string;
  isPrivate?: boolean;
  onRemove?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  difficulty = "Unknown",
  category = "General",
  isPrivate = true,
  onRemove,
  onClick,
  isActive = false,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick();
  };
  const truncateText = (text: string, length: number) =>
    text?.length > length ? `${text.substring(0, length)}...` : text || "";

  const truncatedText = truncateText(question.text, 50);

  const options = question.answerOptions || [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];

  return (
    <Card
      className={`rounded-md border border-muted p-3 mb-2 flex flex-col cursor-pointer transition-all,
        ${isActive ? "bg-muted border-primary" : "hover:bg-muted/50"}`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-xs text-muted-foreground">
              Q{index + 1}
            </span>
            <Badge variant="outline" className="h-5 px-1">
              {isPrivate ? (
                <Lock size={10} className="mr-1" />
              ) : (
                <Globe size={10} className="mr-1" />
              )}
              {isPrivate ? "Private" : "Public"}
            </Badge>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
              title="Remove question"
            >
              <Trash2 size={14} className="text-destructive" />
            </Button>
          )}
        </div>

        {/* Question text area */}
        <div className="mt-2 mb-2 border rounded-md px-2 py-1 text-sm bg-background min-h-8">
          {truncatedText || "Empty question"}
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-1 gap-1 mt-1 mb-2">
          {options.map((option, i) => (
            <div
              key={i}
              className={`text-xs border rounded px-2 py-1 flex items-center ${
                option.isCorrect
                  ? "border-green-500/30 bg-green-50/30"
                  : "border-muted"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full mr-1 border ${
                  option.isCorrect
                    ? "bg-green-500 border-green-600"
                    : "border-muted"
                }`}
              ></div>
              {truncateText(option.text, 20) || `Option ${i + 1}`}
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mt-1">
          {question.timeLimit && (
            <div className="flex items-center">
              <Clock size={12} className="mr-1" />
              <span>{question.timeLimit}s</span>
            </div>
          )}

          {/* Only show these badges if not private */}
          {!isPrivate && (
            <>
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                <Tag size={10} className="mr-1" />
                {category}
              </Badge>

              <Badge
                variant="outline"
                className={`text-xs px-1.5 py-0 h-5 ${
                  difficulty.toLowerCase().includes("hard")
                    ? "border-orange-500"
                    : difficulty.toLowerCase().includes("medium")
                    ? "border-yellow-500"
                    : "border-green-500"
                }`}
              >
                {difficulty}
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
