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
import { useLlmChat } from "@/lib/LLM-Chat/use-llm-chat";
import { useQuestionCategoryData } from "../api/get-question-categories";

// A new component for the visual preview
const PalettePreview = ({ palette }: { palette: string[] }) => {
  if (!palette || palette.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-sm font-medium mb-1">Generated Palette:</p>
      <div className="flex space-x-2 p-2 border rounded-md">
        {palette.map((color) => (
          <div
            key={color}
            className="w-10 h-10 rounded-md border"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};

export const CreateQuestionCategoryForm = () => {
  const { addNotification } = useNotifications();
  const [palette, setPalette] = React.useState<string[]>([]);
  const [llmError, setLlmError] = React.useState<string>("");

  const llmMutation = useLlmChat();

  const createQuestionCategoryMutation = useCreateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Created",
        });
        setPalette([]);
      },
    },
  });

  // Fetch existing categories to avoid color duplication
  const { data: existingCategories } = useQuestionCategoryData({});

  const handleGeneratePalette = async (categoryName: string) => {
    if (!categoryName) return;

    // Clear any previous errors
    setLlmError("");

    const existingPalettes = existingCategories
      ? existingCategories.map((cat) => cat.colorPaletteJson).filter(Boolean)
      : [];
    const existingPalettesString = JSON.stringify(existingPalettes);

    const prompt = `You are a design assistant. For a quiz category named "${categoryName}", generate a harmonious color palette of 3 colors. You MUST respond with ONLY a valid JSON array of hex color code strings, like ["#RRGGBB", "#RRGGBB", "#RRGGBB"]. Do not add any other text. Make the palette visually distinct from these existing ones: ${existingPalettesString}`;

    llmMutation.mutate(
      { data: { prompt } },
      {
        onSuccess: (data) => {
          try {
            const parsedPalette = JSON.parse(data.response);
            if (Array.isArray(parsedPalette)) {
              setPalette(parsedPalette);
              setLlmError(""); // Clear error on success
            }
          } catch (e) {
            console.error("Failed to parse LLM response:", e);
            const errorMessage =
              "Could not generate palette - received invalid response format";
            setLlmError(errorMessage);
            addNotification({
              type: "error",
              title: "Could not generate palette",
            });
          }
        },
        onError: (error) => {
          const errorMessage =
            "Failed to generate palette - service unavailable" + error;
          setLlmError(errorMessage);
          // setTimeout(() => {
          //   setLlmError("");
          // }, 3000);
          addNotification({ type: "error", title: "LLM service error" });
        },
      }
    );
  };

  const onSubmit = (values: CreateQuestionCategoryInput) => {
    const submissionData = {
      ...values,
      colorPalette: palette,
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
        options={{ defaultValues: { name: "", colorPalette: [] } }}
      >
        {({ register, formState, watch }) => {
          const categoryName = watch("name") || "";

          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Category
                </Label>
                <Input
                  id="name"
                  variant="minimal"
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

              {/* Palette generation UI */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGeneratePalette(categoryName)}
                  disabled={!categoryName.trim() || llmMutation.isPending}
                  isPending={llmMutation.isPending}
                >
                  {palette.length > 0 ? "Try Again" : "Generate Palette"}
                </Button>
              </div>
              <p className="text-red-500 block">{llmError}</p>
              <PalettePreview palette={palette} />
            </div>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionCategoryForm;
