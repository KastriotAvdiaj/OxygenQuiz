import { Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";

import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import {
  createTypeTheAnswerQuestionInputSchema,
  useCreateTypeTheAnswerQuestion,
} from "../../api/Type_The_Answer-Question/create-type-the-answer-question";
import { Switch } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";

interface CreateTypeAnswerQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
}

export const CreateTypeAnswerQuestionForm: React.FC<
  CreateTypeAnswerQuestionFormProps
> = ({ categories, difficulties, languages }) => {
  const { addNotification } = useNotifications();

  const createQuestionMutation = useCreateTypeTheAnswerQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Type Answer Question Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={<LiftedButton>Type Answer</LiftedButton>}
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
        id="create-type-answer-question"
        className="w-[500px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createTypeTheAnswerQuestionInputSchema}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "acceptableAnswers",
          });

          React.useEffect(() => {
            if (fields.length === 0) {
              append("");
            }
          }, [append, fields.length]);

          return (
            <>
              <div className="grid grid-[2fr_1fr] w-full gap-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="questionText"
                    className="text-foreground text-sm font-medium"
                  >
                    Question Text
                  </Label>
                  <Input
                    id="questionText"
                    className={`py-2 w-full ${
                      formState.errors["text"] ? "border-red-500" : ""
                    }`}
                    placeholder="Enter your question here..."
                    error={formState.errors["text"]}
                    registration={register("text")}
                  />
                </div>
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
              </div>
              <Separator className="bg-gray-500" />
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
              <Separator className="bg-gray-500" />
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
              <Separator className="bg-gray-500" />

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    Correct Answer
                  </Label>
                  <Input
                    className={`max-w-[300px] ${
                      formState.errors["correctAnswer"] ? "border-red-500" : ""
                    }`}
                    placeholder="Enter the correct answer..."
                    error={formState.errors["correctAnswer"]}
                    registration={register("correctAnswer")}
                  />
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    Acceptable Answers
                  </Label>
                  <div className="flex space-x-2">
                    <Button
                      variant="addSave"
                      size="sm"
                      type="button"
                      className="rounded-sm"
                      onClick={() => append("")}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Answer
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <Input
                        className={`${
                          formState.errors?.acceptableAnswers?.[index]
                            ? "border-red-500"
                            : ""
                        }`}
                        placeholder={`Alternative answer ${index + 1}...`}
                        error={formState.errors?.acceptableAnswers?.[index]}
                        registration={register(`acceptableAnswers.${index}`)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="caseSensitive"
                      checked={watch("isCaseSensitive") === true}
                      onCheckedChange={(checked) =>
                        setValue("isCaseSensitive", checked)
                      }
                    />
                    <Label
                      htmlFor="caseSensitive"
                      className="text-sm text-gray-700"
                    >
                      Case Sensitive
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowPartialMatch"
                      checked={!watch("allowPartialMatch") === true}
                      onCheckedChange={(checked) =>
                        setValue("allowPartialMatch", !checked)
                      }
                    />
                    <Label
                      htmlFor="allowPartialMatch"
                      className="text-sm text-gray-700"
                    >
                      Exact Match Required
                    </Label>
                  </div>
                </div>
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateTypeAnswerQuestionForm;
