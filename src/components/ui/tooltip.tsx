import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/utils/cn";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = ({ delayDuration = 0, ...props }) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
);

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentElement = React.ElementRef<typeof TooltipPrimitive.Content>;

const TooltipContent = React.forwardRef<
  TooltipContentElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, forwardedRef) => {
  const contentRef = React.useRef<TooltipContentElement | null>(null);
  // The arrow is a separate SVG, so it can't pick up `bg-*`/`border-*` classes
  // put on TooltipContent via cascade. Read back whatever color those classes
  // actually resolved to and hand it to the arrow directly, so any override on
  // className (a different bg color, etc.) is reflected on the arrow too.
  const [arrowColors, setArrowColors] = React.useState<{
    fill: string;
    stroke: string;
  } | null>(null);

  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const computed = getComputedStyle(node);
    setArrowColors({ fill: computed.backgroundColor, stroke: computed.borderColor });
  }, [className]);

  return (
    <TooltipPrimitive.Content
      ref={(node) => {
        contentRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      sideOffset={sideOffset}
      className={cn(
        "z-50 border border-border bg-muted rounded-md px-3 py-2 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow
        className="fill-muted stroke-border"
        strokeWidth={2}
        style={
          arrowColors
            ? { fill: arrowColors.fill, stroke: arrowColors.stroke }
            : undefined
        }
      />
    </TooltipPrimitive.Content>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
