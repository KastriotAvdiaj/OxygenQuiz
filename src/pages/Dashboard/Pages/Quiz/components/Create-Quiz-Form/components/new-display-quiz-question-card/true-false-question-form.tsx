import type React from "react";

import { useEffect, useMemo, useState } from "react";
import type { NewTrueFalseQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Label } from "@/components/ui/form";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/question-types";
import { Check, X, CheckCircle, XCircle } from "lucide-react";
import {
  getErrorAwareStyles,
  useFormValidation,
  ValidationErrorsDisplay,
} from "@/hooks/use-questionForm";

interface TrueFalseFormCardProps {
  question: NewTrueFalseQuestion;
}

export const TrueFalseFormCard: React.FC<TrueFalseFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [imageUrl, setImageUrl] = useState(question.imageUrl || undefined);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const { updateQuestion, getQuestionErrors, questionErrors } = useQuiz();

  // Use validation hook
  const { hasErrors, getFieldError, getGeneralErrors } = useFormValidation(
    question.id,
    questionErrors,
    getQuestionErrors
  );

  const currentQuestionState = useMemo(
    () => ({
      text: questionText,
      imageUrl,
      correctAnswer,
    }),
    [questionText, imageUrl, correctAnswer]
  );

  const debouncedQuestionState = useDebounce(currentQuestionState, 300);

  useEffect(() => {
    const updatedQuestion = {
      ...question,
      text: debouncedQuestionState.text,
      imageUrl: debouncedQuestionState.imageUrl,
      correctAnswer: debouncedQuestionState.correctAnswer,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id, updateQuestion]);

  const styles = getQuestionTypeStyles(question.type);
  const errorAwareStyles = getErrorAwareStyles(hasErrors, styles);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl(undefined);
  };

  // Get general validation errors that don't belong to specific fields
  const generalErrors = getGeneralErrors(["text", "imageUrl", "correctAnswer"]);

  return (
    <div className="relative">
      <BaseQuestionFormCard
        questionText={questionText}
        onQuestionTextChange={setQuestionText}
        borderColor={errorAwareStyles.borderColor}
        backgroundColor={errorAwareStyles.backgroundColor}
        questionType={QuestionType.TrueFalse}
        // Image upload props
        imageUrl={imageUrl}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        showImageUpload={true}
        questionTextError={getFieldError("text")}
      >
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <Label className="text-lg font-semibold text-foreground">
              Choose the correct answer
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
            {/* TRUE OPTION */}
            <button
              type="button"
              onClick={() => setCorrectAnswer(true)}
              className={`group relative overflow-hidden rounded-2xl p-8 border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                correctAnswer === true
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-emerald-600 shadow-2xl shadow-emerald-500/40 dark:from-emerald-500 dark:via-emerald-600 dark:to-emerald-700 dark:border-emerald-500"
                  : "bg-gradient-to-br from-gray-100 via-white to-gray-200 border-gray-300 shadow-lg hover:shadow-xl hover:from-emerald-50 hover:via-emerald-100 hover:to-emerald-200 hover:border-emerald-400 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border-gray-600 dark:hover:from-emerald-900/50 dark:hover:via-emerald-800/50 dark:hover:to-emerald-900/50"
              }`}
              style={{
                boxShadow:
                  correctAnswer === true
                    ? "0 8px 25px -5px rgba(16, 185, 129, 0.4), 0 10px 10px -5px rgba(16, 185, 129, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                    : "0 4px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* 3D Inner Shadow Effect */}
              <div
                className={`absolute inset-0 rounded-2xl ${
                  correctAnswer === true
                    ? "shadow-inner"
                    : "shadow-inner opacity-30"
                }`}
              />

              <div className="relative flex flex-col items-center space-y-4">
                <div
                  className={`relative transition-all duration-300 ${
                    correctAnswer === true
                      ? "scale-110"
                      : "group-hover:scale-105"
                  }`}
                >
                  {correctAnswer === true ? (
                    <CheckCircle className="h-10 w-10 text-white drop-shadow-lg" />
                  ) : (
                    <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold transition-colors drop-shadow-sm ${
                      correctAnswer === true
                        ? "text-white"
                        : "text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-300"
                    }`}
                  >
                    TRUE
                  </div>
                  <div
                    className={`text-sm mt-1 transition-colors ${
                      correctAnswer === true
                        ? "text-emerald-100"
                        : "text-muted-foreground"
                    }`}
                  >
                    Statement is correct
                  </div>
                </div>
              </div>

              {/* 3D Highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl" />

              {/* Selection indicator */}
              {correctAnswer === true && (
                <div className="absolute top-3 right-3">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse shadow-lg"></div>
                </div>
              )}
            </button>

            {/* FALSE OPTION */}
            <button
              type="button"
              onClick={() => setCorrectAnswer(false)}
              className={`group relative overflow-hidden rounded-2xl p-8 border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                correctAnswer === false
                  ? "bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-red-600 shadow-2xl shadow-red-500/40 dark:from-red-500 dark:via-red-600 dark:to-red-700 dark:border-red-500"
                  : "bg-gradient-to-br from-gray-100 via-white to-gray-200 border-gray-300 shadow-lg hover:shadow-xl hover:from-red-50 hover:via-red-100 hover:to-red-200 hover:border-red-400 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border-gray-600 dark:hover:from-red-900/50 dark:hover:via-red-800/50 dark:hover:to-red-900/50"
              }`}
              style={{
                boxShadow:
                  correctAnswer === false
                    ? "0 8px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(239, 68, 68, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                    : "0 4px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* 3D Inner Shadow Effect */}
              <div
                className={`absolute inset-0 rounded-2xl ${
                  correctAnswer === false
                    ? "shadow-inner"
                    : "shadow-inner opacity-30"
                }`}
              />

              <div className="relative flex flex-col items-center space-y-4">
                <div
                  className={`relative transition-all duration-300 ${
                    correctAnswer === false
                      ? "scale-110"
                      : "group-hover:scale-105"
                  }`}
                >
                  {correctAnswer === false ? (
                    <XCircle className="h-10 w-10 text-white drop-shadow-lg" />
                  ) : (
                    <X className="h-10 w-10 text-red-600 dark:text-red-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold transition-colors drop-shadow-sm ${
                      correctAnswer === false
                        ? "text-white"
                        : "text-red-700 dark:text-red-400 group-hover:text-red-800 dark:group-hover:text-red-300"
                    }`}
                  >
                    FALSE
                  </div>
                  <div
                    className={`text-sm mt-1 transition-colors ${
                      correctAnswer === false
                        ? "text-red-100"
                        : "text-muted-foreground"
                    }`}
                  >
                    Statement is incorrect
                  </div>
                </div>
              </div>

              {/* 3D Highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl" />

              {/* Selection indicator */}
              {correctAnswer === false && (
                <div className="absolute top-3 right-3">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse shadow-lg"></div>
                </div>
              )}
            </button>
          </div>

          {/* Visual feedback section */}
          <div className="text-center">
            <div
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 shadow-lg ${
                correctAnswer === true
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30"
                  : correctAnswer === false
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30"
                  : "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300"
              }`}
              style={{
                boxShadow:
                  correctAnswer !== undefined
                    ? "0 4px 15px -3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                    : "0 2px 8px -2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {correctAnswer === true && <CheckCircle className="h-4 w-4" />}
              {correctAnswer === false && <XCircle className="h-4 w-4" />}
              <span>
                {correctAnswer === true
                  ? "Correct answer: TRUE"
                  : correctAnswer === false
                  ? "Correct answer: FALSE"
                  : "Select the correct answer"}
              </span>
            </div>
          </div>

          {/* Display general validation errors that don't belong to specific fields */}
          <ValidationErrorsDisplay errors={generalErrors} />
        </div>
      </BaseQuestionFormCard>
    </div>
  );
};
