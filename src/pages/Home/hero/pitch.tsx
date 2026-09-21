import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { riseIn } from "../use-landing-intro";
import { HeroActions } from "./hero-actions";
import { ON_WAVE_TEXT, type HeroTone } from "./tone";

/**
 * The pitch: headline, subtitle, actions. Rendered twice by `Home` (one per tone).
 *
 * **Keep the layout identical between tones** — only colours may differ between `"page"` and
 * `"wave"`. The wave copy is laid over the page copy pixel for pixel; a spacing or size change
 * made to one tone only is what makes the white text stop lining up.
 */
export function Pitch({ tone, intro }: { tone: HeroTone; intro: boolean }) {
  const onWave = tone === "wave";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-[calc(var(--header-height,3rem)+2rem)] text-center sm:pt-[calc(var(--header-height,4rem)+2.5rem)]">
      <motion.h1
        {...riseIn(intro, 0)}
        className={cn(
          // Two lines, each kept on one line (`whitespace-nowrap`). Sized so the longer one,
          // "Breathe in questions." (~10.6× the font size wide), always fits: below lg that's
          // the viewport minus the 2rem side padding; from lg, a viewport clamp with room to
          // spare, capped for ultra-wide screens.
          "whitespace-nowrap font-quiz font-bold leading-[1.02] tracking-tight",
          "text-[min(6rem,calc((100vw_-_2rem)/10.6))] lg:text-[clamp(5rem,7.4vw,8.5rem)]",
          onWave ? ON_WAVE_TEXT : "text-foreground",
        )}
      >
        Breathe in questions.
        {/* The answer line a step smaller, so the pair reads as a statement and its echo.
            In `em`, so it scales with the headline at every width. */}
        <span className="block text-[0.72em]">
          Breathe out{" "}
          <span className={onWave ? "text-cta" : "text-primary"}>answers.</span>
        </span>
      </motion.h1>

      {/* Muted gradient text, clipped to the words (`w-fit`). */}
      <motion.p
        {...riseIn(intro, 1)}
        className={cn(
          "mt-4 w-fit bg-gradient-to-br bg-clip-text text-lg font-medium leading-snug text-transparent sm:mt-6 sm:text-2xl md:text-[1.75rem] lg:text-[2.25rem]",
          onWave
            ? "from-white to-white/70 dark:from-background dark:to-background/75"
            : "from-foreground/85 via-muted-foreground to-muted-foreground/60",
        )}
      >
        Challenge yourself with a variety of quizzes.
      </motion.p>

      <motion.div {...riseIn(intro, 2)} className="mt-6 sm:mt-8">
        <HeroActions tone={tone} />
      </motion.div>
    </div>
  );
}
