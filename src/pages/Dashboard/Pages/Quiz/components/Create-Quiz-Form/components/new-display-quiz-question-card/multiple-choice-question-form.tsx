// Enhanced MultipleChoiceFormCard with validation error display
import { useEffect, useMemo, useState } from "react";
import { useQuiz } from "../../Quiz-questions-context";
import { NewAnswerOption, NewMultipleChoiceQuestion } from "../../types";
import { useDebounce } from "@/hooks/use-debounce";
import { Input, Label } from "@/components/ui/form";
import { Button, Switch } from "@/components/ui";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";

interface ValidationErrorDisplayProps {
  questionId: number;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  questionId,
}) => {
  const { getQuestionErrors, hasValidationBeenTriggered, questionErrors } =
    useQuiz();
  const [errors, setErrors] = useState<any[]>([]);

  // Update errors whenever validation state changes
  useEffect(() => {
    const currentErrors = getQuestionErrors(questionId);
    setErrors(currentErrors);
  }, [
    questionId,
    getQuestionErrors,
    hasValidationBeenTriggered,
    questionErrors,
  ]);

  if (!hasValidationBeenTriggered || errors.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Validation Errors:
          </h4>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-red-500">•</span>
                <span>
                  <strong>{error.field}:</strong> {error.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

interface MultipleChoiceFormCardProps {
  question: NewMultipleChoiceQuestion;
}

export const MultipleChoiceFormCard: React.FC<MultipleChoiceFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [imageUrl, setImageUrl] = useState(question.imageUrl || undefined);
  const {
    updateQuestion,
    getQuestionErrors,
    hasValidationBeenTriggered,
    questionErrors,
  } = useQuiz();

  const styles = getQuestionTypeStyles(question.type);

  // Use useMemo to ensure hasErrors updates when validation state changes
  const hasErrors = useMemo(() => {
    if (!hasValidationBeenTriggered) return false;
    return getQuestionErrors(question.id).length > 0;
  }, [
    question.id,
    hasValidationBeenTriggered,
    questionErrors,
    getQuestionErrors,
  ]);

  const allowMultipleSelections = question.allowMultipleSelections;
  const [answerOptions, setAnswerOptions] = useState<NewAnswerOption[]>(
    question.answerOptions
  );

  const currentQuestionState = useMemo(
    () => ({
      text: questionText,
      imageUrl,
      allowMultipleSelections,
      answerOptions,
    }),
    [questionText, imageUrl, allowMultipleSelections, answerOptions]
  );

  const debouncedQuestionState = useDebounce(currentQuestionState, 300);

  useEffect(() => {
    const updatedQuestion = {
      ...question,
      text: debouncedQuestionState.text,
      imageUrl: debouncedQuestionState.imageUrl,
      allowMultipleSelections: debouncedQuestionState.allowMultipleSelections,
      answerOptions: debouncedQuestionState.answerOptions,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id, updateQuestion]);

  const handleAddOption = () => {
    if (answerOptions.length < 4) {
      setAnswerOptions([...answerOptions, { text: "", isCorrect: false }]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (answerOptions.length > 2) {
      setAnswerOptions(answerOptions.filter((_, i) => i !== index));
    }
  };

  const handleAnswerTextChange = (index: number, text: string) => {
    setAnswerOptions(
      answerOptions.map((option, i) =>
        i === index ? { ...option, text } : option
      )
    );
  };

  const handleCorrectToggle = (index: number) => {
    setAnswerOptions(
      answerOptions.map((option, i) => {
        if (i === index) {
          return { ...option, isCorrect: !option.isCorrect };
        }
        if (!allowMultipleSelections && option.isCorrect) {
          return { ...option, isCorrect: false };
        }
        return option;
      })
    );
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl(undefined);
  };

  return (
    <div className="relative">
      <BaseQuestionFormCard
        questionText={questionText}
        borderColor={hasErrors ? "border-red-500" : styles.borderColor}
        backgroundColor={
          hasErrors ? "bg-red-50/50 dark:bg-red-950/10" : styles.backgroundColor
        }
        questionType={question.type}
        onQuestionTextChange={setQuestionText}
        imageUrl={imageUrl}
        onImageUpload={handleImageUpload}
        onImageRemove={handleImageRemove}
        showImageUpload={true}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pt-4">
            {answerOptions.map((option, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  option.isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex-1">
                  <Input
                    placeholder={`Answer option ${index + 1}...`}
                    variant={option.isCorrect ? "isCorrect" : "quiz"}
                    value={option.text}
                    onChange={(e) =>
                      handleAnswerTextChange(index, e.target.value)
                    }
                    className={`h-20 ${
                      option.isCorrect
                        ? "border-green-300 focus:border-green-500"
                        : ""
                    }`}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Switch
                    checked={option.isCorrect}
                    onCheckedChange={() => handleCorrectToggle(index)}
                    className="shadow-sm"
                  />
                  <Label className="text-xs text-muted-foreground">
                    {allowMultipleSelections ? "Correct" : "Answer"}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveOption(index)}
                  disabled={answerOptions.length <= 2}
                  className="h-9 w-9 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <section className="w-full flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddOption}
              disabled={answerOptions.length >= 4}
              className="w-fit border-dashed bg-primary/80 hover:bg-primary/95 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Answer Option ({answerOptions.length}/4)
            </Button>
          </section>

          {/* Validation Error Display - Now properly reactive */}
          <ValidationErrorDisplay questionId={question.id} />
        </div>
      </BaseQuestionFormCard>
    </div>
  );
};
