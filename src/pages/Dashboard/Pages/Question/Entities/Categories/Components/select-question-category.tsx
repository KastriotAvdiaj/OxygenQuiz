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
import {
  isUnspecifiedLookup,
  useCanSelectUnspecifiedLookup,
} from "../../lookup-visibility";

interface BaseCategorySelectProps {
  label?: string;
  categories: QuestionCategory[];
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
  /** Base look when there's no error. "quiz" (default) is the pushable field; "minimal" is
   *  the quiet modern style used by settings panels. */
  fieldVariant?: "quiz" | "minimal" | "form";
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
    fieldVariant = "minimal",
  } = props;

  const variant = error ? "form-error" : fieldVariant;

  // The seeded "Unspecified" category is an internal default, not a user-facing choice.
  // See lookup-visibility.ts, and docs/quiz/quiz-question-classification.md for the rules.
  const canSelectUnspecified = useCanSelectUnspecifiedLookup();

  // Filter mode: unchanged. Filtering *by* Unspecified is real curation work — it's how an
  // admin finds the rows that need classifying — so admins keep the option here.
  const filterableCategories = canSelectUnspecified
    ? categories
    : categories.filter((category) => !isUnspecifiedLookup(category.name));

  // Form mode: nobody may *assign* it, admins included. The API rejects an Unspecified category
  // on every question create/update path, and it blocks publishing a quiz, so offering it is
  // offering a dead end — which is exactly the rough edge quiz-question-classification.md flagged
  // ("An admin who picks it gets a clear 400 rather than a disabled option").
  //
  // The exception is a value already stored. Filtering the option out while the control still
  // holds that id would leave Radix with nothing to match and render an **empty trigger** —
  // the same failure the per-question time-limit select had. Keeping it means the field always
  // shows what the row is actually set to, and the user can pick something real.
  const assignableCategories = categories.filter(
    (category) =>
      !isUnspecifiedLookup(category.name) ||
      category.id.toString() === String(props.value ?? ""),
  );

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
              placeholder="All Categories"
            />
          </SelectTrigger>
          <SelectContent variant={variant}>
            {includeAllOption && (
              <SelectItem variant={variant} value="all">
                All Categories
              </SelectItem>
            )}
            {filterableCategories.map((category) => (
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
    (category) => category.id.toString() === value,
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
              includeAllOption ? "All Categories" : "Select category"
            }
          />
        </SelectTrigger>
        <SelectContent variant={variant}>
          {includeAllOption && (
            <SelectItem variant={variant} value="all">
              All Categories
            </SelectItem>
          )}
          {assignableCategories.map((category) => (
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
