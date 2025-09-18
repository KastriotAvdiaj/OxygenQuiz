// src/components/quiz/QuizResults.tsx

import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  Clock,
  RotateCcw,
  Home,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { QuizSession, AnswerStatus } from "../quiz-session-types";

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

  // Calculate quiz statistics
  const totalQuestions = session.userAnswers.length;
  const correctAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.Correct
  ).length;
  const incorrectAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.Incorrect
  ).length;
  const timeoutAnswers = session.userAnswers.filter(
    (answer) => answer.status === AnswerStatus.TimedOut
  ).length;

  const scorePercentage =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
  const maxPossibleScore = totalQuestions * 15; // Assuming max 15 points per question

  // Calculate time taken
  const timeTaken =
    session.endTime && session.startTime
      ? new Date(session.endTime).getTime() -
        new Date(session.startTime).getTime()
      : 0;
  const timeTakenFormatted = formatDuration(timeTaken);

  // Determine performance level
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90)
      return { level: "Excellent!", color: theme.primary, icon: Trophy };
    if (percentage >= 80)
      return { level: "Great Job!", color: theme.primary, icon: Target };
    if (percentage >= 70)
      return { level: "Good Work!", color: "#f59e0b", icon: Target };
    if (percentage >= 60)
      return { level: "Keep Practicing!", color: "#f59e0b", icon: Target };
    return { level: "Try Again!", color: "#ef4444", icon: Target };
  };

  const performance = getPerformanceLevel(scorePercentage);
  const PerformanceIcon = performance.icon;

  const handleRetryQuiz = () => {
    if (onRetryQuiz) {
      onRetryQuiz();
    } else {
      // Default behavior - navigate to quiz page
      navigate(`/quiz/${session.quizId}`);
    }
  };

  const handleSelectNewQuiz = () => {
    if (onSelectNewQuiz) {
      onSelectNewQuiz();
    } else {
      // Default behavior - navigate to quiz selection
      navigate("/choose-quiz");
    }
  };

  console.log("Quiz Session Data:", session);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(circle at 20% 80%, ${theme.primary}15 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${theme.secondary}15 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, ${theme.accent}10 0%, transparent 50%),
          hsl(var(--background))
        `,
        ...theme.cssVars,
      }}
    >
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <PerformanceIcon
                className="h-16 w-16 mx-auto mb-4"
                style={{ color: performance.color }}
              />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold quiz-text-primary">
              Quiz Complete!
            </h1>

            <h2
              className="text-2xl md:text-3xl font-semibold"
              style={{ color: performance.color }}
            >
              {performance.level}
            </h2>

            <p className="text-xl quiz-text-secondary">{session.quizTitle}</p>
          </motion.div>

          {/* Score Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Score Card */}
            <div className="quiz-card-elevated p-6 text-center space-y-3">
              <div
                className="text-4xl font-bold"
                style={{ color: theme.primary }}
              >
                {session.totalScore}
              </div>
              <div className="quiz-text-secondary">
                out of {maxPossibleScore} points
              </div>
              <div className="text-sm quiz-text-secondary">Total Score</div>
            </div>

            {/* Accuracy Card */}
            <div className="quiz-card-elevated p-6 text-center space-y-3">
              <div
                className="text-4xl font-bold"
                style={{ color: performance.color }}
              >
                {scorePercentage}%
              </div>
              <div className="quiz-text-secondary">
                {correctAnswers} of {totalQuestions} correct
              </div>
              <div className="text-sm quiz-text-secondary">Accuracy</div>
            </div>

            {/* Time Card */}
            <div className="quiz-card-elevated p-6 text-center space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-8 w-8 quiz-text-primary" />
                <div
                  className="text-4xl font-bold"
                  style={{ color: theme.accent }}
                >
                  {timeTakenFormatted}
                </div>
              </div>
              <div className="quiz-text-secondary">Time taken</div>
              <div className="text-sm quiz-text-secondary">Duration</div>
            </div>
          </motion.div>

          {/* Detailed Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="quiz-card-elevated p-6"
          >
            <h3 className="text-xl font-semibold quiz-text-primary mb-4">
              Performance Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.primary }}
                />
                <span className="quiz-text-secondary">
                  Correct: {correctAnswers}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-red-400" />
                <span className="quiz-text-secondary">
                  Incorrect: {incorrectAnswers}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-yellow-400" />
                <span className="quiz-text-secondary">
                  Timed Out: {timeoutAnswers}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm quiz-text-secondary mb-2">
                <span>Progress</span>
                <span>{scorePercentage}%</span>
              </div>
              <div className="quiz-progress-bar">
                <motion.div
                  className="quiz-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${scorePercentage}%` }}
                  transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                  style={{ backgroundColor: performance.color }}
                />
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col md:flex-row gap-4 justify-center"
          >
            <Button
              onClick={() => navigate(`/quiz/results/${session.id}/review`)}
              variant="outline"
              size="lg"
              className="flex items-center space-x-2 px-6 py-3"
            >
              <Target className="h-5 w-5" />
              <span>Review Answers</span>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleRetryQuiz}
              size="lg"
              className="flex items-center space-x-2 px-6 py-3"
              style={{ backgroundColor: theme.primary }}
            >
              <RotateCcw className="h-5 w-5" />
              <span>Try Again</span>
            </Button>

            <Button
              onClick={handleSelectNewQuiz}
              variant="outline"
              size="lg"
              className="flex items-center space-x-2 px-6 py-3"
            >
              <Home className="h-5 w-5" />
              <span>Choose New Quiz</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: theme.gradients.primary }}
        />
      </div>
    </div>
  );
}

// Helper function to format duration
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${remainingSeconds}s`;
}
