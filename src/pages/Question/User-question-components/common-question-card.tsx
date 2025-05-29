import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tag,
  Trash2,
  CheckCircle,
  Edit3,
  Calendar,
  User,
  Languages,
  ImageIcon,
  Info,
  Eye,
  ChartNetwork,
  Shapes,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  AnyQuestion,
  MultipleChoiceQuestion,
  QuestionType,
  TrueFalseQuestion,
  TypeTheAnswerQuestion,
} from "@/types/ApiTypes";
import { Input } from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface QuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

// Helper functions
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
  onClick,
}) => {
  const mcQuestion = question as MultipleChoiceQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  return (
    <Card
      className="font-header rounded-lg border border-primary/80 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg dark:bg-muted/30"
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

      <CardContent className="px-6 pb-6">
        <Input
          variant="display"
          value={mcQuestion.text || ""}
          className="my-8 !text-[1.5rem] py-8"
        />

        {mcQuestion.imageUrl && (
          <div className="relative w-full mb-3">
            <div className="group relative">
              <div className="flex items-center gap-2 p-3 border border-dashed border-muted-foreground/40 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                <ImageIcon size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This question includes an image • Hover to preview
                </span>
              </div>

              {/* Hover preview */}
              <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 bg-white dark:bg-gray-900 border border-primary border-dashed rounded-lg shadow-xl p-2 max-w-sm">
                <img
                  src={mcQuestion.imageUrl}
                  alt="Question image preview"
                  className="w-full h-auto max-h-48 object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}

        <div className="my-6">
          <div className="grid grid-cols-2 gap-3">
            {mcQuestion.answerOptions?.map((option, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
                  mcQuestion.answerOptions.length === 3 &&
                    i === 2 &&
                    "col-span-2",
                  mcQuestion.answerOptions.length === 2 && "col-span-2",
                  option.isCorrect
                    ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                    : "border-foreground/20 hover:border-foreground/30 bg-muted/20 dark:bg-background/20"
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

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-3">
            <AccordionTrigger>
              <p className="flex gap-2 items-center">
                Extra Information <Info className="h-4 w-4" />
              </p>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {mcQuestion.category.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ChartNetwork size={14} className="text-muted-foreground" />
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
                <div className="flex items-center gap-2 text-sm">
                  <Eye size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Visibility:</span>
                  <Badge variant="outline" className="text-xs">
                    {mcQuestion.visibility}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shapes size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {mcQuestion.type}
                  </Badge>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t dark:border-foreground/40 pt-3">
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
  onClick,
}) => {
  const tfQuestion = question as TrueFalseQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  return (
    <Card
      className="font-header rounded-lg border border-purple-500/80 bg-purple-200/10 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg dark:bg-muted/30"
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

      <CardContent className="px-6 pb-6">
        <Input
          variant="display"
          questionType="true-false"
          value={tfQuestion.text || ""}
          className="my-8 !text-[1.5rem] py-8"
        />

        {tfQuestion.imageUrl && (
          <div className="relative w-full mb-3">
            <div className="group relative">
              <div className="flex items-center gap-2 p-3 border border-dashed border-muted-foreground/40 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                <ImageIcon size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This question includes an image • Hover to preview
                </span>
              </div>

              {/* Hover preview */}
              <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 bg-white dark:bg-gray-900 border border-purple-500 border-dashed rounded-lg shadow-xl p-2 max-w-sm">
                <img
                  src={tfQuestion.imageUrl}
                  alt="Question image preview"
                  className="w-full h-auto max-h-48 object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* True/False Options */}
        <div className="my-6">
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
                tfQuestion.correctAnswer
                  ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                  : "border-foreground/20 hover:border-foreground/30 bg-muted/20 dark:bg-background/20"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full mr-3 border-2 transition-all flex items-center justify-center",
                  tfQuestion.correctAnswer
                    ? "bg-green-500 border-green-600"
                    : "border-muted-foreground/40"
                )}
              >
                {tfQuestion.correctAnswer && (
                  <CheckCircle size={10} className="text-white" />
                )}
              </div>
              <span className="flex-1">True</span>
              {tfQuestion.correctAnswer && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs text-green-700 border-green-500"
                >
                  Correct
                </Badge>
              )}
            </div>

            <div
              className={cn(
                "text-sm border rounded-lg px-4 py-3 flex items-center transition-all duration-200",
                !tfQuestion.correctAnswer
                  ? "border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm"
                  : "border-foreground/20 hover:border-foreground/30 bg-muted/20 dark:bg-background/20"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full mr-3 border-2 transition-all flex items-center justify-center",
                  !tfQuestion.correctAnswer
                    ? "bg-green-500 border-green-600"
                    : "border-muted-foreground/40"
                )}
              >
                {!tfQuestion.correctAnswer && (
                  <CheckCircle size={10} className="text-white" />
                )}
              </div>
              <span className="flex-1">False</span>
              {!tfQuestion.correctAnswer && (
                <Badge
                  variant="outline"
                  className="ml-2 text-xs text-green-700 border-green-500"
                >
                  Correct
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-3">
            <AccordionTrigger>
              <p className="flex gap-2 items-center">
                Extra Information <Info className="h-4 w-4" />
              </p>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {tfQuestion.category.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ChartNetwork size={14} className="text-muted-foreground" />
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
                <div className="flex items-center gap-2 text-sm">
                  <Eye size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Visibility:</span>
                  <Badge variant="outline" className="text-xs">
                    {tfQuestion.visibility}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shapes size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {tfQuestion.type}
                  </Badge>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t dark:border-foreground/40 pt-3">
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
  onClick,
}) => {
  const ttaQuestion = question as TypeTheAnswerQuestion;
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onClick?.();
  };

  return (
    <Card
      className="font-header rounded-lg border border-orange-500/80 border-dashed cursor-pointer transition-all duration-200 overflow-hidden shadow-md hover:shadow-lg dark:bg-muted/30"
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

      <CardContent className="px-6 pb-6">
        <Input
          variant="display"
          questionType="type-answer"
          value={ttaQuestion.text || ""}
          className="my-8 !text-[1.5rem] py-8"
        />

        {ttaQuestion.imageUrl && (
          <div className="relative w-full mb-3">
            <div className="group relative">
              <div className="flex items-center gap-2 p-3 border border-dashed border-muted-foreground/40 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                <ImageIcon size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This question includes an image • Hover to preview
                </span>
              </div>

              {/* Hover preview */}
              <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 bg-white dark:bg-gray-900 border border-orange-500 border-dashed rounded-lg shadow-xl p-2 max-w-sm">
                <img
                  src={ttaQuestion.imageUrl}
                  alt="Question image preview"
                  className="w-full h-auto max-h-48 object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Correct Answer Display */}
        <div className="my-6">
          <div className="border border-green-500/40 bg-green-100 dark:bg-green-900/30 shadow-sm rounded-lg px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Edit3 size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Correct Answer
              </span>
            </div>
            <div className="text-base font-mono bg-white dark:bg-gray-800 rounded px-3 py-2 border border-green-200">
              {ttaQuestion.correctAnswer || "Answer not set"}
            </div>

            {/* Answer Options */}
            <div className="flex gap-2 mt-3">
              {ttaQuestion.isCaseSensitive && (
                <Badge variant="outline" className="text-xs">
                  Case Sensitive
                </Badge>
              )}
              {ttaQuestion.allowPartialMatch && (
                <Badge variant="outline" className="text-xs">
                  Partial Match
                </Badge>
              )}
            </div>

            {/* Alternative Answers */}
            {ttaQuestion.acceptableAnswers &&
              ttaQuestion.acceptableAnswers.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                    Alternative Answers ({ttaQuestion.acceptableAnswers.length})
                  </span>
                  <div className="grid gap-1 mt-1">
                    {ttaQuestion.acceptableAnswers
                      .slice(0, 2)
                      .map((answer, i) => (
                        <div
                          key={i}
                          className="text-xs font-mono bg-green-50 dark:bg-green-900/20 rounded px-2 py-1 border border-green-200/50"
                        >
                          {answer}
                        </div>
                      ))}
                    {ttaQuestion.acceptableAnswers.length > 2 && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        +{ttaQuestion.acceptableAnswers.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-3">
            <AccordionTrigger>
              <p className="flex gap-2 items-center">
                Extra Information <Info className="h-4 w-4" />
              </p>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Tag size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {ttaQuestion.category.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ChartNetwork size={14} className="text-muted-foreground" />
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
                <div className="flex items-center gap-2 text-sm">
                  <Eye size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Visibility:</span>
                  <Badge variant="outline" className="text-xs">
                    {ttaQuestion.visibility}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shapes size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {ttaQuestion.type}
                  </Badge>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer with ID and User */}
        <div className="flex justify-between items-center text-xs text-muted-foreground border-t dark:border-foreground/40 pt-3">
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
