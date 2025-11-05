import { Pen, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { useFieldArray } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import {
  updateMultipleChoiceQuestionInputSchema,
  useUpdateMultipleChoiceQuestion,
} from "../../api/Multiple_Choice_Question/update-multiple-choice-question";
import { useQuizForm } from "../../../Quiz/components/Create-Quiz-Form/use-quiz-form";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { VisibilitySelect } from "../../Entities/select-visibility";
import { LiftedButton } from "@/common/LiftedButton";
import ImageUpload from "@/utils/Image-Upload";
import { MultipleChoiceQuestion } from "@/types/question-types";
import { IconButtonWithTooltip } from "../Re-Usable-Components/delete-question";
import { Authorization } from "@/lib/authorization";

interface UpdateMultipleChoiceQuestionFormProps {
  question: MultipleChoiceQuestion;
}

export const UpdateMultipleChoiceQuestionForm: React.FC<
  UpdateMultipleChoiceQuestionFormProps
> = ({ question }) => {
  const { addNotification } = useNotifications();
  const [imageUrl, setImageUrl] = useState(question.imageUrl || "");
  const { queryData } = useQuizForm();

  const updateQuestionMutation = useUpdateMultipleChoiceQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Multiple Choice Question Updated",
        });
      },
    },
  });

  return (
    <Authorization   policyCheck="question:modify" resource={question}>
      <FormDrawer
        isDone={updateQuestionMutation.isSuccess}
        triggerButton={
          <IconButtonWithTooltip
            icon={<Pen className="size-4" />}
            tooltip="Edit Question"
            variant="icon"
          />
        }
        title="Update Question"
        submitButton={
          <Button
            form="update-question"
            variant="addSave"
            className="rounded-sm text-white "
            type="submit"
            size="default"
            isPending={updateQuestionMutation.isPending}
            disabled={updateQuestionMutation.isPending}>
            Update
          </Button>
        }>
        <Form
          id="update-question"
          className="w-[500px]"
          options={{
            defaultValues: {
              id: question.id,
              text: question.text,
              imageUrl: question.imageUrl || null,
              categoryId: question.category.id,
              difficultyId: question.difficulty.id,
              languageId: question.language.id,
              visibility: question.visibility,
              answerOptions: question.answerOptions,
              allowMultipleSelections:
                question.allowMultipleSelections || false,
            },
          }}
          onSubmit={(values) => {
            const isCorrectSelected = values.answerOptions.some(
              (option: any) => option.isCorrect
            );

            if (!isCorrectSelected) {
              return;
            }

            updateQuestionMutation.mutate({
              data: values,
              questionId: question.id,
            });
          }}
          schema={updateMultipleChoiceQuestionInputSchema}>
          {({ register, formState, control, setValue, watch, clearErrors }) => {
            const { fields, remove, append } = useFieldArray({
              control,
              name: "answerOptions",
            });

            const addOptionDisabled = fields.length >= 4;

            const handleSwitchChange = (index: number) => {
              // If allowMultipleSelections is true, don't unselect other options
              if (!watch("allowMultipleSelections")) {
                const updatedOptions = fields.map((field, i) => ({
                  ...field,
                  isCorrect: i === index,
                }));
                updatedOptions.forEach((option, i) => {
                  setValue(`answerOptions.${i}.isCorrect`, option.isCorrect);
                });
              } else {
                // Just toggle the current option
                const currentValue = watch(`answerOptions.${index}.isCorrect`);
                setValue(`answerOptions.${index}.isCorrect`, !currentValue);
              }

              if (
                watch("answerOptions").some((option: any) => option.isCorrect)
              ) {
                clearErrors("answerOptions");
              }
            };

            const handleImageUpload = (url: string) => {
              setImageUrl(url);
              setValue("imageUrl", url);
            };
            const handleImageRemove = () => {
              setImageUrl("");
              setValue("imageUrl", "");
            };

            useEffect(() => {
              if (imageUrl) {
                setValue("imageUrl", imageUrl);
              }
            }, [imageUrl, setValue]);

            return (
              <>
                <Input
                  variant="quiz"
                  id="questionText"
                  className={formState.errors["text"] ? "border-red-500" : ""}
                  error={formState.errors["text"]}
                  registration={register("text")}
                />
                <ImageUpload
                  initialImageUrl={imageUrl}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                />
                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="allowMultipleSelections"
                    checked={watch("allowMultipleSelections")}
                    onCheckedChange={(checked: boolean) => {
                      setValue("allowMultipleSelections", checked);
                    }}
                  />
                  <Label htmlFor="allowMultipleSelections">
                    Allow Multiple Selections
                  </Label>
                </div>

                <Separator className="bg-gray-500" />

                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Answer Options</Label>
                  </div>
                  {fields.map((field, index) => {
                    const isCorrect = watch(`answerOptions.${index}.isCorrect`);

                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between gap-6">
                        <Input
                          className={`${
                            formState.errors["answerOptions"]
                              ? "border-red-500"
                              : ""
                          } ${isCorrect ? "border-2 border-green-500" : ""}`}
                          placeholder={`Answer Option ${index + 1}`}
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
                            className="text-xs text-gray-600 mt-1">
                            Correct
                          </Label>
                        </div>
                        <LiftedButton
                          variant="icon"
                          className="rounded-xl bg-red-400"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 2}>
                          <Trash2 className="h-4 w-4 " />
                        </LiftedButton>
                      </div>
                    );
                  })}
                  {formState.errors?.answerOptions && (
                    <p className="text-sm text-red-500">
                      At least one option needs to be correct!
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="addSave"
                    size="sm"
                    onClick={() => append({ text: "", isCorrect: false })}
                    disabled={addOptionDisabled}>
                    Add Answer Option
                  </Button>
                </div>
                <Separator className="bg-gray-500" />
                <div className="grid grid-cols-2 gap-4 ">
                  <CategorySelect
                    label="Category"
                    categories={queryData.categories}
                    value={watch("categoryId")?.toString() || ""}
                    onChange={(value: string) =>
                      setValue("categoryId", parseInt(value, 10))
                    }
                    includeAllOption={false}
                    error={formState.errors["categoryId"]?.message}
                    clearErrors={() => clearErrors("categoryId")}
                  />

                  <DifficultySelect
                    label="Difficulty"
                    difficulties={queryData.difficulties}
                    value={watch("difficultyId")?.toString()}
                    onChange={(value: string) =>
                      setValue("difficultyId", parseInt(value, 10))
                    }
                    includeAllOption={false}
                    error={formState.errors["difficultyId"]?.message}
                    clearErrors={() => clearErrors("difficultyId")}
                  />

                  <LanguageSelect
                    label="Language"
                    languages={queryData.languages}
                    value={watch("languageId")?.toString()}
                    onChange={(value: string) =>
                      setValue("languageId", parseInt(value, 10))
                    }
                    includeAllOption={false}
                    error={formState.errors["languageId"]?.message}
                    clearErrors={() => clearErrors("languageId")}
                  />

                  <VisibilitySelect
                    label="Visibility"
                    value={watch("visibility")}
                    onChange={(value: string) => setValue("visibility", value)}
                    error={formState.errors["visibility"]?.message}
                    clearErrors={() => clearErrors("visibility")}
                  />
                </div>
              </>
            );
          }}
        </Form>
      </FormDrawer>
    </Authorization>
  );
};

export default UpdateMultipleChoiceQuestionForm;
