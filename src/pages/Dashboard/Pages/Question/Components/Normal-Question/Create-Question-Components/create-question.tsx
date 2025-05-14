import { Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { Controller } from "react-hook-form";
import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Entities/Language/components/select-question-language";
import { LiftedButton } from "@/common/LiftedButton";
import {
  createMultipleChoiceQuestionInputSchema,
  useCreateMultipleChoiceQuestion,
} from "../../../api/Normal-Question/create-multiple-choice-question";
import ImageUpload from "@/utils/Image-Upload";

interface CreateMultipleChoiceFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  onSuccess: () => void;
}

export const CreateMultipleChoiceForm: React.FC<
  CreateMultipleChoiceFormProps
> = ({ categories, difficulties, languages, onSuccess }) => {
  const { addNotification } = useNotifications();
  const [imageUrl, setImageUrl] = useState("");

  const createQuestionMutation = useCreateMultipleChoiceQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Multiple Choice Question Created",
        });
        onSuccess();
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={<LiftedButton>Multiple Choice</LiftedButton>}
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
        id="create-multiple-choice-question"
        className="w-[500px]"
        onSubmit={(values) => {
          const isCorrectSelected = values.answerOptions.some(
            (option: any) => option.isCorrect
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
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "answerOptions",
          });

          const addOptionDisabled = fields.length >= 4;
          const allowMultipleSelections = watch("allowMultipleSelections");

          // Add this effect to update the form state when imageUrl changes
          useEffect(() => {
            if (imageUrl) {
              setValue("imageUrl", imageUrl);
            }
          }, [imageUrl, setValue]);

          React.useEffect(() => {
            if (fields.length === 0) {
              append({ text: "", isCorrect: false });
              append({ text: "", isCorrect: false });
            }
          }, [append, fields.length]);

          React.useEffect(() => {
            if (!allowMultipleSelections) {
              // Count how many correct answers we have
              const correctAnswers = fields.filter((_, i) =>
                watch(`answerOptions.${i}.isCorrect`)
              );

              // If we have more than one correct answer in single selection mode,
              // keep only the first one as correct
              if (correctAnswers.length > 1) {
                fields.forEach((_, i) => {
                  const shouldBeCorrect =
                    i ===
                    fields.findIndex((_, idx) =>
                      watch(`answerOptions.${idx}.isCorrect`)
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
                !watch(`answerOptions.${index}.isCorrect`)
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

          // Create a handler for image upload that updates both state and form
          const handleImageUpload = (url: string) => {
            setImageUrl(url);
            setValue("imageUrl", url);
          };
          const handleImageRemove = () => {
            setImageUrl("");
            setValue("imageUrl", "");
          };

          return (
            <>
              <Input
                id="questionText"
                variant="quiz"
                className={`py-2 w-full ${
                  formState.errors["text"] ? "border-red-500" : ""
                }`}
                placeholder="Enter your question here..."
                error={formState.errors["text"]}
                registration={register("text")}
              />
              {formState.errors.root && (
                <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                  {formState.errors.root.message}
                </p>
              )}

              {/* Modified image upload implementation */}
              <ImageUpload
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
              />
              <input type="hidden" {...register("imageUrl")} />

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
                {fields.map((field, index) => {
                  const isCorrect = watch(`answerOptions.${index}.isCorrect`);

                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-6"
                    >
                      <Input
                        className={`${
                          formState.errors["answerOptions"]
                            ? "border-red-500"
                            : ""
                        } ${
                          isCorrect
                            ? "border-2 border-green-500 dark:border-green-500"
                            : ""
                        }`}
                        placeholder={`Answer Option ${index + 1}...`}
                        error={formState.errors?.answerOptions?.[index]?.text}
                        registration={register(`answerOptions.${index}.text`)}
                      />
                      <div className="flex flex-col items-center">
                        <Switch
                          className="shadow-md"
                          id={`correct-${index}`}
                          checked={isCorrect}
                          onCheckedChange={() => handleSwitchChange(index)}
                        />
                        <Label
                          htmlFor={`correct-${index}`}
                          className="text-xs text-gray-600 mt-1"
                        >
                          Correct{" "}
                          {allowMultipleSelections ? "Option" : "Answer"}
                        </Label>
                      </div>
                      <LiftedButton
                        variant="icon"
                        className="rounded-xl bg-red-500"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </LiftedButton>
                    </div>
                  );
                })}
                {formState.errors?.answerOptions && (
                  <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                    {formState.errors.answerOptions.message ||
                      "At least one option needs to be correct!"}
                  </p>
                )}
                <LiftedButton
                  type="button"
                  className="text-sm"
                  onClick={() => append({ text: "", isCorrect: false })}
                  disabled={addOptionDisabled}
                >
                  + Add Answer Option
                </LiftedButton>
              </div>
              <CategorySelect
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
                languages={languages}
                value={watch("languageId")?.toString() || ""}
                includeAllOption={false}
                onChange={(selectedValue: string) =>
                  setValue("languageId", parseInt(selectedValue, 10))
                }
                error={formState.errors["languageId"]?.message}
                clearErrors={() => clearErrors("languageId")}
              />
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateMultipleChoiceForm;
