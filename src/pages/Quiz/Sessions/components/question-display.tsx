// src/components/quiz/QuestionDisplay.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QuizTimer } from "./quiz-timer";
import { TrueOrFalseQuestion } from "./true-or-false-question";
import { TypeTheAnswerQuestion } from "./type-the-answer-question";
import {
  type CurrentQuestion,
  type AnswerResult,
  AnswerStatus,
} from "../quiz-session-types";
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
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOptionId(null);
    setShowAnswerFeedback(false);
  }, [question.quizQuestionId]);

  // Show answer feedback when result comes back
  useEffect(() => {
    if (answerResult && instantFeedback) {
      setShowAnswerFeedback(true);
    }
  }, [answerResult, instantFeedback]);

  const handleTimeUp = () => {
    // When time is up, we submit a null answer.
    // The backend will know this is a timeout.
    onSubmit(null);
  };

  const handleOptionSelect = (optionId: number) => {
    if (!showAnswerFeedback) {
      setSelectedOptionId(optionId);
    }
  };

  const handleSubmit = () => {
    onSubmit(selectedOptionId);
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
              <AnimatePresence>
                {question.options.map((option, index) => {
                  // Determine feedback state for instant feedback
                  let feedbackState = "default";
                  let isCorrect = false;
                  let isUserSelection = false;

                  if (showAnswerFeedback && answerResult) {
                    isCorrect = option.id === answerResult.correctAnswerId;
                    isUserSelection = selectedOptionId === option.id;

                    if (isCorrect) {
                      feedbackState = "correct";
                    } else if (
                      isUserSelection &&
                      answerResult.status !== AnswerStatus.Correct
                    ) {
                      feedbackState = "incorrect";
                    }
                  }

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        scale: showAnswerFeedback ? 1 : 1.02,
                      }}
                      whileTap={{
                        scale: showAnswerFeedback ? 1 : 0.98,
                      }}
                    >
                      <motion.button
                        onClick={() => handleOptionSelect(option.id)}
                        disabled={showAnswerFeedback || isSubmitting}
                        className={`quiz-answer-option w-full text-left transition-all duration-300 relative overflow-hidden ${
                          selectedOptionId === option.id ? "selected" : ""
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
                        animate={
                          feedbackState === "correct"
                            ? {
                                backgroundColor: [
                                  "#10b98115",
                                  "#10b98125",
                                  "#10b98115",
                                ],
                              }
                            : feedbackState === "incorrect"
                            ? {
                                backgroundColor: [
                                  "#ef444415",
                                  "#ef444425",
                                  "#ef444415",
                                ],
                              }
                            : {}
                        }
                        transition={{
                          duration: 1,
                          repeat: showAnswerFeedback ? Infinity : 0,
                          repeatType: "reverse",
                        }}
                      >
                        {/* Background pulse effect for correct answer */}
                        {feedbackState === "correct" && (
                          <motion.div
                            className="absolute inset-0 bg-green-500 opacity-10"
                            animate={{
                              opacity: [0.1, 0.2, 0.1],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                          />
                        )}

                        <div className="flex items-center space-x-3 relative z-10">
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
                            {showAnswerFeedback ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white text-xs font-bold"
                              >
                                {feedbackState === "correct"
                                  ? "✓"
                                  : feedbackState === "incorrect"
                                  ? "✗"
                                  : null}
                              </motion.span>
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

                          {/* Success/error icons with animation */}
                          <AnimatePresence>
                            {feedbackState === "correct" && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={{
                                  type: "spring",
                                  damping: 15,
                                  stiffness: 300,
                                  delay: 0.1,
                                }}
                                className="ml-auto text-green-600 text-xl font-bold"
                              >
                                ✓
                              </motion.div>
                            )}
                            {feedbackState === "incorrect" && (
                              <motion.div
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={{
                                  type: "spring",
                                  damping: 15,
                                  stiffness: 300,
                                  delay: 0.1,
                                }}
                                className="ml-auto text-red-600 text-xl font-bold"
                              >
                                ✗
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Submit button - only show if not in feedback mode */}
            <AnimatePresence>
              {!showAnswerFeedback && (
                <motion.div
                  className="flex justify-center pt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedOptionId === null || isSubmitting}
                    size="lg"
                    className="quiz-button-primary px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        Submitting...
                      </>
                    ) : (
                      "Submit Answer"
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
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
