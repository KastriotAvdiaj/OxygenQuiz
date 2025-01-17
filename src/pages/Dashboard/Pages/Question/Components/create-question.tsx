import { Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import {
  createQuestionInputSchema,
  useCreateQuestion,
} from "../api/create-question";
import { QuestionCategory, QuestionDifficulty } from "@/types/ApiTypes";
import { useFieldArray } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CategorySelect } from "../Entities/Categories/Components/select-question-category";
import { DifficultySelect } from "../Entities/Difficulty/Components/select-difficulty";

interface CreateQuestionFormProps {
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
}

export const CreateQuestionForm: React.FC<CreateQuestionFormProps> = ({
  categories,
  difficulties,
}) => {
  const { addNotification } = useNotifications();
  const createQuestionMutation = useCreateQuestion({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={
        <Button
          variant="default"
          className="bg-background"
          size="sm"
          icon={<Plus className="size-4" />}
        >
          Create Question
        </Button>
      }
      title="Create a New Question"
      submitButton={
        <Button
          form="create-question"
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
        id="create-question"
        className="w-[500px]"
        onSubmit={(values) => {
          const isCorrectSelected = values.answerOptions.some(
            (option) => option.isCorrect
          );

          if (!isCorrectSelected) {
            return;
          }

          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createQuestionInputSchema}
      >
        {({ register, formState, control, setValue, watch, clearErrors }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "answerOptions",
          });

          const addOptionDisabled = fields.length >= 4;

          React.useEffect(() => {
            if (fields.length === 0) {
              append({ text: "", isCorrect: false });
              append({ text: "", isCorrect: false });
            }
          }, [append, fields.length]);

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
                  <Label htmlFor="questionText" className="text-sm font-medium">
                    Question Text
                  </Label>
                  <Input
                    id="questionText"
                    className={`py-2 w-full ${
                      formState.errors["text"]
                        ? "border-red-500"
                        : "border-border"
                    }`}
                    placeholder="Enter your question here..."
                    error={formState.errors["text"]}
                    registration={register("text")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category
                  </Label>
                  <CategorySelect
                    categories={categories}
                    selectedCategory=""
                    includeAllOption={false}
                    onCategoryChange={(value) => setValue("category", value)}
                  />
                </div>
              </div>
              <Separator className="bg-gray-500" />
              <DifficultySelect
                difficulties={difficulties}
                selectedDifficulty={
                  difficulties.find((d) => d.id === watch("difficultyId"))
                    ?.level || ""
                }
                includeAllOption={false}
                onDifficultyChange={(level) => {
                  const selectedDifficulty = difficulties.find(
                    (d) => d.level === level
                  );
                  if (selectedDifficulty) {
                    setValue("difficultyId", selectedDifficulty.id); // Store the ID in the form
                  }
                }}
              />
              <Separator className="bg-gray-500" />

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="block text-sm font-medium">
                    Answer Options
                  </Label>
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
                          Correct for Option {index + 1}
                        </Label>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {formState.errors?.answerOptions && (
                  <p className="text-sm text-red-500 font-semibold border border-red-500 p-2 text-center">
                    {formState.errors.answerOptions.message ||
                      "One option needs to be correct!"}
                  </p>
                )}
                <Button
                  variant="addSave"
                  size="sm"
                  className="mt-2 rounded-sm"
                  onClick={() => append({ text: "", isCorrect: false })}
                  disabled={addOptionDisabled}
                >
                  + Add Answer Option
                </Button>
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionForm;
