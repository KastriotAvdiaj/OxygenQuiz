import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useDisclosure } from "@/hooks/use-disclosure";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/utils/cn";
import { Button } from "../button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
  DrawerTitle,
} from "../drawer";

type FormDrawerProps = {
  /** Closes the drawer when it turns true — an edit form, done once it saves. */
  isDone: boolean;
  /**
   * For a drawer that stays open to make another (the question bank's create forms): each time
   * this number goes up, a short "saved" pill rises from the submit button and fades
   * (`SavedPill`). Leave it out for a drawer that closes on save.
   */
  savedSignal?: number;
  /** What the pill says — "Question created". */
  savedMessage?: string;
  /** Called after the drawer closes, however it was closed. */
  onClosed?: () => void;
  triggerButton: React.ReactElement;
  submitButton: React.ReactElement;
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: "top" | "bottom" | "left" | "right";
};

/**
 * True one frame after `open` turns true; false while closed.
 *
 * Why: the click that opens a drawer used to render the whole form before the browser could
 * draw a single frame — 160–270ms of work at 4× CPU for the multiple-choice form (measured
 * 2026-11-08, docs/development/motion.md "Drawers"). The slide couldn't start until that was
 * done, so it began late and its first frames were lost: the "laggy" open. Rendering the panel
 * first and its body on the next frame lets the slide start at once; the body arrives while the
 * panel is still mostly off-screen. The external system this Effect syncs with is the browser's
 * frame clock.
 */
function useAfterFirstFrame(open: boolean): boolean {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    // Two frames: the first is the one the panel's opening style is committed in.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);
  return ready;
}

export const FormDrawer = ({
  title,
  children,
  isDone,
  triggerButton,
  submitButton,
  className,
  variant,
  savedSignal = 0,
  savedMessage = "Saved",
  onClosed,
}: FormDrawerProps) => {
  const { close, open, isOpen } = useDisclosure();
  const bodyReady = useAfterFirstFrame(isOpen);

  React.useEffect(() => {
    if (isDone) {
      close();
    }
  }, [isDone, close]);

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
          onClosed?.();
        } else {
          open();
        }
      }}
    >
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent
        side={variant || "right"}
        className={cn(
          "overflow-y-auto flex max-w-[800px] bg-background border-l dark:border-foreground/40 flex-col justify-between sm:max-w-[540px]",
          className
        )}
      >
        <div className="flex flex-col">
          <DrawerHeader className="px-3 py-2 border-b border-gray-500">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {/* Arrives a frame after the panel (useAfterFirstFrame), fading rather than snapping. */}
          {bodyReady && (
            <div className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">{children}</div>
          )}
        </div>
        <DrawerFooter className="gap-4">
          {/* The pill rises out of the submit button, so it sits in the button's box. */}
          <div className="relative">
            {submitButton}
            <SavedPill signal={savedSignal} message={savedMessage} />
          </div>
          <DrawerClose asChild>
            <Button variant="outline" type="button">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

/**
 * "Question created": a pill that rises out of the submit button and fades, ~1s, each time
 * `signal` goes up. It replaces the corner toast for a form that stays open to make another —
 * the confirmation lands where the author is looking, and is gone before the next question is
 * typed. Keyed by the signal, so saving again mid-rise starts a fresh one.
 *
 * Reduced motion: it fades in place rather than rising. The live region beside it says the same
 * thing to a screen reader, which the moving pill (aria-hidden) can't.
 */
const SavedPill = ({ signal, message }: { signal: number; message: string }) => {
  const reduce = usePrefersReducedMotion();
  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {signal > 0 ? `${message}.` : ""}
      </span>
      <AnimatePresence>
        {signal > 0 && (
          <motion.span
            key={signal}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-quiz-success px-3 py-1 text-xs font-semibold text-white shadow-md"
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : [6, -6, -14, -26] }}
            transition={{ duration: 1.1, times: [0, 0.15, 0.6, 1], ease: "easeOut" }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            {message}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
};
