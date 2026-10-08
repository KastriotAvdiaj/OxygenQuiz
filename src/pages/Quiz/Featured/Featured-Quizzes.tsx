import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { cn } from "@/utils/cn";
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

/** Where "Browse all" goes: the full, filterable catalogue. */
export const CATALOGUE_PATH = "/choose-quiz/all";

/**
 * The page's entrance: the header drops in, then the panels rise one after another (each panel
 * then brings in its own title and tiles — category-panel.tsx). Short and
 * staggered so the page feels alive without making anyone wait to click. Turned off for players
 * who ask their system for reduced motion (MotionConfig below).
 */
const pageVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const fadeDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

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
    <MotionConfig reducedMotion="user">
      <motion.div
        initial="hidden"
        animate="shown"
        variants={pageVariants}
        className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6"
      >
        <button
          onClick={() => navigate("/choose-mode")}
          className="group mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        <motion.header
          variants={fadeDown}
          className="flex items-center justify-between gap-3"
        >
          {/* Held invisible (not removed, so nothing shifts) until we know whether the visitor is
              signed in — otherwise a guest sees "Pick a quiz" flip to "Pick your first quiz". */}
          <h1
            className={cn(
              "text-3xl font-bold leading-none transition-opacity duration-200 sm:text-4xl",
              isUserLoading ? "opacity-0" : "opacity-100",
            )}
          >
            {signedOut ? "Pick your first quiz" : "Pick a quiz"}
          </h1>
          <Link to={CATALOGUE_PATH} tabIndex={-1} className="shrink-0">
            {/* Primary, with an arrow: the one way on from here, to a page of its own. */}
            <LiftedButton size="sm" className="gap-1.5">
              Browse all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LiftedButton>
          </Link>
        </motion.header>

        <motion.div
          variants={pageVariants}
          className="mt-6 space-y-6 sm:mt-8 sm:space-y-8"
        >
          {filled
            ? filled.map(({ panel, slots }, i) => (
                <CategoryPanel
                  key={panel.slug}
                  panel={panel}
                  slots={slots}
                  onPick={handlePick}
                  priority={i === 0}
                />
              ))
            : isLoading &&
              CATEGORY_PANELS.map((panel, i) => (
                <CategoryPanel
                  key={panel.slug}
                  panel={panel}
                  onPick={handlePick}
                  priority={i === 0}
                />
              ))}

          {(isError || filled?.length === 0) && (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              The featured quizzes aren't available right now — every other quiz
              is one click away.
            </p>
          )}
        </motion.div>

        {picked && (
          <QuizStartModal
            quiz={picked}
            isOpen={start.isOpen}
            onClose={start.close}
            onStartQuiz={(quizId) =>
              navigate(quizPlayPath({ id: quizId, format: picked.format }))
            }
          />
        )}
        {picked && (
          <SignUpForMoreDialog
            quiz={picked}
            isOpen={signUp.isOpen}
            onClose={signUp.close}
          />
        )}
      </motion.div>
    </MotionConfig>
  );
}
