import * as React from "react";
import { Eye, Copy, Palette, ChevronDown, ChevronUp } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColorCard } from "@/common/ColouredCard";
import { useNotifications } from "@/common/Notifications";

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

  const { addNotification } = useNotifications();

  const [pasteInput, setPasteInput] = React.useState("");
  const [isLLMSectionOpen, setIsLLMSectionOpen] = React.useState(false);

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

  // Generate LLM prompt and copy to clipboard
  const copyLLMText = async () => {
    const prompt = category
      ? `Generate a color palette of ${colorCount} colors for the category "${category}", where the first color is going to be the main color. Use the colors that best represent the category. Return only the hex color codes in the format #RRGGBB, separated by commas. Do not include any other text or explanation. Should the category be invalid, return the message "Category name invalid".`
      : 'Return the message "Category name invalid".';

    try {
      await navigator.clipboard.writeText(prompt);
      addNotification({
        type: "success",
        title: "Success",
        message: "Copied Message To Clipboard",
      });
    } catch (err) {
      addNotification({
        type: "error",
        title: "error",
        message: "An error occurred while copying the text",
      });
      console.error("Failed to copy text: ", err);
    }
  };

  // Parse pasted color palette
  const parsePastedColors = (text: string): string[] => {
    // Remove extra whitespace and split by common delimiters
    const cleaned = text.trim().replace(/\s+/g, " ");

    // Split by comma, space, or newline
    const parts = cleaned.split(/[,\s\n]+/).filter((part) => part.length > 0);

    const colors: string[] = [];

    for (const part of parts) {
      let color = part.trim();

      // Add # if missing
      if (color.length === 6 && /^[0-9A-F]{6}$/i.test(color)) {
        color = "#" + color;
      }

      // Validate and add if it's a valid hex color
      if (isValidHex(color)) {
        colors.push(color.toUpperCase());
      }
    }

    return colors;
  };

  // Handle paste input
  const handlePasteColors = () => {
    const colors = parsePastedColors(pasteInput);

    if (colors.length >= 2 && colors.length <= 5) {
      // Update color count to match the pasted colors
      setColorCount(colors.length);

      // Update the palette
      const newPalette = [...colors];
      // Ensure we have the right number of colors
      while (newPalette.length < colors.length) {
        newPalette.push("#000000");
      }

      onChange(newPalette);
      setPasteInput(""); // Clear the input after successful paste
    }
  };

  // Memoize valid colors
  const validColors = React.useMemo(() => {
    return palette.slice(0, colorCount).filter(isValidHex);
  }, [palette, colorCount]);

  // Check if paste input contains valid colors
  const pastedColors = React.useMemo(() => {
    return parsePastedColors(pasteInput);
  }, [pasteInput]);

  const isPasteValid = pastedColors.length >= 2 && pastedColors.length <= 5;

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

        {/* LLM Assistant Section - Collapsible */}
        <Collapsible open={isLLMSectionOpen} onOpenChange={setIsLLMSectionOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-md w-full justify-between flex p-2 h-auto text-sm font-medium text-foreground bg-muted dark:bg-background/60 dark:hover:bg-background my-6">
              <span className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>AI Color Assistant</span>
                {category && (
                  <Badge variant="outline" className="text-xs">
                    {category}
                  </Badge>
                )}
              </span>
              {isLLMSectionOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3 bg-muted dark:bg-background/80 p-4 rounded-sm">
            {/* Copy LLM Text Button */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Generate AI prompt for {colorCount} colors
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-block">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={copyLLMText}
                          disabled={!category}
                          className="flex items-center space-x-2">
                          <Copy className="h-4 w-4" />
                          <span>Copy LLM Text</span>
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!category && (
                      <TooltipContent className="bg-background">
                        <p>Please type the category first.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Paste Colors Section */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Paste AI-generated colors
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    variant="minimal"
                    placeholder="Paste color palette here (e.g., #FF5733, #33FF57, #3357FF)"
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    className="text-sm !bg-background"
                  />
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handlePasteColors}
                  disabled={!isPasteValid}
                  className="flex items-center space-x-2">
                  <Palette className="h-4 w-4" />
                  <span>Apply</span>
                </Button>
              </div>

              {/* Paste validation feedback */}
              {pasteInput && (
                <div className="text-xs">
                  {isPasteValid ? (
                    <span className="text-green-600">
                      ✓ Found {pastedColors.length} valid colors
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {pastedColors.length === 0
                        ? "No valid hex colors found"
                        : `Found ${pastedColors.length} colors (need 2-5)`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent className="space-y-4">
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

              {/* Card Preview using ColorCard */}
              <div>
                <p className="text-sm font-medium mb-2">Card Preview</p>
                <ColorCard
                  colorPalette={validColors}
                  gradient={isGradient}
                  size="md"
                  animated={false}
                  borderAnimation={true}
                  className="max-w-none">
                  <div className="p-4 flex-1 flex flex-col justify-center items-center">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium px-2 py-1 rounded-full mb-2 border"
                      style={{
                        backgroundColor: `${validColors[0] || "#6366f1"}20`,
                        borderColor: `${validColors[0] || "#6366f1"}40`,
                      }}>
                      {category || "Category Name"}
                    </Badge>
                    <div className="text-center text-foreground">
                      <h3 className="text-lg font-semibold mb-2 drop-shadow-sm">
                        Preview Card
                      </h3>
                      <p className="text-sm opacity-90">
                        This is how your card will look.
                      </p>
                    </div>
                  </div>
                </ColorCard>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
};
