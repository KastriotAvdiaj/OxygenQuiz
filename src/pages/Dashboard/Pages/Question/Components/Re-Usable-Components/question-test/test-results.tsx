import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, RotateCcw, X, Clock, Trophy } from "lucide-react";
import { QuestionType } from "@/types/question-types";
import { TestResult } from "./test-question-button";

interface TestResultsProps {
  result: TestResult;
  question: any;
  questionType: QuestionType;
  onRetry: () => void;
  onClose: () => void;
}

export const TestResults = ({
  result,
  question,
  questionType,
  onRetry,
  onClose,
}: TestResultsProps) => {
  const formatTime = (seconds: number) => {
    return `${seconds.toFixed(2)}s`;
  };

  const getCorrectAnswerDisplay = () => {
    if (questionType === QuestionType.MultipleChoice) {
      const correctOptions = question.answerOptions.filter((opt: any) => opt.isCorrect);
      return correctOptions.map((opt: any) => opt.text).join(", ");
    }
    return result.correctAnswer;
  };

  return (
    <div className="space-y-6 py-4">
      {/* Result Status */}
      <Alert
        variant={result.isCorrect ? "default" : "destructive"}
        className={
          result.isCorrect
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            : ""
        }
      >
        <div className="flex items-start gap-3">
          {result.isCorrect ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 mt-0.5" />
          )}
          <div className="flex-1">
            <AlertTitle className="text-lg font-semibold">
              {result.isCorrect ? "Correct! 🎉" : "Incorrect"}
            </AlertTitle>
            <AlertDescription className="mt-2">
              {result.isCorrect
                ? "Great job! You answered the question correctly."
                : "Don't worry, keep practicing to improve your skills."}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Score Card */}
      <Card className="border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Trophy className="h-5 w-5" />
            Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">
              {result.score}
            </span>
            <span className="text-lg text-muted-foreground">points</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Completed in {formatTime(result.timeTaken)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Question Review</h3>
        
        <div className="space-y-3">
          <div className="p-4 border rounded-lg dark:border-foreground/30 bg-muted/30">
            <p className="font-medium mb-2">{question.text}</p>
            {question.imageUrl && (
              <div className="w-full rounded-md overflow-hidden border dark:border-foreground/30 mt-3">
                <img
                  src={question.imageUrl}
                  alt="Question image"
                  className="w-full h-auto max-h-48 object-contain mx-auto"
                />
              </div>
            )}
          </div>

          <div className="p-4 border rounded-lg dark:border-foreground/30 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100 mb-1">
                  Correct Answer:
                </p>
                <p className="text-green-800 dark:text-green-200">
                  {getCorrectAnswerDisplay()}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info for Multiple Choice */}
          {questionType === QuestionType.MultipleChoice && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">All Options:</p>
              <div className="space-y-2">
                {question.answerOptions.map((option: any) => (
                  <div
                    key={option.id}
                    className={`p-3 border rounded-md flex items-center gap-2 ${
                      option.isCorrect
                        ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50"
                        : "bg-muted/30 dark:border-foreground/30"
                    }`}
                  >
                    {option.isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm">{option.text}</span>
                    {option.isCorrect && (
                      <Badge variant="outline" className="ml-auto text-xs border-green-300 dark:border-green-700">
                        Correct
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info for Type Answer */}
          {questionType === QuestionType.TypeTheAnswer && question.acceptableAnswers?.length > 0 && (
            <div className="p-4 border rounded-lg dark:border-foreground/30 bg-muted/30">
              <p className="font-medium text-sm mb-2">Acceptable Answers:</p>
              <div className="flex flex-wrap gap-2">
                {question.acceptableAnswers.map((answer: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {answer}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 gap-3">
        <Button
          variant="outline"
          onClick={onRetry}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Test Again
        </Button>
        <Button
          onClick={onClose}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>
    </div>
  );
};