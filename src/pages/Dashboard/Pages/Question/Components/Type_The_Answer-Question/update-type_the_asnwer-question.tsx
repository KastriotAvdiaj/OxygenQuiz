import React, { useState, useEffect } from "react";
import { Pen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { Separator } from "@/components/ui/separator";
import { LiftedButton } from "@/common/LiftedButton";
import ImageUpload from "@/utils/Image-Upload";
import { useFieldArray } from "react-hook-form";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { VisibilitySelect } from "../../Entities/select-visibility";
import {
  Switch,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { useQuizForm } from "../../../Quiz/components/Create-Quiz-Form/use-quiz-form";
import {
  UpdateTypeTheAnswerQuestionInput,
  updateTypeTheAnswerQuestionInputSchema,
  useUpdateTypeTheAnswerQuestion,
} from "../../api/Type_The_Answer-Question/update-type_the_answer-question";
import { TypeTheAnswerQuestion } from "@/types/question-types";
import { IconButtonWithTooltip } from "../Re-Usable-Components/delete-question";

interface UpdateTypeAnswerQuestionFormProps {
  question: TypeTheAnswerQuestion;
}

export const UpdateTypeAnswerQuestionForm: React.FC<
  UpdateTypeAnswerQuestionFormProps
> = ({ question }) => {
  const { addNotification } = useNotifications();
  const [imageUrl, setImageUrl] = useState(question.imageUrl || "");
  const { queryData } = useQuizForm();

  const transformAcceptableAnswersForForm = (answers: string[]) => {
    return answers.map((answer) => ({ value: answer }));
  };

  const updateQuestionMutation = useUpdateTypeTheAnswerQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Type The Answer Question Updated",
        });
      },
      onError: (error: any) => {
        addNotification({
          type: "error",
          title: "Failed to update question",
          message: `Error: ${error.message}`,
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={updateQuestionMutation.isSuccess}
      triggerButton={
        <IconButtonWithTooltip
              icon={<Pen className="size-4" />}
              tooltip="Edit Question"
              variant="icon"
            />
      }
      title="Update Type The Answer Question"
      submitButton={
        <Button
          form="update-type-answer-question"
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
        id="update-type-answer-question"
        className="w-[500px]"
        options={{
          defaultValues: {
            id: question.id,
            text: question.text,
            imageUrl: question.imageUrl,
            correctAnswer: question.correctAnswer,
            categoryId: question.category.id,
            difficultyId: question.difficulty.id,
            languageId: question.language.id,
            visibility: question.visibility,
            // Transform string array to object array for the form
            acceptableAnswers: transformAcceptableAnswersForForm(
              question.acceptableAnswers
            ),
            isCaseSensitive: question.isCaseSensitive,
            allowPartialMatch: question.allowPartialMatch,
          },
        }}
        onSubmit={(values) => {
          updateQuestionMutation.mutate({
            data: values,
            questionId: question.id,
          });
        }}
        schema={updateTypeTheAnswerQuestionInputSchema}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray<
            UpdateTypeTheAnswerQuestionInput,
            "acceptableAnswers",
            "id"
          >({
            control: control,
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

              {/* Image upload implementation */}
              <ImageUpload
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
                initialImageUrl={imageUrl}
              />
              <input type="hidden" {...register("imageUrl")} />

              <div className="space-y-4 mt-4">
                <div className="flex flex-col">
                  <Input
                    label="Correct Answer"
                    variant="isCorrect"
                    className={`${
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

                <div className="grid grid-cols-2 gap-4 border-t pt-4 dark:border-foreground/30">
                  <CategorySelect
                    label="Category"
                    categories={queryData.categories}
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
                    difficulties={queryData.difficulties}
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
                    languages={queryData.languages}
                    value={watch("languageId")?.toString() || ""}
                    includeAllOption={false}
                    onChange={(selectedValue: string) =>
                      setValue("languageId", parseInt(selectedValue, 10))
                    }
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
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default UpdateTypeAnswerQuestionForm;
