import { useId } from "react";
import { cn } from "@/utils/cn";

// Width drives everything: the box is `aspect-[2/1]` and every shape inside is placed in
// percentages, so picking a size scales the whole loader. Each size steps up at the
// breakpoints in both directions: small on a 360px phone (docs/RESPONSIVE.md), and larger
// again from `lg`/`xl` — at a fixed 64px it all but disappeared in the middle of a 1900px
// quiz grid.
//
// `blur` is the goo filter's `stdDeviation`, in px. It cannot be a percentage (SVG filters
// work in user space), so each size carries one value for all its steps. Checked by
// rendering: 3px fuses cleanly from 48px to 96px wide, 4px from 64px to 128px. Too little
// and the ball never visibly fuses with a bar; too much and the bars melt into one lump —
// re-check both ends if you widen a range.
const sizes = {
  sm: { box: "w-8", blur: 1.5 },
  md: { box: "w-10 sm:w-12 lg:w-16", blur: 2.5 },
  lg: { box: "w-12 sm:w-16 lg:w-20 xl:w-24", blur: 3 },
  xl: { box: "w-16 sm:w-20 md:w-24 lg:w-28 xl:w-32", blur: 4 },
};

// The shapes are `bg-current`, so a variant is just a text colour on the wrapper.
const variants = {
  primary: "text-primary",
  muted: "text-muted-foreground",
  quiz: "text-quiz-primary",
};

export type BlobLoaderProps = {
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  /** Duration of one crossing, in milliseconds. Lower = faster. */
  speed?: number;
  /**
   * What a screen reader announces. Pass `""` when something next to it already says what
   * is happening (a heading, or `PageLoading`'s own label) so it is not announced twice.
   */
  label?: string;
  className?: string;
};

/**
 * The app's loader: a ball of liquid peels off the left bar, travels across, and is
 * swallowed by the right one — then it happens again.
 *
 * The "liquid" is an SVG goo filter: the shapes are blurred, then the alpha channel is
 * pushed through a steep threshold (`feColorMatrix`, `18a − 7`), so wherever two blurs
 * overlap they read as one solid, rounded mass. That is also why the bars have soft
 * corners without any `rounded-*`.
 *
 * Why an SVG filter and not the CSS original's `filter: blur() contrast()` +
 * `mix-blend-mode: darken`: that trick only works as black shapes on an opaque white
 * box. It can't be `primary` and can't sit on the dark theme or the landing page's wave.
 * The SVG filter thresholds alpha instead of colour, so the loader is transparent and
 * takes whatever colour `variant` gives it.
 *
 * The ball's reset to the left is invisible by construction: at 90% it is already inside
 * the right bar, and it reappears inside the left one.
 *
 * Replaces `LoadingWave` as the default (see docs/development/loading-states.md).
 */
export const BlobLoader = ({
  size = "md",
  variant = "primary",
  speed = 1000,
  label = "Loading",
  className,
}: BlobLoaderProps) => {
  // useId returns ":r0:"-style ids; colons are not safe inside `url(#…)`.
  const filterId = `blob-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { box, blur } = sizes[size];

  return (
    <div
      role="status"
      className={cn(
        "relative inline-block aspect-[2/1] shrink-0",
        box,
        variants[variant],
        className,
      )}
    >
      <svg aria-hidden="true" focusable="false" className="absolute h-0 w-0">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>
      </svg>

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
      >
        <span className="absolute left-[10%] top-[10%] h-[80%] w-[20%] bg-current" />
        <span className="absolute right-[10%] top-[10%] h-[80%] w-[20%] bg-current" />
        {/* translateX(300%) of its own 20% width = 60% of the box: exactly from the left
            bar into the right one. The keyframe lives in global.css. */}
        <span
          className="absolute left-[10%] top-[30%] h-[40%] w-[20%] animate-blob-loader rounded-full bg-current"
          style={{ animationDuration: `${speed}ms` }}
        />
      </div>

      {label && <span className="sr-only">{label}</span>}
    </div>
  );
};
