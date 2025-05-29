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
  Calendar,
  User,
  Image,
  Languages,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  QuestionType,
  TrueFalseQuestion,
  TypeTheAnswerQuestion,
} from "@/types/ApiTypes";

interface QuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

// Helper functions
// const truncateText = (text: string, length: number) =>
//   text?.length > length ? `${text.substring(0, length)}...` : text || "";

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

// Multiple Choice Question Card
const MultipleChoiceCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
  isActive = false,
  onClick,
}) => {
  const mcQuestion = question as MultipleChoiceQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  const isPrivate = mcQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-primary/80 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted/30"
      )}
      onClick={handleClick}
    >
      <CardHeader
        className={cn(
          "pb-4",
          isActive
            ? "bg-primary/10"
            : "bg-gradient-to-r from-background to-muted"
        )}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
              <List size={20} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 px-3 gap-1">
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  <span className="text-sm">
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-6 px-3 text-sm text-primary bg-primary/20"
                >
                  Multiple Choice
                </Badge>
                {mcQuestion.allowMultipleSelections && (
                  <Badge variant="outline" className="h-6 px-3 text-sm">
                    Multi-select
                  </Badge>
                )}
              </div>
            </div>
          </div>

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

      <CardContent className="px-6 pb-6">
        {/* Question Text */}
        <div className="mb-6 border border-foreground/30 rounded-lg px-4 py-4 text-base bg-background relative shadow-inner">
          <div className="absolute -top-2 left-4 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          <p className="leading-relaxed">
            {mcQuestion.text || "Empty question"}
          </p>
        </div>

        {/* Image if present */}
        {mcQuestion.imageUrl && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Image size={16} />
            <span>Image attached</span>
          </div>
        )}

        {/* Answer Options */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Answer Options
          </h4>
          <div className="grid gap-3">
            {mcQuestion.answerOptions?.map((option, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
                  option.isCorrect
                    ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                    : "border-foreground/20 hover:border-foreground/30"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full mr-3 border-2 transition-all flex items-center justify-center",
                    option.isCorrect
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground/40"
                  )}
                >
                  {option.isCorrect && (
                    <CheckCircle size={10} className="text-white" />
                  )}
                </div>
                <span className="flex-1">
                  {option.text || `Option ${i + 1}`}
                </span>
                {option.isCorrect && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs text-green-700 border-green-500"
                  >
                    Correct
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Question Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <Badge variant="outline" className="text-xs">
              {mcQuestion.category.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Difficulty:</span>
            <Badge variant="outline" className="text-xs">
              {mcQuestion.difficulty.level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Languages size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Language:</span>
            <Badge variant="outline" className="text-xs">
              {mcQuestion.language.language}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(mcQuestion.createdAt)}
            </span>
          </div>
        </div>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <span>ID: {mcQuestion.id}</span>
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>User: {mcQuestion.user.username}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// True/False Question Card
const TrueFalseCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
  isActive = false,
  onClick,
}) => {
  const tfQuestion = question as TrueFalseQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  const isPrivate = tfQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-purple-500 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted/30"
      )}
      onClick={handleClick}
    >
      <CardHeader
        className={cn(
          "pb-4",
          isActive
            ? "bg-primary/10"
            : "bg-gradient-to-r from-background to-muted"
        )}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold">
              <CheckCircle size={20} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 px-3 gap-1">
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  <span className="text-sm">
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-6 px-3 text-sm bg-purple-100 text-purple-800"
                >
                  True/False
                </Badge>
              </div>
            </div>
          </div>

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

      <CardContent className="px-6 pb-6">
        {/* Question Text */}
        <div className="mb-6 border border-foreground/30 rounded-lg px-4 py-4 text-base bg-background relative shadow-inner">
          <div className="absolute -top-2 left-4 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          <p className="leading-relaxed">
            {tfQuestion.text || "Empty question"}
          </p>
        </div>

        {/* Image if present */}
        {tfQuestion.imageUrl && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Image size={16} />
            <span>Image attached</span>
          </div>
        )}

        {/* True/False Options */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Correct Answer
          </h4>
          <div className="flex gap-4">
            <div
              className={cn(
                "text-base border rounded-lg px-6 py-4 flex items-center justify-center flex-1 transition-all duration-200",
                tfQuestion.correctAnswer
                  ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                  : "border-foreground/20"
              )}
            >
              <CheckCircle
                size={20}
                className={cn(
                  "mr-3",
                  tfQuestion.correctAnswer
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              />
              <span className="font-medium">True</span>
              {tfQuestion.correctAnswer && (
                <Badge
                  variant="outline"
                  className="ml-3 text-xs text-green-700 border-green-500"
                >
                  Correct
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "text-base border rounded-lg px-6 py-4 flex items-center justify-center flex-1 transition-all duration-200",
                !tfQuestion.correctAnswer
                  ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                  : "border-foreground/20"
              )}
            >
              <XCircle
                size={20}
                className={cn(
                  "mr-3",
                  !tfQuestion.correctAnswer
                    ? "text-green-600"
                    : "text-muted-foreground"
                )}
              />
              <span className="font-medium">False</span>
              {!tfQuestion.correctAnswer && (
                <Badge
                  variant="outline"
                  className="ml-3 text-xs text-green-700 border-green-500"
                >
                  Correct
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Question Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <Badge variant="outline" className="text-xs">
              {tfQuestion.category.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Difficulty:</span>
            <Badge variant="outline" className="text-xs">
              {tfQuestion.difficulty.level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Languages size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Language:</span>
            <Badge variant="outline" className="text-xs">
              {tfQuestion.language.language}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(tfQuestion.createdAt)}
            </span>
          </div>
        </div>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <span>ID: {tfQuestion.id}</span>
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>User: {tfQuestion.user.username}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Type The Answer Question Card
const TypeTheAnswerCard: React.FC<QuestionCardProps> = ({
  question,
  onRemove,
  isActive = false,
  onClick,
}) => {
  const ttaQuestion = question as TypeTheAnswerQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  const isPrivate = ttaQuestion.visibility === "private";

  return (
    <Card
      className={cn(
        "font-header rounded-lg border border-orange-500 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg",
        isActive
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:bg-muted/30"
      )}
      onClick={handleClick}
    >
      <CardHeader
        className={cn(
          "pb-4",
          isActive
            ? "bg-primary/10"
            : "bg-gradient-to-r from-background to-muted"
        )}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold">
              <Edit3 size={20} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 px-3 gap-1">
                  {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                  <span className="text-sm">
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-6 px-3 text-sm bg-orange-100 text-orange-800"
                >
                  Type Answer
                </Badge>
              </div>
            </div>
          </div>

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

      <CardContent className="px-6 pb-6">
        {/* Question Text */}
        <div className="mb-6 border border-foreground/30 rounded-lg px-4 py-4 text-base bg-background relative shadow-inner">
          <div className="absolute -top-2 left-4 w-4 h-4 bg-background border-t border-foreground/30 border-l rotate-45 transform"></div>
          <p className="leading-relaxed">
            {ttaQuestion.text || "Empty question"}
          </p>
        </div>

        {/* Image if present */}
        {ttaQuestion.imageUrl && (
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Image size={16} />
            <span>Image attached</span>
          </div>
        )}

        {/* Correct Answer */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Correct Answer
          </h4>
          <div className="border-2 border-dashed border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <Edit3 size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Primary Answer
              </span>
            </div>
            <div className="text-base font-mono bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-green-200">
              {ttaQuestion.correctAnswer || "Answer not set"}
            </div>
          </div>

          {/* Answer Options */}
          <div className="flex gap-2 mt-4">
            {ttaQuestion.isCaseSensitive && (
              <Badge variant="outline" className="h-6 px-3 text-sm">
                Case Sensitive
              </Badge>
            )}
            {ttaQuestion.allowPartialMatch && (
              <Badge variant="outline" className="h-6 px-3 text-sm">
                Partial Match
              </Badge>
            )}
          </div>

          {/* Alternative Answers */}
          {ttaQuestion.acceptableAnswers &&
            ttaQuestion.acceptableAnswers.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">
                  Alternative Answers ({ttaQuestion.acceptableAnswers.length})
                </h5>
                <div className="grid gap-2">
                  {ttaQuestion.acceptableAnswers.map((answer, i) => (
                    <div
                      key={i}
                      className="text-sm font-mono bg-muted/50 rounded px-3 py-2 border"
                    >
                      {answer}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Question Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Category:</span>
            <Badge variant="outline" className="text-xs">
              {ttaQuestion.category.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Difficulty:</span>
            <Badge variant="outline" className="text-xs">
              {ttaQuestion.difficulty.level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Languages size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Language:</span>
            <Badge variant="outline" className="text-xs">
              {ttaQuestion.language.language}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(ttaQuestion.createdAt)}
            </span>
          </div>
        </div>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
          <span>ID: {ttaQuestion.id}</span>
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>User: {ttaQuestion.user.username}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Question Card Component
export const QuestionCard: React.FC<QuestionCardProps> = (props) => {
  switch (props.question.type) {
    case QuestionType.MultipleChoice:
      return <MultipleChoiceCard {...props} />;
    case QuestionType.TrueFalse:
      return <TrueFalseCard {...props} />;
    case QuestionType.TypeTheAnswer:
      return <TypeTheAnswerCard {...props} />;
    default:
      return null;
  }
};
