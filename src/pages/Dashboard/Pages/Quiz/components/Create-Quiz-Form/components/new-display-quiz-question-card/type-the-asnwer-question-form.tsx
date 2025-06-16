import { useEffect, useMemo, useState } from "react";
import { NewTypeTheAnswerQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Input, Label } from "@/components/ui/form";
import { Button, Switch } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";

interface TypeTheAnswerFormCardProps {
  question: NewTypeTheAnswerQuestion;
}

export const TypeTheAnswerFormCard: React.FC<TypeTheAnswerFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const [isCaseSensitive, setIsCaseSensitive] = useState(
    question.isCaseSensitive
  );
  const [allowPartialMatch, setAllowPartialMatch] = useState(
    question.allowPartialMatch
  );
  const [acceptableAnswers, setAcceptableAnswers] = useState<
    { value: string }[]
  >(question.acceptableAnswers);
  const { updateQuestion } = useQuiz();

  const currentQuestionState = useMemo(
    () => ({
      text: questionText,
      correctAnswer,
      isCaseSensitive,
      allowPartialMatch,
      acceptableAnswers,
    }),
    [
      questionText,
      correctAnswer,
      isCaseSensitive,
      allowPartialMatch,
      acceptableAnswers,
    ]
  );

  const debouncedQuestionState = useDebounce(currentQuestionState, 300);

  useEffect(() => {
    const updatedQuestion = {
      ...question,
      text: debouncedQuestionState.text,
      correctAnswer: debouncedQuestionState.correctAnswer,
      isCaseSensitive: debouncedQuestionState.isCaseSensitive,
      allowPartialMatch: debouncedQuestionState.allowPartialMatch,
      acceptableAnswers: debouncedQuestionState.acceptableAnswers,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id]);

  const handleAddAcceptableAnswer = () => {
    if (acceptableAnswers.length < 5) {
      setAcceptableAnswers([...acceptableAnswers, { value: "" }]);
    }
  };

  const handleRemoveAcceptableAnswer = (index: number) => {
    setAcceptableAnswers(acceptableAnswers.filter((_, i) => i !== index));
  };

  const handleAcceptableAnswerChange = (index: number, value: string) => {
    setAcceptableAnswers(
      acceptableAnswers.map((answer, i) => (i === index ? { value } : answer))
    );
  };

  const styles = getQuestionTypeStyles(question.type);

  return (
    <BaseQuestionFormCard
      questionText={questionText}
      onQuestionTextChange={setQuestionText}
      borderColor={styles.borderColor}
      backgroundColor={styles.backgroundColor}
    >
      <div className="space-y-6  pt-4">
        {/* Main Answer */}
        <div className="space-y-2">
          <Label htmlFor="main-answer" className="text-sm font-medium">
            Main Answer
          </Label>
          <Input
            id="main-answer"
            placeholder="Enter the main correct answer..."
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="case-sensitive" className="text-sm">
              Case Sensitive
            </Label>
            <Switch
              id="case-sensitive"
              checked={isCaseSensitive}
              onCheckedChange={setIsCaseSensitive}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="partial-match" className="text-sm">
              Allow Partial Match
            </Label>
            <Switch
              id="partial-match"
              checked={allowPartialMatch}
              onCheckedChange={setAllowPartialMatch}
            />
          </div>
        </div>

        {/* Acceptable Answers */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Additional Acceptable Answers (Optional)
          </Label>
          <div className="space-y-2">
            {acceptableAnswers.map((answer, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Alternative answer ${index + 1}...`}
                  value={answer.value}
                  onChange={(e) =>
                    handleAcceptableAnswerChange(index, e.target.value)
                  }
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveAcceptableAnswer(index)}
                  className="h-10 w-10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAcceptableAnswer}
              disabled={acceptableAnswers.length >= 5}
              className="border-dashed bg-primary/80 hover:bg-primary/95 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Alternative Answer ({acceptableAnswers.length}/5)
            </Button>
          </div>
        </div>
      </div>
    </BaseQuestionFormCard>
  );
};
