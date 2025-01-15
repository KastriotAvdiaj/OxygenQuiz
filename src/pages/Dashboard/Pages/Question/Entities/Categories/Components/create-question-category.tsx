import { useNotifications } from "@/common/Notifications";
import { useCreateQuestionCategory } from "../api/create-question-categories";
import { FormDrawer } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { createQuestionCategoryInputSchema } from "../api/create-question-categories";

export const CreateQuestionCategoryForm = () => {
  const { addNotification } = useNotifications();
  const createQuestionCategoryMutation = useCreateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Created",
        });
      },
    },
  });

  return (
    <FormDrawer
      isDone={createQuestionCategoryMutation.isSuccess}
      triggerButton={
        <Button
          variant="default"
          className="bg-background"
          size="sm"
          icon={<Plus className="size-4" />}
        >
          Create New Category
        </Button>
      }
      title="Create New Question Category"
      submitButton={
        <Button
          form="create-question-cateogry"
          variant="addSave"
          className="rounded-sm text-white"
          type="submit"
          size="default"
          isPending={createQuestionCategoryMutation.isPending}
          disabled={createQuestionCategoryMutation.isPending}
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-question-cateogry"
        onSubmit={(values) => {
          createQuestionCategoryMutation.mutate({ data: values });
        }}
        schema={createQuestionCategoryInputSchema}
      >
        {({ register, formState }) => {
          return (
            <>
              <div>
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <Input
                  id="category"
                  className={`py-2 ${
                    formState.errors["name"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter new category here..."
                  error={formState.errors["name"]}
                  registration={register("name")}
                />
              </div>
            </>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionCategoryForm;
