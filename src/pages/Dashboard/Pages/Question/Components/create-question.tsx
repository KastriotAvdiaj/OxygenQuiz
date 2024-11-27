import { Plus, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormDrawer, Input, Label } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import {
  createQuestionInputSchema,
  useCreateQuestion,
} from "../api/create-question";
import { useFieldArray } from "react-hook-form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Switch,
} from "@/components/ui";

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
        className="w-[400px]"
        onSubmit={(values) => {
          createQuestionMutation.mutate({
            data: values,
          });
        }}
        schema={createQuestionInputSchema}
      >
        {({ register, formState, control, setValue, watch }) => {
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
            // Set all switches to false
            const updatedOptions = fields.map((field, i) => ({
              ...field,
              isCorrect: i === index, // Only the current index gets checked
            }));

            // Update the entire field array
            updatedOptions.forEach((option, i) => {
              setValue(`answerOptions.${i}.isCorrect`, option.isCorrect);
            });
          };

          return (
            <>
              <Input
                className="py-6"
                placeholder="Question Text..."
                label="Question Text"
                error={formState.errors["text"]}
                registration={register("text")}
              />
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("difficulty", parseInt(value))
                  }
                >
                  <SelectTrigger id="difficulty" className="border-gray-400">
                    <SelectValue placeholder="Select Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-background-secondary cursor-pointer">
                    {difficultyOptions.map((option) => (
                      <SelectItem
                        className="hover:bg-background cursor-pointer focus:bg-background"
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 mt-4">
                <Label className="block text-sm font-medium">
                  Answer Options
                </Label>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between"
                  >
                    <Input
                      placeholder={`Answer Option ${index + 1}`}
                      error={formState.errors?.answerOptions?.[index]?.text}
                      registration={register(`answerOptions.${index}.text`)}
                    />
                    <Switch
                      id={`correct-${index}`}
                      checked={watch(`answerOptions.${index}.isCorrect`)}
                      onCheckedChange={() => handleSwitchChange(index)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-sm"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                ))}
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
