import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LayoutGrid } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { useUser } from "@/lib/Auth";
import { useDisclosure } from "@/hooks/use-disclosure";
import type { QuizSummaryDTO } from "@/types/quiz-types";
import { QuizStartModal } from "../components/quiz-start-modal";
import { quizPlayPath } from "../quiz-play-path";
import { useGuestCanPlay } from "../Sessions/api/guest-quiz-session";
import { useFeaturedQuizzes } from "./api/get-featured-quizzes";
import { CATEGORY_PANELS, fillPanels } from "./featured-catalogue";
import { CategoryPanel } from "./category-panel";
import { SignUpForMoreDialog } from "./sign-up-for-more-dialog";

/** Where "Browse all" and "Explore more quizzes" go: the full, filterable catalogue. */
export const CATALOGUE_PATH = "/choose-quiz/all";

/**
 * The quiz home page, `/choose-quiz`: four category panels, each an Easy → Expert ladder of
 * featured quizzes, and a way through to the whole catalogue. Built for a first-time visitor —
 * one of these is the natural pick for a guest's free quiz. See docs/quiz/featured-quizzes.md.
 */
export function FeaturedQuizzes() {
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useUser();
  const signedOut = !isUserLoading && !user;
  // A guest who has had their free quiz gets the sign-up prompt instead of the start dialog
  // (docs/auth/guest-play.md); the play route would only bounce them to the login page.
  const { data: guestStatus } = useGuestCanPlay({ enabled: signedOut });
  const guestSpent = signedOut && guestStatus?.canPlay === false;

  const { data: quizzes, isLoading, isError } = useFeaturedQuizzes();
  const filled = quizzes ? fillPanels(quizzes) : null;

  const [picked, setPicked] = useState<QuizSummaryDTO | null>(null);
  const start = useDisclosure();
  const signUp = useDisclosure();

  const handlePick = (quiz: QuizSummaryDTO) => {
    setPicked(quiz);
    if (guestSpent) signUp.open();
    else start.open();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
      <button
        onClick={() => navigate("/choose-mode")}
        className="group mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>

      <header className="flex items-center justify-between gap-3">
        <h1 className="font-header text-3xl font-black leading-none sm:text-4xl">
          {signedOut ? "Pick your first quiz" : "Pick a quiz"}
        </h1>
        <Link to={CATALOGUE_PATH} tabIndex={-1} className="shrink-0">
          <LiftedButton size="sm" className="gap-1.5 bg-muted text-foreground" liftColor="muted-foreground">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Browse all
          </LiftedButton>
        </Link>
      </header>

      <div className="mt-6 space-y-6 sm:mt-8 sm:space-y-8">
        {filled
          ? filled.map(({ panel, slots }) => (
              <CategoryPanel key={panel.slug} panel={panel} slots={slots} onPick={handlePick} />
            ))
          : isLoading &&
            CATEGORY_PANELS.map((panel) => <CategoryPanel key={panel.slug} panel={panel} onPick={handlePick} />)}

        {(isError || filled?.length === 0) && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            The featured quizzes aren't available right now — every other quiz is one click away.
          </p>
        )}
      </div>

      <Link to={CATALOGUE_PATH} tabIndex={-1} className="mt-10 block">
        <LiftedButton outerClassName="w-full" className="w-full gap-2 py-3 text-lg font-semibold sm:text-xl">
          Explore more quizzes
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </LiftedButton>
      </Link>

      {picked && (
        <QuizStartModal
          quiz={picked}
          isOpen={start.isOpen}
          onClose={start.close}
          onStartQuiz={(quizId) => navigate(quizPlayPath({ id: quizId, format: picked.format }))}
        />
      )}
      {picked && (
        <SignUpForMoreDialog quiz={picked} isOpen={signUp.isOpen} onClose={signUp.close} />
      )}
    </div>
  );
}
