// src/components/quiz/QuestionDisplay.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QuizTimer } from "./quiz-timer";
import { TrueOrFalseQuestion } from "./true-or-false-question";
import { TypeTheAnswerQuestion } from "./type-the-answer-question";
import type { CurrentQuestion, AnswerResult } from "../quiz-session-types";
import { QuestionType } from "@/types/question-types";

interface QuestionDisplayProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  instantFeedback?: boolean;
  answerResult?: AnswerResult | null;
}

export function QuestionDisplay({
  question,
  onSubmit,
  isSubmitting,
  theme,
  instantFeedback = false,
  answerResult = null,
}: QuestionDisplayProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  const handleTimeUp = () => {
    // When time is up, we submit a null answer.
    // The backend will know this is a timeout.
    onSubmit(null);
  };

  // Render the question content based on question type
  const renderQuestionContent = () => {
    // Use the question type to determine which component to render
    switch (question.questionType) {
      case QuestionType.TrueFalse:
        return (
          <TrueOrFalseQuestion
            question={question}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            theme={theme}
            instantFeedback={instantFeedback}
            answerResult={answerResult}
            selectedOptionId={selectedOptionId}
            setSelectedOptionId={setSelectedOptionId}
          />
        );
      case QuestionType.TypeTheAnswer:
        return (
          <TypeTheAnswerQuestion
            question={question}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            theme={theme}
          />
        );
      default:
        // Default to multiple choice rendering
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, index) => {
                // Determine feedback state for instant feedback
                let feedbackState = "default";
                if (instantFeedback && answerResult) {
                  if (option.id === answerResult.correctAnswerId) {
                    feedbackState = "correct"; // This is the correct answer
                  } else if (
                    selectedOptionId === option.id &&
                    answerResult.status !== "Correct"
                  ) {
                    feedbackState = "incorrect"; // This was the user's wrong selection
                  }
                }

                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{
                      scale: instantFeedback && answerResult ? 1 : 1.02,
                    }}
                    whileTap={{
                      scale: instantFeedback && answerResult ? 1 : 0.98,
                    }}
                  >
                    <button
                      onClick={() =>
                        !answerResult && setSelectedOptionId(option.id)
                      }
                      disabled={instantFeedback && !!answerResult}
                      className={`quiz-answer-option w-full text-left transition-all duration-300 ${
                        selectedOptionId === option.id ? "selected" : ""
                      } ${
                        feedbackState === "correct"
                          ? "border-green-500 bg-green-100 dark:bg-green-900"
                          : feedbackState === "incorrect"
                          ? "border-red-500 bg-red-100 dark:bg-red-900"
                          : ""
                      }`}
                      style={{
                        borderColor:
                          feedbackState === "correct"
                            ? "#10b981"
                            : feedbackState === "incorrect"
                            ? "#ef4444"
                            : selectedOptionId === option.id
                            ? theme.primary
                            : undefined,
                        backgroundColor:
                          feedbackState === "correct"
                            ? "#10b98115"
                            : feedbackState === "incorrect"
                            ? "#ef444415"
                            : selectedOptionId === option.id
                            ? `${theme.primary}15`
                            : undefined,
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                            selectedOptionId === option.id
                              ? "border-current bg-current"
                              : "border-quiz-border-subtle"
                          }`}
                          style={{
                            borderColor:
                              feedbackState === "correct"
                                ? "#10b981"
                                : feedbackState === "incorrect"
                                ? "#ef4444"
                                : selectedOptionId === option.id
                                ? theme.primary
                                : undefined,
                            backgroundColor:
                              feedbackState === "correct"
                                ? "#10b981"
                                : feedbackState === "incorrect"
                                ? "#ef4444"
                                : selectedOptionId === option.id
                                ? theme.primary
                                : undefined,
                          }}
                        >
                          {instantFeedback && answerResult ? (
                            feedbackState === "correct" ? (
                              <span className="text-white text-xs font-bold">
                                ✓
                              </span>
                            ) : feedbackState === "incorrect" ? (
                              <span className="text-white text-xs font-bold">
                                ✗
                              </span>
                            ) : null
                          ) : selectedOptionId === option.id ? (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          ) : null}
                        </div>
                        <span
                          className={`text-lg font-medium transition-colors ${
                            feedbackState === "correct"
                              ? "text-green-700 dark:text-green-300"
                              : feedbackState === "incorrect"
                              ? "text-red-700 dark:text-red-300"
                              : "quiz-text-primary"
                          }`}
                        >
                          {option.text}
                        </span>
                        {feedbackState === "correct" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-green-600 text-xl font-bold"
                          >
                            ✓
                          </motion.div>
                        )}
                        {feedbackState === "incorrect" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-red-600 text-xl font-bold"
                          >
                            ✗
                          </motion.div>
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="flex justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => onSubmit(selectedOptionId)}
                disabled={
                  selectedOptionId === null ||
                  isSubmitting ||
                  (instantFeedback && !!answerResult)
                }
                size="lg"
                className="quiz-button-primary px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ backgroundColor: theme.primary }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : instantFeedback && answerResult ? (
                  "Answer Submitted"
                ) : (
                  "Submit Answer"
                )}
              </Button>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <motion.div
      // This key is VITAL. It tells React to re-render this component from scratch
      // whenever the question ID changes, which correctly resets all state, including the timer.
      key={question.quizQuestionId}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Question card with enhanced styling */}
      <div className="quiz-card-elevated p-8 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: theme.gradients.subtle }}
        />

        {/* Timer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <QuizTimer
            initialTime={question.timeRemainingInSeconds}
            onTimeUp={handleTimeUp}
            theme={theme}
          />
        </div>

        {/* Question text */}
        <motion.h2
          className="mt-6 text-2xl md:text-3xl font-bold quiz-text-primary leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {question.questionText}
        </motion.h2>
      </div>

      {/* Question content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {renderQuestionContent()}
      </motion.div>
    </motion.div>
  );
}
