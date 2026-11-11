import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { Controller } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Entities/Language/components/select-question-language";
import { AddOptionButton } from "../add-option-button";
import { AnswerOptionField } from "../answer-option-field";
import { AddQuestionButton, QuestionTypeButton } from "../../question-type-button";
import { QuestionVisibilityField, useNewQuestionVisibility } from "../../../Entities/select-visibility";
import { useCreateAnother } from "../../use-create-another";
import { QuestionType } from "@/types/question-types";

/** The most options a multiple-choice question may have — and how many a new one starts with. */
const MAX_ANSWER_OPTIONS = 4;
import {
  createMultipleChoiceQuestionInputSchema,
  useCreateMultipleChoiceQuestion,
} from "../../../api/Multiple_Choice_Question/create-multiple-choice-question";
import { MediaPicker } from "@/features/media/components/media-picker";
import { type MediaSelection } from "@/features/media/api/upload-media";
import { ExplanationField } from "@/common/QuestionExplanation";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

interface CreateMultipleChoiceFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  /** The author closed the drawer after saving at least one question — the batch is done. */
  onSuccess?: () => void;
  /** Render the trigger as the empty list's "Add a question" instead of a type card. */
  emptyState?: boolean;
}

export const CreateMultipleChoiceForm: React.FC<
  CreateMultipleChoiceFormProps
> = ({ categories, difficulties, languages, onSuccess, emptyState }) => {
  const { addNotification } = useNotifications();
  const [media, setMedia] = useState<MediaSelection | null>(null);
  // Stays open for the next question (use-create-another.ts).
  const batch = useCreateAnother(onSuccess);
  const newVisibility = useNewQuestionVisibility();

  const createQuestionMutation = useCreateMultipleChoiceQuestion({
    mutationConfig: {
      // No toast: the drawer's "Question created" pill confirms it, on the submit button.
      onSuccess: (_created, { data }) => {
        setMedia(null);
        batch.markSaved(data);
      },
      onError: () => {
        addNotification({
          type: "error",
          title: "There was an error creating your question",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={false}
      savedSignal={batch.savedCount}
      savedMessage="Question created"
      onClosed={batch.handleClosed}
      triggerButton={
        emptyState ? (
          <AddQuestionButton />
        ) : (
          <QuestionTypeButton questionType={QuestionType.MultipleChoice} label="Multiple Choice" />
        )
      }
      title="Create a New Multiple Choice Question"
      submitButton={
        <Button
          form="create-multiple-choice-question"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createQuestionMutation.isPending}
          disabled={createQuestionMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        key={batch.formKey}
        id="create-multiple-choice-question"
        className="w-[500px]"
        onSubmit={(values) => {
          const isCorrectSelected = values.answerOptions.some(
            (option: any) => option.isCorrect,
          );

          if (!isCorrectSelected) {
            return;
          }

          createQuestionMutation.mutate({
            data: {
              ...values,
            },
          });
        }}
        schema={createMultipleChoiceQuestionInputSchema}
        // The four options a new question starts with are the form's initial state, not
        // something an Effect appends after the first render. That Effect ("if there are none,
        // add two") ran twice under React's development-only StrictMode — which deliberately
        // mounts every component twice to surface exactly this — and doubled the options. A
        // default value is applied once, in development and production alike. Four, like the
        // quiz builder's new question (DEFAULT_NEW_MULTIPLE_CHOICE) and the most allowed.
        defaultValues={{
          ...batch.carried,
          visibility: newVisibility,
          answerOptions: Array.from({ length: MAX_ANSWER_OPTIONS }, () => ({ text: "", isCorrect: false })),
        }}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "answerOptions",
          });

          const addOptionDisabled = fields.length >= MAX_ANSWER_OPTIONS;
          const allowMultipleSelections = watch("allowMultipleSelections");

          React.useEffect(() => {
            if (!allowMultipleSelections) {
              // Count how many correct answers we have
              const correctAnswers = fields.filter((_, i) =>
                watch(`answerOptions.${i}.isCorrect`),
              );

              // If we have more than one correct answer in single selection mode,
              // keep only the first one as correct
              if (correctAnswers.length > 1) {
                fields.forEach((_, i) => {
                  const shouldBeCorrect =
                    i ===
                    fields.findIndex((_, idx) =>
                      watch(`answerOptions.${idx}.isCorrect`),
                    );
                  setValue(`answerOptions.${i}.isCorrect`, shouldBeCorrect);
                });
              }
            }
          }, [allowMultipleSelections, fields, setValue, watch]);

          const handleSwitchChange = (index: number) => {
            if (allowMultipleSelections) {
              setValue(
                `answerOptions.${index}.isCorrect`,
                !watch(`answerOptions.${index}.isCorrect`),
              );
            } else {
              fields.forEach((_, i) => {
                setValue(`answerOptions.${i}.isCorrect`, i === index);
              });
            }

            if (fields.some((_, i) => watch(`answerOptions.${i}.isCorrect`))) {
              clearErrors("answerOptions");
            }
          };

          const handleMediaChange = (next: MediaSelection | null) => {
            setMedia(next);
            setValue("mediaAssetId", next?.assetId ?? null);
          };

          return (
            <>
              <Input
                id="questionText"
                variant="minimal"
                className={`py-2 w-full ${
                  formState.errors["text"] ? "border-red-500" : ""
                }`}
                placeholder="Enter your question here..."
                // Back to the question after each save, ready for the next one.
                autoFocus
                error={formState.errors["text"]}
                registration={register("text")}
              />
              {formState.errors.root && (
                <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                  {formState.errors.root.message}
                </p>
              )}

              {/* Modified image upload implementation */}
              <MediaPicker value={media} onChange={handleMediaChange} />

              <Separator className="bg-gray-500" />

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="flex items-center space-x-2">
                  <Controller
                    name="allowMultipleSelections"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="allowMultipleSelections"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="allowMultipleSelections">
                    Allow multiple correct answers
                  </Label>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    Answer Options
                  </Label>
                  {!allowMultipleSelections && (
                    <span className="text-xs text-gray-500 italic">
                      Single selection mode: Only one answer can be correct
                    </span>
                  )}
                </div>
                {fields.map((field, index) => (
                  <AnswerOptionField
                    key={field.id}
                    index={index}
                    registration={register(`answerOptions.${index}.text`)}
                    error={formState.errors?.answerOptions?.[index]?.text}
                    isCorrect={!!watch(`answerOptions.${index}.isCorrect`)}
                    onToggleCorrect={() => handleSwitchChange(index)}
                    onRemove={() => remove(index)}
                    removeDisabled={fields.length <= 2}
                  />
                ))}
                {formState.errors?.answerOptions && (
                  <p className="text-sm text-red-500">
                    {formState.errors.answerOptions.message ||
                      "At least one option needs to be correct!"}
                  </p>
                )}
                <AddOptionButton
                  onClick={() => append({ text: "", isCorrect: false })}
                  disabled={addOptionDisabled}
                />
              </div>
              <section className="grid grid-cols-2 gap-4 border-t pt-4 dark:border-foreground/30">
                <CategorySelect
                  label="Category"
                  categories={categories}
                  value={watch("categoryId")?.toString() || ""}
                  onChange={(selectedValue: string) =>
                    setValue("categoryId", parseInt(selectedValue, 10))
                  }
                  includeAllOption={false}
                  error={formState.errors["categoryId"]?.message}
                  clearErrors={() => clearErrors("categoryId")}
                />
                <DifficultySelect
                  label="Difficulty"
                  difficulties={difficulties}
                  value={watch("difficultyId")?.toString() || ""}
                  onChange={(selectedValue: string) =>
                    setValue("difficultyId", parseInt(selectedValue, 10))
                  }
                  includeAllOption={false}
                  error={formState.errors["difficultyId"]?.message}
                  clearErrors={() => clearErrors("difficultyId")}
                />
                <LanguageSelect
                  label="Language"
                  languages={languages}
                  value={watch("languageId")?.toString() || ""}
                  includeAllOption={false}
                  onChange={(selectedValue: string) =>
                    setValue("languageId", parseInt(selectedValue, 10))
                  }
                  error={formState.errors["languageId"]?.message}
                  clearErrors={() => clearErrors("languageId")}
                />
                <QuestionVisibilityField
                  label="Visibility"
                  value={watch("visibility") ?? newVisibility}
                  onChange={(value: string) => setValue("visibility", value)}
                  error={formState.errors["visibility"]?.message}
                  clearErrors={() => clearErrors("visibility")}
                />
              </section>
              {/* Optional "why" shown to players after they answer — see
                  docs/quiz/question-explanations.md. */}
              <ExplanationField
                registration={register("explanation")}
                error={formState.errors["explanation"]}
                className="mt-4"
              />
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateMultipleChoiceForm;
