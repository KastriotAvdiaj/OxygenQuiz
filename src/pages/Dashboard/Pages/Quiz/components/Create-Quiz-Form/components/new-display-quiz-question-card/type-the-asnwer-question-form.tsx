import { useEffect, useMemo, useState } from "react";
import { NewTypeTheAnswerQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Input, Label } from "@/components/ui/form";
import { Button, Switch } from "@/components/ui";
import { CheckCircle2, Plus, X } from "lucide-react";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/question-types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getErrorAwareStyles,
  useFormValidation,
  ValidationErrorsDisplay,
} from "@/hooks/use-questionForm";

interface TypeTheAnswerFormCardProps {
  question: NewTypeTheAnswerQuestion;
}

export const TypeTheAnswerFormCard: React.FC<TypeTheAnswerFormCardProps> = ({
  question,
}) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [imageUrl, setImageUrl] = useState(question.imageUrl || undefined);
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
      isCaseSensitive,
      allowPartialMatch,
      acceptableAnswers,
    }),
    [
      questionText,
      imageUrl,
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
      imageUrl: debouncedQuestionState.imageUrl,
      correctAnswer: debouncedQuestionState.correctAnswer,
      isCaseSensitive: debouncedQuestionState.isCaseSensitive,
      allowPartialMatch: debouncedQuestionState.allowPartialMatch,
      acceptableAnswers: debouncedQuestionState.acceptableAnswers,
    };
    updateQuestion(question.id, updatedQuestion);
  }, [debouncedQuestionState, question.id, updateQuestion]);

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

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleImageRemove = () => {
    setImageUrl(undefined);
  };

  const styles = getQuestionTypeStyles(question.type);
  const errorAwareStyles = getErrorAwareStyles(hasErrors, styles);

  // Get general validation errors that don't belong to specific fields
  const generalErrors = getGeneralErrors([
    "text",
    "imageUrl",
    "correctAnswer",
    "acceptableAnswers",
  ]);

  return (
    <BaseQuestionFormCard
      questionText={questionText}
      onQuestionTextChange={setQuestionText}
      borderColor={errorAwareStyles.borderColor}
      backgroundColor={errorAwareStyles.backgroundColor}
      questionType={QuestionType.TypeTheAnswer}
      // Image upload props
      imageUrl={imageUrl}
      onImageUpload={handleImageUpload}
      onImageRemove={handleImageRemove}
      showImageUpload={true}
      questionTextError={getFieldError("text")}
    >
      <div className="space-y-6 p-4">
        {/* Correct answer — the one essential field, kept plain and always visible. */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <Label className="text-sm font-semibold">Correct answer</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            What a player has to type to get it right.
          </p>
          <Input
            id="main-answer"
            variant={getFieldError("correctAnswer") ? "isIncorrect" : "minimal"}
            placeholder="e.g. Paris"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="h-11 text-md font-medium"
            error={getFieldError("correctAnswer")}
          />
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline border-b border-border">
              Answer options
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pt-4">
              {/* Matching rules — plain, explained rows instead of a nested colored card. */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Ignore capitalization
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      &ldquo;Paris&rdquo; and &ldquo;paris&rdquo; both count as
                      correct.
                    </p>
                  </div>
                  <Switch
                    checked={!isCaseSensitive}
                    onCheckedChange={(checked) => setIsCaseSensitive(!checked)}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Accept partial answers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Correct if the answer is contained in what they type —
                      &ldquo;the Eiffel Tower&rdquo; matches &ldquo;Eiffel&rdquo;.
                    </p>
                  </div>
                  <Switch
                    checked={allowPartialMatch}
                    onCheckedChange={setAllowPartialMatch}
                  />
                </div>
              </div>

              {/* Other accepted answers */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Other accepted answers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Synonyms or spellings you&rsquo;ll also mark correct.
                  </p>
                </div>
                <div className="space-y-2">
                  {acceptableAnswers.map((answer, index) => {
                    const acceptableAnswerError =
                      getFieldError(`acceptableAnswers.${index}.value`) ||
                      getFieldError(`acceptableAnswers[${index}].value`);

                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          variant={
                            acceptableAnswerError ? "isIncorrect" : "minimal"
                          }
                          placeholder={`Alternative answer ${index + 1}…`}
                          value={answer.value}
                          onChange={(e) =>
                            handleAcceptableAnswerChange(index, e.target.value)
                          }
                          className="flex-1"
                          error={acceptableAnswerError}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAcceptableAnswer(index)}
                          className="h-8 w-8 flex-none text-muted-foreground hover:bg-destructive/10 hover:text-red-500"
                          aria-label={`Remove alternative answer ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAcceptableAnswer}
                  disabled={acceptableAnswers.length >= 5}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add answer · {acceptableAnswers.length} of 5
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Display general validation errors that don't belong to specific fields */}
        <ValidationErrorsDisplay errors={generalErrors} />
      </div>
    </BaseQuestionFormCard>
  );
};