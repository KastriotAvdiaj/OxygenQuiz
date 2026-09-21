import { motion } from "framer-motion";
import { Pitch } from "./hero/pitch";
import { Wave } from "./hero/wave";
import { WAVE_MASK_VARS } from "./hero/wave-shapes";
import { fadeIn, useLandingIntro } from "./use-landing-intro";

/**
 * The landing page: a big headline across the middle of the screen, over a blue wave — and
 * where the text crosses onto the wave, it changes colour. Decisions and reasoning:
 * docs/home/landing-page.md.
 *
 * How the colour change works: the pitch is rendered **twice**, in identical layout.
 * 1. The `"page"` copy, in normal colours, in flow — the real one, with every link and button.
 * 2. The `"wave"` copy on top, recoloured, masked to the wave's exact shape with CSS
 *    `mask-image` (the same path as the drawn wave, stretched the same way). It shows only on
 *    the wave, and there it covers the page copy. It is decorative: `aria-hidden`, no pointer
 *    events, its buttons invisible placeholders.
 *
 * The wave and its mask **fade** in rather than slide: moving the wave would drag it out from
 * under its own mask.
 */
export const Home = () => {
  const intro = useLandingIntro();

  return (
    // flex-1 (not min-h-screen): fills the layout's dynamic-viewport column (docs/RESPONSIVE.md).
    // overflow-hidden: the wave is sized to the page and must never add a scrollbar.
    <div className="relative flex w-full flex-1 flex-col overflow-hidden text-foreground">
      <motion.div {...fadeIn(intro)} className="pointer-events-none absolute inset-0">
        <Wave />
      </motion.div>

      <Pitch tone="page" intro={intro} />

      <motion.div
        {...fadeIn(intro)}
        aria-hidden="true"
        style={WAVE_MASK_VARS}
        className="pointer-events-none absolute inset-0 flex flex-col [-webkit-mask-image:var(--wave-mask-sm)] [-webkit-mask-size:100%_100%] [mask-image:var(--wave-mask-sm)] [mask-size:100%_100%] lg:[-webkit-mask-image:var(--wave-mask-lg)] lg:[mask-image:var(--wave-mask-lg)]"
      >
        <Pitch tone="wave" intro={intro} />
      </motion.div>
    </div>
  );
};
