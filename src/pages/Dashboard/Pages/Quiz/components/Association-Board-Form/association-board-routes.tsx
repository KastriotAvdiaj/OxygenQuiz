import { useState } from "react";
import { Navigate, useLocation, useParams } from "react-router";
import { Brain } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useUser } from "@/lib/Auth";
import { readDraft } from "@/lib/drafts/draft-storage";
import { useQuizData } from "../../api/get-quiz";
import {
  toAssociationQuizFormValues,
  useAssociationBoard,
} from "../../api/association-quiz";
import { dashboardBaseOf, useQuizEditPath } from "../../quiz-paths";
import { useFormatAvailable } from "../../format-access";
import {
  ASSOCIATION_DRAFT_VERSION,
  QUIZ_DRAFT_SLOTS,
  parseAssociationBoardDraft,
  type AssociationBoardDraft,
} from "../quiz-drafts";
import { AssociationBoardForm } from "./association-board-form";

/**
 * `…/create-quiz/associations` (admin) and `…/create/associations` (player dashboard).
 * While the format is in preview a non-admin who types the URL is sent back to their quiz list —
 * the API would refuse the save anyway (format-access.ts).
 *
 * <b>Draft.</b> Reads any unfinished board *before* the builder mounts and seeds it as the form's
 * defaults, the same way `create-quiz-route.tsx` does for the Classic builder — read once in a
 * `useState` initializer, so the first render already holds the author's work
 * (docs/quiz/quiz-draft-persistence.md).
 */
export const CreateAssociationQuizRoute = () => {
  const available = useFormatAvailable("Associations");
  const { pathname } = useLocation();
  const { data: user } = useUser();

  const [restored] = useState(() =>
    readDraft<AssociationBoardDraft>({
      slot: QUIZ_DRAFT_SLOTS.associations,
      userId: user?.id,
      version: ASSOCIATION_DRAFT_VERSION,
      parse: parseAssociationBoardDraft,
    }),
  );

  if (!available)
    return <Navigate to={`${dashboardBaseOf(pathname)}/quizzes`} replace />;
  return <AssociationBoardForm restoredDraft={restored} />;
};

/**
 * `/dashboard/quizzes/edit-quiz/:quizId/board` — loads the quiz and its board, then the builder
 * in edit mode. A Classic quiz that lands here is sent to its own editor, and the form is keyed
 * by id + version so a refetch after someone else's edit re-seeds it instead of mixing states.
 */
export const EditAssociationQuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);

  const editPath = useQuizEditPath();
  const quizQuery = useQuizData({ quizId });
  const isBoard = quizQuery.data?.format === "Associations";
  const boardQuery = useAssociationBoard({
    quizId,
    queryConfig: { enabled: isBoard },
  });

  if (quizQuery.isLoading || (isBoard && boardQuery.isLoading)) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const quiz = quizQuery.data;
  if (quiz && !isBoard) return <Navigate to={editPath(quiz)} replace />;

  const board = boardQuery.data;
  if (quizQuery.isError || boardQuery.isError || !quiz || !board) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto mb-4 h-16 w-16 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading the board. Please try again.</p>
      </div>
    );
  }

  return (
    <AssociationBoardForm
      key={`${quiz.id}-v${board.version}`}
      edit={{
        quiz,
        values: toAssociationQuizFormValues(quiz, board),
        version: board.version,
      }}
    />
  );
};
