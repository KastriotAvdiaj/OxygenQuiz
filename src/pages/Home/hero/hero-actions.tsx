import { Link } from "react-router-dom";
import { PencilLine, Play, Users } from "lucide-react";
import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { CreateQuizMethodDialog } from "@/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog";
import { cn } from "@/utils/cn";
import { ON_WAVE_TEXT, type HeroTone } from "./tone";

/**
 * The hero's actions: **Play** as the one big button — always the inverse of the two smaller
 * ones, so it is the loudest thing on the page in either theme — an "or", then
 * **Host a lobby** and **Create a quiz** (with a small "AI" tag on its corner).
 *
 * All three are **flat**: the shared `Button`, not `LiftedButton`. The 3D button's edge and
 * shadow are drawn by darkening its own colour, which works on the theme blue and not on a
 * near-black or white face — every attempt at a visible edge here ended up either invisible or
 * an ornament of its own. Flat pills on a flat wave: shape and contrast carry the hierarchy,
 * and the only motion is a colour change on hover and a small press.
 *
 * In the `"wave"` tone every button is an invisible placeholder that only holds its space: the
 * real buttons underneath read on both backgrounds and show through. Only the "or" divider is
 * recoloured.
 */
export function HeroActions({ tone }: { tone: HeroTone }) {
  const isWave = tone === "wave";

  return (
    <div className="flex flex-col items-center">
      <Placeholder when={isWave}>
        <Link to="/choose-quiz" tabIndex={-1}>
          <PrimaryButton>
            <Play
              className="h-4 w-4 fill-current lg:h-5 lg:w-5 xl:h-6 xl:w-6"
              aria-hidden="true"
            />
            Play
          </PrimaryButton>
        </Link>
      </Placeholder>

      <OrDivider className={isWave ? ON_WAVE_TEXT : "text-muted-foreground"} />

      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        <Placeholder when={isWave}>
          {/* Multiplayer needs an account (docs/auth/guest-play.md); the lobby screen handles
              the login prompt. */}
          <Link to="/multiplayer-menu" tabIndex={-1}>
            <SecondaryButton>
              <Users className="h-4 w-4" aria-hidden="true" />
              Host a lobby
            </SecondaryButton>
          </Link>
        </Placeholder>

        <Placeholder when={isWave}>
          <CreateQuizAction interactive={!isWave} />
        </Placeholder>
      </div>
    </div>
  );
}

/**
 * Shared by all three: a pill, and a focus ring in the text colour. The shared `Button`'s ring is
 * `--ring`, which is close enough to the wave's blue to disappear on it; `foreground` reads on the
 * page background and on the blue in both themes. `ring-offset-background` keeps the gap around
 * the ring the colour of the page rather than of the button.
 */
const HERO_BUTTON =
  "rounded-full transition-colors duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * **Play**. The inverse of the secondaries in either theme — navy on white, white on near-black —
 * which is what makes it the primary action without a colour of its own. It steps up a size at
 * `lg` and again at `xl`; below that it stays thumb-sized rather than shrinking.
 */
const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="default"
      size="none"
      className={cn(
        HERO_BUTTON,
        "bg-foreground px-8 py-3 text-lg font-bold text-background hover:bg-foreground/85",
        "dark:bg-white dark:text-primary dark:hover:bg-white/85",
        "sm:px-10 sm:text-xl lg:px-12 lg:py-3.5 lg:text-2xl xl:px-14 xl:py-4 xl:text-3xl",
        className,
      )}
      {...props}
    />
  ),
);
PrimaryButton.displayName = "PrimaryButton";

/**
 * Clearly a button, clearly second: an outlined pill on the page background.
 * Forwards its ref and props — "Create a quiz" is used as a Radix `DialogTrigger asChild`,
 * which hands the trigger its `onClick`/`aria-*` props and ref; a wrapper that dropped them
 * would render a button that never opens anything.
 */
const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="outline"
      size="none"
      className={cn(
        HERO_BUTTON,
        "gap-1.5 border-foreground/25 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted sm:gap-2 sm:px-5 sm:py-2.5 sm:text-base",
        className,
      )}
      {...props}
    />
  ),
);
SecondaryButton.displayName = "SecondaryButton";

/**
 * "Create a quiz" opens the same manual-or-AI chooser the user dashboard uses, with the user
 * dashboard's routes. Logged-out visitors are sent to /login?redirectTo=… by that route's
 * loader and land back where they were going.
 *
 * `interactive={false}` renders just the button shape (for the wave copy) — no dialog, so the
 * page never mounts two of them.
 */
function CreateQuizAction({ interactive }: { interactive: boolean }) {
  const button = (
    <SecondaryButton>
      <PencilLine className="h-4 w-4" aria-hidden="true" />
      Create a quiz
      <span className="sr-only">, by hand or with AI</span>
      <AiTag />
    </SecondaryButton>
  );

  return (
    <>
      {interactive ? (
        <CreateQuizMethodDialog
          trigger={button}
          manualPath="/my-dashboard/quizzes/create"
          aiTopicPath="/my-dashboard/quizzes/create/ai/topic"
          aiMaterialPath="/my-dashboard/quizzes/create/ai/material"
          associationsPath="/my-dashboard/quizzes/create/associations"
        />
      ) : (
        button
      )}
    </>
  );
}

/**
 * A small "AI" tag pinned to the top-right corner of "Create a quiz": tells people AI is an
 * option before they open the chooser, without adding a third button. It is positioned against
 * the button itself (the shared `Button` is `relative`), so it presses with it. The ring in the
 * page colour cuts it out from whatever is behind — the page or the wave. Decorative: the
 * button's label already says "by hand or with AI" to screen readers.
 */
function AiTag() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-2 select-none rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-primary-foreground ring-2 ring-background"
    >
      AI
    </span>
  );
}

function OrDivider({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] sm:my-7 lg:my-9",
        className,
      )}
    >
      <span className="h-px w-10 bg-current opacity-40" />
      or
      <span className="h-px w-10 bg-current opacity-40" />
    </div>
  );
}

/**
 * Keeps its child's space but draws nothing — for the buttons in the wave copy.
 * `visibility: hidden` also takes them out of the tab order and the accessibility tree.
 */
function Placeholder({ when, children }: { when: boolean; children: React.ReactNode }) {
  if (!when) return <>{children}</>;
  return (
    <span className="invisible" aria-hidden="true">
      {children}
    </span>
  );
}
