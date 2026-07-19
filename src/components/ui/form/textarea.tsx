import * as React from "react";
import { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/utils/cn";

import { FieldWrapper, FieldWrapperPassThroughProps } from "./field-wrapper";
import {
  FIELD_MODERN,
  FIELD_PRESS,
  FIELD_SHELL,
  FIELD_THEMES,
} from "./field-variants";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldWrapperPassThroughProps & {
    className?: string;
    registration?: Partial<UseFormRegisterReturn>;
    variant?:
      | "default"
      | "quiz"
      | "settings"
      | "isCorrect"
      | "isIncorrect"
      | "minimal";
  };

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, registration, variant = "default", ...props },
    ref,
  ) => {
    // Special handling for minimal variant — mirrors Input's minimal pattern
    if (variant === "minimal") {
      return (
        <FieldWrapper label={label} error={error}>
          <div className="minimal-input-wrapper">
            <textarea
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
        <textarea
          className={cn(
            // Base styles (common to all variants)
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            variant === "default" && ["min-h-[60px]"],
            // Modern settings field (see field-variants.ts) — quiet, theme-aware.
            variant === "settings" && cn(FIELD_MODERN, "min-h-[80px] resize-y"),
            // Pushable-field compositions shared with Input (field-variants.ts)
            variant === "quiz" &&
              cn(
                FIELD_SHELL,
                FIELD_PRESS,
                FIELD_THEMES.primary,
                "min-h-[60px]",
              ),
            variant === "isCorrect" &&
              cn(FIELD_SHELL, FIELD_PRESS, FIELD_THEMES.green, "min-h-[60px]"),
            variant === "isIncorrect" &&
              cn(FIELD_SHELL, FIELD_PRESS, FIELD_THEMES.red, "min-h-[60px]"),
            className,
          )}
          ref={ref}
          {...props}
          {...registration}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
