import { useEffect, useMemo, useState } from "react";
import { NewTypeTheAnswerQuestion } from "../../types";
import { useQuiz } from "../../Quiz-questions-context";
import { useDebounce } from "@/hooks/use-debounce";
import { BaseQuestionFormCard } from "./display-base-quiz-question-card";
import { Input, Label } from "@/components/ui/form";
import { Button, Card, CardContent, Switch } from "@/components/ui";
import { AlertCircle, CheckCircle2, Plus, Type, X } from "lucide-react";
import { getQuestionTypeStyles } from "../existing-display-quiz-question-card/display-multiple-choice-question-card/display-muiltiple-choice-question-card";
import { QuestionType } from "@/types/ApiTypes";
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

  const filledAcceptableAnswers = acceptableAnswers.filter(
    (answer) => answer.value.trim() !== ""
  );

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
        {/* Main Answer */}
        <Card className="border-2 border-emerald-400 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <Label className="text-md font-semibold text-emerald-800 dark:text-emerald-200">
                  Primary Correct Answer
                </Label>
              </div>
            </div>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-500" />
              <Input
                id="main-answer"
                variant={getFieldError("correctAnswer") ? "isIncorrect" : "isCorrect"}
                placeholder="Enter the primary correct answer..."
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="pl-12 h-12 text-md font-medium border-emerald-300 focus:border-emerald-500 dark:border-emerald-700"
                error={getFieldError("correctAnswer")}
              />
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm font-medium flex justify-between hover:no-underline underline">
              <span className="text-sm font-medium">Extra Details</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-4">
              <Card className="border-orange-400 rounded-md bg-orange-200/30 backdrop-blur-sm dark:backdrop-blur-xl dark:border-orange-800 dark:bg-orange-950/20">
                <CardContent className="p-4  rounded-md">
                  <div className="flex items-center space-x-2 mb-4 rounded-md">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <Label className="font-semibold text-orange-800 dark:text-orange-200">
                      Answer Matching Rules
                    </Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="space-y-1">
                        <Label className="font-medium">Case Sensitive</Label>
                        <p className="text-xs text-muted-foreground">
                          {"Require exact capitalization match"}
                        </p>
                      </div>
                      <Switch
                        checked={isCaseSensitive}
                        onCheckedChange={setIsCaseSensitive}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="space-y-1">
                        <Label className="font-medium">Partial Match</Label>
                        <p className="text-xs text-muted-foreground">
                          Accept answers containing the correct text
                        </p>
                      </div>
                      <Switch
                        checked={allowPartialMatch}
                        onCheckedChange={setAllowPartialMatch}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Acceptable Answers */}
              <div
                className={`space-y-3 w-full flex flex-col items-center gap-4 border p-4 rounded-md border-dashed ${errorAwareStyles.borderColor}`}
              >
                <Label className="text-sm font-medium">
                  Additional Acceptable Answers (Optional)
                </Label>
                <div className="space-y-4">
                  {acceptableAnswers.map((answer, index) => {
                    const acceptableAnswerError = getFieldError(`acceptableAnswers.${index}.value`) || 
                                                getFieldError(`acceptableAnswers[${index}].value`);
                    
                    return (
                      <div key={index} className="relative w-full">
                        <Input
                          variant={acceptableAnswerError ? "isIncorrect" : "quiz"}
                          placeholder={`Alternative answer ${index + 1}...`}
                          value={answer.value}
                          onChange={(e) =>
                            handleAcceptableAnswerChange(index, e.target.value)
                          }
                          className="flex-1"
                          error={acceptableAnswerError}
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
                    );
                  })}
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAcceptableAnswer}
                    disabled={acceptableAnswers.length >= 5}
                    className={`border-dashed ${errorAwareStyles.backgroundColor} ${errorAwareStyles.borderColor} `}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Alternative Answer ({acceptableAnswers.length}/5)
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isCaseSensitive
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {isCaseSensitive ? "Case Sensitive" : "Case Insensitive"}
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    allowPartialMatch
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {allowPartialMatch
                    ? "Partial Match Allowed"
                    : "Exact Match Required"}
                </div>
                {filledAcceptableAnswers.length > 0 && (
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    {filledAcceptableAnswers.length} Alternative
                    {filledAcceptableAnswers.length !== 1 ? "s" : ""}
                  </div>
                )}
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