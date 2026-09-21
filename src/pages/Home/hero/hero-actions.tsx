import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PencilLine, Play, Users } from "lucide-react";
import { forwardRef } from "react";
import { LiftedButton, type LiftedButtonProps } from "@/common/LiftedButton";
import { CreateQuizMethodDialog } from "@/pages/Dashboard/Pages/Quiz/components/create-quiz-method-dialog";
import { cn } from "@/utils/cn";
import { ON_WAVE_TEXT, type HeroTone } from "./tone";

/**
 * The hero's actions: **Play** as the one big button, an "or", then two smaller ones —
 * **Host a lobby** and **Create a quiz** (with a floating "With AI" bubble).
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
          <LiftedButton
            liftColor="var(--color-cta)"
            glow={false}
            className="gap-2 bg-cta px-7 py-2.5 text-lg font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)] sm:px-9 sm:text-xl lg:px-10 lg:py-3 lg:text-2xl"
          >
            <Play className="h-4 w-4 fill-current lg:h-5 lg:w-5" aria-hidden="true" />
            Play
          </LiftedButton>
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
 * Same treatment as "Cancel" in the confirmation dialog: clearly a button, clearly second.
 * Forwards its ref and props — "Create a quiz" is used as a Radix `DialogTrigger asChild`,
 * which hands the trigger its `onClick`/`aria-*` props and ref; a wrapper that dropped them
 * would render a button that never opens anything.
 */
const SecondaryButton = forwardRef<HTMLButtonElement, LiftedButtonProps>(
  ({ className, ...props }, ref) => (
    <LiftedButton
      ref={ref}
      liftColor="muted"
      glow={false}
      className={cn(
        "gap-1.5 border border-foreground/30 bg-background px-3.5 py-1.5 text-sm text-foreground sm:gap-2 sm:px-5 sm:py-2 sm:text-base",
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
    </SecondaryButton>
  );

  return (
    <span className="relative inline-block">
      {interactive ? (
        <CreateQuizMethodDialog
          trigger={button}
          manualPath="/my-dashboard/quizzes/create"
          aiTopicPath="/my-dashboard/quizzes/create/ai/topic"
          aiMaterialPath="/my-dashboard/quizzes/create/ai/material"
        />
      ) : (
        button
      )}
      <AiBubble />
    </span>
  );
}

/**
 * A small speech bubble hovering over the corner of "Create a quiz": tells people AI is an
 * option before they open the chooser, without adding a third button. White with a blue label
 * so it reads on the page and on the wave. It bobs gently — never under reduced motion.
 */
function AiBubble() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute -right-3 -top-4 rotate-6 select-none"
      animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="relative block whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-primary shadow-md ring-1 ring-primary/25">
        With AI
        {/* The bubble's tail, pointing down at the button. */}
        <span className="absolute -bottom-1 left-3 h-2 w-2 rotate-45 bg-white ring-1 ring-primary/25 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
      </span>
    </motion.span>
  );
}

function OrDivider({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] sm:my-4",
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
