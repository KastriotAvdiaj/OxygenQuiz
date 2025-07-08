import * as React from "react";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";

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

interface ColorPaletteInputProps {
  palette: string[];
  onChange: (palette: string[]) => void;
  isGradient: boolean;
  onGradientChange: (isGradient: boolean) => void;
}

export const ColorPaletteInput: React.FC<ColorPaletteInputProps> = ({
  palette,
  onChange,
  isGradient,
  onGradientChange,
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

  // Memoize derived values to prevent unnecessary recalculations
  const { validColors, mainColor, borderGradient } = React.useMemo(() => {
    const valid = palette.slice(0, colorCount).filter(isValidHex);
    const main = valid[0] || "#000000";
    const border = valid.length > 1 ? valid.join(", ") : main;
    return { validColors: valid, mainColor: main, borderGradient: border };
  }, [palette, colorCount]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Color Palette</CardTitle>
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="color-count"
              className="text-sm text-muted-foreground"
            >
              Colors
            </Label>
            <Select
              value={String(colorCount)}
              onValueChange={(value) => updateColorCount(parseInt(value))}
            >
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
        {Array.from({ length: colorCount }, (_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Label
              htmlFor={`color-${index}`}
              className="w-8 text-sm text-muted-foreground"
            >
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
          <Switch
            id="gradient-switch"
            checked={isGradient}
            onCheckedChange={onGradientChange}
          />
          <Label htmlFor="gradient-switch">Use Gradient</Label>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-background rounded-sm"
              disabled={validColors.length === 0}
            >
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

              {/* Card Preview */}
              <div>
                <p className="text-sm font-medium mb-2">Card Preview</p>
                <motion.div
                  className="relative h-full rounded-lg"
                  animate={{
                    "--border-angle": ["0deg", "360deg"],
                  }}
                  transition={{
                    duration: 4,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                  style={
                    {
                      "--border-colors": borderGradient,
                    } as React.CSSProperties
                  }
                >
                  <Card
                    className="relative flex flex-col overflow-hidden rounded-lg border-2 
                   transition-all duration-300 group min-h-[180px] shadow-md backdrop-blur-sm"
                    style={{
                      background:
                        isGradient && validColors.length > 1
                          ? `linear-gradient(135deg, ${validColors.join(", ")})`
                          : `${mainColor}60`, // Add alpha transparency to the solid color
                      borderImage: `conic-gradient(from var(--border-angle, 0deg), ${borderGradient}, ${validColors[0]}) 1`,
                      borderImageSlice: 1,
                    }}
                  >
                    <div className="p-4 flex-1 flex flex-col justify-center items-center">
                      <div className="text-center text-white">
                        <h3 className="text-lg font-semibold mb-2">
                          Category Name
                        </h3>
                        <p className="text-sm opacity-90">
                          This is a preview of the card.
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardFooter>
    </Card>
  );
};
