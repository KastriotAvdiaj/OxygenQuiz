import { useNotifications } from "@/common/Notifications";
import { useCreateQuestionDifficulty } from "../api/create-question-difficulty";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { createQuestionDifficultyInputSchema } from "../api/create-question-difficulty";
import { LiftedButton } from "@/common/LiftedButton";

export const CreateQuestionDifficultyForm = () => {
  const { addNotification } = useNotifications();
  const createQuestionDifficultyMutation = useCreateQuestionDifficulty({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Difficulty Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionDifficultyMutation.isSuccess}
      triggerButton={
        <LiftedButton className="text-xs">+ New Difficulty</LiftedButton>
      }
      title="Create New Question Difficulty"
      submitButton={
        <Button
          form="create-question-difficulty"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createQuestionDifficultyMutation.isPending}
          disabled={createQuestionDifficultyMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-question-difficulty"
        onSubmit={(values) => {
          createQuestionDifficultyMutation.mutate({ data: values });
        }}
        schema={createQuestionDifficultyInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty
                </Label>
                <Input
                  id="level"
                  className={`py-2 ${
                    formState.errors["level"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter new level here..."
                  error={formState.errors["level"]}
                  registration={register("level")}
                />

                <Input
                  id="weight"
                  className={`py-2 ${
                    formState.errors["weight"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  type="number"
                  placeholder="Enter weight here..."
                  error={formState.errors["weight"]}
                  registration={register("weight", { valueAsNumber: true })}
                />
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionDifficultyForm;
