import { Pitch } from "./hero/pitch";
import { useLandingIntro } from "./use-landing-intro";

/**
 * The landing page: a big headline across the middle of the screen, a subtitle and the actions,
 * on the plain page background. Decisions and reasoning: docs/home/landing-page.md.
 *
 * Until 2026-09-28 a blue wave ran behind it, and the pitch was drawn twice so the text could
 * turn white where it crossed the wave (a masked second copy). The wave went at the owner's
 * request, and the second copy with it; its files are in `_to_delete/wave/`.
 */
export const Home = () => {
  const intro = useLandingIntro();

  return (
    // flex-1 (not min-h-screen): fills the layout's dynamic-viewport column (docs/RESPONSIVE.md).
    <div className="relative flex w-full flex-1 flex-col text-foreground">
      <Pitch intro={intro} />
    </div>
  );
};
