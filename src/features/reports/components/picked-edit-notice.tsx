import { PickHand } from "@/components/icons/solid-icons";
import { useUser } from "@/lib/Auth";
import { useQuestionEditability } from "@/pages/Dashboard/Pages/Question/api/get-question-editability";
import { cn } from "@/utils/cn";

type Viewer = { roles?: string[]; permissions?: string[] } | null | undefined;

/**
 * Whether this user's edits keep a pick. Mirrors `QuizHouse.CanAutoPickAsync` on the API: staff
 * (Admin, SuperAdmin) always, anyone else with `quiz:autopick` (docs/media/moderation.md §5).
 * Client-side it only decides whether to warn.
 */
const canAutoPick = (user: Viewer) =>
  !!user?.roles?.some((r) => r === "Admin" || r === "SuperAdmin") ||
  !!user?.permissions?.includes("quiz:autopick");

/** Whether saving an edit to this quiz will take it out of the picked catalogue (`QuizHouse.UnpickForEdit`). */
export const editUnpicks = (quiz: { isPicked?: boolean } | undefined, user: Viewer) =>
  !!quiz?.isPicked && !canAutoPick(user);

const Notice = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    role="note"
    className={cn(
      // Fades in: the question version appears once its count arrives (docs/development/motion.md).
      "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm animate-in fade-in duration-200 motion-reduce:animate-none",
      className,
    )}
  >
    <PickHand size={16} className="mt-0.5 shrink-0 text-primary" />
    <span>{children}</span>
  </div>
);

/**
 * Said before the author saves, not after: losing the pick is the price of the edit, so it belongs
 * beside the editor. A publish/unpublish alone keeps it, so the sentence says "changes".
 */
export function PickedEditNotice({ className }: { className?: string }) {
  return (
    <Notice className={className}>
      <strong>This quiz is picked.</strong> Saving changes takes it out of the picked catalogue
      until it&apos;s picked again — so a reviewed quiz is never changed unreviewed.
    </Notice>
  );
}

/**
 * The question editors' version. A question is shared, so editing it from the question bank
 * changes — and unpicks — every picked quiz it is in (`IQuestionRepository.UnpickQuizzesContainingAsync`).
 * The count comes from `GET /questions/editability` (`PickedQuizCount`), which only reads your own
 * questions; anyone who can edit someone else's is staff, and keeps the picks anyway.
 */
export function PickedQuestionNotice({ questionId, className }: { questionId: number; className?: string }) {
  const { data: user } = useUser();
  const keepsPicks = canAutoPick(user);
  const { data } = useQuestionEditability(keepsPicks ? [] : [questionId], null);
  const count = data?.find((e) => e.questionId === questionId)?.pickedQuizCount ?? 0;
  if (keepsPicks || count === 0) return null;

  return (
    <Notice className={className}>
      <strong>
        {count === 1 ? "A picked quiz uses this question." : `${count} picked quizzes use this question.`}
      </strong>{" "}
      Saving changes takes {count === 1 ? "it" : "them"} out of the picked catalogue until{" "}
      {count === 1 ? "it's" : "they're"} picked again.
    </Notice>
  );
}
