// DifficultySelect Component
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionDifficulty } from "@/types/ApiTypes";
import { Label } from "@/components/ui/form";

interface BaseDifficultySelectProps {
  label?: string;
  difficulties: QuestionDifficulty[];
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

interface FormModeProps extends BaseDifficultySelectProps {
  mode?: "form";
  value: string; // Stringified ID (e.g., "1")
  onChange: (value: string) => void; // Receives stringified ID
}

interface FilterModeProps extends BaseDifficultySelectProps {
  mode: "filter";
  value: number | undefined; // Actual ID or undefined for "all"
  onChange: (value: number | undefined) => void; // Receives actual ID or undefined
}

type DifficultySelectProps = FormModeProps | FilterModeProps;

export const DifficultySelect: React.FC<DifficultySelectProps> = (props) => {
  const {
    label,
    difficulties,
    includeAllOption = true,
    error,
    clearErrors,
    mode = "form",
  } = props;

  const variant = error ? "incorrect" : "quiz";

  if (mode === "filter") {
    const { value, onChange } = props as FilterModeProps;

    return (
      <div>
        {label && (
          <Label className="text-sm font-medium text-foreground">{label}</Label>
        )}
        <Select
          value={value ? value.toString() : "all"}
          onValueChange={(selectedValue) => {
            onChange(
              selectedValue === "all" ? undefined : Number(selectedValue)
            );
            clearErrors?.();
          }}
        >
          <SelectTrigger
            variant={variant}
            className="min-w-[200px]"
          >
            <SelectValue
              className="text-foreground"
              placeholder="All Difficulties"
            />
          </SelectTrigger>
          <SelectContent variant={variant} className="min-w-[200px]">
            {includeAllOption && (
              <SelectItem variant={variant} value="all">All Difficulties</SelectItem>
            )}
            {difficulties.map((difficulty) => (
              <SelectItem
                variant={variant}
                key={difficulty.id}
                value={difficulty.id.toString()}
              >
                {difficulty.level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  // Form mode (default/existing behavior)
  const { value, onChange } = props as FormModeProps;
  const isValueValid = difficulties.some(
    (difficulty) => difficulty.id.toString() === value
  );

  return (
    <div>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue === "all" ? "all" : selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger
          variant={variant}
          className="min-w-[200px]"
        >
          <SelectValue placeholder="--Select Difficulty--" />
        </SelectTrigger>
        <SelectContent variant={variant} className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem variant={variant} value="all">All Difficulties</SelectItem>
          )}
          {difficulties.map((difficulty) => (
            <SelectItem 
              variant={variant} 
              key={difficulty.id} 
              value={difficulty.id.toString()}
            >
              {difficulty.level}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};