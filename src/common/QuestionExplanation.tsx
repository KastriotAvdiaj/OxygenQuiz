import { useState } from "react";
import { Lightbulb, Plus } from "lucide-react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Textarea } from "@/components/ui/form/textarea";
import { cn } from "@/utils/cn";

import { EXPLANATION_MAX_LENGTH } from "./question-explanation";

interface ExplanationFieldBase {
  id?: string;
  className?: string;
  error?: FieldError;
}

/** Controlled — the quiz builder's question cards keep their own state and debounce it upward. */
interface ControlledExplanationFieldProps extends ExplanationFieldBase {
  value: string;
  onChange: (value: string) => void;
  registration?: never;
  defaultValue?: never;
}

/** Registered — the standalone question forms are react-hook-form forms. */
interface RegisteredExplanationFieldProps extends ExplanationFieldBase {
  registration: UseFormRegisterReturn;
  /** The field's starting value, used only to decide whether it opens expanded. */
  defaultValue?: string | null;
  value?: never;
  onChange?: never;
}

type ExplanationFieldProps =
  | ControlledExplanationFieldProps
  | RegisteredExplanationFieldProps;

/**
 * The editor for a question's optional explanation — the "why" a player reads after answering
 * (docs/quiz/question-explanations.md). Constants and the zod field are in
 * `question-explanation.ts`.
 *
 * Collapsed to a quiet "Add an explanation" button while empty, so a card without one
 * doesn't carry an empty box — and open from the start when there is one, which is the AI path:
 * the model writes one for every question and the author should see it to review it.
 *
 * Opening is one-way: clearing the text doesn't snap it shut under the author's cursor.
 */
export function ExplanationField(props: ExplanationFieldProps) {
  const initial = props.registration ? props.defaultValue : props.value;
  const [expanded, setExpanded] = useState(() => Boolean(initial?.trim()));

  // Controlled callers can gain a value after mount (an AI draft restored late); that opens it too.
  const isOpen = expanded || Boolean(props.value?.trim());

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
          props.className,
        )}>
        <Plus className="h-3.5 w-3.5" />
        Add an explanation
        <span className="text-xs opacity-70">(optional)</span>
      </button>
    );
  }

  const length = props.registration ? undefined : props.value.length;

  return (
    <div className={cn("space-y-1.5", props.className)}>
      <label
        htmlFor={props.id ?? "question-explanation"}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
        Explanation
        <span className="text-xs font-normal text-muted-foreground">
          — shown to players after they answer
        </span>
      </label>
      <Textarea
        id={props.id ?? "question-explanation"}
        variant="settings"
        maxLength={EXPLANATION_MAX_LENGTH}
        placeholder="Why is the correct answer correct? One or two sentences is plenty."
        error={props.error}
        {...(props.registration
          ? { registration: props.registration }
          : {
              value: props.value,
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                props.onChange(e.target.value),
            })}
      />
      {length !== undefined && length > EXPLANATION_MAX_LENGTH * 0.8 && (
        <p className="text-right text-xs text-muted-foreground">
          {length} / {EXPLANATION_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}

/**
 * What a player sees. Renders nothing for a question without one, so callers can drop it in
 * unconditionally.
 */
export function ExplanationNote({
  explanation,
  className,
}: {
  explanation?: string | null;
  className?: string;
}) {
  if (!explanation?.trim()) return null;

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border border-border bg-muted/50 p-3 text-left text-sm text-foreground",
        className,
      )}>
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="whitespace-pre-line leading-relaxed">
        <span className="sr-only">Explanation: </span>
        {explanation}
      </p>
    </div>
  );
}
