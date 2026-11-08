import * as React from "react";
import { createPortal } from "react-dom";
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

/** Exit animation (280ms, `.slide-panel` in global.css) plus a margin. */
const UNMOUNT_AFTER_CLOSE_MS = 350;
/** Pointer left the trigger without opening: keep the warm form this long in case it comes back. */
const COOL_AFTER_LEAVE_MS = 400;

/**
 * Renders the drawer's form **before** it opens — when the pointer reaches the trigger, or it
 * takes focus or a touch — so the click only has to slide a panel whose content already exists.
 *
 * Why: the multiple-choice form costs ~250ms to render at 4× CPU (measured 2026-11-08,
 * docs/development/motion.md "Drawers"). Rendered on the click, it either delays the slide or
 * (deferred a frame) pops in during it. Hover gives it the ~100–300ms a hand takes to press.
 *
 * How: the form is portalled into a detached `<div>` (`host`) and that node is moved into the
 * panel when the panel mounts. Not Radix `forceMount`: a force-mounted closed dialog still runs
 * `hideOthers` (aria-hides the page) and `RemoveScroll` (locks scrolling). The form keeps its
 * React tree under the Drawer root, so dialog context still reaches it — but Radix also judges
 * "click outside" by that tree, hence the `onPointerDownOutside` guard on the panel.
 *
 * It is dropped again after the close animation, so a reopened drawer starts fresh (no stale
 * draft), and when the pointer leaves without opening, so hovering down a table of edit buttons
 * doesn't leave a form per row. Opened with nothing warm (a scripted open), it renders two frames
 * after the panel instead — the panel is still mostly off-screen then.
 */
function useWarmBody() {
  const [warm, setWarm] = React.useState(false);
  const [host] = React.useState(() => document.createElement("div"));
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const isOpenRef = React.useRef(false);
  // While closing, Radix hands focus back to the trigger. Warming on that focus would keep the
  // closed form — an abandoned edit — for the next open, so warm-up waits for the unmount.
  const closingRef = React.useRef(false);

  const cancel = () => clearTimeout(timer.current);
  const later = (ms: number) => {
    cancel();
    timer.current = setTimeout(() => {
      closingRef.current = false;
      setWarm(false);
    }, ms);
  };
  const warmUp = () => {
    if (closingRef.current) return;
    cancel();
    setWarm(true);
  };

  React.useEffect(() => cancel, []);

  return {
    warm,
    host,
    /** Ref for the slot inside the panel: moves the pre-rendered form in, before focus is placed. */
    slotRef: React.useCallback((node: HTMLDivElement | null) => node?.appendChild(host), [host]),
    triggerHandlers: {
      onPointerEnter: warmUp,
      onFocus: warmUp,
      onPointerDown: warmUp,
      onPointerLeave: () => {
        if (!isOpenRef.current && !closingRef.current) later(COOL_AFTER_LEAVE_MS);
      },
      onBlur: () => {
        if (!isOpenRef.current && !closingRef.current) later(COOL_AFTER_LEAVE_MS);
      },
    },
    opened: () => {
      isOpenRef.current = true;
      closingRef.current = false;
      cancel();
      if (!warm) {
        requestAnimationFrame(() => requestAnimationFrame(() => setWarm(true)));
      }
    },
    closed: () => {
      isOpenRef.current = false;
      closingRef.current = true;
      later(UNMOUNT_AFTER_CLOSE_MS);
    },
  };
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
  const body = useWarmBody();

  React.useEffect(() => {
    if (isDone) {
      close();
      body.closed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- body's functions are fresh each render; isDone is the trigger
  }, [isDone, close]);

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
          body.closed();
          onClosed?.();
        } else {
          open();
          body.opened();
        }
      }}
    >
      <DrawerTrigger asChild {...body.triggerHandlers}>
        {triggerButton}
      </DrawerTrigger>
      {body.warm && createPortal(children, body.host)}
      <DrawerContent
        side={variant || "right"}
        className={cn(
          "overflow-y-auto flex max-w-[800px] bg-background border-l dark:border-foreground/40 flex-col justify-between sm:max-w-[540px]",
          className
        )}
        onPointerDownOutside={(e) => {
          // Radix decides "outside" by the React tree, and the form is portalled in from outside
          // DrawerContent's — so to Radix every click on it is outside, and would close the
          // drawer. Inside means inside the moved-in form, or a dropdown/popover it opened.
          const target = e.detail.originalEvent.target;
          if (
            target instanceof Element &&
            (body.host.contains(target) || target.closest("[data-radix-popper-content-wrapper]"))
          ) {
            e.preventDefault();
          }
        }}
        onOpenAutoFocus={(e) => {
          // The pre-rendered form mounted detached, so its autoFocus input never got focus.
          // Give it focus now — without scrolling, which would jolt the panel mid-slide.
          const field = body.host.querySelector<HTMLElement>(
            "input:not([type=hidden]):not([disabled]), textarea:not([disabled])"
          );
          if (field) {
            e.preventDefault();
            field.focus({ preventScroll: true });
          }
        }}
      >
        <div className="flex flex-col">
          <DrawerHeader className="px-3 py-2 border-b border-gray-500">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {/* The form lives in body.host (useWarmBody); this is where it is placed. */}
          <div ref={body.slotRef} />
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
