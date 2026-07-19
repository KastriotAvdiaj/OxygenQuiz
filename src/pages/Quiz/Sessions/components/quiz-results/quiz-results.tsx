// src/components/quiz/QuizResults.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Home, BarChart3, FileText } from "lucide-react";
import { QuizSession } from "../../../../../types/quiz-session-types";
import { QuizOverview } from "./quiz-overview";
import { QuestionReview } from "./question-review";
import { LiftedButton } from "@/common/LiftedButton";
interface QuizResultsProps {
  session: QuizSession;
  onRetryQuiz?: () => void;
  onSelectNewQuiz?: () => void;
}

export function QuizResults({
  session,
  onRetryQuiz,
  onSelectNewQuiz,
}: QuizResultsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const handleRetryQuiz = () => {
    if (onRetryQuiz) {
      onRetryQuiz();
    } else {
      navigate(`/quiz/${session.quizId}`);
    }
  };

  const handleSelectNewQuiz = () => {
    if (onSelectNewQuiz) {
      onSelectNewQuiz();
    } else {
      navigate("/choose-quiz");
    }
  };

  return (
    <div className="bg-background  ">
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-4 sm:mb-5 text-center">
          <h1 className="inline-block text-2xl sm:text-3xl font-black tracking-tight text-primary">
            {session.quizTitle}
          </h1>
          <div className="mx-auto mt-1.5 h-1 w-16 rounded-full bg-primary/60" />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto">
            <TabsTrigger value="overview" className="px-2 mx-0 sm:px-4 sm:mx-2">
              <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Overview
              </span>
            </TabsTrigger>
            <TabsTrigger value="review" className="px-2 mx-0 sm:px-4 sm:mx-2">
              <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Question Review
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <QuizOverview session={session} />
          </TabsContent>

          <TabsContent value="review">
            <QuestionReview session={session} />
          </TabsContent>
        </Tabs>

        {/* Persistent Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5 pt-5 sm:mt-6 sm:pt-6">
          <LiftedButton
            onClick={handleRetryQuiz}
            className="flex items-center justify-center"
          >
            <RotateCcw className="h-5 w-5 sm:h-4 sm:w-4" />
            Try Again
          </LiftedButton>

          <LiftedButton
            onClick={handleSelectNewQuiz}
            // variant={"fancy"}
            className="flex items-center justify-center"
          >
            <Home className="h-5 w-5 sm:h-4 sm:w-4" />
            New Quiz
          </LiftedButton>
        </div>
      </div>
    </div>
  );
}
