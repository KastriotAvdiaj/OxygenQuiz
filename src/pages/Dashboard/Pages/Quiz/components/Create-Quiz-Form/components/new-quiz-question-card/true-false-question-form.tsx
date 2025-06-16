import { useEffect, useMemo, useState } from "react";
import { NewTrueFalseQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./base-new-quiz-question-card";
import { Label } from "@/components/ui/form";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";

interface TrueFalseFormCardProps {
  question: NewTrueFalseQuestion;
}

export const TrueFalseFormCard: React.FC<TrueFalseFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const { updateQuestion } = useQuiz();

  const currentQuestionState = useMemo(
    () => ({
      text: questionText,
      correctAnswer,
    }),
    [questionText, correctAnswer]
  );

  const debouncedQuestionState = useDebounce(currentQuestionState, 300);

  useEffect(() => {
    const updatedQuestion = {
      ...question,
      text: debouncedQuestionState.text,
      correctAnswer: debouncedQuestionState.correctAnswer,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id]);

  const styles = getQuestionTypeStyles(question.type);

  return (
    <BaseQuestionFormCard
      questionText={questionText}
      onQuestionTextChange={setQuestionText}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
    >
      <div className="space-y-4 pt-4">
        <div className="flex justify-center">
          <Label className="text-sm font-medium text-muted-foreground mb-3">
            Select the correct answer:
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
              correctAnswer === true
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-border bg-background hover:border-primary/50"
            }`}
            onClick={() => setCorrectAnswer(true)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  correctAnswer === true
                    ? "border-green-500 bg-green-500"
                    : "border-muted-foreground"
                }`}
              >
                {correctAnswer === true && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
              <span className="text-lg font-medium">True</span>
            </div>
          </div>
          <div
            className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
              correctAnswer === false
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-border bg-background hover:border-primary/50"
            }`}
            onClick={() => setCorrectAnswer(false)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  correctAnswer === false
                    ? "border-green-500 bg-green-500"
                    : "border-muted-foreground"
                }`}
              >
                {correctAnswer === false && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
              <span className="text-lg font-medium">False</span>
            </div>
          </div>
        </div>
      </div>
    </BaseQuestionFormCard>
  );
};
