import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { LiftedButton } from "@/common/LiftedButton";
import { rule } from "@/lib/filtering";
import { cn } from "@/utils/cn";
import { useSearchQuizzes } from "../../Dashboard/Pages/Quiz/api/search-quizzes";
import { SORT_RULES } from "../components/quiz-header";
import { quizPlayPath } from "../quiz-play-path";

/**
 * The two cards beside the category panels on the quiz home page (docs/quiz/featured-quizzes.md,
 * "Beside the panels"): the newest Associations board, and the way to play with friends. In the
 * side gutters on wide screens; under the panels everywhere else.
 */

const promoVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.035 },
  },
};

/** The newest public board — the one "Try Associations" opens. */
const NEWEST_BOARD = {
  page: 1,
  pageSize: 1,
  sort: [SORT_RULES.newest],
  filters: [rule.eq("format", "Associations")],
};

const cardClass =
  "flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-[0_4px_0_hsl(var(--border))]";

export function TryAssociationsCard({
  signedOut,
  className,
}: {
  signedOut: boolean;
  className?: string;
}) {
  const { data } = useSearchQuizzes({ scope: "public", query: NEWEST_BOARD });
  const board = data?.items[0];
  // No public board on this database: no card, rather than a button that leads nowhere.
  if (!board) return null;

  const playPath = quizPlayPath({ id: board.id, format: "Associations" });
  return (
    <motion.div variants={promoVariants} className={cn(cardClass, className)}>
      <span className="w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
        New
      </span>
      <MiniBoard />
      <div>
        <h2 className="text-lg font-bold leading-tight">Try Associations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open tiles, find what links each column, then guess the final word.
        </p>
      </div>
      {/* A guest is sent to sign in by the play route and comes back to this board
          (guest play of a board isn't built — associations.md §9.8). */}
      <Link to={playPath} tabIndex={-1} className="mt-auto">
        <LiftedButton
          outerClassName="w-full"
          className="w-full gap-1.5"
          size="sm"
        >
          {signedOut ? "Sign in to play" : "Play a board"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LiftedButton>
      </Link>
    </motion.div>
  );
}

export function PlayWithFriendsCard({ className }: { className?: string }) {
  return (
    <motion.div variants={promoVariants} className={cn(cardClass, className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-bold leading-tight">Play with friends</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Host a lobby and race your friends live, or join one with a code.
        </p>
      </div>
      <Link to="/multiplayer-menu" tabIndex={-1} className="mt-auto">
        <LiftedButton
          outerClassName="w-full"
          className="w-full gap-1.5 bg-muted text-foreground"
          liftColor="muted-foreground"
          size="sm"
        >
          Multiplayer
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LiftedButton>
      </Link>
    </motion.div>
  );
}

/** Which tiles of the little board show as already open — a hint of the game, not a real board. */
const OPEN = new Set([0, 5, 6, 9, 15]);

const tileVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 24 },
  },
};

/** A 4×4 board in miniature: columns A–D, a few tiles open. Decorative. */
function MiniBoard() {
  return (
    <div aria-hidden="true" className="grid grid-cols-4 gap-1">
      {["A", "B", "C", "D"].map((letter) => (
        <span
          key={letter}
          className="text-center text-[10px] font-bold text-muted-foreground"
        >
          {letter}
        </span>
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <motion.span
          key={i}
          variants={tileVariants}
          className={cn(
            "h-4 rounded-[4px]",
            OPEN.has(i)
              ? "bg-primary"
              : "bg-muted ring-1 ring-inset ring-border",
          )}
        />
      ))}
      <span className="col-span-4 mt-0.5 h-4 rounded-[4px] bg-foreground/10 ring-1 ring-inset ring-border" />
    </div>
  );
}
