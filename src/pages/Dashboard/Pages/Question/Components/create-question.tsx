import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { createQuestionInputSchema, useCreateQuestion } from "../api/create-question";
import { useFieldArray } from "react-hook-form";
// import { useState } from "react";

const difficultyOptions = [
  { label: "Easy", value: 0 },
  { label: "Medium", value: 1 },
  { label: "Hard", value: 2 },
];

export const CreateQuestionForm = () => {
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
      title="Create Question"
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
        className="w-[300px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createQuestionInputSchema}
      >
        {({ register, formState, control }) => {
          const { fields, append, remove } = useFieldArray({
            control,
            name: "answerOptions",
          });

          const addOptionDisabled = fields.length >= 4;

          return (
            <>
              <Input
                placeholder="Question Text..."
                label="Question Text"
                error={formState.errors["text"]}
                registration={register("text")}
              />

              <div className="flex flex-col space-y-1.5">
                <label htmlFor="difficulty">Difficulty</label>
                <select
                  id="difficulty"
                  className="border-gray-400 rounded"
                  {...register("difficulty", { valueAsNumber: true })}
                >
                  {difficultyOptions.map((option, index) => (
                    <option key={index} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 mt-4">
                <label className="block text-sm font-medium">Answer Options</label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Input
                      placeholder={`Answer Option ${index + 1}`}
                      error={formState.errors?.answerOptions?.[index]?.text}
                      registration={register(`answerOptions.${index}.text`)}
                    />
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register(`answerOptions.${index}.isCorrect`)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 2}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    append({ text: "", isCorrect: false })
                  }
                  disabled={addOptionDisabled}
                >
                  Add Answer Option
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
