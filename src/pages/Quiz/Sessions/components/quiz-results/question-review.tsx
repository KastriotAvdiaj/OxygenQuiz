import { useState } from "react";
import { Clock, List, Grid3X3, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AnswerStatus,
  QuizSession,
} from "../../../../../types/quiz-session-types";
import { QuestionMedia } from "@/common/QuestionMedia";
import { formatDuration } from "./quiz-session-utils";
import { cn } from "@/utils/cn";

interface QuestionReviewProps {
  session: QuizSession;
}

type ViewMode = "list" | "cards";

export function QuestionReview({ session }: QuestionReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-transparent";
      case AnswerStatus.Incorrect:
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent";
      case AnswerStatus.TimedOut:
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-transparent";
      default:
        return "bg-muted text-muted-foreground border-transparent";
    }
  };

  // Faint status tint for the inactive question pills in the number bar
  const getStatusTint = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20";
      case AnswerStatus.Incorrect:
        return "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20";
      case AnswerStatus.TimedOut:
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground hover:bg-muted-foreground/20";
    }
  };

  const getOptionClassName = (isSelected: boolean, isCorrect: boolean) => {
    // Subtle tint + colored left accent bar; text stays in the normal foreground
    // color so the card reads calmly in both light and dark mode.
    let className =
      "p-2 sm:p-2.5 rounded-lg text-sm text-foreground border-l-4 border-transparent";

    if (isCorrect) {
      // The correct answer (whether or not the user picked it)
      className += " bg-green-500/10 border-green-500";
    } else if (isSelected && !isCorrect) {
      // The user's incorrect pick
      className += " bg-red-500/10 border-red-500";
    } else {
      className += " bg-muted/50 text-muted-foreground";
    }

    return className;
  };

  const renderOptionBadges = (isSelected: boolean, isCorrect: boolean) => (
    <div className="flex items-center gap-2">
      {isSelected && (
        <Badge variant="secondary" className="text-xs">
          Your Answer
        </Badge>
      )}
      {isCorrect && (
        <Badge
          variant="secondary"
          className="text-xs bg-green-500/15 text-green-600 dark:text-green-400 border-transparent"
        >
          Correct
        </Badge>
      )}
    </div>
  );

  const renderOption = (
    text: string,
    isSelected: boolean,
    isCorrect: boolean,
  ) => (
    <div className={getOptionClassName(isSelected, isCorrect)}>
      <div className="flex items-center justify-between">
        <span>{text}</span>
        {renderOptionBadges(isSelected, isCorrect)}
      </div>
    </div>
  );

  const renderQuestionContent = (answer: any, questionNumber: number) => {
    const timeSpent = formatDuration(answer.timeSpentInSeconds * 1000);

    // Multi-select MC answers store the chosen option ids as a CSV in submittedAnswer;
    // single-select uses selectedOptionId. Build the set of ids the user picked.
    const selectedOptionIds = new Set<number>(
      answer.questionType === "MultipleChoice" && answer.submittedAnswer
        ? String(answer.submittedAnswer)
            .split(",")
            .map((s: string) => parseInt(s.trim(), 10))
            .filter((n: number) => !Number.isNaN(n))
        : answer.selectedOptionId != null
          ? [answer.selectedOptionId]
          : [],
    );

    return (
      <div className="space-y-3">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Question {questionNumber}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", getStatusColor(answer.status))}
              >
                {answer.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {answer.questionType}
              </Badge>
            </div>
            <h3 className="text-sm sm:text-base font-medium text-foreground">
              {answer.questionText}
            </h3>
          </div>
          <div className="text-right text-xs text-muted-foreground shrink-0">
            <div className="flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              {timeSpent}
            </div>
            <div className="font-medium mt-0.5">{answer.score} pts</div>
          </div>
        </div>

        {/* Optional question media */}
        <QuestionMedia
          mediaUrl={answer.mediaUrl}
          mediaType={answer.mediaType}
          alt="Question image"
          className="!max-w-md"
        />

        {/* Answer Content */}
        <div className="space-y-2">
          {/* Multiple Choice */}
          {answer.questionType === "MultipleChoice" && answer.answerOptions && (
            <div className="space-y-1.5">
              {answer.answerOptions.map((option: any) => {
                const isSelected = selectedOptionIds.has(option.id);
                const isCorrect = option.isCorrect;

                return (
                  <div key={option.id}>
                    {renderOption(option.text, isSelected, isCorrect)}
                  </div>
                );
              })}
            </div>
          )}

          {/* True/False */}
          {answer.questionType === "TrueFalse" && (
            <div className="space-y-1.5">
              {["True", "False"].map((optionText) => {
                const isSelected = answer.submittedAnswer === optionText;
                const isCorrect =
                  (answer.correctAnswerBoolean ? "True" : "False") ===
                  optionText;

                return (
                  <div key={optionText}>
                    {renderOption(optionText, isSelected, isCorrect)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Type the Answer */}
          {answer.questionType === "TypeTheAnswer" && (
            <div className="space-y-1.5">
              {answer.status === AnswerStatus.Correct ? (
                // If correct, show one green block for the user's answer
                <div className={getOptionClassName(true, true)}>
                  <div className="flex items-center justify-between">
                    <span>{answer.submittedAnswer}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Your Answer
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-green-500/15 text-green-600 dark:text-green-400 border-transparent"
                      >
                        Correct
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                // If incorrect, show user's answer in red
                <div className={getOptionClassName(true, false)}>
                  <div className="flex items-center justify-between">
                    <span>{answer.submittedAnswer || "No answer"}</span>
                    <Badge variant="secondary" className="text-xs">
                      Your Answer
                    </Badge>
                  </div>
                </div>
              )}

              {/* Always show the correct answer in a green block if the user was incorrect */}
              {answer.status !== AnswerStatus.Correct && (
                <div className={getOptionClassName(false, true)}>
                  <div className="flex items-center justify-between">
                    <span>{answer.correctAnswerText}</span>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-500/15 text-green-600 dark:text-green-400 border-transparent"
                    >
                      Correct Answer
                    </Badge>
                  </div>
                </div>
              )}

              {/* Display other acceptable answers if they exist */}
              {answer.acceptableAnswers &&
                answer.acceptableAnswers.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground block mb-1">
                      Other Acceptable Answers:
                    </span>
                    <span className="font-medium">
                      {answer.acceptableAnswers.join(", ")}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-end gap-2">
        {/* <h2 className="text-lg sm:text-xl font-semibold">Question Review</h2> */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex items-center gap-1.5 sm:gap-2 dark:text-white px-2.5 sm:px-3"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="flex items-center gap-1.5 sm:gap-2 dark:text-white px-2.5 sm:px-3"
          >
            <Grid3X3 className="h-4 w-4" />
            Cards
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0 border border-border rounded-md">
            {session.userAnswers.map((answer, index) => (
              <div key={answer.id}>
                <div className="p-4 sm:p-6">
                  {renderQuestionContent(answer, index + 1)}
                </div>
                {index < session.userAnswers.length - 1 && (
                  <Separator className="bg-border" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-3">
          <Card className="border border-border rounded-md">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base">
                  Question {currentQuestionIndex + 1} of{" "}
                  {session.userAnswers.length}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    className="border-border"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.max(0, currentQuestionIndex - 1),
                      )
                    }
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border"
                    size="sm"
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.min(
                          session.userAnswers.length - 1,
                          currentQuestionIndex + 1,
                        ),
                      )
                    }
                    disabled={
                      currentQuestionIndex === session.userAnswers.length - 1
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {renderQuestionContent(
                session.userAnswers[currentQuestionIndex],
                currentQuestionIndex + 1,
              )}
            </CardContent>
          </Card>

          {/* Question Navigation Tabs */}
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="Question navigation"
              className="flex items-center gap-1 max-w-full overflow-x-auto rounded-xl bg-muted/50 p-1 border border-border"
            >
              {session.userAnswers.map((answer, index) => {
                const isActive = currentQuestionIndex === index;
                return (
                  <button
                    key={answer.id}
                    role="tab"
                    aria-selected={isActive}
                    title={answer.status}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center min-w-[1.9rem] sm:min-w-[2.1rem] rounded-lg px-2 py-1 text-xs sm:text-sm font-semibold transition-colors duration-200",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : getStatusTint(answer.status),
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
