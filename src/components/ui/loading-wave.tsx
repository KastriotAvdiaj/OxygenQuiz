import { cn } from "@/utils/cn";

// Font-size drives everything: the bounce height is expressed in `em` (see the
// `loading-wave` keyframe in global.css), so picking a size scales the hop too.
const sizes = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

const variants = {
  primary: "text-foreground",
  muted: "text-muted-foreground",
  quiz: "text-quiz-primary",
};

export type LoadingWaveProps = {
  /** Word to animate. Each character hops in turn to form a travelling wave. */
  text?: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  /** Duration of one full wave cycle, in milliseconds. Lower = faster. */
  speed?: number;
  className?: string;
};

/**
 * An animated word-mark loader: the letters of `text` rise and fall one after
 * another, sending a wave across the word to signal a busy/loading state.
 *
 * Each letter runs the same `loading-wave` keyframe (global.css) but with a
 * staggered `animation-delay`, so the peak travels left-to-right and loops.
 */
export const LoadingWave = ({
  text = "LOADING",
  size = "md",
  variant = "primary",
  speed = 1200,
  className = "",
}: LoadingWaveProps) => {
  const chars = [...text];
  // Each letter starts a little after the previous one. Spreading the delay over
  // ~70% of the cycle keeps a visible gap between the wave's crest and trough.
  const step = (speed * 0.7) / Math.max(chars.length, 1);

  return (
    <div
      role="status"
      className={cn(
        "inline-flex select-none font-quiz  tracking-[0.2em]",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block animate-loading-wave"
          style={{
            animationDuration: `${speed}ms`,
            animationDelay: `${i * step}ms`,
          }}
        >
          {/* Preserve spaces so multi-word text keeps its gaps. */}
          {char === " " ? " " : char}
        </span>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
};
