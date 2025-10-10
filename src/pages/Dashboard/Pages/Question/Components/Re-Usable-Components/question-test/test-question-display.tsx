import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label,Input } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle } from "lucide-react";
import { QuestionType } from "@/types/question-types";
import { TestConfig, TestResult } from "./test-question-button";
import { useTestQuestionMutation } from "../../../api/test-question";
import { Spinner } from "@/components/ui";

interface TestQuestionDisplayProps {
  question: any;
  questionType: QuestionType;
  config: TestConfig;
  onTestComplete: (result: TestResult) => void;
}

export const TestQuestionDisplay = ({
  question,
  questionType,
  config,
  onTestComplete,
}: TestQuestionDisplayProps) => {
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimitInSeconds);
  const [startTime] = useState(Date.now());
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [isTimedOut, setIsTimedOut] = useState(false);

  const testQuestionMutation = useTestQuestionMutation();

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsTimedOut(true);
      handleSubmit(true); // Auto-submit on timeout
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleSubmit = async (timedOut: boolean = false) => {
    const timeTaken = (Date.now() - startTime) / 1000;

    let submittedAnswer: any = {
      questionId: question.id,
      questionType,
      timeLimitInSeconds: config.timeLimitInSeconds,
      pointSystem: config.pointSystem,
      timeTaken,
      timedOut,
    };

    if (questionType === QuestionType.MultipleChoice) {
      if (question.allowMultipleSelections) {
        submittedAnswer.selectedOptionIds = selectedOptionIds;
      } else {
        submittedAnswer.selectedOptionId = selectedOptionId;
      }
    } else if (questionType === QuestionType.TrueFalse) {
      submittedAnswer.answer = textAnswer;
    } else if (questionType === QuestionType.TypeTheAnswer) {
      submittedAnswer.answer = textAnswer;
    }

    try {
      const result = await testQuestionMutation.mutateAsync(submittedAnswer);
      onTestComplete({
        isCorrect: result.isCorrect,
        score: result.score,
        timeTaken,
        correctAnswer: result.correctAnswer,
      });
    } catch (error) {
      console.error("Test submission failed:", error);
    }
  };

  const handleMultipleSelectionChange = (optionId: number, checked: boolean) => {
    if (checked) {
      setSelectedOptionIds([...selectedOptionIds, optionId]);
    } else {
      setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optionId));
    }
  };

  const canSubmit = () => {
    if (isTimedOut) return false;
    
    if (questionType === QuestionType.MultipleChoice) {
      return question.allowMultipleSelections
        ? selectedOptionIds.length > 0
        : selectedOptionId !== null;
    }
    return textAnswer.trim().length > 0;
  };

  const progressPercentage = (timeRemaining / config.timeLimitInSeconds) * 100;
  const isWarning = timeRemaining <= config.timeLimitInSeconds * 0.25;

  return (
    <div className="space-y-6 py-4">
      {/* Timer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${isWarning ? "text-red-500" : "text-muted-foreground"}`} />
            <span className={`text-lg font-semibold ${isWarning ? "text-red-500" : ""}`}>
              {timeRemaining}s remaining
            </span>
          </div>
        </div>
        <Progress
          value={progressPercentage}
          className={`h-2 ${isWarning ? "bg-red-100 dark:bg-red-900/20" : ""}`}
        />
      </div>

      {isTimedOut && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Time's up! Your answer has been automatically submitted.
          </AlertDescription>
        </Alert>
      )}

      {/* Question */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{question.text}</h3>
          {question.imageUrl && (
            <div className="w-full rounded-md overflow-hidden border dark:border-foreground/30">
              <img
                src={question.imageUrl}
                alt="Question image"
                className="w-full h-auto max-h-64 object-contain mx-auto"
              />
            </div>
          )}
        </div>

        {/* Answer Input */}
        {questionType === QuestionType.MultipleChoice && (
          <div className="space-y-3">
            {question.allowMultipleSelections ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Select all that apply:
                </p>
                {question.answerOptions.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 dark:border-foreground/30">
                    <Checkbox
                      id={`option-${option.id}`}
                      checked={selectedOptionIds.includes(option.id)}
                      onCheckedChange={(checked) =>
                        handleMultipleSelectionChange(option.id, checked as boolean)
                      }
                      disabled={isTimedOut}
                    />
                    <Label
                      htmlFor={`option-${option.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={selectedOptionId?.toString()}
                onValueChange={(value) => setSelectedOptionId(parseInt(value))}
                disabled={isTimedOut}
              >
                {question.answerOptions.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 dark:border-foreground/30">
                    <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        )}

        {questionType === QuestionType.TrueFalse && (
          <RadioGroup
            value={textAnswer}
            onValueChange={setTextAnswer}
            disabled={isTimedOut}
          >
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 dark:border-foreground/30">
              <RadioGroupItem value="True" id="true" />
              <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 dark:border-foreground/30">
              <RadioGroupItem value="False" id="false" />
              <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
            </div>
          </RadioGroup>
        )}

        {questionType === QuestionType.TypeTheAnswer && (
          <div className="space-y-2">
            <Label htmlFor="textAnswer">Your Answer:</Label>
            <Input
              id="textAnswer"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isTimedOut}
              className="text-base"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit() || testQuestionMutation.isPending}
          className="gap-2"
          size="lg"
        >
          {testQuestionMutation.isPending ? (
            <>
              <Spinner size="sm" />
              Submitting...
            </>
          ) : (
            "Submit Answer"
          )}
        </Button>
      </div>
    </div>
  );
};