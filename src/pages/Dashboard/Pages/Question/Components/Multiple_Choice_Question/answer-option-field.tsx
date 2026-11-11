import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";

import { LiftedButton } from "@/common/LiftedButton";
import { Input, Label } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";

export interface AnswerOptionFieldProps {
  index: number;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  isCorrect: boolean;
  onToggleCorrect: () => void;
  onRemove: () => void;
  /** A question keeps at least two options. */
  removeDisabled: boolean;
}

/**
 * One answer option in the multiple-choice create and update forms — the same row in both. The
 * builder's minimal field; marking it correct turns it green (border, wash and underline fade in
 * over 200ms, `.option-field--correct` in global.css), so the right answer reads at a glance
 * without looking across to the switch.
 */
export const AnswerOptionField = ({
  index,
  registration,
  error,
  isCorrect,
  onToggleCorrect,
  onRemove,
  removeDisabled,
}: AnswerOptionFieldProps) => (
  <div className="flex items-start gap-4">
    <div className={cn("option-field min-w-0 flex-1", isCorrect && "option-field--correct")}>
      <Input
        variant="minimal"
        placeholder={`Answer option ${index + 1}`}
        aria-label={`Answer option ${index + 1}`}
        error={error}
        registration={registration}
      />
    </div>
    <div className="flex shrink-0 flex-col items-center pt-2">
      <Switch
        id={`correct-${index}`}
        // Four switches all named "Correct" are indistinguishable to a screen reader (and to a
        // test); this one says which option it marks.
        aria-label={`Option ${index + 1} is correct`}
        checked={isCorrect}
        onCheckedChange={onToggleCorrect}
      />
      <Label htmlFor={`correct-${index}`} className="mt-1 text-xs text-muted-foreground">
        Correct
      </Label>
    </div>
    <LiftedButton
      type="button"
      variant="icon"
      outerClassName="mt-1.5 shrink-0"
      className="bg-red-600 text-white"
      liftColor="red-700"
      onClick={onRemove}
      disabled={removeDisabled}
      aria-label={`Remove option ${index + 1}`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </LiftedButton>
  </div>
);
