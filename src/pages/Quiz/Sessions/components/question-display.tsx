import { motion } from "framer-motion";
import { QuizTimer } from "./quiz-timer";
import { QuestionType } from "@/types/question-types";
import {
  CurrentQuestion,
  InstantFeedbackAnswerResult,
} from "../quiz-session-types";
import { TrueOrFalseQuestion } from "./true-or-false-question";
import { TypeTheAnswerQuestion } from "./type-the-answer-question";
import { MultipleChoiceQuestion } from "./multiple-choice-question";
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

    // Maybe rename these components so that it doesn't interfere with the original question type components.
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Question Card */}
      <div className="relative">
        <motion.div
          className="quiz-card-elevated p-8 text-center relative overflow-hidden rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}05, ${theme.secondary}05)`,
          }}
        >
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
            className="mt-8 text-2xl md:text-3xl font-bold quiz-text-primary leading-relaxed relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {question.questionText}
          </motion.h2>
        </motion.div>

        {/* Instant Feedback Display */}
        {instantFeedback && answerResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <FeedbackDisplay result={answerResult} theme={theme} />
          </motion.div>
        )}
      </div>

      {/* Question Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10"
      >
        {renderQuestionContent()}
      </motion.div>
    </motion.div>
  );
}
