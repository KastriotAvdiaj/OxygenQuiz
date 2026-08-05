import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PencilLine, Sparkles } from "lucide-react";
import { GrFormNextLink } from "react-icons/gr";

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
  /** Shows the "New" pill on the AI card. Drop it once the feature stops being news. */
  highlightAi?: boolean;
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
  highlightAi = true,
}: CreateQuizMethodDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      {trigger ?? <LiftedButton>+ Create Quiz</LiftedButton>}
    </DialogTrigger>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          <p className="text-xl">How do you want to build this quiz?</p>
          <p className="text-muted-foreground text-xs font-normal">
            You can edit everything afterwards either way.
          </p>
        </DialogTitle>
      </DialogHeader>

      {/* One column on phones — two 5-unit-padded cards side by side don't fit a 360px
          screen without the copy becoming unreadable. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <MethodCard
          to={manualPath}
          icon={<PencilLine className="h-8 w-8 text-primary" />}
          title="Create manually"
          description="Build the quiz yourself — pick existing questions from the bank or write new ones from scratch."
        />
        <MethodCard
          to={aiPath}
          icon={<Sparkles className="h-8 w-8 text-primary" />}
          title="Create with AI"
          description="Paste your source material, run our prompt through any AI, and we'll turn the result into a ready-to-edit quiz."
          badge={highlightAi ? "New" : undefined}
        />
      </div>
    </DialogContent>
  </Dialog>
);

interface MethodCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
}

/** One choice card. Both options render through this so they can't drift apart visually. */
const MethodCard = ({ to, icon, title, description, badge }: MethodCardProps) => (
  <Link
    to={to}
    className="group relative rounded-xl border-2 border-primary/30 hover:border-primary bg-background p-5 flex flex-col gap-3 transition-colors"
  >
    {badge && (
      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-primary/15 text-primary rounded-full px-2 py-0.5">
        {badge}
      </span>
    )}
    {icon}
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground text-xs mt-1">{description}</p>
    </div>
    {/* mt-auto pins the CTA to the bottom so both cards' CTAs align even when one
        description wraps to more lines than the other. */}
    <span className="mt-auto pt-2 text-primary text-sm flex items-center gap-1">
      Start <GrFormNextLink />
    </span>
  </Link>
);

export default CreateQuizMethodDialog;
