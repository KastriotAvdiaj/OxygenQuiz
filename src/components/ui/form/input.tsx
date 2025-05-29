import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/utils/cn";

import {
  FieldWrapper,
  type FieldWrapperPassThroughProps,
} from "./field-wrapper";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  FieldWrapperPassThroughProps & {
    className?: string;
    registration?: Partial<UseFormRegisterReturn>;
    variant?: "default" | "quiz" | "isCorrect" | "isIncorrect" | "display";
    questionType?: "multiple-choice" | "type-answer" | "true-false";
  };

const variantStyles: Record<NonNullable<InputProps["variant"]>, string> = {
  default: "",
  quiz: "bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 text-foreground font-medium rounded-xl h-12 shadow-[0_4px_0_0_hsl(var(--primary)/0.7)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-primary focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-primary/30 dark:to-primary/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
  isCorrect:
    "bg-gradient-to-r from-green-500/10 to-green-500/5 border-2 border-green-500 text-foreground font-medium rounded-xl h-12 shadow-[0_4px_0_0_rgba(0,200,80,0.7)] dark:shadow-[0_4px_0_0_rgba(0,200,80,0.5)] hover:shadow-[0_2px_0_0_hsl(var(--green-500)/0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-green-500 focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-green-500/40 dark:to-green-500/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
  isIncorrect:
    "bg-gradient-to-r from-red-500/10 to-red-500/5 border-2 border-red-500/30 text-foreground font-medium rounded-xl h-12 shadow-[0_4px_0_0_rgba(220,38,38,0.5)] hover:shadow-[0_2px_0_0_rgba(220,38,38,0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-red-500/50 focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-red-500/20 dark:to-red-500/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
  display:
    "bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/40 dark:border-primary/80 text-foreground font-medium rounded-xl h-12 shadow-[0_4px_0_0_hsl(var(--primary)/0.7)] dark:bg-gradient-to-r dark:from-primary/40 dark:to-primary/10 text-center text-lg sm:text-xl md:text-xl px-4 py-4 cursor-default",
};

// Question type color overrides for quiz and display variants
const questionTypeColors = {
  "type-answer": {
    // Orange theme
    quiz: "bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30 shadow-[0_4px_0_0_rgba(249,115,22,0.7)] hover:shadow-[0_2px_0_0_rgba(249,115,22,0.5)] focus-visible:ring-orange-500 dark:from-orange-500/30 dark:to-orange-500/10",
    display: "bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-2 border-orange-500/40 dark:border-orange-500/80 shadow-[0_4px_0_0_rgba(249,115,22,0.7)] dark:from-orange-500/40 dark:to-orange-500/10"
  },
  "true-false": {
    // Purple theme
    quiz: "bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-2 border-purple-500/30 shadow-[0_4px_0_0_rgba(168,85,247,0.7)] hover:shadow-[0_2px_0_0_rgba(168,85,247,0.5)] focus-visible:ring-purple-500 dark:from-purple-500/30 dark:to-purple-500/10",
    display: "bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-2 border-purple-500/40 dark:border-purple-500/80 shadow-[0_4px_0_0_rgba(168,85,247,0.7)] dark:from-purple-500/40 dark:to-purple-500/10"
  }
};

const getVariantStyles = (variant: NonNullable<InputProps["variant"]>, questionType?: InputProps["questionType"]): string => {
  const baseStyle = variantStyles[variant];
  
  // Only apply question type colors for quiz and display variants
  if ((variant === "quiz" || variant === "display") && questionType && questionType !== "multiple-choice") {
    const colorOverride = questionTypeColors[questionType]?.[variant];
    if (colorOverride) {
      // Replace the color-related classes while keeping other styling
      const baseWithoutColors = baseStyle
        .replace(/bg-gradient-to-r from-primary\/\d+ to-primary\/\d+/g, '')
        .replace(/border-\d+ border-primary\/\d+/g, '')
        .replace(/shadow-\[[^\]]+\]/g, '')
        .replace(/hover:shadow-\[[^\]]+\]/g, '')
        .replace(/focus-visible:ring-primary/g, '')
        .replace(/dark:border-primary\/\d+/g, '')
        .replace(/dark:from-primary\/\d+ dark:to-primary\/\d+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return `${baseWithoutColors} ${colorOverride}`;
    }
  }
  
  return baseStyle;
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

    return (
      <FieldWrapper label={label} error={error}>
        <input
          type={type}
          className={cn(baseClasses, getVariantStyles(variant, questionType), className)}
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