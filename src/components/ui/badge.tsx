import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/cn";
import { useTheme } from "./theme-provider";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border border-input",
        primary: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        success: "bg-green-100 text-green-800 hover:bg-green-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  const theme = useTheme();
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        // The dark-mode edge is a DEFAULT, so it goes before `className`, not after.
        //
        // It used to come last, which meant `cn`'s tailwind-merge resolved it as the winner
        // and every caller's border colour was silently discarded in dark mode — the amber
        // edge on the question rows' "Needs a look" badge among them. A caller passing
        // `border-primary` got `border-foreground/40` and no warning. `className` last is
        // what every other component here does and what every caller assumes.
        theme.theme === "dark" ? "border-foreground/40" : "",
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
