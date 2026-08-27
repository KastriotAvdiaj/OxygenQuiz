import * as React from "react";
import { Eye } from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input, Label } from "@/components/ui/form";
import { QuizCard } from "@/pages/Quiz/components/quiz-card";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { PaletteSuggestions } from "./palette-suggestions";

interface ColorPaletteInputProps {
  palette: string[];
  onChange: (palette: string[]) => void;
  isGradient: boolean;
  onGradientChange: (isGradient: boolean) => void;
  category?: string;
}

export const ColorPaletteInput: React.FC<ColorPaletteInputProps> = ({
  palette,
  onChange,
  isGradient,
  onGradientChange,
  category,
}) => {
  // Use the initial palette length (up to 5) or default to 3
  const [colorCount, setColorCount] = React.useState(
    Math.min(Math.max(palette.length, 2), 5)
  );

  // Helper to validate a hex color string
  const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(hex);
  };

  const updateColor = (index: number, color: string) => {
    const newPalette = [...palette];
    newPalette[index] = color;
    onChange(newPalette);
  };

  const updateColorCount = (count: number) => {
    setColorCount(count);
    const newPalette = [...palette];

    if (count < newPalette.length) {
      // Truncate the array if the new count is smaller
      newPalette.length = count;
    } else if (count > newPalette.length) {
      // Pad the array with empty strings if the new count is larger
      while (newPalette.length < count) {
        newPalette.push("#000000"); // Default to black for new slots
      }
    }

    onChange(newPalette);
  };

  // Applying a suggestion is a user action, so the handler does all of it — including the
  // count, which the swatch rows below are sized by. Deriving the count from `palette` in an
  // Effect instead would render one frame with the wrong number of rows.
  const applySuggestedPalette = (colors: string[]) => {
    setColorCount(Math.min(Math.max(colors.length, 2), 5));
    onChange(colors);
  };

  // Memoize valid colors
  const validColors = React.useMemo(() => {
    return palette.slice(0, colorCount).filter(isValidHex);
  }, [palette, colorCount]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Color Palette</CardTitle>
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="color-count"
              className="text-sm text-muted-foreground">
              Colors
            </Label>
            <Select
              value={String(colorCount)}
              onValueChange={(value) => updateColorCount(parseInt(value))}>
              <SelectTrigger id="color-count" className="w-20">
                <SelectValue placeholder="Count" />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Where the AI Color Assistant used to sit. Applying a candidate writes straight into
            this picker's state, so the admin edits it exactly as if they had chosen the colours
            themselves — and nothing is saved until the surrounding form is submitted.
            See docs/adr/0003-the-model-proposes-the-code-decides.md. */}
        <PaletteSuggestions
          categoryName={category ?? ""}
          onApply={applySuggestedPalette}
        />

        {Array.from({ length: colorCount }, (_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Label
              htmlFor={`color-${index}`}
              className="w-8 text-sm text-muted-foreground">
              #{index + 1}
            </Label>
            <input
              id={`color-picker-${index}`}
              type="color"
              value={palette[index] || "#000000"}
              onChange={(e) => updateColor(index, e.target.value)}
              className="w-10 h-10 rounded-md border cursor-pointer appearance-none bg-transparent"
              title="Click to open color picker"
            />
            <div className="flex-grow">
              <Input
                id={`color-${index}`}
                type="text"
                value={palette[index] || ""}
                onChange={(e) => updateColor(index, e.target.value)}
                placeholder="#000000"
                className="w-full font-mono"
                maxLength={7}
              />
              {palette[index] && !isValidHex(palette[index]) && (
                <p className="text-xs text-destructive mt-1">
                  Invalid hex format
                </p>
              )}
            </div>
            <div
              className="w-8 h-8 rounded-md border flex-shrink-0"
              style={{
                backgroundColor: isValidHex(palette[index])
                  ? palette[index]
                  : "transparent",
              }}
              title={palette[index] || "No color selected"}
            />
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label htmlFor="gradient-switch">Use Gradient</Label>
          <Switch
            id="gradient-switch"
            checked={isGradient}
            onCheckedChange={onGradientChange}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-background rounded-sm"
              disabled={validColors.length === 0}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              {/* Palette Preview */}
              <div>
                <p className="text-sm font-medium mb-2">Palette Preview</p>
                {isGradient && validColors.length > 1 ? (
                  <div
                    className="w-full h-16 rounded-md border"
                    style={{
                      background: `linear-gradient(to right, ${validColors.join(
                        ", "
                      )})`,
                    }}
                  />
                ) : (
                  <div className="flex space-x-2">
                    {validColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 rounded-md border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Card Preview — renders the real quiz card so admins see
                  exactly how quizzes in this category will appear. */}
              <div>
                <p className="text-sm font-medium mb-2">Card Preview</p>
                <QuizCard
                  quiz={
                    {
                      title: "Preview Quiz",
                      description:
                        "This is how quizzes in this category will look.",
                      category: category || "Category Name",
                      difficulty: "Medium",
                      colorPaletteJson: JSON.stringify(
                        validColors.length ? validColors : ["#6366f1"]
                      ),
                      timeLimitInSeconds: 300,
                      questionCount: 12,
                      user: "you",
                    } as unknown as QuizSummaryDTO
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
};
