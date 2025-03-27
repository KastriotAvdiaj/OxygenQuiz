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
    variant?: "default" | "quiz";
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
      ...props
    },
    ref
  ) => {
    return (
      <FieldWrapper label={label} error={error}>
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            variant === "quiz" && [
              "bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 text-foreground font-medium rounded-xl h-12 shadow-[0_4px_0_0_hsl(var(--primary)/0.5)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] hover:translate-y-1 active:translate-y-2 active:shadow-none transform transition-all duration-200 focus-visible:ring-primary/50 focus-visible:ring-offset-background dark:bg-gradient-to-r dark:from-primary/20 dark:to-primary/10 placeholder:text-center placeholder:text-lg focus:placeholder:opacity-0 text-center text-lg sm:text-xl md:text-xl px-4 py-2",
            ],
            className
          )}
          ref={ref}
          {...registration}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Input.displayName = "Input";

export { Input };
