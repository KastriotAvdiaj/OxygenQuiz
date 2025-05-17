import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { TrueFalseQuestion } from "@/types/ApiTypes";
import { Separator } from "@/components/ui/separator";
import { LiftedButton } from "@/common/LiftedButton";

import ImageUpload from "@/utils/Image-Upload";
import {
  updateTrueFalseQuestionInputSchema,
  useUpdateTrueFalseQuestion,
} from "../../api/True_False-Question/update-true_false-question";
import { DifficultySelect } from "../../Entities/Difficulty/Components/select-question-difficulty";
import { CategorySelect } from "../../Entities/Categories/Components/select-question-category";
import { LanguageSelect } from "../../Entities/Language/components/select-question-language";
import { useQuizForm } from "../../../Quiz/components/Create-Quiz-Form/use-quiz-form";
import { VisibilitySelect } from "../../Entities/select-visibility";
import { Check, Edit2Icon } from "lucide-react";

interface UpdateTrueFalseQuestionFormProps {
  question: TrueFalseQuestion;
}

export const UpdateTrueFalseQuestionForm: React.FC<
  UpdateTrueFalseQuestionFormProps
> = ({ question }) => {
  const { addNotification } = useNotifications();
  const [imageUrl, setImageUrl] = useState(question.imageUrl || "");
  const { queryData } = useQuizForm();

  const updateQuestionMutation = useUpdateTrueFalseQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "True/False Question Updated",
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
        <LiftedButton variant="icon">
          <Edit2Icon className="size-4" />
        </LiftedButton>
      }
      title="Update True/False Question"
      submitButton={
        <Button
          form="update-true-false-question"
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
        id="update-true-false-question"
        className="w-[500px]"
        defaultValues={question}
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
          },
        }}
        onSubmit={(values) => {
          updateQuestionMutation.mutate({
            data: values,
            questionId: question.id,
          });
        }}
        schema={updateTrueFalseQuestionInputSchema}
      >
        {({ register, formState, setValue, watch, clearErrors }) => {
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

              <Separator className="bg-gray-500" />

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    Correct Answer
                  </Label>
                </div>
                <div className="flex items-center justify-around rounded-sm">
                  <div className="flex flex-col w-full items-center bg-primary/80 dark:bg-primary/80 rounded-md p-2">
                    <button
                      id="true-option"
                      type="button"
                      onClick={() => setValue("correctAnswer", true)}
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
                      onClick={() => setValue("correctAnswer", false)}
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
              </div>
              <div className="grid grid-cols-2 gap-4 ">
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
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default UpdateTrueFalseQuestionForm;
