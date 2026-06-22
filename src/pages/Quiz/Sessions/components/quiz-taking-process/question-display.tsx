import { motion, AnimatePresence } from "framer-motion";
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
import { QuestionMedia } from "@/common/QuestionMedia";
import { useState, useRef, useCallback } from "react";
import { useNotifications } from "@/common/Notifications";
import { Clock } from "lucide-react";

interface QuestionDisplayProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string, isTimedOut?: boolean) => void;
  isSubmitting: boolean;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
}

export function QuestionDisplay({
  question,
  onSubmit,
  isSubmitting,
  instantFeedback = false,
  answerResult = null,
}: QuestionDisplayProps) {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Reset state when question changes
  const questionIdRef = useRef(question.quizQuestionId);
  if (questionIdRef.current !== question.quizQuestionId) {
    questionIdRef.current = question.quizQuestionId;
    hasSubmittedRef.current = false;
    setIsTimedOut(false);
  }

  // Called by children whenever the user changes their selection (kept for potential future use)
  const handleSelectionChange = useCallback(
    (_optionId: number | null, _textAnswer?: string) => {
      // No-op — we no longer auto-submit on timeout
    },
    []
  );

  // Wraps the real onSubmit to mark as submitted (prevents double-submit)
  const handleSubmit = useCallback(
    (selectedOptionId: number | null, submittedAnswer?: string) => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;
      onSubmit(selectedOptionId, submittedAnswer);
    },
    [onSubmit]
  );

  const handleTimeUp = useCallback(() => {
    // If user already submitted (e.g. at the last second), skip entirely —
    // no banner, no notification, no duplicate submission
    if (hasSubmittedRef.current) return;

    setIsTimedOut(true);
    hasSubmittedRef.current = true;
    onSubmit(null, undefined, true);

    // Show a notification tip
    useNotifications.getState().addNotification({
      type: "warning",
      variant: "top-center",
      title: "Time's Up!",
      message:
        "You didn't submit your answer in time. Tip: Double-click an answer to submit it instantly, or use the Submit button.",
    });
  }, [onSubmit]);

  const renderQuestionContent = () => {
    const commonProps = {
      question,
      onSubmit: handleSubmit,
      isSubmitting,
      instantFeedback,
      // When timed out, don't pass answerResult to children —
      // this prevents them from showing red/green feedback on the selected option
      answerResult: isTimedOut ? null : answerResult,
      isTimedOut,
      onSelectionChange: handleSelectionChange,
    };

    switch (question.questionType) {
      case QuestionType.TrueFalse:
        return <TrueOrFalseQuestion {...commonProps} />;

      case QuestionType.TypeTheAnswer: {
        const { question: _q, ...typeProps } = commonProps;
        return <TypeTheAnswerQuestion {...typeProps} />;
      }

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
      className="space-y-4 sm:space-y-6">
      {/* Timer — freezes once the answer is submitted or timed out */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center">
        <QuizTimer
          initialTime={question.timeRemainingInSeconds}
          totalTime={question.timeLimitInSeconds}
          onTimeUp={handleTimeUp}
          isPaused={!!answerResult || isTimedOut}
          size="md"
        />
      </motion.div>

      {/* Question Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative">
        <div className="quiz-card-elevated p-4 sm:p-6 md:p-8 text-center relative overflow-hidden rounded-xl border-2 border-dashed border-primary bg-primary/20">
          <div className="absolute inset-0 opacity-3" />
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-relaxed relative z-10 tracking-wider">
            {question.questionText}
          </h2>
        </div>

        {/* Optional question media (image/audio/video) */}
        <QuestionMedia
          mediaUrl={question.mediaUrl}
          mediaType={question.mediaType}
          alt="Question image"
          className="mt-4"
        />

        {/* Time's Up Banner — shown instead of feedback when timed out */}
        <AnimatePresence>
          {isTimedOut && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-yellow-700 dark:text-yellow-300">
                  Time's Up!
                </p>
                <p className="text-xs sm:text-sm text-yellow-600/80 dark:text-yellow-400/80">
                  You didn't submit your answer in time.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instant Feedback Display — only shown when NOT timed out */}
        {instantFeedback && answerResult && !isTimedOut && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4">
            <FeedbackDisplay result={answerResult} />
          </motion.div>
        )}
      </motion.div>

      {/* Question Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10">
        {renderQuestionContent()}
      </motion.div>
    </motion.div>
  );
}
