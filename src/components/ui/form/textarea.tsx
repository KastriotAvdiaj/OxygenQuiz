import * as React from "react";
import { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/utils/cn";

import { FieldWrapper, FieldWrapperPassThroughProps } from "./field-wrapper";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldWrapperPassThroughProps & {
    className?: string;
    registration?: Partial<UseFormRegisterReturn>;
    variant?: "default" | "quiz" | "isCorrect" | "isIncorrect";
  };
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, registration, variant = "default", ...props },
    ref
  ) => {
    return (
      <FieldWrapper label={label} error={error}>
        <textarea
          className={cn(
            // Base styles (common to all variants)
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            variant === "default" && ["min-h-[60px]"],
            variant === "quiz" && [
              "min-h-[60px] bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 text-foreground font-medium rounded-xl shadow-[0_4px_0_0_hsl(var(--primary)/0.7)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-primary focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-primary/30 dark:to-primary/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
            ],
            variant === "isCorrect" && [
              "min-h-[60px] bg-gradient-to-r from-green-500/10 to-green-500/5 border-2 border-green-500 text-foreground font-medium rounded-xl shadow-[0_4px_0_0_rgba(0,200,80,0.7)] hover:shadow-[0_2px_0_0_hsl(var(--green-500)/0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-green-500 focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-green-500/40 dark:to-green-500/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
            ],
            variant === "isIncorrect" && [
              "min-h-[60px] bg-gradient-to-r from-red-500/10 to-red-500/5 border-2 border-red-500/30 text-foreground font-medium rounded-xl shadow-[0_4px_0_0_rgba(220,38,38,0.5)] hover:shadow-[0_2px_0_0_rgba(220,38,38,0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-red-500/50 focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-red-500/20 dark:to-red-500/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
            ],
            className
          )}
          ref={ref}
          {...props}
          {...registration}
        />
      </FieldWrapper>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
