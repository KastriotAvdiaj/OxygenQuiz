import { useFieldArray } from "react-hook-form"; // Removed Controller as it wasn't used directly here
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { FormProps } from "../types";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { AnswerOption } from "@/pages/Dashboard/Pages/Question/Components/Create-Question-Components/answer-option";
import { Info, Medal, Trash2 } from "lucide-react";
import { ScoreSelect } from "./score-select";
import React from "react";
import { CustomCheckbox } from "@/common/custom-checkbox";
import {
  Card,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";

interface PrivateQuestionFormProps {
  index: number;
  formProps: FormProps;
  difficulties: QuestionDifficulty[];
  categories: QuestionCategory[];
  languages: QuestionLanguage[];
  removeQuestion: () => void;
}

export const PrivateQuestionForm = ({
  index,
  formProps,
  removeQuestion,
}: PrivateQuestionFormProps) => {
  const { register, control, formState, setValue, watch, clearErrors } =
    formProps;
  const [extraSettings, setExtraSettings] = React.useState(false);

  const answerOptionsName = `privateQuestions.${index}.answerOptions` as const;
  const {
    fields: answerOptionFields,
    append: appendAnswerOption,
    remove: removeAnswerOption,
  } = useFieldArray({
    control: control,
    name: answerOptionsName,
  });

  const handleCorrectToggle = (optionIndex: number) => {
    answerOptionFields.forEach((_, i) => {
      setValue(`${answerOptionsName}.${i}.isCorrect`, i === optionIndex, {
        shouldValidate: true,
      });
    });
    clearErrors(`${answerOptionsName}`);
  };

  const maxAnswers = 4;
  const canAddMoreAnswers = answerOptionFields.length < maxAnswers;
  const numOptions = answerOptionFields.length;

  const handleAddAnswerOption = () => {
    if (canAddMoreAnswers) {
      appendAnswerOption({ text: "", isCorrect: false });
    }
  };

  // Define base grid classes (applies when 2 or more options)
  const answerOptionsContainerClasses = `
    grid
    gap-4
    ${
      numOptions >= 2 ? "sm:grid-cols-2" : "grid-cols-1"
    } // Base 2 columns on sm+ if needed
    mt-4
  `;

  return (
    <Card
      className={`p-4 rounded max-w-2xl border-dashed border-2 border-primary/30 dark:bg-transparent`}
    >
      {/* ... (Rest of the form: Header, Question Text, Score Select, Separator remains the same) ... */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Question {index + 1}</h3>
        <Button
          variant="destructive"
          type="button"
          size="icon"
          onClick={removeQuestion}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-4 font-header">
        <Label htmlFor={`privateQuestions.${index}.text`} className="sr-only">
          Question Text
        </Label>
        <Input
          variant="quiz"
          placeholder={`Type Your Question`}
          id={`privateQuestions.${index}.text`}
          {...register(`privateQuestions.${index}.text`)}
          error={formState.errors.privateQuestions?.[index]?.text}
        />
      </div>
      <div className="mb-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor={`privateQuestions.${index}.score`}
            className="flex items-center gap-2 text-lg"
          >
            <Medal size={20} /> Points (Time)
          </Label>
          <ScoreSelect
            control={control}
            name={`privateQuestions.${index}.score`}
            error={formState.errors.privateQuestions?.[index]?.score}
            id={`privateQuestions.${index}.score`}
          />
        </div>
      </div>
      {/* TODO: Add Difficulty/Category/Language Selects here */}
      <Separator className="my-4" />

      {/* --- Answer Options Section --- */}
      <div>
        <section className="flex items-center justify-between mb-4">
          <Label className="block text-lg font-semibold text-foreground mb-2">
            Answer Options
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Select correct answer)
            </span>
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <section className="flex items-center gap-2">
                  <Label className="text-gray-500">Extra Settings</Label>
                  <CustomCheckbox
                    disabled={true}
                    checked={extraSettings}
                    onChange={(e) => setExtraSettings(e.target.checked)}
                  />
                </section>
              </TooltipTrigger>
              <TooltipContent className="bg-background">
                <p>Option is disabled for now.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </section>

        {/* Apply base grid classes to this container */}
        <div className={answerOptionsContainerClasses}>
          {answerOptionFields.map((field, optionIndex) => {
            // --- Add conditional class for the third item ---
            const isThirdItemWhenThreeExist =
              numOptions === 3 && optionIndex === 2;
            const itemWrapperClass = isThirdItemWhenThreeExist
              ? "sm:col-span-2"
              : "";

            return (
              // Wrap AnswerOption in a div to apply the conditional class and key
              <div key={field.id} className={itemWrapperClass}>
                <AnswerOption
                  extraSettings={extraSettings}
                  index={optionIndex}
                  textRegistration={register(
                    `${answerOptionsName}.${optionIndex}.text`
                  )}
                  isCorrect={
                    !!watch(`${answerOptionsName}.${optionIndex}.isCorrect`)
                  }
                  onCorrectToggle={() => handleCorrectToggle(optionIndex)}
                  error={
                    formState.errors.privateQuestions?.[index]?.answerOptions?.[
                      optionIndex
                    ]?.text
                  }
                  onRemove={() => removeAnswerOption(optionIndex)}
                  disableRemove={answerOptionFields.length <= 2}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* --- End Answer Options Section --- */}

      {extraSettings && (
        <>
          <Button
            variant="addSave"
            type="button"
            size="sm"
            onClick={handleAddAnswerOption}
            disabled={!canAddMoreAnswers}
            className="mt-5 rounded-sm"
          >
            + Add Option
          </Button>
          {!canAddMoreAnswers && (
            <p className="text-sm text-muted-foreground mt-1">
              Maximum {maxAnswers} options reached.
            </p>
          )}
        </>
      )}
    </Card>
  );
};
