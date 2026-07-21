// DifficultySelect Component
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { QuestionDifficulty } from "@/types/question-types";
import {
  isUnspecifiedLookup,
  useCanSelectUnspecifiedLookup,
} from "../../lookup-visibility";

interface BaseDifficultySelectProps {
  label?: string;
  difficulties: QuestionDifficulty[];
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
  /** Base look when there's no error. "quiz" (default) is the pushable field; "minimal" is
   *  the quiet modern style used by settings panels. */
  fieldVariant?: "quiz" | "minimal" | "form";
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
    fieldVariant = "quiz",
  } = props;

  const variant = error ? "form-error" : fieldVariant;

  // The seeded "Unspecified" difficulty is an internal default, not a user-facing choice —
  // hide it from everyone except catalog admins. See lookup-visibility.ts.
  const canSelectUnspecified = useCanSelectUnspecifiedLookup();
  const selectableDifficulties = canSelectUnspecified
    ? difficulties
    : difficulties.filter((difficulty) => !isUnspecifiedLookup(difficulty.level));

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
              selectedValue === "all" ? undefined : Number(selectedValue),
            );
            clearErrors?.();
          }}
        >
          <SelectTrigger variant={variant} className="min-w-[200px]">
            <SelectValue
              className="text-foreground"
              placeholder="All Difficulties"
            />
          </SelectTrigger>
          <SelectContent variant={variant} className="min-w-[200px]">
            {includeAllOption && (
              <SelectItem variant={variant} value="all">
                All Difficulties
              </SelectItem>
            )}
            {selectableDifficulties.map((difficulty) => (
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
    (difficulty) => difficulty.id.toString() === value,
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
        <SelectTrigger variant={variant} className="min-w-[200px]">
          <SelectValue placeholder="Select difficulty" />
        </SelectTrigger>
        <SelectContent variant={variant} className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem variant={variant} value="all">
              All Difficulties
            </SelectItem>
          )}
          {selectableDifficulties.map((difficulty) => (
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
