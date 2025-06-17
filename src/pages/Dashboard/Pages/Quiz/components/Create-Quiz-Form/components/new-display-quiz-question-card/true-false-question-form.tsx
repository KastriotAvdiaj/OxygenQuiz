import { useEffect, useMemo, useState } from "react";
import { NewTrueFalseQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Label } from "@/components/ui/form";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/ApiTypes";
import { Check } from "lucide-react";

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
      questionType={QuestionType.TrueFalse}
    >
      <div className="space-y-4 pt-4">
        <div className="flex justify-center">
          <Label className="text-sm font-medium text-muted-foreground mb-3">
            Select the correct answer:
          </Label>
        </div>
        <div className="flex items-center justify-center rounded-sm">
          {/* TRUE OPTION */}
          <div className="flex flex-col items-center w-full bg-primary/80 dark:bg-primary/80 rounded-md p-2">
            <button
              id="true-option"
              type="button"
              onClick={() => setCorrectAnswer(true)}
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                correctAnswer === true
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              {correctAnswer === true && <Check className="h-4 w-4" />}
            </button>
            <label htmlFor="true-option" className="text-md font-medium mt-2">
              True
            </label>
          </div>

          {/* FALSE OPTION */}
          <div className="flex flex-col items-center w-full bg-red-500/80 dark:bg-red-500/80 rounded-sm p-2">
            <button
              id="false-option"
              type="button"
              onClick={() => setCorrectAnswer(false)}
              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                correctAnswer === false
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              {correctAnswer === false && <Check className="h-4 w-4" />}
            </button>
            <label htmlFor="false-option" className="text-md font-medium mt-2">
              False
            </label>
          </div>
        </div>
      </div>
    </BaseQuestionFormCard>
  );
};
