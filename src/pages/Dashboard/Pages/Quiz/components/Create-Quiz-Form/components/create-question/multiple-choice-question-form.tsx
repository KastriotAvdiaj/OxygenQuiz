import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
// import { LiftedButton } from "@/common/LiftedButton";
import { NewMultipleChoiceQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
// import ImageUpload from "@/utils/Image-Upload";

interface AnswerOption {
  text: string;
  isCorrect: boolean;
}

interface MultipleChoiceFormCardProps {
  question: NewMultipleChoiceQuestion;
}

export const MultipleChoiceFormCard: React.FC<MultipleChoiceFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const { updateQuestion } = useQuiz();

  const allowMultipleSelections = question.allowMultipleSelections;
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>(
    question.answerOptions
  );

  // Create a memoized version of the current question state
  const currentQuestionState = useMemo(
    () => ({
      text: questionText,
      allowMultipleSelections,
      answerOptions,
    }),
    [questionText, allowMultipleSelections, answerOptions]
  );

  // Debounce the question state to avoid rapid updates
  const debouncedQuestionState = useDebounce(currentQuestionState, 300);

  // Only update when the debounced state changes
  useEffect(() => {
    const updatedQuestion = {
      ...question,
      text: debouncedQuestionState.text,
      allowMultipleSelections: debouncedQuestionState.allowMultipleSelections,
      answerOptions: debouncedQuestionState.answerOptions,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id]);

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

  return (
    <Card className={`bg-background border-2 border-primary/30 `}>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <Input
            id="question-text"
            variant="fullColor"
            placeholder="Enter your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div className=" grid grid-cols-2 gap-4 border-t pt-4">
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
                    className={`h-20
                      ${
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
        </div>
      </CardContent>
    </Card>
  );
};
