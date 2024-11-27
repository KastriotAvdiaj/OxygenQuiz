import { useState } from "react";
import { Form, Input } from "@/components/ui/form";
import { FormDrawer } from "@/components/ui/form";
import { Label } from "@/components/ui/form/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQuestionInputSchema,
  useCreateQuestion,
} from "../api/create-question";
import { useNotifications } from "@/common/Notifications";
import { FieldError } from "react-hook-form";

export const NewQuestion = () => {
  const [selectedWrongAnswers, setSelectedWrongAnswers] = useState<number>(3);
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

  const difficultyMap: Record<string, number> = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
    "Extra Hard": 4,
  };

  const handleSubmit = (values: any) => {
    console.log("HandleSubmit");
    const answerOptions = [
      { text: values.correctAnswer, isCorrect: true },
      ...Array.from({ length: selectedWrongAnswers }).map((_, index) => ({
        text: values[`wrongAnswer${index + 1}`],
        isCorrect: false,
      })),
    ];

    createQuestionMutation.mutate({
      data: {
        text: values.question,
        difficulty: difficultyMap[values.difficulty] || 1, // Map string to number
        answerOptions,
      },
    });
  };

  return (
    <FormDrawer
      isDone={createQuestionMutation.isSuccess}
      triggerButton={
        <Button
          variant="addSave"
          className="bg-text-hover rounded-sm text-white"
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
        onSubmit={() => handleSubmit}
        schema={createQuestionInputSchema}
      >
        {({ register, formState, setValue }) => (
          <div className="grid w-full items-center gap-8">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="Question..."
                error={formState.errors["question"] as FieldError}
                registration={register("question")}
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label>Number of Wrong Answers</Label>
              <div className="flex space-x-4">
                {[1, 2, 3].map((value) => (
                  <label
                    key={value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedWrongAnswers === value}
                      onCheckedChange={() => setSelectedWrongAnswers(value)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  placeholder="Correct Answer..."
                  label="Correct Answer"
                  error={formState.errors["correctAnswer"] as FieldError}
                  registration={register("correctAnswer")}
                />
              </div>

              {Array.from({ length: selectedWrongAnswers }).map((_, index) => (
                <div key={index} className="flex flex-col space-y-1.5">
                  <Input
                    placeholder={`Wrong Answer ${index + 1}...`}
                    label={`Wrong Answer ${index + 1}`}
                    error={
                      formState.errors[`wrongAnswer${index + 1}`] as FieldError
                    }
                    registration={register(`wrongAnswer${index + 1}`)}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label>Difficulty</Label>
              <Select onValueChange={(value) => setValue("difficulty", value)}>
                <SelectTrigger className="border-gray-400">
                  <SelectValue placeholder="Select Difficulty" />
                </SelectTrigger>
                <SelectContent className="cursor-pointer bg-[var(--background-secondary)]">
                  {[
                    { label: "Easy", value: "Easy" },
                    { label: "Medium", value: "Medium" },
                    { label: "Hard", value: "Hard" },
                    { label: "Extra Hard", value: "Extra Hard" },
                  ].map((difficulty) => (
                    <SelectItem
                      key={difficulty.value}
                      value={difficulty.value}
                      className="cursor-pointer hover:!bg-[var(--background)]"
                    >
                      {difficulty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Form>
    </FormDrawer>
  );
};
