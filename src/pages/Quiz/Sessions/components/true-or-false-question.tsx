import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { CurrentQuestion, InstantFeedbackAnswerResult } from "../quiz-session-types";

interface TrueOrFalseQuestionProps {
  question: CurrentQuestion;
  onSubmit: (selectedOptionId: number | null, submittedAnswer?: string) => void;
  isSubmitting: boolean;
  theme: ReturnType<typeof import("@/hooks/use-quiz-theme").useQuizTheme>;
  instantFeedback?: boolean;
  answerResult?: InstantFeedbackAnswerResult | null;
}

export function TrueOrFalseQuestion({
  question,
  onSubmit,
  isSubmitting,
  theme,
  instantFeedback = false,
  answerResult = null,
}: TrueOrFalseQuestionProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  // Find the True and False options from the question options
  const trueOption = question.options.find(opt => opt.id === 1);
  const falseOption = question.options.find(opt => opt.id === 0);

  const getFeedbackState = (optionId: number) => {
    if (!instantFeedback || !answerResult) return "default";

    if (optionId === answerResult.correctOptionId) {
      return "correct";
    } else if (selectedOptionId === optionId && answerResult.status !== "Correct") {
      return "incorrect";
    }
    return "default";
  };

  const isDisabled = instantFeedback && !!answerResult;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* True Option */}
        {trueOption && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: isDisabled ? 1 : 1.03 }}
            whileTap={{ scale: isDisabled ? 1 : 0.97 }}
          >
            <button
              onClick={() => !isDisabled && setSelectedOptionId(trueOption.id)}
              disabled={isDisabled}
              className={`
                w-full h-24 rounded-xl border-3 transition-all duration-300
                flex items-center justify-center gap-3 text-xl font-semibold
                ${getFeedbackState(trueOption.id) === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : ''}
                ${getFeedbackState(trueOption.id) === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : ''}
                ${getFeedbackState(trueOption.id) === 'default' && selectedOptionId === trueOption.id ? 'shadow-lg transform scale-105' : ''}
                ${getFeedbackState(trueOption.id) === 'default' && selectedOptionId !== trueOption.id ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : ''}
              `}
              style={{
                borderColor: getFeedbackState(trueOption.id) === 'correct' ? '#10b981'
                  : getFeedbackState(trueOption.id) === 'incorrect' ? '#ef4444'
                  : selectedOptionId === trueOption.id ? theme.primary
                  : undefined,
                backgroundColor: getFeedbackState(trueOption.id) === 'correct' ? '#10b98115'
                  : getFeedbackState(trueOption.id) === 'incorrect' ? '#ef444415'
                  : selectedOptionId === trueOption.id ? `${theme.primary}15`
                  : undefined,
                borderWidth: '3px',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: getFeedbackState(trueOption.id) === 'correct' ? '#10b981'
                      : selectedOptionId === trueOption.id ? theme.primary
                      : '#22c55e',
                  }}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <span>True</span>
                {instantFeedback && answerResult && getFeedbackState(trueOption.id) !== 'default' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`text-xl font-bold ${
                      getFeedbackState(trueOption.id) === 'correct' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {getFeedbackState(trueOption.id) === 'correct' ? '✓' : '✗'}
                  </motion.div>
                )}
              </div>
            </button>
          </motion.div>
        )}

        {/* False Option */}
        {falseOption && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: isDisabled ? 1 : 1.03 }}
            whileTap={{ scale: isDisabled ? 1 : 0.97 }}
          >
            <button
              onClick={() => !isDisabled && setSelectedOptionId(falseOption.id)}
              disabled={isDisabled}
              className={`
                w-full h-24 rounded-xl border-3 transition-all duration-300
                flex items-center justify-center gap-3 text-xl font-semibold
                ${getFeedbackState(falseOption.id) === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : ''}
                ${getFeedbackState(falseOption.id) === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : ''}
                ${getFeedbackState(falseOption.id) === 'default' && selectedOptionId === falseOption.id ? 'shadow-lg transform scale-105' : ''}
                ${getFeedbackState(falseOption.id) === 'default' && selectedOptionId !== falseOption.id ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100' : ''}
              `}
              style={{
                borderColor: getFeedbackState(falseOption.id) === 'correct' ? '#10b981'
                  : getFeedbackState(falseOption.id) === 'incorrect' ? '#ef4444'
                  : selectedOptionId === falseOption.id ? theme.primary
                  : undefined,
                backgroundColor: getFeedbackState(falseOption.id) === 'correct' ? '#10b98115'
                  : getFeedbackState(falseOption.id) === 'incorrect' ? '#ef444415'
                  : selectedOptionId === falseOption.id ? `${theme.primary}15`
                  : undefined,
                borderWidth: '3px',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: getFeedbackState(falseOption.id) === 'correct' ? '#10b981'
                      : selectedOptionId === falseOption.id ? theme.primary
                      : '#ef4444',
                  }}
                >
                  <X className="w-5 h-5 text-white" />
                </div>
                <span>False</span>
                {instantFeedback && answerResult && getFeedbackState(falseOption.id) !== 'default' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`text-xl font-bold ${
                      getFeedbackState(falseOption.id) === 'correct' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {getFeedbackState(falseOption.id) === 'correct' ? '✓' : '✗'}
                  </motion.div>
                )}
              </div>
            </button>
          </motion.div>
        )}
      </div>

      <motion.div
        className="flex justify-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={() => onSubmit(selectedOptionId)}
          disabled={selectedOptionId === null || isSubmitting || isDisabled}
          size="lg"
          className="px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 min-w-[200px]"
          style={{ backgroundColor: theme.primary }}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </div>
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