import * as React from "react";
import { useNotifications } from "@/common/Notifications";
import { useUpdateQuestionCategory } from "../api/update-question-category";
import { FormDrawer, Form, Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui";
import {
  updateQuestionCategoryInputSchema,
  UpdateQuestionCategoryInput,
} from "../api/update-question-category";
import { QuestionCategory } from "@/types/question-types";
import { ColorPaletteInput } from "./color-palette-input";

interface UpdateQuestionCategoryFormProps {
  category: QuestionCategory;
  triggerButton: React.ReactNode;
}

export const UpdateQuestionCategoryForm: React.FC<
  UpdateQuestionCategoryFormProps
> = ({ category, triggerButton }) => {
  const { addNotification } = useNotifications();
  const [palette, setPalette] = React.useState<string[]>(() => {
    try {
      return category.colorPaletteJson
        ? JSON.parse(category.colorPaletteJson)
        : ["", "", ""];
    } catch {
      return ["", "", ""];
    }
  });
  const [isGradient, setIsGradient] = React.useState(
    category.gradient || false
  );

  const updateQuestionCategoryMutation = useUpdateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Updated",
        });
      },
    },
  });

  const onSubmit = (values: UpdateQuestionCategoryInput) => {
    const validColors = palette.filter(
      (color) => color && /^#[0-9A-F]{6}$/i.test(color)
    );

    if (validColors.length === 0) {
      addNotification({
        type: "error",
        title: "Please select at least one valid color",
      });
      return;
    }

    const submissionData = {
      ...values,
      colorPaletteJson: JSON.stringify(validColors),
      gradient: isGradient,
    };

    updateQuestionCategoryMutation.mutate({
      data: submissionData,
      categoryId: category.id,
    });
  };

  // Reset local state when category changes (e.g., when drawer opens)
  React.useEffect(() => {
    try {
      setPalette(
        category.colorPaletteJson
          ? JSON.parse(category.colorPaletteJson)
          : ["", "", ""]
      );
    } catch {
      setPalette(["", "", ""]);
    }
    setIsGradient(category.gradient || false);
  }, [category]);

  return (
    <FormDrawer
      className="max-w-200"
      isDone={updateQuestionCategoryMutation.isSuccess}
      triggerButton={
        React.isValidElement(triggerButton) ? (
          triggerButton
        ) : (
          <Button>Update</Button>
        )
      }
      title="Update Question Category"
      submitButton={
        <Button
          form="update-question-category"
          type="submit"
          className="text-white"
          disabled={updateQuestionCategoryMutation.isPending}
        >
          {updateQuestionCategoryMutation.isPending ? "Updating..." : "Update"}
        </Button>
      }
    >
      <Form
        id="update-question-category"
        onSubmit={onSubmit}
        schema={updateQuestionCategoryInputSchema}
        options={{
          defaultValues: {
            name: category.name,
            colorPaletteJson: category.colorPaletteJson || "[]",
          },
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

export default UpdateQuestionCategoryForm;
