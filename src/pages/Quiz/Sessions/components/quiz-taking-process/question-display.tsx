import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { QuizTimer } from "./quiz-timer";
import { QuestionType } from "@/types/question-types";
import {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../../quiz-session-types";
import { TrueOrFalseQuestion } from "./question-display-type-files/true-or-false-question";
import { TypeTheAnswerQuestion } from "./question-display-type-files/type-the-answer-question";
import { MultipleChoiceQuestion } from "./question-display-type-files/multiple-choice-question";
import { FeedbackDisplay } from "./feedback-display";

interface QuestionDisplayProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
}

export function QuestionDisplay({
  question,
  onSubmit,
  isSubmitting,
  theme,
  instantFeedback = false,
  answerResult = null,
}: QuestionDisplayProps) {
  const [revealComplete, setRevealComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [question.quizQuestionId]);

  const handleTimeUp = () => {
    onSubmit(null);
  };

  const renderQuestionContent = () => {
    const commonProps = {
      question,
      onSubmit,
      isSubmitting,
      theme,
      instantFeedback,
      answerResult,
    };

    switch (question.questionType) {
      case QuestionType.TrueFalse:
        return <TrueOrFalseQuestion {...commonProps} />;

      case QuestionType.TypeTheAnswer:
        return <TypeTheAnswerQuestion {...commonProps} />;

      default:
        return <MultipleChoiceQuestion {...commonProps} />;
    }
  };

  return (
    <motion.div
      key={question.quizQuestionId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Blur overlay for reveal phase */}
      {!revealComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 backdrop-blur-md pointer-events-none z-40"
        />
      )}

      {/* Full screen centered question reveal */}
      {!revealComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1.8, duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <motion.h2
            initial={{ scale: 1.5, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2, duration: 0.4, ease: "easeInOut" }}
            onAnimationComplete={() => setRevealComplete(true)}
            className="text-4xl md:text-5xl lg:text-6xl font-bold quiz-text-primary text-center px-8 max-w-4xl leading-relaxed"
          >
            {question.questionText}
          </motion.h2>
        </motion.div>
      )}

      {/* Timer - shown after reveal */}
      {revealComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center"
        >
          <QuizTimer
            initialTime={question.timeRemainingInSeconds}
            onTimeUp={handleTimeUp}
            theme={theme}
          />
        </motion.div>
      )}

      {/* Question Card - shown after reveal */}
      {revealComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <div className="quiz-card-elevated p-8 text-center relative overflow-hidden rounded-xl border-2 border-dashed border-primary bg-primary/10">
            {/* Subtle background decoration */}
            <div
              className="absolute inset-0 opacity-3"
              style={{ background: theme.gradients.subtle }}
            />

            {/* Question text */}
            <h2 className="text-2xl md:text-3xl font-bold quiz-text-primary leading-relaxed relative z-10">
              {question.questionText}
            </h2>
          </div>

          {/* Instant Feedback Display */}
          {instantFeedback && answerResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <FeedbackDisplay result={answerResult} theme={theme} />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Question Content - shown after reveal */}
      {revealComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {renderQuestionContent()}
        </motion.div>
      )}
    </motion.div>
  );
}