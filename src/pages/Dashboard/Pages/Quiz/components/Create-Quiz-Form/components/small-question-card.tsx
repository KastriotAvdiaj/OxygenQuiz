import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Tag,
  Trash2,
  Lock,
  Globe,
  Award,
  Sparkles,
  Brain,
  LightbulbIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Question } from "@/types/ApiTypes";
import { cn } from "@/utils/cn";
// Define the props interface for the question data
interface QuestionCardProps {
  question: Question;
  isActive?: boolean;
  onClick: () => void;
  index: number;
  difficulty?: string;
  category?: string;
  isPrivate?: boolean;
  onRemove?: () => void;
}

// Difficulty visualization system
type DifficultyConfig = {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
};

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

  // Get difficulty configuration based on the difficulty name
  const getDifficultyConfig = (difficultyName: string): DifficultyConfig => {
    const name = difficultyName.toLowerCase();

    if (
      name.includes("beginner") ||
      name.includes("easy") ||
      name.includes("novice")
    ) {
      return {
        icon: <LightbulbIcon size={12} />,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
        label: difficulty,
      };
    } else if (name.includes("medium") || name.includes("intermediate")) {
      return {
        icon: <Brain size={12} />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-950/40",
        label: difficulty,
      };
    } else if (name.includes("hard") || name.includes("advanced")) {
      return {
        icon: <Award size={12} />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-950/40",
        label: difficulty,
      };
    } else if (name.includes("expert") || name.includes("master")) {
      return {
        icon: <Sparkles size={12} />,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-950/40",
        label: difficulty,
      };
    }

    return {
      icon: <Brain size={12} />,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-950/40",
      label: difficulty,
    };
  };

  const diffConfig = getDifficultyConfig(difficulty);

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-foreground/20 p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted/50"
      )}
      onClick={handleClick}
    >
      {/* Question Header with Fun Gradient Background */}
      <div
        className={cn(
          "px-4 py-2 flex justify-between items-center",
          isActive
            ? "bg-primary/10"
            : "bg-gradient-to-r from-background to-muted"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
            {index + 1}
          </div>
          <Badge variant="outline" className="h-5 px-2 gap-1 animate-pulse">
            {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
            <span className="text-xs">{isPrivate ? "Private" : "Public"}</span>
          </Badge>
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-red-500"
            onClick={onRemove}
            title="Remove question"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      <CardContent className="p-3">
        {/* Question text with speech bubble design */}
        <div className="mt-1 mb-3 border border-foreground/30 rounded-lg px-3 py-2 text-sm bg-background relative shadow-inner">
          <div className="absolute -top-2 left-3 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          {truncatedText || "Empty question"}
        </div>

        {/* Answer options with animated selection indicators */}
        <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
          {options.map((option, i) => (
            <div
              key={i}
              className={cn(
                "text-xs border rounded-md px-3 py-2 flex items-center transition-all duration-200",
                option.isCorrect
                  ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
                  : "border-foreground/10 hover:border-foreground/20"
              )}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full mr-2 border transition-all",
                  option.isCorrect
                    ? "bg-green-500 border-green-600 animate-pulse"
                    : "border-muted-foreground/40"
                )}
              ></div>
              <span className="truncate">
                {truncateText(option.text, 20) || `Option ${i + 1}`}
              </span>
            </div>
          ))}
        </div>

        {/* Metadata with improved visual indicators */}
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground mt-2 border-t pt-2">
          <div className="flex items-center gap-2">
            {question.timeLimit && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 px-2 py-0 h-5"
              >
                <Clock size={10} />
                <span>{question.timeLimit}s</span>
              </Badge>
            )}

            {!isPrivate && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-2 py-0 h-5 text-xs"
              >
                <Tag size={10} />
                {category}
              </Badge>
            )}
          </div>

          {!isPrivate && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1 px-2 py-0 h-5 text-xs border",
                diffConfig.bgColor,
                diffConfig.color
              )}
            >
              {diffConfig.icon}
              <span>{diffConfig.label}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
