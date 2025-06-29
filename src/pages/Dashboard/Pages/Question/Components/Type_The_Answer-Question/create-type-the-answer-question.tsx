import { Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";

import { useFieldArray } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import {
  createTypeTheAnswerQuestionInputSchema,
  useCreateTypeTheAnswerQuestion,
} from "../../api/Type_The_Answer-Question/create-type-the-answer-question";
import {
  Switch,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import ImageUpload from "@/utils/Image-Upload";
import { QuestionCategory, QuestionDifficulty, QuestionLanguage } from "@/types/question-types";

interface CreateTypeAnswerQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  languages: QuestionLanguage[];
  onSuccess?: () => void;
  title?: string;
}

export const CreateTypeAnswerQuestionForm: React.FC<
  CreateTypeAnswerQuestionFormProps
> = ({ categories, difficulties, languages, onSuccess, title }) => {
  const { addNotification } = useNotifications();
  const [imageUrl, setImageUrl] = useState("");

  const createQuestionMutation = useCreateTypeTheAnswerQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Type Answer Question Created",
        });
        onSuccess?.();
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={
        <LiftedButton>{title ? title : "Type The Answer"}</LiftedButton>
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
            difficultyId: undefined,
            categoryId: undefined,
            languageId: undefined,
            correctAnswer: "",
            isCaseSensitive: false,
            allowPartialMatch: false,
            acceptableAnswers: [],
            visibility: undefined,
            imageUrl: "",
          },
        }}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "acceptableAnswers",
          });

          useEffect(() => {
            if (imageUrl) {
              setValue("imageUrl", imageUrl);
            }
          }, [imageUrl, setValue]);

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
                label="Question"
                variant="quiz"
                id="questionText"
                className={`py-2 w-full ${
                  formState.errors["text"] ? "border-red-500" : ""
                }`}
                placeholder="Enter your question here..."
                error={formState.errors["text"]}
                registration={register("text")}
              />
              <ImageUpload
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
              />
              <input type="hidden" {...register("imageUrl")} />
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
                    Acceptable Answers
                  </Label>
                  <div className="flex space-x-2">
                    <LiftedButton
                      type="button"
                      className="text-[12px]"
                      onClick={() => append({ value: "" })}
                    >
                      + Add Answer
                    </LiftedButton>
                  </div>
                </div>
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
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-xl"
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
                          <p className="bg-background p-2 rounded-md text-sm text-foreground border border-foreground dark:border-foreground/30 mb-2">
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
                          <p className="bg-background p-2 rounded-md text-sm text-foreground border border-foreground dark:border-foreground/30 mb-2 mr-3">
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
                </section>
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateTypeAnswerQuestionForm;
