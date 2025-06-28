/** Renders a list of predefined filter presets as clickable buttons. */

import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";
import { FilterPreset, CurrentFilters } from "./types";

interface FilterPresetsProps {
  presets: FilterPreset[];
  currentFilters: CurrentFilters;
  onApplyPreset: (preset: FilterPreset) => void;
}

export const FilterPresets = ({
  presets,
  currentFilters,
  onApplyPreset,
}: FilterPresetsProps) => {
  const isPresetActive = (preset: FilterPreset) => {
    // An empty filter object means 'All Quizzes', which is active if no other filters are set.
    if (Object.keys(preset.filters).length === 0) {
      return Object.values(currentFilters).every((val) => val === undefined);
    }
    // For other presets, check if the current filters match the preset's filters
    return Object.entries(preset.filters).every(
      ([key, value]) => currentFilters[key as keyof CurrentFilters] === value
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isActive = isPresetActive(preset);
        return (
          <Button
            key={preset.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyPreset(preset)}
            className={`h-9 px-4 gap-2 transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted/80 hover:scale-105"
            }`}
          >
            {preset.isFavorite && <Star className="w-3 h-3" />}
            {preset.label}
            {isActive && <Check className="w-3 h-3" />}
          </Button>
        );
      })}
    </div>
  );
};
