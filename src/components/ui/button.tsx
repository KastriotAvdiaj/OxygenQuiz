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
        default:
          "bg-background text-foreground gap-2 border border-border shadow hover:bg-muted active:scale-95",
        icon: "bg-muted gap-2 shadow p-0 m-0",
        addSave:
          "flex justify-center items-center gap-2 shadow text-white bg-primary hover:bg-primary/70 active:scale-95",
        outline:
          "flex text-foreground bg-background justify-center items-center gap-3 border border-border shadow-sm hover:bg-muted active:scale-95",
        secondary: "bg-secondary shadow-sm active:scale-95",
        link: "underline-offset-4 hover:underline active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        userMenu: "bg-muted gap-2 shadow active:scale-95 h-5 font-normal px-0",
        drawer:
          "flex justify-start gap-1.5 px-1 items-center bg-background rounded hover:bg-muted text-sm active:scale-95",
        destructive:
          "flex justify-center items-center gap-2 bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow focus-visible:ring-red-600",
        dashboard:
          "flex w-full text-foreground bg-background justify-start text-[17px] gap-2.5 items-center rounded hover:bg-muted active:scale-95",
        start:
          "font-sans flex justify-center gap-2 items-center mx-auto shadow-xl text-lg bg-[var(--muted)] backdrop-blur-md lg:font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-foreground hover:text-gray-50 before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-4 text-foreground overflow-hidden border-2 rounded-full group",
      },
      size: {
        dashboard: "px-2.5 py-2",
        drawerSize: "h-8 px-1.5 py-2",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded px-8",
        icon: "h-9 w-9",
        none: "",
      },
      active: {
        true: "bg-muted hover:bg-muted",
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
  icon?: React.ReactNode;
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
      icon,
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
        {isPending ? (
          <>
            <Spinner size="sm" variant="light" /> {children}
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>} {/* Render icon */}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
