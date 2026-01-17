import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Timer,
  Clock,
  List,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnswerStatus, QuizSession } from "../../quiz-session-types";
import { formatDuration } from "./quiz-session-utils";

interface QuestionReviewProps {
  session: QuizSession;
}

type ViewMode = "list" | "cards";

export function QuestionReview({ session }: QuestionReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case AnswerStatus.Incorrect:
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case AnswerStatus.TimedOut:
        return <Timer className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "bg-green-100 text-green-600 border-green-200";
      case AnswerStatus.Incorrect:
        return "bg-red-100 text-red-600 border-red-200";
      case AnswerStatus.TimedOut:
        return "bg-yellow-100 text-yellow-600 border-yellow-200";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getOptionClassName = (isSelected: boolean, isCorrect: boolean) => {
    let className = "p-3 rounded-lg";
    
    if (isSelected && isCorrect) {
      className += " bg-green-200 border border-green-200 text-green-600 dark:bg-green-600 dark:border-green-700 dark:text-green-100";
    } else if (isSelected && !isCorrect) {
      className += " bg-red-50 border border-red-200 text-red-600 dark:bg-red-900 dark:border-red-600 dark:text-red-200";
    } else if (!isSelected && isCorrect) {
      className += " bg-green-50 border border-green-200 text-green-600 dark:bg-green-900 dark:border-green-600 dark:text-green-200";
    } else {
      className += " bg-muted dark:bg-muted-foreground/20";
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
          className="text-xs bg-green-100 text-green-600"
        >
          Correct
        </Badge>
      )}
    </div>
  );

  const renderOption = (text: string, isSelected: boolean, isCorrect: boolean) => (
    <div className={getOptionClassName(isSelected, isCorrect)}>
      <div className="flex items-center justify-between">
        <span>{text}</span>
        {renderOptionBadges(isSelected, isCorrect)}
      </div>
    </div>
  );

  const renderQuestionContent = (answer: any, questionNumber: number) => {
    const timeSpent = formatDuration(answer.timeSpentInSeconds * 1000);

    return (
      <div className="space-y-4">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Question {questionNumber}
              </span>
              <Badge
                variant="outline"
                className={getStatusColor(answer.status)}
              >
                {answer.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {answer.questionType}
              </Badge>
            </div>
            <h3 className="font-medium text-foreground mb-2">
              {answer.questionText}
            </h3>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeSpent}
            </div>
            <div className="font-medium mt-1">{answer.score} pts</div>
          </div>
        </div>

        {/* Answer Content */}
        <div className="space-y-3">
          {/* Multiple Choice */}
          {answer.questionType === "MultipleChoice" && answer.answerOptions && (
            <div className="space-y-2">
              {answer.answerOptions.map((option: any) => {
                const isSelected = answer.selectedOptionId === option.id;
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
            <div className="space-y-2">
              {["True", "False"].map((optionText) => {
                const isSelected = answer.submittedAnswer === optionText;
                const isCorrect =
                  (answer.correctAnswerBoolean ? "True" : "False") === optionText;

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
            <div className="space-y-2">
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
                        className="text-xs bg-green-100 text-green-600"
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
                      className="text-xs bg-green-100 text-green-600"
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
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Question Review</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 dark:text-white"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="flex items-center gap-2 dark:text-white"
          >
            <Grid3X3 className="h-4 w-4" />
            Cards
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0 border border-primary rounded-md">
            {session.userAnswers.map((answer, index) => (
              <div key={answer.id}>
                <div className="p-6">
                  {renderQuestionContent(answer, index + 1)}
                </div>
                {index < session.userAnswers.length - 1 && <Separator className="bg-primary"/>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          <Card className=""
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1} of{" "}
                  {session.userAnswers.length}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    // className={`${currentQuestionIndex === 0 ? '' : 'border-primary'}`}
                    className="border-primary"

                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.max(0, currentQuestionIndex - 1)
                      )
                    }
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary"
                    size="sm"
                    onClick={() =>
                      setCurrentQuestionIndex(
                        Math.min(
                          session.userAnswers.length - 1,
                          currentQuestionIndex + 1
                        )
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
            <CardContent>
              {renderQuestionContent(
                session.userAnswers[currentQuestionIndex],
                currentQuestionIndex + 1
              )}
            </CardContent>
          </Card>

          {/* Question Navigation */}
          <div className="flex flex-wrap gap-2 justify-center">
            {session.userAnswers.map((answer, index) => (
              <Button
                key={answer.id}
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={`flex items-center gap-2 min-w-[60px] ${currentQuestionIndex === index ? 'bg-muted border-foreground/20' : ''}`}
              >
                {getStatusIcon(answer.status)}
                {index + 1}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}