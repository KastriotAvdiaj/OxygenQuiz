import { Check, Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";

import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionLanguage,
} from "@/types/ApiTypes";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import {
  createTrueFalseQuestionInputSchema,
  useCreateTrueFalseQuestion,
} from "../../api/True_False-Question/create-true_false-question";
import { LiftedButton } from "@/common/LiftedButton";

interface CreateTrueFalseQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
}

export const CreateTrueFalseQuestionForm: React.FC<
  CreateTrueFalseQuestionFormProps
> = ({ categories, difficulties, languages }) => {
  const { addNotification } = useNotifications();

  const createQuestionMutation = useCreateTrueFalseQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "True/False Question Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={<LiftedButton>True/False</LiftedButton>}
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
        id="create-true-false-question"
        className="w-[500px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createTrueFalseQuestionInputSchema}
      >
        {({ register, formState, setValue, watch, clearErrors }) => {
          const checkCorrectAnswer = (value: boolean) => {
            setValue("correctAnswer", value);
            clearErrors("correctAnswer");
          };

          return (
            <>
              <div className="grid grid-[2fr_1fr] w-full gap-5">
                <div className="space-y-2">
                  <Input
                    id="text"
                    variant="quiz"
                    className={`py-2 w-full ${
                      formState.errors["text"] ? "border-red-500" : ""
                    }`}
                    placeholder="Enter your statement here..."
                    error={formState.errors["text"]}
                    registration={register("text")}
                  />
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
                <Separator className="bg-gray-500" />

                <CategorySelect
                  // label="Category"
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
              <DifficultySelect
                // label="Difficulty"
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
                // label="Language"
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

export default CreateTrueFalseQuestionForm;
