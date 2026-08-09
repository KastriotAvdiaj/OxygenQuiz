import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { LiftedButton } from "@/common/LiftedButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface CreateQuizMethodDialogProps {
  /** Route for the hand-authored builder, e.g. `/dashboard/quizzes/create-quiz`. */
  manualPath: string;
  /** Route for the AI wizard, e.g. `/dashboard/quizzes/create-quiz/ai`. */
  aiPath: string;
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
}

/**
 * The fork in the road for quiz creation: build it by hand, or generate it from source
 * material with an AI (see docs/quiz/ai-quiz-architecture.md).
 *
 * Presentational and route-agnostic on purpose. The two dashboards mount the same quiz
 * flows under different path prefixes (`/dashboard/quizzes/create-quiz` vs.
 * `/my-dashboard/quizzes/create`), so the paths are props rather than hard-coded — a
 * copy-pasted version of this dialog is how one surface ends up linking into the other
 * dashboard's routes.
 */
export const CreateQuizMethodDialog = ({
  manualPath,
  aiPath,
  trigger,
  open,
  onOpenChange,
}: CreateQuizMethodDialogProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <LiftedButton>+ Create Quiz</LiftedButton>}
      </DialogTrigger>
      {/* Two short buttons need far less room than the paragraph-bearing cards this
          replaced; DialogContent owns the phone gutter itself (see docs/RESPONSIVE.md). */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            How do you want to build this quiz?
          </DialogTitle>
        </DialogHeader>

        {/* Grid, not a flex row: equal columns give both buttons one width, and stacking
            below `sm` is a layout change rather than a squeezed, mid-phrase-wrapping
            deformation. See "Rows of buttons" in docs/RESPONSIVE.md.

            `outerClassName="w-full"` sizes the outer button to the grid cell and
            `h-full w-full` makes the front face fill it, so a label that wraps on one
            button can't leave the other's coloured face short in an equal-height row. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {/* Green marks the hand-authored path so the two options are distinguishable at
              a glance. `liftColor` recolors the edge and drop shadow to match: leave it
              out and a green face sits on the theme-primary blue depth layers. Both read
              from the same `--quiz-success` token, so dark mode tracks automatically. */}
          <LiftedButton
            type="button"
            onClick={() => navigate(manualPath)}
            outerClassName="w-full"
            liftColor="hsl(var(--quiz-success))"
            className="h-full w-full bg-quiz-success px-4 py-2.5 text-sm font-semibold leading-tight text-center"
          >
            Create manually
          </LiftedButton>

          <LiftedButton
            type="button"
            onClick={() => navigate(aiPath)}
            outerClassName="w-full"
            className="h-full w-full px-4 py-2.5 text-sm font-semibold leading-tight text-center"
          >
            Create with AI
          </LiftedButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizMethodDialog;
