import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
  // CHANGE 1: Added `relative` to allow for absolute positioning of the spinner inside.
  "relative items-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm rounded-sm",
        icon: "bg-muted gap-2 shadow p-0 m-0",
        addSave:
          "flex justify-center items-center gap-2 shadow text-white bg-primary hover:bg-primary/70 active:scale-95",
        outline:
          "flex text-foreground bg-transparent justify-center items-center gap-3 border border-border shadow-sm hover:bg-muted active:scale-95",
        secondary: "bg-secondary shadow-sm active:scale-95",
        link: "underline-offset-4 hover:underline active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        userMenu: "gap-2 active:scale-95 h-5 font-normal px-0",
        drawer:
          "flex justify-start gap-1.5 px-1 items-center bg-background rounded hover:bg-muted text-sm active:scale-95",
        destructive:
          "flex justify-center items-center gap-2 rounded-md bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow focus-visible:ring-red-600",
        dashboard:
          "flex w-full text-foreground bg-background justify-start text-[17px] items-center rounded hover:bg-muted active:scale-95",
        quiz: "flex justify-center items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-lg hover:ring-2 hover:ring-offset-2 hover:ring-yellow-500 active:scale-95 transition-all duration-300",
        fancy: "fancy-button font-secondary",
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

export interface FancyButtonColors {
  primary: string;
  secondary: string;
  shadow: string;
  text: string;
  border: string;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  active?: boolean;
  isPending?: boolean;
  icon?: React.ReactNode;
  fancyColors?: FancyButtonColors;
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
      fancyColors,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const fancyStyle =
      variant === "fancy" && fancyColors
        ? ({
            "--fancy-primary": fancyColors.primary,
            "--fancy-secondary": fancyColors.secondary,
            "--fancy-shadow": fancyColors.shadow,
            "--fancy-text": fancyColors.text,
            "--fancy-border": fancyColors.border,
            ...style,
          } as React.CSSProperties)
        : style;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, active, className }))}
        ref={ref}
        disabled={isPending || props.disabled}
        style={fancyStyle}
        {...props}
      >
        {isPending && (
          <div className="absolute flex items-center justify-center inset-0">
            <Spinner size="sm" variant="light" />
          </div>
        )}

        <span
          className={cn("flex items-center justify-center gap-2", {
            invisible: isPending,
          })}
        >
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </span>
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
