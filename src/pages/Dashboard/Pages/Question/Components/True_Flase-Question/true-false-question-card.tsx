import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, XCircle, ChevronDown, ImageIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { DeleteQuestion } from "../Re-Usable-Components/delete-question";
import { UpdateTrueFalseQuestionForm } from "./update-true_false-questions";
import { QuestionType, TrueFalseQuestion } from "@/types/question-types";
import { memo } from "react";
import { TestQuestionButton } from "../Re-Usable-Components/question-test/test-question-button";

interface TrueFalseQuestionCardProps {
  question: TrueFalseQuestion;
  viewMode?: "list" | "grid";
}

export const TrueFalseQuestionCard = ({
  question,
  viewMode = "list",
}: TrueFalseQuestionCardProps) => {
  if (viewMode === "grid") {
    // Compact grid view - always expanded, no accordion
    return (
      <Card className="border shadow-sm dark:border-foreground/20 dark:bg-primary/10 overflow-hidden">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-sm leading-tight flex-1 font-medium">
              {question.text}
              {question.imageUrl && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
                >
                  <ImageIcon className="h-3 w-3 mr-1" />
                  <span className="text-blue-600 dark:text-blue-400 text-xs">
                    Image
                  </span>
                </Badge>
              )}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                question.difficulty.level === "Easy" &&
                  "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
                question.difficulty.level === "Medium" &&
                  "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                question.difficulty.level === "Hard" &&
                  "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50"
              )}
            >
              {question.difficulty.level}
            </Badge>
          </div>

          {/* Compact badges */}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Badge variant="secondary" className="text-xs font-normal">
              {question.category.name}
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              True/False
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-2 pt-0">
          {question.imageUrl && (
            <div className="w-full mb-3 rounded-md overflow-hidden border dark:border-foreground/30">
              <img
                src={question.imageUrl}
                alt="Question image"
                className="w-full h-auto max-h-32 object-contain mx-auto"
              />
            </div>
          )}

          {/* Compact answer display */}
          <div
            className={cn(
              "flex items-center p-2 rounded-md border mb-3",
              question.correctAnswer
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/50"
            )}
          >
            {question.correctAnswer ? (
              <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400 flex-shrink-0 mr-2" />
            ) : (
              <XCircle className="h-3 w-3 text-red-500 dark:text-red-400 flex-shrink-0 mr-2" />
            )}
            <div className="flex-1 text-xs font-medium">
              {question.correctAnswer ? "TRUE" : "FALSE"}
            </div>
          </div>

          <section className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              ID: {question.id}
            </Badge>
            <div className="flex items-center gap-1">
              <UpdateTrueFalseQuestionForm question={question} />
              <DeleteQuestion
                id={question.id}
                questionType={QuestionType.TrueFalse}
              />
            </div>
          </section>
        </CardContent>
      </Card>
    );
  }

  // Original list view with accordion
  return (
    <Card className="mb-4 border shadow-sm dark:border-foreground/20 dark:bg-primary/10 overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg leading-tight flex-1">
            {question.text}
            {question.imageUrl && (
              <Badge
                variant="outline"
                className="ml-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                <span className="text-blue-600 dark:text-blue-400">Image</span>
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs">
              ID: {question.id}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                question.difficulty.level === "Easy" &&
                  "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
                question.difficulty.level === "Medium" &&
                  "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                question.difficulty.level === "Hard" &&
                  "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50"
              )}
            >
              {question.difficulty.level}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {question.category.name}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {question.language.language}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal capitalize">
            {question.visibility}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-2 pt-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm font-medium flex justify-between">
              <span className="text-sm font-medium">Correct Answer</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {question.imageUrl && (
                  <div className="w-full mb-3 rounded-md overflow-hidden border">
                    <img
                      src={question.imageUrl}
                      alt="Question image"
                      className="w-full h-auto max-h-48 object-contain mx-auto"
                    />
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-center p-2 rounded-md border",
                    question.correctAnswer
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/50"
                  )}
                >
                  {question.correctAnswer ? (
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mr-2" />
                  )}
                  <div className="flex-1 text-sm font-medium">
                    {question.correctAnswer ? "TRUE" : "FALSE"}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t dark:border-foreground/30">
                  Created:{" "}
                  {new Date(question.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <section className="flex items-center justify-end gap-2 mr-2">
                <DeleteQuestion
                  id={question.id}
                  questionType={QuestionType.TrueFalse}
                  />
                <TestQuestionButton question={question} questionType={QuestionType.TrueFalse} />
                <UpdateTrueFalseQuestionForm question={question} />
              </section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default memo(TrueFalseQuestionCard);
