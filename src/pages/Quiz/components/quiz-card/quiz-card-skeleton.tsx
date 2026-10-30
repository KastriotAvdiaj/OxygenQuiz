import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

/**
 * A quiz card that hasn't arrived yet: the same frame, padding and rows as `QuizCard`, so the
 * real card lands in the space the skeleton took. Built from the card's own spacing classes —
 * when the card's layout changes, change this beside it.
 *
 * For the catalogue's own data wait only (docs/development/loading-states.md §2.1): `/choose-quiz`
 * normally arrives with its first page prefetched and never shows this.
 */
function QuizCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card">
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Skeleton className="h-[7px] w-[7px] rounded-full" />
            <Skeleton className="h-[7px] w-[7px] rounded-full" />
            <Skeleton className="h-[7px] w-[7px] rounded-full" />
          </span>
          <Skeleton className="ml-auto h-6 w-6 rounded-full" />
        </div>

        {/* Two title lines at the title's line height (text-xl / 1.6rem × 1.12). */}
        <div className="mt-3 space-y-2 sm:mt-4">
          <Skeleton className="h-5 w-11/12 sm:h-6" />
          <Skeleton className="h-5 w-3/5 sm:h-6" />
        </div>
        <Skeleton className="mt-2.5 h-3.5 w-24" />

        <div className="min-h-[1.25rem] flex-1 sm:min-h-[3.25rem]" />

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="ml-auto h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** A page of skeleton cards in the catalogue's grid (same classes as the real grid). */
export function QuizGridSkeleton({ count }: { count: number }) {
  return (
    <SkeletonGroup
      label="Loading quizzes"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr"
    >
      {Array.from({ length: count }, (_, i) => (
        <QuizCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}
