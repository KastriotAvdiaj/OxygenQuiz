import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
import { getErrorFontClass } from "./errorFontZone";

/**
 * The shared layout of every error screen — the 404s, the crash fallback, the stale-version
 * notice, access denied (docs/development/error-handling.md, "The error screens").
 *
 * No card: the page itself is the message. A hero on top (the 404's globe "404", or an
 * `ErrorBadge`), a large title, a muted line of explanation, then the actions — all centred, and
 * all stepping up in size with the screen rather than being a small box in the middle of a big
 * one. The title and message use `text-balance` so they break into even lines at any width.
 *
 * Router-free on purpose: `MainErrorFallback` renders it from the app's top-level error
 * boundary, outside `RouterProvider`, so nothing in here may use a router hook or `<Link>`.
 * Callers pass their own actions.
 */
export function ErrorScreen({
  hero,
  title,
  message,
  actions,
  children,
  fullViewport = true,
  role,
}: {
  hero: ReactNode;
  title: ReactNode;
  message: ReactNode;
  actions?: ReactNode;
  /** Anything after the actions — the crash screen's error details. */
  children?: ReactNode;
  /**
   * `true` (default) for a standalone screen: it is its own scroll container, sized to the
   * visible viewport (`app-shell-viewport`, docs/RESPONSIVE.md). `false` inside a layout that
   * already provides one, like the dashboard.
   */
  fullViewport?: boolean;
  role?: "alert";
}) {
  const reduceMotion = useReducedMotion();
  // A short, staggered rise for each block; nothing at all under reduced motion.
  const rise = (step: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay: 0.08 * step, ease: "easeOut" },
        };

  return (
    <div
      role={role}
      className={cn(
        getErrorFontClass(),
        fullViewport ? "app-shell-viewport" : "h-full min-h-[70vh]",
        "flex w-full bg-background text-foreground",
      )}
    >
      {/* The padding lives on this inner column, not the outer element: `.app-shell-viewport`
          sets its own horizontal padding (the safe-area insets) in plain CSS, which beats any
          Tailwind padding class on the same element — the text ran to the screen's edges. */}
      <div className="m-auto flex w-full flex-col items-center px-5 py-12 text-center sm:px-8">
      <motion.div {...rise(0)}>{hero}</motion.div>

      <motion.h1
        {...rise(1)}
        className="mt-6 max-w-[18ch] text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:mt-8 sm:text-5xl lg:text-6xl"
      >
        {title}
      </motion.h1>

      <motion.p
        {...rise(2)}
        className="mt-3 max-w-md text-balance text-base leading-relaxed text-muted-foreground sm:mt-5 sm:max-w-xl sm:text-lg lg:text-xl"
      >
        {message}
      </motion.p>

      {actions && (
        <motion.div
          {...rise(3)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4"
        >
          {actions}
        </motion.div>
      )}

      {children && (
        <motion.div {...rise(4)} className="mt-8 w-full max-w-xl sm:mt-10">
          {children}
        </motion.div>
      )}
      </div>
    </div>
  );
}

/**
 * The hero for error screens that have no picture of their own: a big icon chip, a miniature of
 * the app's pushable surfaces (the same `--primary-edge` ledge `ModeCard`'s chips and
 * `LiftedButton` use), tilted a little. It floats gently once it has arrived.
 */
export function ErrorBadge({ icon: Icon }: { icon: LucideIcon }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_6px_0_0_var(--primary-edge)] sm:h-24 sm:w-24 lg:h-28 lg:w-28 lg:rounded-3xl"
      // Tilt through framer's `rotate`, not a Tailwind class: framer owns this element's
      // transform for the float, and would overwrite a class-set rotation.
      style={{ rotate: -6 }}
      animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
      transition={
        reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }
      }
    >
      <Icon className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" strokeWidth={2.25} />
    </motion.div>
  );
}

/** The error screens' buttons: the primary action, and a quieter one in muted greys. */
export function ErrorAction({
  secondary = false,
  className,
  ...props
}: LiftedButtonProps & { secondary?: boolean }) {
  return (
    <LiftedButton
      {...props}
      liftColor={secondary ? "muted-foreground" : props.liftColor}
      className={cn(
        "gap-2 px-6 text-base sm:px-8 sm:text-lg",
        secondary && "bg-muted text-foreground",
        className,
      )}
    />
  );
}
