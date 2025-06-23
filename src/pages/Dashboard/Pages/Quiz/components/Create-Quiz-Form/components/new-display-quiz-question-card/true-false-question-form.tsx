import type React from "react";

import { useEffect, useMemo, useState } from "react";
import type { NewTrueFalseQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Label } from "@/components/ui/form";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/ApiTypes";
import { Check, X, CheckCircle, XCircle } from "lucide-react";

interface TrueFalseFormCardProps {
  question: NewTrueFalseQuestion;
}

export const TrueFalseFormCard: React.FC<TrueFalseFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [imageUrl, setImageUrl] = useState(question.imageUrl || undefined);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const { updateQuestion } = useQuiz();

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
  }, [debouncedQuestionState, question.id]);

  const styles = getQuestionTypeStyles(question.type);

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl(undefined);
  };

  return (
    <BaseQuestionFormCard
      questionText={questionText}
      onQuestionTextChange={setQuestionText}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
      questionType={QuestionType.TrueFalse}
      // Image upload props
      imageUrl={imageUrl}
      onImageUpload={handleImageUpload}
      onImageRemove={handleImageRemove}
      showImageUpload={true}
    >
      <div className="space-y-6 pt-4">
        <div className="text-center">
          <Label className="text-lg font-semibold text-foreground">
            Choose the correct answer
          </Label>
          {/* <p className="text-sm text-muted-foreground mt-1">Select whether the statement is true or false</p> */}
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {/* TRUE OPTION */}
          <button
            type="button"
            onClick={() => setCorrectAnswer(true)}
            className={`group relative overflow-hidden rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              correctAnswer === true
                ? "bg-purple-50 border-purple-500 shadow-purple-200 shadow-lg dark:bg-purple-950 dark:border-purple-400"
                : "bg-background border-border hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`relative transition-all duration-300 ${
                  correctAnswer === true ? "scale-110" : "group-hover:scale-105"
                }`}
              >
                {correctAnswer === true ? (
                  <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Check className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-60 group-hover:opacity-100" />
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-xl font-bold transition-colors ${
                    correctAnswer === true
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-purple-600 dark:text-purple-400"
                  }`}
                >
                  TRUE
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Statement is correct
                </div>
              </div>
            </div>

            {/* Selection indicator */}
            {correctAnswer === true && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </button>

          {/* FALSE OPTION */}
          <button
            type="button"
            onClick={() => setCorrectAnswer(false)}
            className={`group relative overflow-hidden rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              correctAnswer === false
                ? "bg-red-50 border-red-500 shadow-red-200 shadow-lg dark:bg-red-950 dark:border-red-400"
                : "bg-background border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/30"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`relative transition-all duration-300 ${
                  correctAnswer === false
                    ? "scale-110"
                    : "group-hover:scale-105"
                }`}
              >
                {correctAnswer === false ? (
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                ) : (
                  <X className="h-8 w-8 text-red-600 dark:text-red-400 opacity-60 group-hover:opacity-100" />
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-xl font-bold transition-colors ${
                    correctAnswer === false
                      ? "text-red-700 dark:text-red-300"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  FALSE
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Statement is incorrect
                </div>
              </div>
            </div>

            {/* Selection indicator */}
            {correctAnswer === false && (
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </button>
        </div>

        {/* Visual feedback section */}
        <div className="text-center">
          <div
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              correctAnswer === true
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : correctAnswer === false
                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                : "bg-muted text-muted-foreground"
            }`}
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
      </div>
    </BaseQuestionFormCard>
  );
};