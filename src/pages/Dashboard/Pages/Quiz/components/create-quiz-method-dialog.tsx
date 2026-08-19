import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  FileText,
  PencilLine,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LiftedButton } from "@/common/LiftedButton";
import { ModeCard } from "@/pages/Quiz/components/mode-card";
import { cn } from "@/utils/cn";

/**
 * Whether "from my material" can be picked yet.
 *
 * The server already accepts pasted `sourceText`, but the mode users actually asked for is
 * *upload a file* — slice 2.3 in docs/quiz/ai-quiz-generation-flow.md. Until that lands the
 * card renders disabled and says "Coming soon": showing it settles the shape of the choice
 * now, so enabling it later doesn't move the other option under anyone's cursor.
 *
 * Flipping this to `true` takes two steps, and they only work together:
 *   1. this constant,
 *   2. register `quizzes/create-quiz/ai/material` (and the `/my-dashboard` twin) in
 *      `routes/Router.tsx` — `useAiQuizDraft` already reads the mode off that segment, and
 *      the wizard already renders whichever field that mode asks for.
 *
 * Nothing else. In particular the card already navigates to `aiMaterialPath`, so flipping
 * the flag can't leave it pointing somewhere plausible-but-wrong — the failure mode that
 * makes a feature flag worse than no flag at all.
 */
export const AI_MATERIAL_MODE_ENABLED = false;

type Step = "method" | "aiSource";

export interface CreateQuizMethodDialogProps {
  /** Route for the hand-authored builder, e.g. `/dashboard/quizzes/create-quiz`. */
  manualPath: string;
  /** The generate-for-me wizard in topic mode, e.g. `/dashboard/quizzes/create-quiz/ai/topic`. */
  aiTopicPath: string;
  /**
   * The same wizard in source mode, e.g. `/dashboard/quizzes/create-quiz/ai/material`.
   *
   * Passed even though the route isn't registered yet and the card is disabled: the point of
   * wiring it now is that turning `AI_MATERIAL_MODE_ENABLED` on is a one-line change with
   * nothing left to remember. A card that navigates somewhere wrong the day it goes live is
   * exactly what a disabled placeholder is supposed to prevent.
   */
  aiMaterialPath: string;
  /**
   * What opens the dialog. Defaults to the standard "+ Create Quiz" button; pass your own
   * if a surface needs different affordance (it's wrapped in `DialogTrigger asChild`).
   */
  trigger?: ReactNode;
  /**
   * Controlled open state. Leave both undefined for the normal trigger-driven behaviour —
   * Radix treats `open === undefined` as uncontrolled. Stories pass `open` to pin the
   * dialog in view without simulating a click.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Which step to start on. Initial value only — the dialog resets to `"method"` whenever it
   * opens. Exists so a story can pin the second step without scripting a click.
   */
  initialStep?: Step;
}

/**
 * The fork in the road for quiz creation, in two steps.
 *
 * **Step 1** is the one that was always here: build it by hand, or with an AI.
 * **Step 2** appears only for people who chose AI, and asks the question the wizard used to
 * ask with a tab strip welded to the top of its card — should the AI work from a topic, or
 * from your own material?
 *
 * Moving it here is what lets the wizard be a form again. That card used to carry four
 * separate "which way?" controls (the mode tabs, Advanced, and two grey footer links) wrapped
 * around a single text box; now every route decision is made once, before anything is typed,
 * and the page you land on has one field, one Advanced drawer and one button. The chosen mode
 * travels in the URL, so the wizard never needs the tabs back — see
 * docs/quiz/ai-quiz-two-paths.md.
 *
 * Two steps in one overlay rather than a second dialog or a chooser page: the user already
 * has this dialog open, and swapping its body is a cheaper transition than closing it to load
 * a route for one binary decision. The cost is that browser Back doesn't undo step 2, which
 * is what the arrow next to the title is for.
 *
 * **The cards are `ModeCard`, the same component the player-facing game-mode hub uses**, at
 * `size="compact"`. Picking how to make a quiz and picking how to play one are the same kind
 * of decision, and they should not look like they were designed by two different people —
 * reusing the component rather than restyling a copy is what keeps that true after the next
 * change to either surface.
 *
 * Presentational and route-agnostic on purpose. The two dashboards mount the same quiz flows
 * under different path prefixes (`/dashboard/quizzes/create-quiz` vs.
 * `/my-dashboard/quizzes/create`), so the paths are props rather than hard-coded — a
 * copy-pasted version of this dialog is how one surface ends up linking into the other
 * dashboard's routes.
 */
export const CreateQuizMethodDialog = ({
  manualPath,
  aiTopicPath,
  aiMaterialPath,
  trigger,
  open,
  onOpenChange,
  initialStep = "method",
}: CreateQuizMethodDialogProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(initialStep);

  /**
   * Reset on *open*, not on close. Resetting as it closes swaps the body back to step 1
   * mid-animation, so the user watches their own choice get undone on the way out.
   */
  const handleOpenChange = (next: boolean) => {
    if (next) setStep("method");
    onOpenChange?.(next);
  };

  const isMethodStep = step === "method";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <LiftedButton>+ Create Quiz</LiftedButton>}
      </DialogTrigger>
      {/* Wider than the old two-button dialog because the cards carry a description and a
          foot row; `sm:max-w-xl` is the width at which two of them sit side by side without
          either wrapping its title. DialogContent still owns the phone gutter and the dvh
          height cap itself — see docs/RESPONSIVE.md. */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          {/* pr-6 clears the close button; the back arrow sits inline with the title rather
              than above it, so the header keeps one line at phone widths. */}
          <DialogTitle className="flex items-center gap-2 pr-6 text-xl">
            {!isMethodStep && (
              <button
                type="button"
                onClick={() => setStep("method")}
                aria-label="Back to how you want to build this quiz"
                className="-ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {isMethodStep
              ? "How do you want to build this quiz?"
              : "What should the AI work from?"}
          </DialogTitle>
        </DialogHeader>

        {/* Two equal columns that stack below `sm`, exactly like the game-mode hub — and for
            the reason in docs/RESPONSIVE.md, "Rows of buttons": equal grid columns give both
            cards one width, where a flex row would shrink their content boxes and leave two
            differently-proportioned cards side by side.

            `items-stretch` so a two-line description on one card doesn't leave the other's
            foot row floating; `mt-auto` inside ModeCard pins both to the bottom. */}
        <div
          className={cn(
            "mt-2 grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4",
            // The phone column is capped for the same reason the game-mode hub caps its own:
            // edge-to-edge full-width cards read as page sections rather than tappable
            // choices. In a dialog the gutter does half the work, so this is gentler.
            "mx-auto w-full max-w-xs sm:max-w-none"
          )}
        >
          {isMethodStep ? (
            <>
              {/* Green marks the hand-authored path, matching the colour it has carried on
                  this dialog since it was two LiftedButtons. */}
              <ModeCard
                icon={PencilLine}
                title="Manually"
                description="Write every question yourself in the builder."
                meta="Full control"
                metaIcon={Zap}
                accent="green"
                size="compact"
                onSelect={() => navigate(manualPath)}
              />
              {/* Advances the dialog instead of navigating — the AI branch has one more
                  question, and it is the question the wizard should no longer be asking. */}
              <ModeCard
                icon={Sparkles}
                title="With AI"
                description="Describe the quiz and we'll draft the questions for you."
                meta="You review before it saves"
                metaIcon={Wand2}
                accent="primary"
                size="compact"
                onSelect={() => setStep("aiSource")}
                delay={0.08}
              />
            </>
          ) : (
            <>
              <ModeCard
                icon={Wand2}
                title="From a topic"
                description="Name a subject and we'll write the questions from it."
                meta="Uses one daily generation"
                metaIcon={Zap}
                accent="primary"
                size="compact"
                onSelect={() => navigate(aiTopicPath)}
              />
              <ModeCard
                icon={FileText}
                title="From my material"
                description="Build questions out of your own notes, article or transcript."
                meta="Coming soon"
                metaIcon={Clock}
                accent="foreground"
                size="compact"
                disabled={!AI_MATERIAL_MODE_ENABLED}
                onSelect={() => navigate(aiMaterialPath)}
                delay={0.08}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizMethodDialog;
