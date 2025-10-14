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
import TextType from "@/common/Effect-Related/TextType";

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
  const [typingComplete, setTypingComplete] = useState(false);

  useEffect(() => {
    // Reset typing for new question
    setTypingComplete(false);

    // Grace period: Force show everything after 3 seconds
    const gracePeriodTimer = setTimeout(() => {
      setTypingComplete(true);
    }, 3000);

    return () => clearTimeout(gracePeriodTimer);
  }, [question.quizQuestionId]);

  const handleTypingComplete = () => {
    setTypingComplete(true);
  };

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
      className="space-y-6">
      {/* Timer - shown after typing completes */}
      {typingComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center">
          <QuizTimer
            initialTime={question.timeRemainingInSeconds}
            onTimeUp={handleTimeUp}
            theme={theme}
          />
        </motion.div>
      )}

      {/* Question Card - always visible */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative">
        <div className="quiz-card-elevated p-8 text-center relative overflow-hidden rounded-xl border-2 border-dashed border-primary bg-primary/10">
          {/* Subtle background decoration */}
          <div
            className="absolute inset-0 opacity-3"
            style={{ background: theme.gradients.subtle }}
          />

          {/* Question text with typing effect */}
          <h2 className="text-2xl md:text-3xl font-bold quiz-text-primary leading-relaxed relative z-10">
            <TextType
              text={[question.questionText]}
              typingSpeed={30}
              pauseDuration={500}
              showCursor={true}
              cursorCharacter="|"
              onSentenceComplete={handleTypingComplete}
            />
          </h2>
        </div>

        {/* Instant Feedback Display */}
        {instantFeedback && answerResult && typingComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4">
            <FeedbackDisplay result={answerResult} theme={theme} />
          </motion.div>
        )}
      </motion.div>

      {/* Question Content - shown after typing completes */}
      {typingComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10">
          {renderQuestionContent()}
        </motion.div>
      )}
    </motion.div>
  );
}
