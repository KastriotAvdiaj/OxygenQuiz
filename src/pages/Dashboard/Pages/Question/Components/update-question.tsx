import { Pen } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { Question } from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import {
  updateQuestionInputSchema,
  useUpdateQuestion,
} from "../api/update-question";
import { CategorySelect } from "../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../Entities/Language/components/select-question-language";
import { useQuizForm } from "../../Quiz/components/Create-Quiz-Form/use-quiz-form";
import { VisibilitySelect } from "../Entities/select-visibility";

interface UpdateQuestionFormProps {
  question: Question;
}

export const UpdateQuestionForm: React.FC<UpdateQuestionFormProps> = ({
  question,
}) => {
  const { addNotification } = useNotifications();
  const { queryData } = useQuizForm();

  const updateQuestionMutation = useUpdateQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Updated",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={updateQuestionMutation.isSuccess}
      triggerButton={
        <Button size="sm" icon={<Pen className="size-4 mr-0" />}></Button>
      }
      title="Update Question"
      submitButton={
        <Button
          form="update-question"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={updateQuestionMutation.isPending}
          disabled={updateQuestionMutation.isPending}
        >
          Update
        </Button>
      }
    >
      <Form
        id="update-question"
        className="w-[500px]"
        options={{
          defaultValues: {
            text: question.text,
            categoryId: question.category.id,
            difficultyId: question.difficulty.id,
            languageId: question.language.id,
            visibility: question.visibility,
            answerOptions: question.answerOptions,
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
        schema={updateQuestionInputSchema}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, remove } = useFieldArray({
            control,
            name: "answerOptions",
          });

          //   const addOptionDisabled = fields.length >= 4;

          const handleSwitchChange = (index: number) => {
            const updatedOptions = fields.map((field, i) => ({
              ...field,
              isCorrect: i === index,
            }));
            updatedOptions.forEach((option, i) => {
              setValue(`answerOptions.${i}.isCorrect`, option.isCorrect);
            });

            if (updatedOptions.some((option) => option.isCorrect)) {
              clearErrors("answerOptions");
            }
          };

          return (
            <>
              <div className="grid grid-[2fr_1fr] w-full gap-5">
                <div className="space-y-2">
                  <Label htmlFor="questionText">Question Text</Label>
                  <Input
                    id="questionText"
                    className={formState.errors["text"] ? "border-red-500" : ""}
                    error={formState.errors["text"]}
                    registration={register("text")}
                  />
                </div>
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
              </div>
              <Separator className="bg-gray-500" />
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
              <Separator className="bg-gray-500" />
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
                      className="flex items-center justify-between gap-6"
                    >
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
                          className="text-xs text-gray-600 mt-1"
                        >
                          Correct
                        </Label>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
                {formState.errors?.answerOptions && (
                  <p className="text-sm text-red-500">
                    One option needs to be correct!
                  </p>
                )}
                {/* <Button
                  type="button"
                  variant="addSave"
                  size="sm"
                  onClick={() => append({ text: "", isCorrect: false })}
                  disabled={addOptionDisabled}
                >
                  Add Answer Option
                </Button> */}
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default UpdateQuestionForm;
