import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tag,
  Trash2,
  Lock,
  Globe,
  CheckCircle,
  XCircle,
  Edit3,
  List,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  QuestionType,
  TrueFalseQuestion,
  TypeTheAnswerQuestion,
} from "@/types/ApiTypes";
import { useQuiz } from "../QuizQuestionsContext";

interface QuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

// Helper functions
const truncateText = (text: string, length: number) =>
  text?.length > length ? `${text.substring(0, length)}...` : text || "";

// Multiple Choice Question Card
const SmallMultipleChoiceCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
  isActive = false,
}) => {
  const { setDisplayQuestion, displayQuestion } = useQuiz();

  const mcQuestion = question as MultipleChoiceQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDisplayQuestion(mcQuestion);
    // onClick();
  };

  const truncatedText = truncateText(mcQuestion.text, 50);
  const isPrivate = mcQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-primary/80 border-dashed p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:bg-muted/50",
        displayQuestion?.id === mcQuestion.id &&
          "bg-gradient-to-r from-background to-primary/20 "
      )}
      onClick={handleClick}
    >
      <CardHeader
        className={cn(
          "px-4 py-2 flex justify-between items-center",
          isActive
            ? "bg-primary/10"
            : "bg-gradient-to-r from-background to-muted",
          displayQuestion?.id === mcQuestion.id &&
            "bg-gradient-to-r from-background to-primary/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
            <List size={12} />
          </div>
          <Badge variant="outline" className="h-5 px-2 gap-1">
            {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
            <span className="text-xs">{isPrivate ? "Private" : "Public"}</span>
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 px-2 text-xs text-primary bg-primary/20"
          >
            Multiple Choice
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
      </CardHeader>

      <CardContent className="p-3">
        <div className="mt-1 mb-3 border border-foreground/30 rounded-lg px-3 py-2 text-sm bg-background relative shadow-inner">
          <div className="absolute -top-2 left-3 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          {truncatedText || "Empty question"}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
          {mcQuestion.answerOptions?.slice(0, 4).map((option, i) => (
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
                    ? "bg-green-500 border-green-600"
                    : "border-muted-foreground/40"
                )}
              ></div>
              <span className="truncate">
                {truncateText(option.text, 20) || `Option ${i + 1}`}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground border-foreground/30 mt-2 border-t pt-2">
          <div className="flex items-center gap-2">
            {mcQuestion.allowMultipleSelections && (
              <Badge variant="outline" className="h-5 px-2 text-xs">
                Multi-select
              </Badge>
            )}
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0 h-5 text-xs"
            >
              <Tag size={10} />
              {mcQuestion.category.name}
            </Badge>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 px-2 py-0 h-5 text-xs border "
            )}
          >
            <span>{question.difficulty.level}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// True/False Question Card
const SmallTrueFalseCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
}) => {
  const tfQuestion = question as TrueFalseQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDisplayQuestion(tfQuestion);
    // onClick();
  };

  const { setDisplayQuestion, displayQuestion } = useQuiz();

  const truncatedText = truncateText(tfQuestion.text, 50);
  const isPrivate = tfQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-purple-500 border-dashed p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:bg-muted/50",
        displayQuestion?.id === tfQuestion.id &&
          "bg-gradient-to-r from-background to-purple-500/30"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "px-4 py-2 flex justify-between items-center bg-gradient-to-r from-background to-muted",
          displayQuestion?.id === tfQuestion.id &&
            "bg-gradient-to-r from-background to-purple-500/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-bold text-xs">
            <CheckCircle size={12} />
          </div>
          <Badge variant="outline" className="h-5 px-2 gap-1">
            {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
            <span className="text-xs">{isPrivate ? "Private" : "Public"}</span>
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 px-2 text-xs bg-purple-100 text-purple-800"
          >
            True/False
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
        <div className="mt-1 mb-3 border border-foreground/30 rounded-lg px-3 py-2 text-sm bg-background relative shadow-inner">
          <div className="absolute -top-2 left-3 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          {truncatedText || "Empty question"}
        </div>

        <div className="flex gap-2 mt-1 mb-3">
          <div
            className={cn(
              "text-sm border rounded-md px-4 py-3 flex items-center justify-center flex-1 transition-all duration-200",
              tfQuestion.correctAnswer
                ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
                : "border-foreground/10"
            )}
          >
            <CheckCircle
              size={16}
              className={cn(
                "mr-2",
                tfQuestion.correctAnswer
                  ? "text-green-600"
                  : "text-muted-foreground"
              )}
            />
            <span className="font-medium">True</span>
          </div>
          <div
            className={cn(
              "text-sm border rounded-md px-4 py-3 flex items-center justify-center flex-1 transition-all duration-200",
              !tfQuestion.correctAnswer
                ? "border-green-500/30 bg-green-100 dark:bg-green-900/30 shadow-sm"
                : "border-foreground/10"
            )}
          >
            <XCircle
              size={16}
              className={cn(
                "mr-2",
                !tfQuestion.correctAnswer
                  ? "text-green-600"
                  : "text-muted-foreground"
              )}
            />
            <span className="font-medium">False</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground border-foreground/30 mt-2 border-t pt-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0 h-5 text-xs"
            >
              <Tag size={10} />
              {tfQuestion.category.name}
            </Badge>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 px-2 py-0 h-5 text-xs border"
            )}
          >
            <span>{question.difficulty.level}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Type The Answer Question Card
const SmallTypeTheAnswerCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
}) => {
  const { setDisplayQuestion, displayQuestion } = useQuiz();

  const ttaQuestion = question as TypeTheAnswerQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDisplayQuestion(ttaQuestion);
  };

  const truncatedText = truncateText(ttaQuestion.text, 50);
  const isPrivate = ttaQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-orange-500 border-dashed p-0 mb-3 cursor-pointer transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:bg-muted/50",
        displayQuestion?.id === ttaQuestion.id &&
          "bg-gradient-to-r from-background to-orange-500/30"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "px-4 py-2 flex justify-between items-center bg-gradient-to-r from-background to-muted",
          displayQuestion?.id === ttaQuestion.id &&
            "bg-gradient-to-r from-background to-orange-500/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold text-xs">
            <Edit3 size={12} />
          </div>
          <Badge variant="outline" className="h-5 px-2 gap-1">
            {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
            <span className="text-xs">{isPrivate ? "Private" : "Public"}</span>
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 px-2 text-xs bg-orange-100 text-orange-800 hover:bg-orange-200"
          >
            Type Answer
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
        <div className="mt-1 mb-3 border border-foreground/30 rounded-lg px-3 py-2 text-sm bg-background relative shadow-inner">
          <div className="absolute -top-2 left-3 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          {truncatedText || "Empty question"}
        </div>

        <div className="mt-1 mb-3">
          <div className="border-2 border-dashed border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Edit3 size={14} className="text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                Correct Answer
              </span>
            </div>
            <div className="text-sm font-mono bg-white dark:bg-gray-800 rounded px-2 py-1 border">
              {truncateText(ttaQuestion.correctAnswer, 30) || "Answer not set"}
            </div>
          </div>

          {ttaQuestion.acceptableAnswers &&
            ttaQuestion.acceptableAnswers.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">
                  + {ttaQuestion.acceptableAnswers.length} alternative answers
                </span>
              </div>
            )}
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground mt-2 border-t pt-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {ttaQuestion.isCaseSensitive && (
                <Badge variant="outline" className="h-5 px-1 text-xs">
                  Case
                </Badge>
              )}
              {ttaQuestion.allowPartialMatch && (
                <Badge variant="outline" className="h-5 px-1 text-xs">
                  Partial
                </Badge>
              )}
            </div>
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-2 py-0 h-5 text-xs"
            >
              <Tag size={10} />
              {ttaQuestion.category.name}
            </Badge>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 px-2 py-0 h-5 text-xs border"
            )}
          >
            <span>{question.difficulty.level}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Question Card Component
export const SmallQuestionCard: React.FC<QuestionCardProps> = (props) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <SmallMultipleChoiceCard {...props} />;
    case QuestionType.TrueFalse:
      return <SmallTrueFalseCard {...props} />;
    case QuestionType.TypeTheAnswer:
      return <SmallTypeTheAnswerCard {...props} />;
    default:
      return null;
  }
};
