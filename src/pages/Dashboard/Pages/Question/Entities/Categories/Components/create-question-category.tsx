import * as React from "react";
import { useNotifications } from "@/common/Notifications";
import { useCreateQuestionCategory } from "../api/create-question-categories";
import { FormDrawer, Form, Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui";
import { LiftedButton } from "@/common/LiftedButton";
import {
  createQuestionCategoryInputSchema,
  CreateQuestionCategoryInput,
} from "../api/create-question-categories";
import { ColorPaletteInput } from "./color-palette-input";

export const CreateQuestionCategoryForm = () => {
  const { addNotification } = useNotifications();
  const [palette, setPalette] = React.useState<string[]>(["", "", ""]);
  const [isGradient, setIsGradient] = React.useState(false);

  const createQuestionCategoryMutation = useCreateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Created",
        });
        // Reset palette state. The form state will reset when the drawer closes/re-opens.
        setPalette(["", "", ""]);
        setIsGradient(false);
      },
    },
  });

  const onSubmit = (values: CreateQuestionCategoryInput) => {
    const validColors = palette.filter(
      (color) => color && /^#[0-9A-F]{6}$/i.test(color)
    );

    // if (validColors.length === 0) {
    //   addNotification({
    //     type: "error",
    //     title: "Please select at least one valid color",
    //   });
    //   return;
    // } // Choose whether to add this or not, in the backend it's optional

    const submissionData = {
      ...values,
      colorPalette: validColors,
      isGradient: isGradient,
    };
    createQuestionCategoryMutation.mutate({ data: submissionData });
  };

  return (
    <FormDrawer
      className="max-w-200"
      isDone={createQuestionCategoryMutation.isSuccess}
      triggerButton={
        <LiftedButton className="text-xs">+ New Category</LiftedButton>
      }
      title="Create New Question Category"
      submitButton={
        <Button
          form="create-question-category"
          type="submit"
          className="text-white"
        >
          Submit
        </Button>
      }
    >
      <Form
        id="create-question-category"
        onSubmit={onSubmit}
        schema={createQuestionCategoryInputSchema}
        options={{
          defaultValues: { name: "", colorPalette: [] },
        }}
      >
        {({ register, formState }) => {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Category Name
                </Label>
                <Input
                  id="name"
                  variant="minimal"
                  className={`py-2 ${
                    formState.errors["name"]
                      ? "border-red-500"
                      : "border-border"
                  }`}
                  placeholder="Enter category name..."
                  error={formState.errors["name"]}
                  registration={register("name")}
                />
              </div>

              <ColorPaletteInput
                palette={palette}
                onChange={setPalette}
                isGradient={isGradient}
                onGradientChange={setIsGradient}
              />
            </div>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionCategoryForm;
