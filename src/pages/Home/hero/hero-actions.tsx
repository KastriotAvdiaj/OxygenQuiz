import { Link, useNavigation } from "react-router-dom";
import { PencilLine, Play, Users } from "lucide-react";
import { forwardRef } from "react";
import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import { CreateQuizMethodDialog } from "@/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog";
import { cn } from "@/utils/cn";

/**
 * The hero's actions: **Play** as the one big button, an "or", then **Host a lobby** and
 * **Create a quiz** (with a "With AI" speech bubble over its corner).
 *
 * All three are the old landing page's "Explore" `LiftedButton` (square face, a frame of edge
 * around it — docs/home/landing-page.md): Play big and in the theme blue, the two secondaries
 * the same button a size down, Host a lobby in muted greys and Create a quiz in green. Size and
 * colour carry the hierarchy.
 */
export function HeroActions() {
  return (
    <div className="flex flex-col items-center">
      <PlayButton />

      <OrDivider className="text-muted-foreground" />

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Multiplayer needs an account (docs/auth/guest-play.md); the lobby screen handles
            the login prompt. */}
        <Link to="/multiplayer-menu" tabIndex={-1}>
          <SecondaryButton
            className="bg-muted text-foreground"
            liftColor="muted-foreground"
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Host a lobby
          </SecondaryButton>
        </Link>

        <CreateQuizAction />
      </div>
    </div>
  );
}

/**
 * **Play** → `/choose-quiz`. The old "Explore" button (`components/choose-quiz-dialog.tsx`,
 * removed 2026-09-21 — `git show c7ef0452^:src/pages/Home/components/choose-quiz-dialog.tsx`):
 * square face, and a fluid size, since a fixed text-5xl dwarfed phone screens
 * (docs/RESPONSIVE.md). Wider than Explore was, with a ▶ that scales with the label. Like
 * Explore it greys out while the quiz list is loading, so a second press can't queue.
 */
function PlayButton() {
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname?.startsWith("/choose-quiz");

  return (
    <Link to="/choose-quiz" tabIndex={-1}>
      <LiftedButton
        outerClassName="rounded-none p-2"
        className="gap-2 rounded-none px-8 py-2 text-xl sm:gap-3 sm:px-12 sm:py-4 sm:text-3xl md:text-4xl lg:gap-4 lg:px-16 lg:text-5xl"
        disabled={isLoading}
      >
        <Play
          className="h-5 w-5 fill-current sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10"
          aria-hidden="true"
        />
        Play
      </LiftedButton>
    </Link>
  );
}

/**
 * Play's button a size down: the same square face and frame, smaller text and padding. The
 * caller gives it its colours (face classes + `liftColor` for the edge and shadow).
 * Forwards its ref and props — "Create a quiz" is a Radix `DialogTrigger asChild`, which hands
 * the trigger its `onClick`/`aria-*` props and ref; a wrapper that dropped them would render a
 * button that never opens anything.
 */
const SecondaryButton = forwardRef<HTMLButtonElement, LiftedButtonProps>(
  ({ className, outerClassName, ...props }, ref) => (
    <LiftedButton
      ref={ref}
      outerClassName={cn("rounded-none p-1", outerClassName)}
      className={cn(
        "gap-1.5 rounded-none px-4 py-2 text-sm sm:gap-2 sm:px-5 sm:py-2.5 sm:text-base",
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
 */
function CreateQuizAction() {
  return (
    <CreateQuizMethodDialog
      trigger={
        <SecondaryButton
          className="bg-quiz-success text-white"
          liftColor="hsl(var(--quiz-success))"
        >
          <PencilLine className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          Create a quiz
          <span className="sr-only">, by hand or with AI</span>
          <WithAiBubble />
        </SecondaryButton>
      }
      manualPath="/my-dashboard/quizzes/create"
      aiTopicPath="/my-dashboard/quizzes/create/ai/topic"
      aiMaterialPath="/my-dashboard/quizzes/create/ai/material"
      associationsPath="/my-dashboard/quizzes/create/associations"
    />
  );
}

/**
 * A small "With AI" speech bubble over the top-right corner of "Create a quiz", its tail pointing
 * down at the button: tells people AI is an option before they open the chooser, without adding
 * a third button. It sits inside the button's face, so it lifts and presses with it. The tail is
 * a CSS border triangle in the bubble's colour, centred under it. Decorative: the button's
 * label already says "by hand or with AI" to screen readers.
 */
function WithAiBubble() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-4 -top-7 select-none whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[11px] font-bold leading-none tracking-wide text-primary-foreground shadow-md"
    >
      With AI
      <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-primary" />
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
