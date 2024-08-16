import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary gap-2 shadow hover:bg-[var(--background)]/80  active:scale-95",
        destructive:
          "bg-destructive shadow-sm hover:bg-destructive/90 active:scale-95",
        addSave:
          "flex justify-center items-center gap-2 text-white shadow bg-[var(--add-button)] hover:bg-blue-700 rounded active:scale-95",
        outline:
          "border border-input shadow-sm hover:bg-[var(--outline-button)]  active:scale-95",
        secondary: "bg-secondary shadow-sm active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95",
        link: "text-white underline-offset-4 hover:underline active:scale-95",
        drawer:
          "flex justify-start gap-1.5 px-1 items-center bg-ring rounded hover:bg-[var(--background)] text-sm active:scale-95",
        dashboard:
          "flex w-full justify-start text-[17px] gap-2.5 items-center bg-ring rounded hover:bg-[var(--background)] active:scale-95",
      },
      size: {
        dashboard: " px-2.5 py-2",
        drawerSize: "h-8 px-1.5 py-2",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded px-8",
        icon: "h-9 w-9",
        none: "",
      },
      active: {
        true: "bg-[var(--background)] hover:bg-[var(--background)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      active: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  active?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, active = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, active, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
