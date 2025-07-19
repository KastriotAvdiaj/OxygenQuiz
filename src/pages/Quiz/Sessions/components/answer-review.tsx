// src/components/quiz/AnswerReview.tsx

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { QuizSession, AnswerStatus } from "../quiz-session-types";

interface AnswerReviewProps {
  session: QuizSession;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
}

export function AnswerReview({ session, theme }: AnswerReviewProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: AnswerStatus) => {
    switch (status) {
      case AnswerStatus.Correct:
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case AnswerStatus.Incorrect:
        return <XCircle className="h-6 w-6 text-red-500" />;
      case AnswerStatus.TimedOut:
        return <Clock className="h-6 w-6 text-yellow-500" />;
      default:
        return <XCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AnswerStatus) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "border-green-500 bg-green-50 dark:bg-green-950";
      case AnswerStatus.Incorrect:
        return "border-red-500 bg-red-50 dark:bg-red-950";
      case AnswerStatus.TimedOut:
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      default:
        return "border-gray-500 bg-gray-50 dark:bg-gray-950";
    }
  };

  const getStatusText = (status: AnswerStatus) => {
    switch (status) {
      case AnswerStatus.Correct:
        return "Correct";
      case AnswerStatus.Incorrect:
        return "Incorrect";
      case AnswerStatus.TimedOut:
        return "Timed Out";
      default:
        return "No Answer";
    }
  };

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
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            onClick={() => navigate(`/quiz/results/${session.id}`)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Results</span>
          </Button>

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold quiz-text-primary">
              Answer Review
            </h1>
            <p className="quiz-text-secondary">{session.quizTitle}</p>
          </div>

          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" style={{ color: theme.primary }} />
            <span className="font-semibold" style={{ color: theme.primary }}>
              {session.totalScore} pts
            </span>
          </div>
        </motion.div>
      </div>

      {/* Answer List */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 pb-8">
        <div className="space-y-4">
          {session.userAnswers.map((answer, index) => (
            <motion.div
              key={answer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className={`quiz-card p-6 border-l-4 ${getStatusColor(
                answer.status
              )}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium quiz-text-secondary">
                    Question {index + 1}
                  </span>
                  {getStatusIcon(answer.status)}
                  <span className="text-sm font-medium">
                    {getStatusText(answer.status)}
                  </span>
                </div>

                <div className="text-right">
                  <div
                    className="text-lg font-bold"
                    style={{ color: theme.primary }}
                  >
                    {answer.score} pts
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <h3 className="text-lg font-medium quiz-text-primary mb-2">
                  {answer.questionText}
                </h3>
              </div>

              {/* Answer Details */}
              <div className="space-y-3">
                {/* User's Answer */}
                <div className="flex items-start space-x-3">
                  <span className="text-sm font-medium quiz-text-secondary min-w-[100px]">
                    Your Answer:
                  </span>
                  <div className="flex-1">
                    {answer.selectedOptionText ? (
                      <span
                        className={`font-medium ${
                          answer.status === AnswerStatus.Correct
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {answer.selectedOptionText}
                      </span>
                    ) : answer.submittedAnswer ? (
                      <span
                        className={`font-medium ${
                          answer.status === AnswerStatus.Correct
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        "{answer.submittedAnswer}"
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">
                        {answer.status === AnswerStatus.TimedOut
                          ? "Time ran out"
                          : "No answer provided"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Correct Answer (for incorrect responses) */}
                {answer.status !== AnswerStatus.Correct && (
                  <div className="flex items-start space-x-3">
                    <span className="text-sm font-medium quiz-text-secondary min-w-[100px]">
                      Correct Answer:
                    </span>
                    <div className="flex-1">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {/* This would need to be provided by the backend */}
                        <span className="text-sm quiz-text-secondary italic">
                          (Correct answer details would be shown here)
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Explanation (if available) */}
                {/* This would be populated if the backend provides explanations */}
                <div className="mt-4 p-3 bg-quiz-surface-elevated rounded-lg">
                  <span className="text-sm font-medium quiz-text-secondary">
                    Explanation:
                  </span>
                  <p className="text-sm quiz-text-secondary mt-1 italic">
                    (Question explanations would be shown here when available)
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 quiz-card-elevated p-6 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-500">
                {
                  session.userAnswers.filter(
                    (a) => a.status === AnswerStatus.Correct
                  ).length
                }
              </div>
              <div className="text-sm quiz-text-secondary">Correct</div>
            </div>

            <div>
              <div className="text-2xl font-bold text-red-500">
                {
                  session.userAnswers.filter(
                    (a) => a.status === AnswerStatus.Incorrect
                  ).length
                }
              </div>
              <div className="text-sm quiz-text-secondary">Incorrect</div>
            </div>

            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {
                  session.userAnswers.filter(
                    (a) => a.status === AnswerStatus.TimedOut
                  ).length
                }
              </div>
              <div className="text-sm quiz-text-secondary">Timed Out</div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex flex-col md:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate(`/quiz/${session.quizId}`)}
            size="lg"
            className="flex items-center space-x-2 px-6 py-3"
            style={{ backgroundColor: theme.primary }}
          >
            <span>Try Quiz Again</span>
          </Button>

          <Button
            onClick={() => navigate("/choose-quiz")}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2 px-6 py-3"
          >
            <span>Choose New Quiz</span>
          </Button>
        </motion.div>
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
