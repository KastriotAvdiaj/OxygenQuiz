import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { FormProps } from "../types";
import { AnswerOption } from "@/pages/Dashboard/Pages/Question/Components/Multiple_Choice_Question/Create-Multiple-Choice-Question-Components/answer-option";
import { Medal, Trash2, Clock } from "lucide-react"; // Added Clock and HelpCircle icons
import { ScoreSelect } from "./score-select"; // Assuming ScoreSelect accepts options prop
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

  // --- Handlers (remain the same) ---
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

  // --- Answer Option Layout Classes (remain the same) ---
  const answerOptionsContainerClasses = `
    grid
    gap-4
    ${numOptions >= 2 ? "sm:grid-cols-2" : "grid-cols-1"}
    mt-4
  `;

  return (
    <Card
      className={`p-6 rounded w-full border-dashed border-2 border-primary/30 dark:bg-background/80`}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Question {index + 1}</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="flex items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
          onClick={removeQuestion}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-x-8 gap-y-6">
        <div className="flex flex-col gap-4">
          <div className="font-header">
            <Label
              htmlFor={`privateQuestions.${index}.text`}
              className="sr-only"
            >
              Question Text
            </Label>
            <Input
              variant="quiz"
              placeholder={`Type Your Question`}
              id={`privateQuestions.${index}.text`}
              {...register(`privateQuestions.${index}.text`)}
              error={formState.errors.privateQuestions?.[index]?.text}
              className="text-lg py-3" // Slightly larger input
            />
          </div>

          <Separator className="my-2" />

          {/* --- Answer Options Section --- */}
          <div className="mt-2">
            {/* Optionally keep the extra settings toggle if it controls advanced answer features */}
            <section className="flex items-center justify-between mb-4">
              <Label className="font-medium text-base">Answer Options</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Maybe connect this to advanced answer settings if needed */}
                    <section className="flex items-center gap-2">
                      <Label
                        className="text-sm text-gray-500 cursor-pointer"
                        htmlFor={`extra-settings-${index}`}
                      >
                        Advanced Options
                      </Label>
                      <CustomCheckbox
                        //  id={`extra-settings-${index}`}
                        checked={extraSettings}
                        onChange={(checked) =>
                          setExtraSettings(Boolean(checked))
                        }
                        // You might want to re-enable this if it does something useful
                        disabled={true}
                      />
                    </section>
                  </TooltipTrigger>
                  <TooltipContent className="bg-background">
                    <p>
                      Toggle advanced answer settings (e.g. image uploads - if
                      implemented).
                    </p>
                    {/* <p>Option is disabled for now.</p> */}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </section>

            {/* Answers Grid */}
            <div className={answerOptionsContainerClasses}>
              {answerOptionFields.map((field, optionIndex) => {
                const isThirdItemWhenThreeExist =
                  numOptions === 3 && optionIndex === 2;
                const itemWrapperClass = isThirdItemWhenThreeExist
                  ? "sm:col-span-2"
                  : "";

                return (
                  <div key={field.id} className={itemWrapperClass}>
                    <AnswerOption
                      extraSettings={extraSettings} // Pass state if needed by AnswerOption
                      index={optionIndex}
                      textRegistration={register(
                        `${answerOptionsName}.${optionIndex}.text`
                      )}
                      isCorrect={
                        !!watch(`${answerOptionsName}.${optionIndex}.isCorrect`)
                      }
                      onCorrectToggle={() => handleCorrectToggle(optionIndex)}
                      error={
                        formState.errors.privateQuestions?.[index]
                          ?.answerOptions?.[optionIndex]?.text
                      }
                      onRemove={() => removeAnswerOption(optionIndex)}
                      disableRemove={answerOptionFields.length <= 2}
                    />
                  </div>
                );
              })}
            </div>

            {/* Add Option Button - only show when less than max */}
            {canAddMoreAnswers && (
              <Button
                variant="outline" // Changed variant for less emphasis
                type="button"
                size="sm"
                onClick={handleAddAnswerOption}
                className="mt-5 rounded-sm w-full sm:w-auto"
              >
                + Add Answer Option
              </Button>
            )}
            {!canAddMoreAnswers && (
              <p className="text-sm text-muted-foreground mt-2">
                Maximum {maxAnswers} options reached.
              </p>
            )}
          </div>
        </div>{" "}
        {/* End Main Content Column */}
        {/* --- Settings Sidebar Column --- */}
        <div className="flex flex-col gap-5 border-l border-border pl-6 md:pl-8 pt-1 md:border-l md:pt-0">
          {/* Points Type Select */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor={`privateQuestions.${index}.pointType`}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Medal size={16} /> Point System
            </Label>
            <ScoreSelect
              control={control}
              name={`privateQuestions.${index}.pointType`} // ** NEW FIELD NAME **
              // error={formState.errors.privateQuestions?.[index]?.pointType}
              id={`privateQuestions.${index}.pointType`}
            />
          </div>

          {/* Time Limit Select */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor={`privateQuestions.${index}.timeLimit`}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Clock size={16} /> Time Limit
            </Label>
            <ScoreSelect // Reusing ScoreSelect again
              control={control}
              name={`privateQuestions.${index}.timeLimit`} // ** NEW FIELD NAME **
              error={formState.errors.privateQuestions?.[index]?.timeLimit}
              id={`privateQuestions.${index}.timeLimit`}
            />
            {/* Optional: Display error message */}
            {formState.errors.privateQuestions?.[index]?.timeLimit && (
              <p className="text-xs text-red-500 mt-1">
                {formState.errors.privateQuestions[index]?.timeLimit?.message}
              </p>
            )}
          </div>

          {/* You can add other settings here if needed later, e.g., difficulty */}
        </div>{" "}
        {/* End Settings Sidebar Column */}
      </div>{" "}
      {/* End Main Layout Grid */}
    </Card>
  );
};
