// src/components/quiz/QuestionReview.tsx

import { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Timer, 
  Clock,
  List,
  Grid3X3,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnswerStatus, QuizSession } from "../../quiz-session-types";
import { formatDuration } from "./quiz-session-utils";

interface QuestionReviewProps {
  session: QuizSession;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

type ViewMode = "list" | "cards";

export function QuestionReview({ session, theme }: QuestionReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case AnswerStatus.Incorrect:
        return <XCircle className="h-5 w-5 text-red-600" />;
      case AnswerStatus.TimedOut:
        return <Timer className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "bg-green-100 text-green-800 border-green-200";
      case AnswerStatus.Incorrect:
        return "bg-red-100 text-red-800 border-red-200";
      case AnswerStatus.TimedOut:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
            <div className="font-medium mt-1">
              {answer.score} pts
            </div>
          </div>
        </div>

        {/* Answer Content */}
        <div className="space-y-3">
          {/* Multiple Choice */}
          {answer.questionType === "MultipleChoice" && answer.answerOptions && (
            <div className="space-y-2">
              {answer.answerOptions.map((option: any, idx: number) => {
                const isSelected = answer.selectedOptionId === option.id;
                const isCorrect = option.isCorrect;
                
                let optionClass = "p-3 rounded-lg border ";
                if (isSelected && isCorrect) {
                  optionClass += "bg-green-50 border-green-200 text-green-800";
                } else if (isSelected && !isCorrect) {
                  optionClass += "bg-red-50 border-red-200 text-red-800";
                } else if (!isSelected && isCorrect) {
                  optionClass += "bg-green-50 border-green-200 text-green-800";
                } else {
                  optionClass += "bg-gray-50 border-gray-200";
                }
                
                return (
                  <div key={option.id} className={optionClass}>
                    <div className="flex items-center justify-between">
                      <span>{option.text}</span>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            Your Answer
                          </Badge>
                        )}
                        {isCorrect && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Correct
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* True/False */}
          {answer.questionType === "TrueFalse" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-muted-foreground">Your Answer:</span>
                <span className="font-medium">{answer.submittedAnswer}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-muted-foreground">Correct Answer:</span>
                <span className="font-medium">{answer.correctAnswerBoolean ? "True" : "False"}</span>
              </div>
            </div>
          )}

          {/* Type the Answer */}
          {answer.questionType === "TypeTheAnswer" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-muted-foreground">Your Answer:</span>
                <span className="font-medium">{answer.submittedAnswer || "No answer"}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-muted-foreground">Correct Answer:</span>
                <span className="font-medium">{answer.correctAnswerText}</span>
              </div>
              {answer.acceptableAnswers && answer.acceptableAnswers.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-muted-foreground block mb-1">
                    Acceptable Answers:
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
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Cards
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            {session.userAnswers.map((answer, index) => (
              <div key={answer.id}>
                <div className="p-6">
                  {renderQuestionContent(answer, index + 1)}
                </div>
                {index < session.userAnswers.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1} of {session.userAnswers.length}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(Math.min(session.userAnswers.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === session.userAnswers.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderQuestionContent(session.userAnswers[currentQuestionIndex], currentQuestionIndex + 1)}
            </CardContent>
          </Card>

          {/* Question Navigation */}
          <div className="flex flex-wrap gap-2 justify-center">
            {session.userAnswers.map((answer, index) => (
              <Button
                key={answer.id}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className="flex items-center gap-2 min-w-[60px]"
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