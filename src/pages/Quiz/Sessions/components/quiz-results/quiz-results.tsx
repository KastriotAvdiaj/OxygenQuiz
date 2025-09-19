// src/components/quiz/QuizResults.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, BarChart3, FileText } from "lucide-react";
import { QuizSession } from "../../quiz-session-types";
import { QuizOverview } from "./quiz-overview";
import { QuestionReview } from "./question-review";
interface QuizResultsProps {
  session: QuizSession;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  onRetryQuiz?: () => void;
  onSelectNewQuiz?: () => void;
}

export function QuizResults({
  session,
  theme,
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
    <div className="min-h-screen bg-background">
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
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Question Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <QuizOverview session={session} theme={theme} />
          </TabsContent>

          <TabsContent value="review">
            <QuestionReview session={session} theme={theme} />
          </TabsContent>
        </Tabs>

        {/* Persistent Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 pt-8 border-t">
          <Button
            onClick={handleRetryQuiz}
            className="flex items-center gap-2"
            style={{ backgroundColor: theme.primary }}
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>

          <Button
            onClick={handleSelectNewQuiz}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Choose New Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}