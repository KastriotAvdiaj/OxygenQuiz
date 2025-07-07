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

// Color palette input component
const ColorPaletteInput = ({
  palette,
  onChange,
}: {
  palette: string[];
  onChange: (palette: string[]) => void;
}) => {
  const [colorCount, setColorCount] = React.useState(3);

  const updateColor = (index: number, color: string) => {
    const newPalette = [...palette];
    newPalette[index] = color;
    onChange(newPalette);
  };

  const updateColorCount = (count: number) => {
    setColorCount(count);
    const newPalette = [...palette];
    
    // If reducing colors, truncate the array
    if (count < palette.length) {
      newPalette.length = count;
    }
    // If increasing colors, add empty strings
    else if (count > palette.length) {
      while (newPalette.length < count) {
        newPalette.push("");
      }
    }
    
    onChange(newPalette);
  };

  const isValidHex = (hex: string) => {
    return /^#[0-9A-F]{6}$/i.test(hex);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Color Palette</Label>
        
        {/* Color count selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Colors:</span>
          <select
            value={colorCount}
            onChange={(e) => updateColorCount(parseInt(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {[2, 3, 4, 5].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: colorCount }, (_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium w-8">#{index + 1}</span>

              {/* Color picker input */}
              <div className="relative">
                <input
                  type="color"
                  value={palette[index] || "#000000"}
                  onChange={(e) => updateColor(index, e.target.value)}
                  className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer bg-transparent"
                  title="Click to open color picker"
                />
              </div>

              {/* Hex input */}
              <Input
                type="text"
                value={palette[index] || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Auto-add # if not present
                  const hexValue = value.startsWith("#") ? value : `#${value}`;
                  updateColor(index, hexValue);
                }}
                placeholder="#000000"
                className="w-24 text-sm font-mono"
                maxLength={7}
              />
            </div>

            {/* Color preview */}
            <div
              className="w-8 h-8 rounded-md border-2 border-gray-300 flex-shrink-0"
              style={{
                backgroundColor: isValidHex(palette[index])
                  ? palette[index]
                  : "#ffffff",
              }}
              title={palette[index] || "No color selected"}
            />

            {/* Validation indicator */}
            {palette[index] && !isValidHex(palette[index]) && (
              <span className="text-red-500 text-xs">Invalid hex</span>
            )}
          </div>
        ))}
      </div>

      {/* Palette preview */}
      {palette.some((color) => isValidHex(color)) && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Palette Preview:</p>
          <div className="flex space-x-2">
            {palette.slice(0, colorCount).map((color, index) => (
              <div
                key={index}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 flex items-center justify-center"
                style={{
                  backgroundColor: isValidHex(color) ? color : "#f5f5f5",
                }}
              >
                {!isValidHex(color) && (
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CreateQuestionCategoryForm = () => {
  const { addNotification } = useNotifications();
  const [palette, setPalette] = React.useState<string[]>(["", "", ""]);

  const createQuestionCategoryMutation = useCreateQuestionCategory({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Question Category Created",
        });
        setPalette(["", "", ""]);
      },
    },
  });

  const onSubmit = (values: CreateQuestionCategoryInput) => {
    // Filter out empty colors and validate hex format
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
      colorPalette: validColors,
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

              <ColorPaletteInput palette={palette} onChange={setPalette} />
            </div>
          );
        }}
      </Form>
    </FormDrawer>
  );
};

export default CreateQuestionCategoryForm;