import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { QuestionLanguage } from "@/types/question-types";
import {
  isUnspecifiedLookup,
  useCanSelectUnspecifiedLookup,
} from "../../lookup-visibility";

interface BaseLanguageSelectProps {
  label?: string;
  languages: QuestionLanguage[];
  includeAllOption?: boolean;
  error?: string;
  clearErrors?: () => void;
  /** Base look when there's no error. "quiz" (default) is the pushable field; "minimal" is
   *  the quiet modern style used by settings panels. */
  fieldVariant?: "quiz" | "minimal" | "form";
}

interface FormModeProps extends BaseLanguageSelectProps {
  mode?: "form";
  value: string; // Stringified ID (e.g., "1")
  onChange: (value: string) => void; // Receives stringified ID
}

interface FilterModeProps extends BaseLanguageSelectProps {
  mode: "filter";
  value: number | undefined; // Actual ID or undefined for "all"
  onChange: (value: number | undefined) => void; // Receives actual ID or undefined
}

type LanguageSelectProps = FormModeProps | FilterModeProps;

export const LanguageSelect: React.FC<LanguageSelectProps> = (props) => {
  const {
    label,
    languages,
    includeAllOption = true,
    error,
    clearErrors,
    mode = "form",
    fieldVariant = "minimal",
  } = props;

  const variant = error ? "form-error" : fieldVariant;

  // The seeded "Unspecified" language is an internal default, not a user-facing choice.
  // Mirrors select-question-category.tsx exactly — keep the two in step.
  const canSelectUnspecified = useCanSelectUnspecifiedLookup();

  // Filter mode: unchanged. Admins keep it, because filtering by Unspecified is how you find
  // the rows that still need classifying.
  const filterableLanguages = canSelectUnspecified
    ? languages
    : languages.filter((language) => !isUnspecifiedLookup(language.language));

  // Form mode: nobody may assign it, admins included — the API rejects it on a question and it
  // blocks publishing a quiz. A value already stored stays in the list so the trigger can never
  // render blank (see the twin comment in select-question-category.tsx).
  const assignableLanguages = languages.filter(
    (language) =>
      !isUnspecifiedLookup(language.language) ||
      language.id.toString() === String(props.value ?? ""),
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
              placeholder="All Languages"
            />
          </SelectTrigger>
          <SelectContent variant={variant} className="min-w-[200px]">
            {includeAllOption && (
              <SelectItem variant={variant} value="all">
                All Languages
              </SelectItem>
            )}
            {filterableLanguages.map((language) => (
              <SelectItem
                key={language.id}
                variant={variant}
                value={language.id.toString()}
              >
                {language.language}
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
  const isValueValid = languages.some(
    (language) => language.id.toString() === value,
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
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent variant={variant} className="min-w-[200px]">
          {includeAllOption && (
            <SelectItem variant={variant} value="all">
              All Languages
            </SelectItem>
          )}
          {assignableLanguages.map((language) => (
            <SelectItem
              key={language.id}
              variant={variant}
              value={language.id.toString()}
            >
              {language.language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
