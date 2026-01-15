import * as React from "react";

import { cn } from "@/utils/cn";
import { useTheme } from "./theme-provider";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "lifted" }
>(({ className, variant = "default", ...props }, ref) => {
  const { theme } = useTheme();
  const hasCustomBorder = className?.includes("border") || false;

  if (variant === "lifted") {
    return (
      <div className="relative group">
        <div
          className={cn(
            "absolute top-1 left-1 w-full h-full bg-foreground border border-foreground/20 rounded-xl",
            "opacity-100" 
          )}
        />
        <div
          ref={ref}
          className={cn(
            "relative bg-card border-4 border-foreground rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5",
            className
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        `${
          theme === "dark"
            ? `bg-muted ${hasCustomBorder ? "" : "border-none"}`
            : `bg-card border`
        } rounded-xl text-card-foreground shadow dark:shadow-card`,
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
