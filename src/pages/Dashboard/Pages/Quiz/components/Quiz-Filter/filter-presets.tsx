/** Renders a list of predefined filter presets as clickable buttons. */

import { Star, Check } from "lucide-react";
import { FilterPreset, CurrentFilters } from "./types";
import { LiftedButton } from "@/common/LiftedButton";

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
      {presets.map((preset, index) => {
        const isActive = isPresetActive(preset);
        return (
          <LiftedButton
            key={index}
            onClick={() => onApplyPreset(preset)}
            backgroundColorForBorder="bg-muted"
            className={`h-8 px-4 gap-2 text-sm ${
              isActive
                ? "bg-primary text-white shadow-md px-2 hover:translate-y-[-0px]"
                : "hover:bg-foreground/70 hover:text-background bg-background text-foreground"
            }`}>
            {preset.isFavorite && <Star className="w-3 h-3" />}
            {preset.label}
            {isActive && <Check className="w-3 h-3" />}
          </LiftedButton>
        );
      })}
    </div>
  );
};
