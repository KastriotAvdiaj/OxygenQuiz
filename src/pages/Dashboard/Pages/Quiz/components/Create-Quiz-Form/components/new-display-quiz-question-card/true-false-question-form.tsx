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

  const generalErrors = getGeneralErrors(["text", "imageUrl", "correctAnswer"]);

  return (
    <div className="relative">
      <BaseQuestionFormCard
        questionText={questionText}
        onQuestionTextChange={setQuestionText}
        borderColor={errorAwareStyles.borderColor}
        backgroundColor={errorAwareStyles.backgroundColor}
        questionType={QuestionType.TrueFalse}
        imageUrl={imageUrl}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        showImageUpload={true}
        questionTextError={getFieldError("text")}
      >
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <Label className="text-sm font-medium text-muted-foreground">
              Select the correct answer
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {/* TRUE OPTION */}
            <button
              type="button"
              onClick={() => setCorrectAnswer(true)}
              className={`group relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                correctAnswer === true
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-200 dark:border-gray-800 bg-transparent hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="flex-shrink-0 mr-4">
                {correctAnswer === true ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                ) : (
                  <Check className="h-6 w-6 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                )}
              </div>
              <div>
                <div
                  className={`font-semibold text-lg ${
                    correctAnswer === true
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-foreground"
                  }`}
                >
                  True
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Statement is correct
                </div>
              </div>
              
              {/* Active Indicator Dot */}
              {correctAnswer === true && (
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {/* FALSE OPTION */}
            <button
              type="button"
              onClick={() => setCorrectAnswer(false)}
              className={`group relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                correctAnswer === false
                  ? "border-red-500 bg-red-500/10"
                  : "border-gray-200 dark:border-gray-800 bg-transparent hover:border-red-200 dark:hover:border-red-900 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="flex-shrink-0 mr-4">
                {correctAnswer === false ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <X className="h-6 w-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                )}
              </div>
              <div>
                <div
                  className={`font-semibold text-lg ${
                    correctAnswer === false
                      ? "text-red-700 dark:text-red-400"
                      : "text-foreground"
                  }`}
                >
                  False
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Statement is incorrect
                </div>
              </div>

              {/* Active Indicator Dot */}
              {correctAnswer === false && (
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>

          {/* Minimal Visual feedback section */}
          <div className="flex justify-center mt-2">
            <div
              className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                correctAnswer === true
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : correctAnswer === false
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {correctAnswer === true && <CheckCircle className="h-3.5 w-3.5" />}
              {correctAnswer === false && <XCircle className="h-3.5 w-3.5" />}
              <span>
                {correctAnswer === true
                  ? "Correct answer: True"
                  : correctAnswer === false
                  ? "Correct answer: False"
                  : "Pending selection"}
              </span>
            </div>
          </div>

          <ValidationErrorsDisplay errors={generalErrors} />
        </div>
      </BaseQuestionFormCard>
    </div>
  );
};