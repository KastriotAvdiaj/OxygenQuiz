import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/utils/cn"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /**
     * Render the content in a Portal to <body> (default).
     *
     * Setting this to false inside a modal Radix Dialog does dodge the body's
     * `pointer-events: none` lock — but it also traps the content inside
     * `DialogContent`, which is height-capped and `overflow-y-auto`, so anything
     * taller than the remaining space is clipped and makes the dialog scroll.
     *
     * For tall content (a calendar, a long list) prefer keeping the portal and
     * adding `pointer-events-auto` to the content instead: it re-enables clicks on
     * that layer alone and the popover floats free of the dialog's scroll area.
     * `date-picker.tsx` is the worked example.
     */
    portalled?: boolean;
  }
>(({ className, align = "center", sideOffset = 4, portalled = true, ...props }, ref) => {
  const content = (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]",
        className
      )}
      {...props}
    />
  );

  return portalled ? (
    <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>
  ) : (
    content
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
