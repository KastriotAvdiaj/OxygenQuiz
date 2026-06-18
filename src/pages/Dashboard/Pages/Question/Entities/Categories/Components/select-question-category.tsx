import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { QuestionCategory } from "@/types/question-types";

interface BaseCategorySelectProps {
  label?: string;
  categories: QuestionCategory[];
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
}

interface FormModeProps extends BaseCategorySelectProps {
  mode?: "form";
  value: string; // Stringified ID (e.g., "1")
  onChange: (value: string) => void; // Receives stringified ID
}

interface FilterModeProps extends BaseCategorySelectProps {
  mode: "filter";
  value: number | undefined; // Actual ID or undefined for "all"
  onChange: (value: number | undefined) => void; // Receives actual ID or undefined
}

type CategorySelectProps = FormModeProps | FilterModeProps;

export const CategorySelect: React.FC<CategorySelectProps> = (props) => {
  const {
    label,
    categories,
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
          <SelectTrigger variant={variant} className="min-w-[200px]">
            <SelectValue
              className="text-foreground"
              placeholder="All Categories"
            />
          </SelectTrigger>
          <SelectContent variant={variant}>
            {includeAllOption && (
              <SelectItem variant={variant} value="all">
                All Categories
              </SelectItem>
            )}
            {categories.map((category) => (
              <SelectItem
                variant={variant}
                key={category.id}
                value={category.id.toString()}
              >
                {category.name}
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
  const isValueValid = categories.some(
    (category) => category.id.toString() === value
  );

  return (
    <div>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger variant={variant} className="min-w-[200px]">
          <SelectValue
            className="text-foreground"
            placeholder={
              includeAllOption ? "All Categories" : "--Select Category--"
            }
          />
        </SelectTrigger>
        <SelectContent variant={variant}>
          {includeAllOption && (
            <SelectItem variant={variant} value="all">
              All Categories
            </SelectItem>
          )}
          {categories.map((category) => (
            <SelectItem
              variant={variant}
              key={category.id}
              value={category.id.toString()}
            >
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
