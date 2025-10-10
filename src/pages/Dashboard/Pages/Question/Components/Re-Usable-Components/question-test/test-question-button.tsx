import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnyQuestion, QuestionType } from "@/types/question-types";
import { TestConfiguration } from "./test-configuration";
import { TestQuestionDisplay } from "./test-question-display";

import { PointSystem } from "@/pages/Dashboard/Pages/Quiz/components/Create-Quiz-Form/types";
import { FaFlask } from "react-icons/fa";
import { TestResults } from "./test-results";
import { LiftedButton } from "@/common/LiftedButton";

interface TestQuestionButtonProps {
  question: AnyQuestion; // Will be MultipleChoiceQuestion | TrueFalseQuestion | TypeTheAnswerQuestion
  questionType: QuestionType;
}

export interface TestConfig {
  timeLimitInSeconds: number;
  pointSystem: PointSystem;
}

export interface TestResult {
  isCorrect: boolean;
  score: number;
  timeTaken: number;
  correctAnswer: string;
}

type TestStage = "config" | "testing" | "results";

export const TestQuestionButton = ({
  question,
  questionType,
}: TestQuestionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testStage, setTestStage] = useState<TestStage>("config");
  const [testConfig, setTestConfig] = useState<TestConfig>({
    timeLimitInSeconds: 30,
    pointSystem: PointSystem.Standard,
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleOpenDialog = () => {
    setIsOpen(true);
    setTestStage("config");
    setTestResult(null);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setTestStage("config");
    setTestResult(null);
  };

  const handleStartTest = (config: TestConfig) => {
    setTestConfig(config);
    setTestStage("testing");
  };

  const handleTestComplete = (result: TestResult) => {
    setTestResult(result);
    setTestStage("results");
  };

  const handleRetry = () => {
    setTestStage("config");
    setTestResult(null);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <LiftedButton
              variant="icon"
              onClick={handleOpenDialog}
              className="rounded-xl bg-primary"
            >
              <FaFlask className="h-4 w-4" />
            </LiftedButton>
          </TooltipTrigger>
          <TooltipContent className="bg-background border-foreground/50">
            <p>Test Question</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border bg-background dark:border-foreground/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {testStage === "config" && "Configure Test"}
              {testStage === "testing" && "Answer the Question"}
              {testStage === "results" && "Test Results"}
            </DialogTitle>
          </DialogHeader>

          {testStage === "config" && (
            <TestConfiguration
              defaultConfig={testConfig}
              onStartTest={handleStartTest}
            />
          )}

          {testStage === "testing" && (
            <TestQuestionDisplay
              question={question}
              questionType={questionType}
              config={testConfig}
              onTestComplete={handleTestComplete}
            />
          )}

          {testStage === "results" && testResult && (
            <TestResults
              result={testResult}
              question={question}
              questionType={questionType}
              onRetry={handleRetry}
              onClose={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};