import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QuestionType, TypeTheAnswerQuestion } from "@/types/ApiTypes";
import {
  ImageIcon,
  TextCursorInput,
  CaseSensitive, // Renamed from CaseSensitiveIcon for clarity
  SearchCheck,
  SearchX,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { DeleteQuestion } from "../Re-Usable-Components/delete-question";
import UpdateTypeAnswerQuestionForm from "./update-type_the_asnwer-question";

interface TypeTheAnswerQuestionCardProps {
  question: TypeTheAnswerQuestion;
}

export const TypeTheAnswerQuestionCard = ({
  question,
}: TypeTheAnswerQuestionCardProps) => {
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
                "text-xs", // Added text-xs here for consistency
                question.difficulty.level === "Easy" &&
                  "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/30",
                question.difficulty.level === "Medium" &&
                  "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/30",
                question.difficulty.level === "Hard" &&
                  "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/30"
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
            <AccordionTrigger className="py-2 text-sm font-medium flex justify-between hover:no-underline">
              <span className="text-sm font-medium">Answer Details</span>
              <TextCursorInput className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-3">
              {" "}
              {/* Adjusted padding */}
              <div className="space-y-4">
                {" "}
                {/* Increased spacing between sections */}
                {question.imageUrl && (
                  <div className="w-full mb-3 rounded-md overflow-hidden border dark:border-foreground/30">
                    <img
                      src={question.imageUrl}
                      alt="Question image"
                      className="w-full h-auto max-h-48 object-contain mx-auto bg-muted/30 dark:bg-muted/10"
                    />
                  </div>
                )}
                {/* Updated Correct Answer Display */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Correct Answer
                  </p>
                  <div className="p-2.5 rounded-md bg-green-50 dark:bg-green-700/20 border border-green-200 dark:border-green-600/40 shadow-sm">
                    <p className="font-mono text-sm text-green-700 dark:text-green-300 font-semibold break-all">
                      {question.correctAnswer}
                    </p>
                  </div>
                </div>
                {/* Updated Case Sensitive and Partial Match Display */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evaluation Rules
                  </p>
                  <div className="p-3 rounded-md border bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700/60 space-y-2.5">
                    <div className="flex items-start sm:items-center text-sm">
                      {question.isCaseSensitive ? (
                        <CaseSensitive className="h-4 w-4 mr-2.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <CaseSensitive className="h-4 w-4 mr-2.5 text-gray-500 dark:text-gray-400 flex-shrink-0 opacity-60 mt-0.5 sm:mt-0" />
                      )}
                      <span className="text-foreground/90 dark:text-foreground/80">
                        Case Sensitivity:{" "}
                        <span className="font-medium text-foreground dark:text-white">
                          {question.isCaseSensitive
                            ? "Enabled (Strict: 'A' ≠ 'a')"
                            : "Disabled (Flexible: 'A' = 'a')"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start sm:items-center text-sm">
                      {question.allowPartialMatch ? (
                        <SearchCheck className="h-4 w-4 mr-2.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <SearchX className="h-4 w-4 mr-2.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <span className="text-foreground/90 dark:text-foreground/80">
                        Match Type:{" "}
                        <span className="font-medium text-foreground dark:text-white">
                          {question.allowPartialMatch
                            ? "Partial Allowed (e.g., 'York' in 'New York')"
                            : "Exact Required (Must match fully)"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                {question.acceptableAnswers.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Alternative Acceptable Answers
                    </p>
                    <ul className="space-y-1 text-sm">
                      {question.acceptableAnswers.map((answer, index) => (
                        <li
                          key={index}
                          className="p-1.5 px-2 rounded-md bg-muted/50 dark:bg-muted/30 border border-transparent dark:hover:border-foreground/20 font-mono text-xs"
                        >
                          {answer}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-3 border-t dark:border-foreground/20">
                  Created:{" "}
                  <span className="font-medium">
                    {new Date(question.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>
              <section className="flex items-center justify-end gap-2 mr-2">
                <UpdateTypeAnswerQuestionForm question={question} />
                <DeleteQuestion
                  id={question.id}
                  questionType={QuestionType.TypeTheAnswer}
                />
              </section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
