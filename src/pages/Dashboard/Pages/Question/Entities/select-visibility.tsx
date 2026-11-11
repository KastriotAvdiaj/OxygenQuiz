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
  /** Same look as the category, difficulty and language selects beside it. */
  fieldVariant?: "quiz" | "minimal" | "form";
}

const VISIBILITY_OPTIONS = ["Public", "Private"] as const;

/**
 * Built like `CategorySelect`'s form mode — same label, same trigger variant, same error line —
 * because it always sits in the same grid as it. It used to be the pushable `quiz` trigger with a
 * bold label, and stood out from its three neighbours.
 */
export const VisibilitySelect: React.FC<VisibilitySelectProps> = ({
  label,
  value,
  onChange,
  error,
  clearErrors,
  fieldVariant = "minimal",
}) => {
  const variant = error ? "form-error" : fieldVariant;
  const isValueValid = (VISIBILITY_OPTIONS as readonly string[]).includes(value);

  return (
    <div>
      {label && (
        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      )}
      <Select
        value={isValueValid ? value : ""}
        onValueChange={(selectedValue) => {
          onChange(selectedValue);
          clearErrors?.();
        }}
      >
        <SelectTrigger variant={variant} className="min-w-0">
          <SelectValue className="text-foreground" placeholder="Select visibility" />
        </SelectTrigger>
        <SelectContent variant={variant}>
          {VISIBILITY_OPTIONS.map((option) => (
            <SelectItem variant={variant} key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

/**
 * Whether the signed-in user may file questions as public questions (`Public`) — Admin and
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
 * The visibility a new question on the Questions page starts with: staff make it public, everyone
 * else keeps it to themselves. It is a default, not carried from the last save
 * (use-create-another.ts), so a batch starts public every time.
 */
export const useNewQuestionVisibility = (): "Public" | "Private" =>
  useCanShareQuestions() ? "Public" : "Private";

/** The visibility select, shown to staff only. Everyone else's questions stay `Private`. */
export const QuestionVisibilityField: React.FC<VisibilitySelectProps> = (props) =>
  useCanShareQuestions() ? <VisibilitySelect {...props} /> : null;
