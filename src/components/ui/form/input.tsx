import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/utils/cn";

import {
  FieldWrapper,
  type FieldWrapperPassThroughProps,
} from "./field-wrapper";
import { FIELD_MODERN, FIELD_PRESS, FIELD_SHELL, FIELD_THEMES } from "./field-variants";
import { QuestionType } from "@/types/question-types";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  FieldWrapperPassThroughProps & {
    className?: string;
    registration?: Partial<UseFormRegisterReturn>;
    variant?:
      | "default"
      | "settings"
      | "isCorrect"
      | "isIncorrect"
      | "display"
      | "fullColor"
      | "minimal";
    questionType?: QuestionType;
  };

// Pushable-field compositions (see field-variants.ts). "display" is the
// read-only field. The answer-feedback states "isCorrect" (green) and
// "isIncorrect" (red) are rendered separately via the minimal branch below.
const displayField = (theme: string) =>
  cn(FIELD_SHELL, theme, "h-12 py-4 cursor-default");

const variantStyles: Record<NonNullable<InputProps["variant"]>, string> = {
  default: "",
  settings: cn(FIELD_MODERN, "h-10"),
  fullColor: cn(
    FIELD_SHELL,
    FIELD_PRESS,
    "[--edge:var(--primary-edge)] h-12 bg-primary border-primary text-white font-semibold !placeholder-gray-300 focus-visible:ring-primary"
  ),
  // Handled by the minimal branch in the component; kept for type completeness.
  isCorrect: "",
  isIncorrect: "",
  display: displayField(FIELD_THEMES.primary),
  minimal: "minimal-input",
};

/**
 * Question-type recolors for the quiz/display variants: Type-the-Answer
 * fields are orange; True/False keeps the primary palette. Multiple choice
 * never reaches this map (guarded below).
 */
const questionTypeThemes: Partial<Record<QuestionType, string>> = {
  [QuestionType.TypeTheAnswer]: FIELD_THEMES.orange,
  [QuestionType.TrueFalse]: FIELD_THEMES.primary,
};

const getVariantStyles = (
  variant: NonNullable<InputProps["variant"]>,
  questionType?: QuestionType
): string => {
  if (
    variant === "display" &&
    questionType &&
    questionType !== QuestionType.MultipleChoice
  ) {
    const theme = questionTypeThemes[questionType];
    if (theme) {
      return displayField(theme);
    }
  }
  return variantStyles[variant];
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      registration,
      variant = "default",
      questionType,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "flex h-9 w-full rounded-md bg-background px-3 py-1 text-sm shadow-md border dark:border-foreground/40 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    // Minimal underline field. "isIncorrect" and "isCorrect" reuse the same
    // minimal styling but add a destructive-colored (red) or success-colored
    // (green) underline/tint to signal validation state.
    if (
      variant === "minimal" ||
      variant === "isIncorrect" ||
      variant === "isCorrect"
    ) {
      const hasError = variant === "isIncorrect";
      const isCorrect = variant === "isCorrect";
      return (
        <FieldWrapper label={label} error={error}>
          <div
            className={cn(
              "minimal-input-wrapper",
              hasError && "minimal-input-error",
              isCorrect && "minimal-input-correct"
            )}
          >
            <input
              type={type}
              className={cn(
                "minimal-input",
                hasError && "minimal-input--error",
                isCorrect && "minimal-input--correct",
                className
              )}
              ref={ref}
              {...props}
              {...registration}
            />
          </div>
        </FieldWrapper>
      );
    }

    return (
      <FieldWrapper label={label} error={error}>
        <input
          type={type}
          className={cn(
            baseClasses,
            getVariantStyles(variant, questionType),
            className
          )}
          ref={ref}
          {...props}
          {...(variant === "display" ? { readOnly: true, tabIndex: -1 } : {})}
          {...registration}
        />
      </FieldWrapper>
    );
  }
);
Input.displayName = "Input";

export { Input };
