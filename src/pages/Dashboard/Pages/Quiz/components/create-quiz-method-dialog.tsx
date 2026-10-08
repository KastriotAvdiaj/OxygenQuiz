import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  LayoutGrid,
  FileText,
  ListChecks,
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
import { useFormatAvailable } from "../format-access";

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

/**
 * The steps, one question each:
 * - `format` — what kind of quiz (Classic or Associations). Only while there is a choice: players
 *   don't see Associations yet (format-access.ts), so for them the dialog opens on `method`.
 * - `method` — how to build a Classic quiz (by hand, or with AI).
 * - `aiSource` — what the AI works from (a topic, or your own material).
 */
type Step = "format" | "method" | "aiSource";

/** How long the chosen step's cards take to leave before the next step's arrive, in ms. */
const LEAVE_MS = 170;

/** The centre and width of the card that was just picked, in viewport pixels. */
type Origin = { x: number; y: number; width: number };

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
   * The Associations board builder, e.g. `/dashboard/quizzes/create-quiz/associations`. A
   * different *format*, so it is a card on the first step ("What kind of quiz?"), next to
   * Classic (docs/quiz/associations.md, "Authoring").
   */
  associationsPath: string;
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
   * Which step to start on. Initial value only — the dialog resets to its first step whenever
   * it opens. Exists so a story can pin a later step without scripting a click.
   */
  initialStep?: Step;
}

/**
 * The fork in the road for quiz creation. Each step asks one question:
 *
 * 1. **What kind of quiz?** Classic, or an Associations board. Associations has one way to be
 *    built, so it goes straight to its builder; Classic goes on to step 2. Skipped for anyone
 *    who can't pick Associations yet — a question with one answer isn't a question.
 * 2. **How do you want to build it?** By hand, or with an AI.
 * 3. **What should the AI work from?** Only after "With AI": a topic, or your own material. It
 *    used to be a tab strip welded to the top of the wizard's card; asking it here is what lets
 *    the wizard be a form (docs/quiz/ai-quiz-two-paths.md).
 *
 * The first step used to mix the two questions — Manually, With AI and Associations side by
 * side — which offered a format as if it were a way of writing questions.
 *
 * **The move between steps** (docs/quiz/ai-quiz-two-paths.md §2a): the card you pick grows a touch
 * and fades while its sibling shrinks away (`LEAVE_MS`), then the next step's two cards pop out
 * of where the picked card was — each starts at its centre, small, and springs to its own place
 * (`Emerge`). The Back arrow reverses without the pop: the earlier step just fades back in, as
 * returning shouldn't look like choosing. Under reduced motion the steps simply swap.
 *
 * Every step is two cards, so the dialog keeps one width throughout and nothing but the cards
 * moves. Steps in one overlay rather than a chooser page: the user already has it open, and
 * swapping its body is cheaper than loading a route for each small decision. Browser Back doesn't
 * undo a step, which is what the arrow next to the title is for.
 *
 * **The cards are `ModeCard`, the same component the player-facing game-mode hub uses**, at
 * `size="compact"` — picking how to make a quiz and how to play one are the same kind of
 * decision. Their own entrance is off here (`entrance={false}`); `Emerge` owns it.
 *
 * Presentational and route-agnostic on purpose: the two dashboards and the landing page mount
 * it with different paths (`/dashboard/quizzes/create-quiz` vs. `/my-dashboard/quizzes/create`),
 * so they are props rather than hard-coded.
 */
export const CreateQuizMethodDialog = ({
  manualPath,
  aiTopicPath,
  aiMaterialPath,
  associationsPath,
  trigger,
  open,
  onOpenChange,
  initialStep,
}: CreateQuizMethodDialogProps) => {
  const navigate = useNavigate();
  // Every player since Associations was released (format-access.ts); the format step is skipped
  // for anyone a future preview format would hide from.
  const showAssociations = useFormatAvailable("Associations");
  const firstStep: Step = showAssociations ? "format" : "method";

  const [step, setStep] = useState<Step>(initialStep ?? firstStep);
  // The card being left for the next step (it and its sibling are animating out), if any.
  const [leaving, setLeaving] = useState<string | null>(null);
  // Where the next step's cards pop out from; null for Back, which just fades in.
  const [origin, setOrigin] = useState<Origin | null>(null);
  const slots = useRef<Record<string, HTMLDivElement | null>>({});
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const grid = useRef<HTMLDivElement>(null);
  // Set by advance/back, so the effect below moves focus only after a step change the user made
  // — not when the dialog opens, where Radix places focus itself. "pointer" when the choice was a
  // click or tap, "keyboard" otherwise.
  const steppedRef = useRef<"keyboard" | "pointer" | null>(null);
  // Set on pointerdown inside the dialog, cleared on keydown. `:focus-visible` can't tell us:
  // Radix focuses the first card when the dialog opens, and clicking an already-focused card
  // leaves it matching `:focus-visible`.
  const lastInputRef = useRef<"keyboard" | "pointer">("keyboard");
  const reduceMotion = useReducedMotion();

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  /**
   * After a step change, put focus back inside the cards. The control that had it has just
   * unmounted, and focus would otherwise fall to the dialog itself — which lights its border, and
   * leaves a keyboard user nowhere. From the keyboard it goes to the new step's first card; after
   * a click it goes to the cards' grid (tabIndex -1, no outline), because Chrome draws the focus
   * ring on a card focused by script even after a mouse click.
   */
  useEffect(() => {
    const how = steppedRef.current;
    if (!how) return;
    steppedRef.current = null;
    const target =
      how === "keyboard"
        ? grid.current?.querySelector<HTMLButtonElement>("button:not([disabled])")
        : grid.current;
    target?.focus({ preventScroll: true });
  }, [step]);

  const howChosen = () => lastInputRef.current;

  /**
   * Reset on *open*, not on close. Resetting as it closes swaps the body back to the first step
   * mid-animation, so the user watches their own choice get undone on the way out.
   */
  const handleOpenChange = (next: boolean) => {
    if (next) {
      clearTimeout(leaveTimer.current);
      setStep(firstStep);
      setLeaving(null);
      setOrigin(null);
    }
    onOpenChange?.(next);
  };

  /** Leave for `next` from the card `key`: play the leave, then mount the next step's cards. */
  const advance = (key: string, next: Step) => {
    if (leaving) return; // one choice at a time
    const el = slots.current[key];
    const rect = el?.getBoundingClientRect();
    const from = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width }
      : null;

    steppedRef.current = howChosen();
    if (reduceMotion) {
      setStep(next);
      return;
    }
    setLeaving(key);
    leaveTimer.current = setTimeout(() => {
      setOrigin(from);
      setStep(next);
      setLeaving(null);
    }, LEAVE_MS);
  };

  const back = () => {
    clearTimeout(leaveTimer.current);
    setLeaving(null);
    setOrigin(null);
    steppedRef.current = howChosen();
    setStep(step === "aiSource" ? "method" : "format");
  };

  const canGoBack = step === "aiSource" || (step === "method" && showAssociations);

  const title =
    step === "format"
      ? "What kind of quiz?"
      : step === "method"
        ? "How do you want to build it?"
        : "What should the AI work from?";

  /** One card's slot: its leave animation, its emerge animation, and a ref to measure it by. */
  const slot = (key: string, index: number, card: ReactNode) => (
    <motion.div
      key={key}
      className="h-full"
      initial={false}
      animate={
        leaving === null
          ? { opacity: 1, scale: 1 }
          : leaving === key
            ? { opacity: 0, scale: 1.04 }
            : { opacity: 0, scale: 0.9 }
      }
      transition={{ duration: LEAVE_MS / 1000, ease: "easeOut" }}
    >
      <Emerge
        origin={origin}
        index={index}
        slotRef={(el) => {
          slots.current[key] = el;
        }}
      >
        {card}
      </Emerge>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <LiftedButton>+ Create Quiz</LiftedButton>}
      </DialogTrigger>
      {/* `sm:max-w-xl` is the width at which two cards sit side by side without either wrapping
          its title — and every step is two cards, so the width never changes. DialogContent
          owns the phone gutter and the dvh height cap (docs/RESPONSIVE.md). */}
      <DialogContent
        className="sm:max-w-xl"
        onPointerDownCapture={() => {
          lastInputRef.current = "pointer";
        }}
        onKeyDownCapture={() => {
          lastInputRef.current = "keyboard";
        }}
      >
        <DialogHeader>
          {/* pr-6 clears the close button; the back arrow sits inline with the title, so the
              header keeps one line at phone widths. */}
          <DialogTitle className="flex items-center gap-2 pr-6 text-xl">
            {canGoBack && (
              <button
                type="button"
                onClick={back}
                aria-label="Back to the previous question"
                className="-ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Two equal columns that stack below `sm`, like the game-mode hub (docs/RESPONSIVE.md,
            "Rows of buttons"). Keyed by step, so each step's cards mount fresh and emerge.
            `items-stretch` + ModeCard's `mt-auto` keep both foot rows level. The phone column
            is capped so full-width cards don't read as page sections. */}
        <div
          key={step}
          ref={grid}
          tabIndex={-1}
          className="mx-auto mt-2 grid outline-none w-full max-w-xs items-stretch gap-3 sm:max-w-none sm:grid-cols-2 sm:gap-4"
        >
          {step === "format" && (
            <>
              {slot(
                "classic",
                0,
                <ModeCard
                  icon={ListChecks}
                  title="Classic quiz"
                  description="Questions with answers to pick or type."
                  meta="By hand or with AI"
                  metaIcon={Sparkles}
                  accent="primary"
                  size="compact"
                  entrance={false}
                  onSelect={() => advance("classic", "method")}
                />,
              )}
              {/* One way to build a board, so no second question: straight to the builder. */}
              {slot(
                "associations",
                1,
                <ModeCard
                  icon={LayoutGrid}
                  title="Associations"
                  description="A board: four columns of clues and a final solution."
                  meta="The Oxygen final"
                  metaIcon={Zap}
                  accent="foreground"
                  size="compact"
                  entrance={false}
                  onSelect={() => navigate(associationsPath)}
                />,
              )}
            </>
          )}

          {step === "method" && (
            <>
              {/* Green marks the hand-authored path, the colour it has carried on this dialog
                  since it was two LiftedButtons. */}
              {slot(
                "manual",
                0,
                <ModeCard
                  icon={PencilLine}
                  title="Manually"
                  description="Write every question yourself in the builder."
                  meta="Full control"
                  metaIcon={Zap}
                  accent="green"
                  size="compact"
                  entrance={false}
                  onSelect={() => navigate(manualPath)}
                />,
              )}
              {slot(
                "ai",
                1,
                <ModeCard
                  icon={Sparkles}
                  title="With AI"
                  description="Describe the quiz and we'll draft the questions for you."
                  meta="You review before it saves"
                  metaIcon={Wand2}
                  accent="primary"
                  size="compact"
                  entrance={false}
                  onSelect={() => advance("ai", "aiSource")}
                />,
              )}
            </>
          )}

          {step === "aiSource" && (
            <>
              {slot(
                "topic",
                0,
                <ModeCard
                  icon={Wand2}
                  title="From a topic"
                  description="Name a subject and we'll write the questions from it."
                  meta="Uses one daily generation"
                  metaIcon={Zap}
                  accent="primary"
                  size="compact"
                  entrance={false}
                  onSelect={() => navigate(aiTopicPath)}
                />,
              )}
              {slot(
                "material",
                1,
                <ModeCard
                  icon={FileText}
                  title="From my material"
                  description="Build questions out of your own notes, article or transcript."
                  meta="Coming soon"
                  metaIcon={Clock}
                  accent="foreground"
                  size="compact"
                  entrance={false}
                  disabled={!AI_MATERIAL_MODE_ENABLED}
                  onSelect={() => navigate(aiMaterialPath)}
                />,
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * A card arriving. With an `origin` (the card just picked), it starts at that card's centre,
 * small and transparent, and springs out to its own place — so the next choices read as coming
 * *out of* the one you picked. Without one (the first step, or Back) it just fades up.
 *
 * Imperative (`animate` on the element in a layout effect) rather than `initial`/`animate`
 * props, because where it starts depends on where it *lands*, which is only known once it has
 * been laid out. The layout effect runs before the first paint and hides it first, so it never
 * flashes in its final place. Under reduced motion it does nothing.
 */
const Emerge = ({
  origin,
  index,
  children,
  slotRef,
}: {
  origin: Origin | null;
  index: number;
  children: ReactNode;
  /** Receives the element, so the dialog can measure this card if it is picked. (Not `ref`:
   *  React 18 doesn't pass `ref` to function components as a prop.) */
  slotRef: (el: HTMLDivElement | null) => void;
}) => {
  const el = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const node = el.current;
    if (!node || reduceMotion) return;

    const delay = index * 0.05;
    node.style.opacity = "0";

    if (!origin) {
      const fade = animate(node, { opacity: [0, 1], y: [8, 0] }, { duration: 0.22, delay, ease: "easeOut" });
      return () => fade.stop();
    }

    const box = node.getBoundingClientRect();
    const dx = origin.x - (box.left + box.width / 2);
    const dy = origin.y - (box.top + box.height / 2);
    const move = animate(
      node,
      { x: [dx, 0], y: [dy, 0], scale: [0.5, 1] },
      { type: "spring", stiffness: 420, damping: 30, mass: 0.8, delay },
    );
    const fade = animate(node, { opacity: [0, 1] }, { duration: 0.16, delay, ease: "easeOut" });
    return () => {
      move.stop();
      fade.stop();
    };
    // Mount only: a card emerges once, when its step appears (the grid is keyed by step).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="h-full"
      ref={(node) => {
        el.current = node;
        slotRef(node);
      }}
    >
      {children}
    </div>
  );
};

export default CreateQuizMethodDialog;
