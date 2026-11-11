import { Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";

import { useFieldArray } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import {
  createTypeTheAnswerQuestionInputSchema,
  useCreateTypeTheAnswerQuestion,
} from "../../api/Type_The_Answer-Question/create-type-the-answer-question";
import { MAX_ACCEPTABLE_ANSWERS } from "../../api/Type_The_Answer-Question/constants";
import {
  Switch,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import { AddQuestionButton, QuestionTypeButton } from "../question-type-button";
import { QuestionVisibilityField, useNewQuestionVisibility } from "../../Entities/select-visibility";
import { useCreateAnother } from "../use-create-another";
import { QuestionType, QuestionCategory, QuestionDifficulty, QuestionLanguage } from "@/types/question-types";
import { MediaPicker } from "@/features/media/components/media-picker";
import { type MediaSelection } from "@/features/media/api/upload-media";
import { ExplanationField } from "@/common/QuestionExplanation";

interface CreateTypeAnswerQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  onSuccess?: () => void;
  /** Render the trigger as the empty list's "Add a question" instead of a type card. */
  emptyState?: boolean;
}

export const CreateTypeAnswerQuestionForm: React.FC<
  CreateTypeAnswerQuestionFormProps
> = ({ categories, difficulties, languages, onSuccess, emptyState }) => {
  const [media, setMedia] = useState<MediaSelection | null>(null);
  // Stays open for the next question (use-create-another.ts).
  const batch = useCreateAnother(onSuccess);
  const newVisibility = useNewQuestionVisibility();

  const createQuestionMutation = useCreateTypeTheAnswerQuestion({
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
          <QuestionTypeButton questionType={QuestionType.TypeTheAnswer} label="Type The Answer" />
        )
      }
      title="Create a Type the Answer Question"
      submitButton={
        <Button
          form="create-type-answer-question"
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
        id="create-type-answer-question"
        className="w-[500px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createTypeTheAnswerQuestionInputSchema}
        options={{
          defaultValues: {
            text: "",
            // The last question's, when this is the next in a batch (use-create-another.ts).
            difficultyId: batch.carried.difficultyId,
            categoryId: batch.carried.categoryId,
            languageId: batch.carried.languageId,
            correctAnswer: "",
            isCaseSensitive: false,
            allowPartialMatch: false,
            acceptableAnswers: [],
            visibility: newVisibility,
          },
        }}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "acceptableAnswers",
          });

          const addAnswerDisabled = fields.length >= MAX_ACCEPTABLE_ANSWERS;


          const handleMediaChange = (next: MediaSelection | null) => {
            setMedia(next);
            setValue("mediaAssetId", next?.assetId ?? null);
          };
          return (
            <>
              <Input
                label="Question"
                variant="minimal"
                id="questionText"
                className={`py-2 w-full ${
                  formState.errors["text"] ? "border-red-500" : ""
                }`}
                placeholder="Enter your question here..."
                autoFocus
                error={formState.errors["text"]}
                registration={register("text")}
              />
              <MediaPicker value={media} onChange={handleMediaChange} />
              <div className="space-y-4 mt-4">
                <div className="flex flex-col ">
                  <Input
                    label="Correct Answer"
                    variant="isCorrect"
                    className={` ${
                      formState.errors["correctAnswer"] ? "border-red-500" : ""
                    }`}
                    placeholder="Enter the correct answer..."
                    error={formState.errors["correctAnswer"]}
                    registration={register("correctAnswer")}
                  />
                </div>
              </div>
              <Separator className="bg-gray-300 dark:bg-gray-600" />

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    Acceptable Answers{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({fields.length}/{MAX_ACCEPTABLE_ANSWERS})
                    </span>
                  </Label>
                  <div className="flex space-x-2">
                    <LiftedButton
                      type="button"
                      className="flex items-center gap-2 py-1 text-sm"
                      disabled={addAnswerDisabled}
                      onClick={() => !addAnswerDisabled && append({ value: "" })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add answer
                    </LiftedButton>
                  </div>
                </div>
                {addAnswerDisabled && (
                  <p className="text-xs text-muted-foreground">
                    That's the maximum. Remove one to add a different answer.
                  </p>
                )}
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Input
                      variant="minimal"
                        className={`${
                          formState.errors?.acceptableAnswers?.[index]
                            ? "border-red-500"
                            : ""
                        }`}
                        placeholder={`Alternative answer ${index + 1}...`}
                        error={
                          formState.errors?.acceptableAnswers?.[index]?.value
                        }
                        registration={register(
                          `acceptableAnswers.${index}.value`
                        )}
                      />
                      <LiftedButton
                          type="button"
                          variant="icon"
                          outerClassName="shrink-0"
                          className="bg-red-600 text-white"
                          liftColor="red-700"
                          onClick={() => remove(index)}
                          aria-label={`Remove alternative answer ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </LiftedButton>
                    </div>
                  ))}
                </div>
                {formState.errors?.acceptableAnswers && (
                  <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                    {formState.errors.acceptableAnswers.message}
                  </p>
                )}
              </div>

              <div className="space-y-4 mt-6">
                <Label
                  htmlFor="answerOptions"
                  className="block text-sm font-medium text-foreground"
                >
                  Answer Options
                </Label>
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted dark:border-foreground/30 dark:bg-muted/20">
                  <TooltipProvider>
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-default">
                            {" "}
                            <Switch
                              id="caseSensitive"
                              checked={watch("isCaseSensitive") === true}
                              onCheckedChange={(checked) =>
                                setValue("isCaseSensitive", checked)
                              }
                            />
                            <Label
                              htmlFor="caseSensitive"
                              className="text-sm text-gray-700 dark:text-gray-400"
                            >
                              Case Sensitive
                            </Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm text-foreground">
                            If DISABLED, "new york" will be accepted for "New
                            York"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 cursor-default">
                            <Switch
                              id="allowPartialMatch"
                              checked={!watch("allowPartialMatch") === true}
                              onCheckedChange={(checked) =>
                                setValue("allowPartialMatch", !checked)
                              }
                            />
                            <Label
                              htmlFor="allowPartialMatch"
                              className="text-sm text-gray-700 dark:text-gray-400"
                            >
                              Exact Match Required
                            </Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm text-foreground mr-3">
                            If DISABLED, "New York" will be accepted for "New
                            York City"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
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
              </div>
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

export default CreateTypeAnswerQuestionForm;
