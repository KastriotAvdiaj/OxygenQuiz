import * as React from "react";
import {
  CaretSortIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import * as SelectPrimitive from "@radix-ui/react-select";

import { cn } from "@/utils/cn";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> & {
  variant?: "default" | "quiz" | "incorrect" | "form" | "form-error";
};

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, variant = "default", ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full border text-foreground dark:border-foreground/30 border-foreground/70 items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm shadow-sm ring-offset-muted placeholder:text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      variant === "quiz" &&
        "font-header placeholder:text-center bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/40 dark:border-primary/60 text-foreground font-medium rounded-xl transform transition-all duration-200 dark:bg-gradient-to-r dark:from-primary/20 dark:to-primary/10 text-sm h-9 px-3 py-1.5 shadow-[0_3px_0_0_hsl(var(--primary)/0.5)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] hover:translate-y-px active:shadow-none active:translate-y-0.5 md:text-xs md:h-8 md:px-2.5 md:py-1 md:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] md:hover:shadow-[0_1px_0_0_hsl(var(--primary)/0.5)] md:hover:translate-y-px md:active:shadow-none md:active:translate-y-px lg:text-sm lg:h-9 lg:px-3 lg:py-1.5 lg:shadow-[0_3px_0_0_hsl(var(--primary)/0.5)] lg:hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.5)] lg:hover:translate-y-px lg:active:shadow-none lg:active:translate-y-0.5",
      variant === "incorrect" &&
        "font-header placeholder:text-center bg-gradient-to-r from-red-500/10 to-red-500/5 border-2 border-red-500/40 dark:border-red-500/60 text-foreground font-medium rounded-xl transform transition-all duration-200 dark:bg-gradient-to-r dark:from-red-500/20 dark:to-red-500/10 text-sm h-9 px-3 py-1.5 shadow-[0_3px_0_0_hsl(0_84%_60%/0.5)] hover:shadow-[0_2px_0_0_hsl(0_84%_60%/0.5)] hover:translate-y-px active:shadow-none active:translate-y-0.5 md:text-xs md:h-8 md:px-2.5 md:py-1 md:shadow-[0_2px_0_0_hsl(0_84%_60%/0.5)] md:hover:shadow-[0_1px_0_0_hsl(0_84%_60%/0.5)] md:hover:translate-y-px md:active:shadow-none md:active:translate-y-px lg:text-sm lg:h-9 lg:px-3 lg:py-1.5 lg:shadow-[0_3px_0_0_hsl(0_84%_60%/0.5)] lg:hover:shadow-[0_2px_0_0_hsl(0_84%_60%/0.5)] lg:hover:translate-y-px lg:active:shadow-none lg:active:translate-y-0.5",
      variant === "form" &&
        "bg-background border-2 border-foreground/20 dark:border-foreground/30 rounded-lg transition-all duration-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 hover:border-foreground/40 dark:hover:border-foreground/50 shadow-inner shadow-foreground/5 dark:shadow-foreground/10 h-10 px-4 py-2 text-sm font-medium placeholder:text-foreground/60 placeholder:font-normal",
      variant === "form-error" &&
        "bg-background border-2 border-red-500/50 dark:border-red-500/60 rounded-lg transition-all duration-200 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20 focus:ring-offset-0 hover:border-red-500/60 dark:hover:border-red-500/70 shadow-inner shadow-red-500/10 dark:shadow-red-500/20 h-10 px-4 py-2 text-sm font-medium placeholder:text-red-500/70 placeholder:font-normal text-foreground bg-red-50/50 dark:bg-red-950/20",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <CaretSortIcon
        className={cn(
          "h-4 w-4 opacity-50",
          variant === "quiz" && "text-primary opacity-90",
          variant === "incorrect" && "text-red-500 opacity-90",
          variant === "form" && "text-foreground/60 opacity-80",
          variant === "form-error" && "text-red-500 opacity-80"
        )}
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUpIcon />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDownIcon />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
> & {
  variant?: "default" | "quiz" | "incorrect" | "form" | "form-error";
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    { className, children, position = "popper", variant = "default", ...props },
    ref
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-foreground/70 bg-muted text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          variant === "quiz" &&
            "border-2 border-primary/60 bg-background rounded-xl shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300",
          variant === "incorrect" &&
            "border-2 border-red-500/60 bg-background rounded-xl shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300",
          variant === "form" &&
            "border-2 border-foreground/20 bg-background rounded-lg shadow-lg backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200",
          variant === "form-error" &&
            "border-2 border-red-500/50 bg-background rounded-lg shadow-lg backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
            (variant === "quiz" || variant === "incorrect") && "p-0.5",
            (variant === "form" || variant === "form-error") && "p-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

type SelectItemProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Item
> & {
  variant?: "default" | "quiz" | "incorrect" | "form" | "form-error";
};

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, variant = "default", ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default hover:bg-background data-[highlighted]:bg-background/70 cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      variant === "quiz" &&
        "text-center rounded-lg transition-colors duration-150 text-xs py-1.5 hover:bg-primary/10 data-[highlighted]:bg-primary/20 data-[highlighted]:text-foreground focus:bg-primary/20 focus:text-foreground md:text-xs md:py-1 lg:text-xs lg:py-1.5",
      variant === "incorrect" &&
        "text-center rounded-lg transition-colors duration-150 text-xs py-1.5 hover:bg-red-500/10 data-[highlighted]:bg-red-500/20 data-[highlighted]:text-foreground focus:bg-red-500/20 focus:text-foreground md:text-xs md:py-1 lg:text-xs lg:py-1.5",
      variant === "form" &&
        "rounded-md transition-colors duration-150 text-sm py-2 pl-3 pr-9 hover:bg-foreground/5 data-[highlighted]:bg-foreground/10 data-[highlighted]:text-foreground focus:bg-foreground/10 focus:text-foreground font-medium",
      variant === "form-error" &&
        "rounded-md transition-colors duration-150 text-sm py-2 pl-3 pr-9 hover:bg-red-500/5 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-foreground focus:bg-red-500/10 focus:text-foreground font-medium",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon
          className={cn(
            "h-4 w-4",
            variant === "quiz" && "text-primary",
            variant === "incorrect" && "text-red-500",
            variant === "form" && "text-primary",
            variant === "form-error" && "text-red-500"
          )}
        />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};