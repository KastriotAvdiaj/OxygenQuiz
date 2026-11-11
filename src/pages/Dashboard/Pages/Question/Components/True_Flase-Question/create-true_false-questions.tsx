import { Check } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";

import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import {
  createTrueFalseQuestionInputSchema,
  useCreateTrueFalseQuestion,
} from "../../api/True_False-Question/create-true_false-question";
import { AddQuestionButton, QuestionTypeButton } from "../question-type-button";
import { QuestionVisibilityField, useNewQuestionVisibility } from "../../Entities/select-visibility";
import { useCreateAnother } from "../use-create-another";
import { QuestionType } from "@/types/question-types";
import { MediaPicker } from "@/features/media/components/media-picker";
import { type MediaSelection } from "@/features/media/api/upload-media";
import { ExplanationField } from "@/common/QuestionExplanation";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/question-types";

interface CreateTrueFalseQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  onSuccess?: () => void;
  /** Render the trigger as the empty list's "Add a question" instead of a type card. */
  emptyState?: boolean;
}

export const CreateTrueFalseQuestionForm: React.FC<
  CreateTrueFalseQuestionFormProps
> = ({ categories, difficulties, languages, onSuccess, emptyState }) => {
  const [media, setMedia] = useState<MediaSelection | null>(null);
  // Stays open for the next question (use-create-another.ts).
  const batch = useCreateAnother(onSuccess);
  const newVisibility = useNewQuestionVisibility();

  const createQuestionMutation = useCreateTrueFalseQuestion({
    mutationConfig: {
      // No toast: the drawer's "Question created" pill confirms it, on the submit button.
      onSuccess: (_created, { data }) => {
        setMedia(null);
        batch.markSaved(data);
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
          <QuestionTypeButton questionType={QuestionType.TrueFalse} label="True / False" />
        )
      }
      title="Create a True False Question"
      submitButton={
        <Button
          form="create-true-false-question"
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
        id="create-true-false-question"
        className="w-[500px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createTrueFalseQuestionInputSchema}
        defaultValues={{ ...batch.carried, visibility: newVisibility }}
      >
        {({ register, formState, setValue, watch, clearErrors }) => {
          const checkCorrectAnswer = (value: boolean) => {
            setValue("correctAnswer", value);
            clearErrors("correctAnswer");
          };


          const handleMediaChange = (next: MediaSelection | null) => {
            setMedia(next);
            setValue("mediaAssetId", next?.assetId ?? null);
          };

          return (
            <>
              <div className="grid grid-[2fr_1fr] w-full gap-5">
                <div className="space-y-2">
                  <Input
                    id="text"
                    variant="minimal"
                    className={`py-2 w-full ${
                      formState.errors["text"] ? "border-red-500" : ""
                    }`}
                    placeholder="Enter your statement here..."
                    autoFocus
                    error={formState.errors["text"]}
                    registration={register("text")}
                  />
                  <MediaPicker value={media} onChange={handleMediaChange} />
                </div>
                <div className="space-y-4 mt-4">
                  <Label className="block text-sm font-medium text-foreground flex items-center justify-center gap-2">
                    Correct Answer
                  </Label>
                  <div className="flex items-center justify-around rounded-sm">
                    <div className="flex flex-col w-full items-center bg-primary/80 dark:bg-primary/80 rounded-md p-2">
                      <button
                        id="true-option"
                        type="button"
                        onClick={() => checkCorrectAnswer(true)}
                        className={`w-6 h-6 rounded-full flex items-center border justify-center transition-all ${
                          watch("correctAnswer") === true
                            ? "bg-green-500 text-white"
                            : "bg-primary/20 hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40"
                        }`}
                      >
                        {watch("correctAnswer") === true && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <Label
                        htmlFor="true-option"
                        className="text-md font-medium mt-2"
                      >
                        True
                      </Label>
                    </div>

                    <div className="flex flex-col items-center w-full bg-red-500/80 dark:bg-red-500/80 rounded-sm p-2">
                      <button
                        id="false-option"
                        type="button"
                        onClick={() => checkCorrectAnswer(false)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                          watch("correctAnswer") === false
                            ? "bg-green-500 text-white"
                            : "bg-primary/20 hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40"
                        }`}
                      >
                        {watch("correctAnswer") === false && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <Label
                        htmlFor="false-option"
                        className="text-md font-medium mt-2"
                      >
                        False
                      </Label>
                    </div>
                  </div>
                  {formState.errors?.correctAnswer && (
                    <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                      Please select either True or False
                    </p>
                  )}
                </div>
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

export default CreateTrueFalseQuestionForm;
