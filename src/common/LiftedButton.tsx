import React from "react";
import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";

/**
 * Semantic theme tokens accepted by `liftColor`. Each resolves to the matching
 * `hsl(var(--token))` CSS variable (defined in src/global.css / tailwind.config.js), so a
 * caller can write `liftColor="destructive"` instead of `hsl(var(--destructive))`.
 */
export const LIFT_COLOR_TOKENS = [
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "foreground",
  "foreground-lighter",
  "background",
  "border",
  "ring",
] as const;

export type LiftColorToken = (typeof LIFT_COLOR_TOKENS)[number];

type PaletteHue =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

type PaletteShade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

/**
 * An entry on Tailwind's colour scale, written the way the class is — "red-400",
 * "emerald-600". Spelled out as a union rather than `${string}-${number}` so the editor
 * completes it and a typo is a compile error instead of a colour that silently never arrives.
 */
export type TailwindPaletteColor = `${PaletteHue}-${PaletteShade}`;

/**
 * Matches a palette entry by *shape*, so the resolver can tell "red-400" from a CSS keyword.
 * The shade is required: bare "red" is a valid CSS colour and has to pass through untouched,
 * as does "rebeccapurple".
 */
const PALETTE_ENTRY = /^[a-z]+-(?:50|950|[1-9]00)$/;

/**
 * Resolve a `liftColor` prop to a concrete CSS color:
 * - a known theme token (e.g. "primary", "foreground") → `hsl(var(--token))`
 * - a Tailwind palette entry ("red-400") → `var(--color-red-400, …)`
 * - any other string (hex, rgb(), hsl(), a raw `var(--x)`) → passed through unchanged
 * - `undefined` → the theme primary
 *
 * The palette branch works because `tailwind.config.js` publishes the whole scale as CSS
 * variables (the `paletteVariables` plugin there). It has to: a colour picked at runtime can
 * never be a Tailwind class, because the JIT only generates what it can read verbatim in
 * source.
 *
 * The `var()` carries a fallback for a reason. A name shaped like a palette entry but with no
 * variable behind it — "red-450", or a hue dropped from the theme — would leave `--lift-base`
 * unset, and every depth layer here is a `color-mix` reading it. An invalid mix computes to
 * nothing, so the edge and shadow would *vanish*: a button that lost its depth entirely rather
 * than one wearing the wrong colour. Falling back to primary keeps it a button.
 */
const resolveLiftColor = (
  liftColor?: LiftColorToken | TailwindPaletteColor | (string & {}),
): string => {
  if (!liftColor) return "hsl(var(--primary))";

  if ((LIFT_COLOR_TOKENS as readonly string[]).includes(liftColor)) {
    return `hsl(var(--${liftColor}))`;
  }

  if (PALETTE_ENTRY.test(liftColor)) {
    return `var(--color-${liftColor}, hsl(var(--primary)))`;
  }

  return liftColor;
};

export interface LiftedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string; // Applied to the front (visible face)
  outerClassName?: string; // Applied to the outer button element (layout)
  variant?: "default" | "icon";
  /**
   * Face size. `default` is the page-level primary action — `py-2 px-4` at inherited 16px,
   * about 40px tall. `sm` is the same button among other controls: 14px text and a tighter
   * face, which stops a row of actions reading as a row of primary actions.
   *
   * <b>`sm` only tightens from `sm:` up.</b> 14px text with `py-1.5` computes to a 32px
   * control, and docs/RESPONSIVE.md asks for ≥36px on anything you tap — so phones keep
   * `py-2` (36px) and pointer devices get the smaller face. Density is not a width concern
   * in general, but a touch-target floor is.
   *
   * The default is unchanged, so the ~50 existing call sites keep the face they have.
   */
  size?: "default" | "sm";
  backgroundColorForBorder?: string; // Applied to the edge layer
  isPending?: boolean;
  /**
   * Base color for the 3D depth layers (edge gradient + drop shadow). Accepts, in order of
   * preference:
   * - a semantic theme token — "primary", "foreground", "destructive", … (see
   *   {@link LIFT_COLOR_TOKENS}). Reach for these first: they follow the theme into dark mode.
   * - a Tailwind palette entry — "red-400", "emerald-600" (see {@link TailwindPaletteColor}).
   *   The scale, but a fixed point on it: a palette entry does **not** change between light and
   *   dark, so check the button on both before shipping one.
   * - any raw CSS color — "#7c3aed", "hsl(var(--muted-foreground))", a `var(--x)`. For colours
   *   that aren't in the theme at all, like a quiz's category palette.
   *
   * Defaults to the theme primary; pass this whenever the front face isn't primary-colored, or
   * the button sits on a blue backdrop it has nothing to do with.
   */
  liftColor?: LiftColorToken | TailwindPaletteColor | (string & {});
}

// 3D "pushable" button: shadow (blurred, drops on press), edge (darker
// gradient, gives depth), front (colored face that lifts). The depth layers
// derive from --lift-base, which defaults to the theme's --primary and can be
// overridden per-button via the `liftColor` prop.

// Timing uses arbitrary properties (transition-duration / -timing-function
// in square-bracket form): the equivalent duration/ease arbitrary-value
// utilities are ambiguous to Tailwind, which then generates nothing for them.
const springOut =
  "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]";
const springHover =
  "group-hover:[transition-duration:250ms] group-hover:[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1.5)]";
const snapActive = "group-active:[transition-duration:34ms]";

const edgeGradient =
  "[background:linear-gradient(to_right,color-mix(in_srgb,var(--lift-base),black_35%)_0%,color-mix(in_srgb,var(--lift-base),black_18%)_8%,color-mix(in_srgb,var(--lift-base),black_35%)_92%,color-mix(in_srgb,var(--lift-base),black_50%)_100%)]";

const shadowFill =
  "[background:color-mix(in_srgb,var(--lift-base),transparent_60%)]";

export const LiftedButton = React.forwardRef<
  HTMLButtonElement,
  LiftedButtonProps
>(
  (
    {
      children,
      className,
      outerClassName,
      disabled,
      backgroundColorForBorder,
      isPending,
      liftColor,
      variant = "default",
      size = "default",
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isPending;
    const isIcon = variant === "icon";
    const rounded = isIcon ? "rounded-xl" : "rounded-lg";

    // Lift distances (px): icon variant is subtler than default
    const front = isIcon
      ? {
          rest: "-translate-y-[3px]",
          hover: "group-hover:-translate-y-[4px]",
          active: "group-active:-translate-y-[1px]",
        }
      : {
          rest: "-translate-y-1",
          hover: "group-hover:-translate-y-1.5",
          active: "group-active:-translate-y-0.5",
        };
    const shadow = isIcon
      ? {
          rest: "translate-y-[1.5px]",
          hover: "group-hover:translate-y-[3px]",
          active: "group-active:translate-y-[1px]",
        }
      : {
          rest: "translate-y-[2px]",
          hover: "group-hover:translate-y-1",
          active: "group-active:translate-y-[1px]",
        };

    return (
      <button
        className={cn(
          "group relative border-none bg-transparent p-0 font-thin outline-offset-4 transition-[filter] [transition-duration:250ms]",
          "focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          // brightness-110 reads as a "shine" — keep it in light mode only
          !isDisabled && "cursor-pointer hover:brightness-110 dark:hover:brightness-100",
          // Disabled keeps the exact resting appearance — only the interactions
          // drop away. Dimming individual layers would let the darker edge and
          // shadow bleed through the front face, which reads as a rendering bug.
          isDisabled && "cursor-normal",
          outerClassName
        )}
        disabled={isDisabled}
        style={
          {
            "--lift-base": resolveLiftColor(liftColor),
            ...style,
          } as React.CSSProperties
        }
        {...props}
        ref={ref}
      >
        {/* Shadow — colored in light mode; in dark mode a colored blur reads
            as a glow halo, so it falls back to a plain translucent black. */}
        <span
          className={cn(
            "absolute inset-0 blur-[2px] will-change-transform",
            shadowFill,
            "dark:[background:rgb(0_0_0/0.45)]",
            rounded,
            shadow.rest,
            `transition-transform [transition-duration:600ms] ${springOut}`,
            !isDisabled && cn(shadow.hover, shadow.active, springHover, snapActive)
          )}
        />
        {/* Edge */}
        <span
          className={cn(
            "absolute inset-0",
            rounded,
            backgroundColorForBorder ? backgroundColorForBorder : edgeGradient
          )}
        />
        {/* Front */}
        <span
          className={cn(
            // `whitespace-nowrap` matches the shared Button, which has carried it from the
            // start. Without it this face is just a flex child that shrinks, so a label in a
            // tight row breaks mid-phrase — "+ Create Quiz" became three stacked lines in a
            // 390px page header, which reads as a broken component rather than a full row.
            // A button label that needs two lines is a label that needs shortening.
            "relative flex items-center justify-center gap-2 whitespace-nowrap bg-primary text-white will-change-transform",
            rounded,
            isIcon
              ? "p-2"
              : size === "sm"
                ? "px-3 py-2 text-sm sm:py-1.5"
                : "py-2 px-4",
            front.rest,
            `transition-transform [transition-duration:600ms] ${springOut}`,
            !isDisabled && cn(front.hover, front.active, springHover, snapActive),
            className
          )}
        >
          {isPending && isIcon ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {children}
            </>
          )}
        </span>
      </button>
    );
  }
);

LiftedButton.displayName = "LiftedButton";
