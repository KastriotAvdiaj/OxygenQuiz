// src/components/quiz/QuizResults.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Home, BarChart3, FileText } from "lucide-react";
import { QuizSession } from "../../quiz-session-types";
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Quiz Results
          </h1>
          <p className="text-muted-foreground text-lg">{session.quizTitle}</p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="overview">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </span>
            </TabsTrigger>
            <TabsTrigger value="review">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 pt-8">
          <LiftedButton
            onClick={handleRetryQuiz}
            className="flex items-center font-secondary text-2xl">
            <RotateCcw className="h-6 w-6" />
            Try Again
          </LiftedButton>

          <LiftedButton
            onClick={handleSelectNewQuiz}
            // variant={"fancy"}
            className="flex items-center text-2xl font-secondary">
            <Home className="h-6 w-6" />
            New Quiz
          </LiftedButton>
        </div>
      </div>
    </div>
  );
}
