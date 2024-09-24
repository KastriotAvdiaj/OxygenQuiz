import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary gap-2 shadow hover:bg-bacground active:scale-95",
        addSave:
          "flex justify-center items-center gap-2  shadow text-[var(--text)] bg-[var(--text-hover)] hover:bg-[var(--text-hover-darker)] rounded active:scale-95",
        outline:
          "flex justify-center items-center gap-3 border border-border shadow-sm hover:bg-[var(--outline-button)] active:scale-95",
        secondary: "bg-secondary shadow-sm active:scale-95",
        link: " underline-offset-4 hover:underline active:scale-95",
        drawer:
          "flex justify-start gap-1.5 px-1 items-center bg-ring rounded hover:bg-[var(--background)] text-sm active:scale-95",
        dashboard:
          "flex w-full justify-start text-[17px] gap-2.5 items-center bg-ring rounded hover:bg-[var(--background)] active:scale-95",
        start:
          "font-sans flex justify-center gap-2 items-center mx-auto shadow-xl text-lg bg-[var(--background-secondary)] backdrop-blur-md lg:font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-[var(--text-hover)] hover:text-gray-50 before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-4 text-[var(--text)] overflow-hidden border-2 rounded-full group",
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
  isPending?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      active = false,
      isPending = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, active, className }))}
        ref={ref}
        {...props}
      >
        {isPending ? <Spinner size="sm" variant="light" /> : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
