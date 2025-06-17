import { useEffect, useMemo, useState } from "react";
import { NewTypeTheAnswerQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Input, Label } from "@/components/ui/form";
import { Button, Switch } from "@/components/ui";
import { Plus, X } from "lucide-react";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/ApiTypes";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      questionType={QuestionType.TypeTheAnswer}
    >
      <div className="space-y-6 p-4">
        {/* Main Answer */}
        <div className="w-full flex flex-col items-center justify-center">
          <Label htmlFor="main-answer" className="text-sm font-medium">
            Correct Answer
          </Label>
          <Input
            id="main-answer"
            variant="isCorrect"
            placeholder="Enter the main correct answer..."
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="h-12 px-8"
          />
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm font-medium flex justify-between hover:no-underline underline">
              <span className="text-sm font-medium">Extra Details</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex flex-col items-center justify-between gap-2">
                  <Label htmlFor="case-sensitive" className="text-sm">
                    Case Sensitive
                  </Label>
                  <Switch
                    type="button"
                    id="case-sensitive"
                    checked={isCaseSensitive}
                    onCheckedChange={setIsCaseSensitive}
                  />
                </div>
                <div className="flex flex-col items-center justify-between gap-2">
                  <Label htmlFor="partial-match" className="text-sm">
                    Allow Partial Match
                  </Label>
                  <Switch
                    type="button"
                    id="partial-match"
                    checked={allowPartialMatch}
                    onCheckedChange={setAllowPartialMatch}
                  />
                </div>
              </div>

              {/* Acceptable Answers */}
              <div
                className={`space-y-3 w-full flex flex-col items-center gap-4 border p-4 rounded-md border-dashed ${styles.borderColor}`}
              >
                <Label className="text-sm font-medium">
                  Additional Acceptable Answers (Optional)
                </Label>
                <div className="space-y-2">
                  {acceptableAnswers.map((answer, index) => (
                    <div key={index} className="relative w-full">
                      <Input
                        variant="quiz"
                        placeholder={`Alternative answer ${index + 1}...`}
                        value={answer.value}
                        onChange={(e) =>
                          handleAcceptableAnswerChange(index, e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveAcceptableAnswer(index)}
                        className="absolute top-0 right-0 h-4 w-4 p-0 text-white bg-red-400 hover:bg-destructive hover:text-destructive-foreground rounded-md"
                      >
                        <X className="h-2 w-2" />
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
                    className={`border-dashed ${styles.backgroundColor} ${styles.borderColor} `}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Alternative Answer ({acceptableAnswers.length}/5)
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </BaseQuestionFormCard>
  );
};
