import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/form";
import { ROLES } from "@/lib/authorization";
import { useUser } from "@/lib/Auth";

interface VisibilitySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  clearErrors?: () => void;
}

export const VisibilitySelect: React.FC<VisibilitySelectProps> = ({
  label,
  value,
  onChange,
  error,
  clearErrors,
}) => {
  const visibilityOptions = ["Global", "Private"];
  const isValueValid = visibilityOptions.includes(value);

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
        <SelectTrigger
          variant="quiz"
          className={`min-w-[200px] ${error ? "border-red-500" : ""}`}
        >
          <SelectValue placeholder="--Select Visibility--" />
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {visibilityOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

/**
 * Whether the signed-in user may file questions in the shared question bank (`Global`) — Admin and
 * SuperAdmin. Fast feedback only: the gate is `QuestionService.ResolveNewVisibility` /
 * `ApplyVisibilityChange` on the API, which answers 403 to anyone else (docs/quiz/question-bank.md).
 */
export const useCanShareQuestions = () => {
  // useUser rather than useAuthorization, which throws without a signed-in user: with no user
  // loaded the answer is simply "no", the same side the server errs on.
  const roles = useUser().data?.roles;
  return roles?.some((r) => r === ROLES.Admin || r === ROLES.SuperAdmin) ?? false;
};

/**
 * The visibility a new question on the Questions page starts with: staff file into the shared
 * bank, everyone else keeps it to themselves. It is a default, not carried from the last save
 * (use-create-another.ts), so a batch starts in the bank every time.
 */
export const useNewQuestionVisibility = (): "Global" | "Private" =>
  useCanShareQuestions() ? "Global" : "Private";

/** The visibility select, shown to staff only. Everyone else's questions stay `Private`. */
export const QuestionVisibilityField: React.FC<VisibilitySelectProps> = (props) =>
  useCanShareQuestions() ? <VisibilitySelect {...props} /> : null;
