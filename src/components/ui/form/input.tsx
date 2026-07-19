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
      | "quiz"
      | "settings"
      | "isCorrect"
      | "isIncorrect"
      | "display"
      | "fullColor"
      | "minimal";
    questionType?: QuestionType;
  };

// Pushable-field compositions (see field-variants.ts). "quiz" is the
// interactive editor/answer field; "display" is its read-only twin;
// isCorrect/isIncorrect are the answer-feedback states of the same field.
const quizField = (theme: string) =>
  cn(FIELD_SHELL, FIELD_PRESS, theme, "tracking-wider h-12");
const displayField = (theme: string) =>
  cn(FIELD_SHELL, theme, "h-12 py-4 cursor-default");

const variantStyles: Record<NonNullable<InputProps["variant"]>, string> = {
  default: "",
  quiz: quizField(FIELD_THEMES.primary),
  settings: cn(FIELD_MODERN, "h-10"),
  fullColor: cn(
    FIELD_SHELL,
    FIELD_PRESS,
    "[--edge:var(--primary-edge)] h-12 bg-primary border-primary text-white font-semibold !placeholder-gray-300 focus-visible:ring-primary"
  ),
  isCorrect: quizField(FIELD_THEMES.green),
  isIncorrect: quizField(FIELD_THEMES.red),
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
    (variant === "quiz" || variant === "display") &&
    questionType &&
    questionType !== QuestionType.MultipleChoice
  ) {
    const theme = questionTypeThemes[questionType];
    if (theme) {
      return variant === "quiz" ? quizField(theme) : displayField(theme);
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

    // Special handling for minimal variant
    if (variant === "minimal") {
      return (
        <FieldWrapper label={label} error={error}>
          <div className="minimal-input-wrapper">
            <input
              type={type}
              className={cn("minimal-input", className)}
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
