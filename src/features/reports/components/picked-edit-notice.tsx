import { PickSparkle } from "@/components/icons/solid-icons";
import { cn } from "@/utils/cn";

/**
 * Whether saving an edit will take this quiz out of the picked catalogue. Mirrors
 * `QuizHouse.UnpickForEdit` / `CanAutoPickAsync` on the API: a picked quiz loses its pick when
 * someone without `quiz:autopick` changes it — staff (Admin, SuperAdmin) always have it
 * (docs/media/moderation.md §5). Client-side it only decides whether to warn.
 */
export const editUnpicks = (
  quiz: { isPicked?: boolean } | undefined,
  user: { roles?: string[]; permissions?: string[] } | null | undefined,
) =>
  !!quiz?.isPicked &&
  !user?.roles?.some((r) => r === "Admin" || r === "SuperAdmin") &&
  !user?.permissions?.includes("quiz:autopick");

/**
 * Said before the author saves, not after: losing the pick is the price of the edit, so it belongs
 * beside the editor. A publish/unpublish alone keeps it, so the sentence says "changes".
 */
export function PickedEditNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm",
        className,
      )}
    >
      <PickSparkle size={16} className="mt-0.5 shrink-0 text-primary" />
      <span>
        <strong>This quiz is picked.</strong> Saving changes takes it out of the picked catalogue
        until it&apos;s picked again — so a reviewed quiz is never changed unreviewed.
      </span>
    </div>
  );
}
